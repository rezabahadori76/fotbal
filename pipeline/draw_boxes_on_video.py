#!/usr/bin/env python3
"""
Overlay player bounding boxes from CSV on video; draw jersey_number above the top-right of each box.
"""

from __future__ import annotations

import argparse
import platform
import shutil
import subprocess
from pathlib import Path

import cv2
import pandas as pd

from pipeline.paths import ANNOTATED_VIDEO, CLEANED_CSV, TEAM_FIXED_CSV, VIDEO


def jersey_label(val) -> str:
    if pd.isna(val):
        return ""
    try:
        return str(int(round(float(val))))
    except (ValueError, TypeError):
        return str(val).strip()


def transcode_to_h264_mp4(path: Path) -> None:
    """Re-encode OpenCV mp4v output to H.264 for QuickTime / browser playback."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print(
            "Warning: ffmpeg not found — output uses mp4v and may not play "
            "in QuickTime or HTML5 video. Install ffmpeg and re-run."
        )
        return

    tmp = path.with_name(f"{path.stem}.__h264__.mp4")
    if tmp.exists():
        tmp.unlink()

    # Hardware encoder on macOS is much faster for long clips.
    if platform.system() == "Darwin":
        video_args = ["-c:v", "h264_videotoolbox", "-b:v", "8M"]
    else:
        video_args = ["-c:v", "libx264", "-preset", "fast", "-crf", "22"]

    cmd = [
        ffmpeg,
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(path),
        "-an",
        *video_args,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(tmp),
    ]
    print(f"Transcoding to H.264 for playback: {path.name} …")
    subprocess.run(cmd, check=True)
    path.unlink()
    tmp.rename(path)
    print(f"Playback-ready H.264: {path}")


def main() -> None:
    default_csv = CLEANED_CSV if CLEANED_CSV.is_file() else TEAM_FIXED_CSV
    parser = argparse.ArgumentParser(description="Draw CSV bboxes and jersey labels on video.")
    parser.add_argument("--csv", type=Path, default=default_csv)
    parser.add_argument("--video", type=Path, default=VIDEO)
    parser.add_argument("--output", type=Path, default=ANNOTATED_VIDEO)
    parser.add_argument(
        "--max-frames",
        type=int,
        default=0,
        help="If > 0, only process this many frames (for quick tests).",
    )
    parser.add_argument(
        "--skip-h264-encode",
        action="store_true",
        help="Keep OpenCV mp4v output (may not play in QuickTime/browser).",
    )
    args = parser.parse_args()

    usecols = [
        "frame_index",
        "bbox_x1",
        "bbox_y1",
        "bbox_x2",
        "bbox_y2",
        "jersey_number",
        "team_id",
    ]
    df = pd.read_csv(args.csv, usecols=usecols, low_memory=False)
    by_frame = {int(k): v for k, v in df.groupby("frame_index", sort=True)}

    cap = cv2.VideoCapture(str(args.video))
    if not cap.isOpened():
        raise SystemExit(f"Could not open video: {args.video}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps is None or fps <= 1e-3:
        fps = 29.97
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    writer = cv2.VideoWriter(str(args.output), fourcc, fps, (width, height))
    if not writer.isOpened():
        raise SystemExit(f"Could not open VideoWriter for: {args.output}")

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.65
    thickness = 2
    team_colors = {
        1: (0, 200, 255),
        2: (0, 220, 100),
    }
    default_color = (200, 200, 200)

    frame_idx = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if args.max_frames and frame_idx >= args.max_frames:
                break

            sub = by_frame.get(frame_idx)
            if sub is not None:
                for row in sub.itertuples(index=False):
                    x1 = int(round(row.bbox_x1))
                    y1 = int(round(row.bbox_y1))
                    x2 = int(round(row.bbox_x2))
                    y2 = int(round(row.bbox_y2))
                    x1 = max(0, min(x1, width - 1))
                    x2 = max(0, min(x2, width - 1))
                    y1 = max(0, min(y1, height - 1))
                    y2 = max(0, min(y2, height - 1))

                    tid = row.team_id
                    if pd.isna(tid):
                        color = default_color
                    else:
                        color = team_colors.get(int(tid), default_color)

                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                    label = jersey_label(row.jersey_number)
                    if label:
                        (tw, th), baseline = cv2.getTextSize(
                            label, font, font_scale, thickness
                        )
                        margin = 6
                        text_x = x2 - tw
                        text_y = y1 - margin
                        min_y = th + margin
                        if text_y < min_y:
                            text_y = min_y
                        if text_x < 0:
                            text_x = 0
                        if text_x + tw > width - 1:
                            text_x = width - 1 - tw

                        cv2.putText(
                            frame,
                            label,
                            (text_x, text_y),
                            font,
                            font_scale,
                            color,
                            thickness,
                            lineType=cv2.LINE_AA,
                        )

            writer.write(frame)
            frame_idx += 1
            if frame_idx % 500 == 0:
                print(f"Processed {frame_idx} frames...")
    finally:
        cap.release()
        writer.release()

    print(f"Done. Wrote {args.output} ({frame_idx} frames)")
    if not args.skip_h264_encode and args.output.suffix.lower() == ".mp4":
        transcode_to_h264_mp4(args.output)


if __name__ == "__main__":
    main()
