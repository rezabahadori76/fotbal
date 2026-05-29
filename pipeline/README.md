# Pipeline

All CSV and video processing scripts live here. Data files (video, CSV, `team config.json`) stay in the **project root**.

## Run (from project root)

```bash
cd /path/to/fotbal_UI
source .venv/bin/activate

# Full CSV pipeline (team fix → cleanup)
python -m pipeline.run

# Team ID fix only
python -m pipeline.fix_team_id_by_track

# Roster-based cleanup only
python -m pipeline.clean_tracking_csv

# Draw bounding boxes on video
python -m pipeline.draw_boxes_on_video
```

## Default outputs

| Stage | File |
|--------|------|
| Raw input | `output_video 2.csv` |
| After team fix | `output_video_2_team_fixed.csv` |
| Final cleaned | `output_video_2_cleaned.csv` |
| Annotated video | `output_annotated.mp4` |

## Player UI

```bash
python player_editor_app.py
```
