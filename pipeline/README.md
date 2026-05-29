# Pipeline

همه اسکریپت‌های پردازش CSV و ویدیو اینجا هستند. فایل‌های داده (ویدیو، CSV، `team config.json`) در **ریشه پروژه** می‌مانند.

## اجرا (از ریشه پروژه)

```bash
cd /path/to/fotbal_UI
source .venv/bin/activate

# کل پایپ‌لاین CSV (تیم → پاکسازی)
python -m pipeline.run

# فقط اصلاح team_id
python -m pipeline.fix_team_id_by_track

# فقط پاکسازی با roster
python -m pipeline.clean_tracking_csv

# رسم باکس روی ویدیو
python -m pipeline.draw_boxes_on_video
```

## خروجی‌های پیش‌فرض

| مرحله | فایل |
|--------|------|
| ورودی خام | `output_video 2.csv` |
| بعد از fix team | `output_video_2_team_fixed.csv` |
| نهایی cleaned | `output_video_2_cleaned.csv` |
| ویدیو با باکس | `output_annotated.mp4` |

## UI بازیکن

```bash
python player_editor_app.py
```
