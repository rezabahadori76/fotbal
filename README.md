# fotbal_ui

Football match analytics web UI: player tracking review, jersey assignment, coach and player dashboards.

Built on top of tracking CSV/video outputs. Includes a Flask app for interactive editing and analytics, plus an embedded Academy Hub dashboard for admin/coach/player question workflows.

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

# Integrated web UI (PitchIQ + Football Manager Academy Hub)
python run_dev.py
```

**Start here:** [http://127.0.0.1:5050/login](http://127.0.0.1:5050/login) — sign in to PitchIQ (fotbal_ui video analytics).

After sign-in, click **Football Manager** in the top bar to open the merged dashboard at `/hub` (questions, assignments, responses).

`run_dev.py` starts Flask (`:5050`) and Next.js (`:3000`). Flask proxies `/hub/*` into the Football Manager app so everything runs inside **fotbal_ui** on one port.

First-time Academy Hub setup:

```bash
cd academy_hub
npm install
cp .env.example .env
npm run db:setup
```

### Logins

**PitchIQ (video)** — tab Coach / Player on the main login page:

| Role | Login |
|------|-------|
| Coach | `coach` / `coach123` |
| Player | team + jersey # / `player123` |

**Academy Hub (Football Manager)** — tab Academy, or `/hub/login`:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@academy.com` | `password123` |
| Coach | `coach@academy.com` | `password123` |
| Player | `player@academy.com` | `password123` |

## Project layout

| Path | Description |
|------|-------------|
| `player_editor_app.py` | Flask web app |
| `analytics_engine.py` | Coach/player analytics |
| `auth_utils.py` | Login and roles |
| `academy_hub/` | Next.js admin/coach/player dashboard |
| `pipeline/` | CSV/video processing scripts |
| `static/`, `templates/` | Frontend assets |
| `team config.json` | Team rosters and match metadata |

## Default logins (development)

See `users.json`. Change passwords before deploying.
