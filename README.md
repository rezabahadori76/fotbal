# fotbal_ui

Football match analytics web UI: player tracking review, jersey assignment, coach and player dashboards.

Built on top of tracking CSV/video outputs. Includes a Flask app for interactive editing and analytics.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Place your video and tracking CSV in the project root (see `pipeline/README.md` for default filenames). Large media files are not stored in git.

Copy or edit `users.json` for coach/player login credentials and change `secret_key` before production.

## Run

```bash
# Data pipeline (CSV cleanup, team fix, optional bbox video)
python -m pipeline.run

# Web UI
python player_editor_app.py
```

Open the URL printed in the terminal (default `http://127.0.0.1:5000`).

## Project layout

| Path | Description |
|------|-------------|
| `player_editor_app.py` | Flask web app |
| `analytics_engine.py` | Coach/player analytics |
| `auth_utils.py` | Login and roles |
| `pipeline/` | CSV/video processing scripts |
| `static/`, `templates/` | Frontend assets |
| `team config.json` | Team rosters and match metadata |

## Default logins (development)

See `users.json`. Change passwords before deploying.
