# FarmPilot

FarmPilot is split into two apps:

- `Backend/` - FastAPI + SQLAlchemy + SQLite
- `Frontend/my-app/` - Next.js app router UI

## Prerequisites

- Node.js 18+ or 20+
- Python 3.11+

## 1. Start the backend

Open a terminal in `Backend/`.

First, set up your environment variables for the Agentic AI:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (and change LLM_MODEL if desired)
```

Then install dependencies and start the server:
```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

If you want to use a virtual environment and `python -m venv .venv` works on your machine, use this optional path instead:

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

If `python -m venv .venv` fails on your machine, skip the virtual environment and use the direct commands above.

If your Python launcher is not pointing at the right version, try Python 3.11 explicitly:

```bash
py -3.11 -m venv .venv
```

The first launch creates a local SQLite file named `farmpilot.db` in `Backend/` and seeds sample data.

The backend should be available at:

- `http://127.0.0.1:8000`
- `http://127.0.0.1:8000/health`

## 2. Start the frontend

Open a second terminal in `Frontend/my-app/` and run:

```bash
npm install
npm run dev
```

The frontend should be available at:

- `http://localhost:3000`

## 3. Stop everything

Stop the frontend with `Ctrl+C` in the terminal running `npm run dev`.

Stop the backend with `Ctrl+C` in the terminal running `uvicorn`.

## Notes

- SQLite keeps the hackathon setup simple and avoids Docker or a separate database server.
- The backend seeds initial data on startup, so the app will show a sample plant, sensors, a pending agent task, and a notification the first time it runs.
- The frontend currently uses mock UI state, but the backend database is ready for API wiring next.
