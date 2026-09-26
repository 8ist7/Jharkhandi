# Runtime Guide 

## Prerequisites
- Windows/macOS/Linux
- Node.js 18+ (Node versions with `node:sqlite` use SQLite; otherwise JSON fallback is used)
- Python 3 is optional for the fallback server and QA scripts

## Installation
No third-party npm dependency install is required for the bundled prototype.

## Environment
Optional:
- `PORT` — default `5855`
- `DATA_DIR` — alternate writable data directory

No secrets/API keys are bundled or required.

## Database
Default database: `data/jharkhandi.sqlite`.
The server creates missing tables idempotently at startup.

## Run
Windows: `RUN_JHARKHANDI.bat`

Node directly:
`npm start`

Default URL:
`http://localhost:5855`

## Load demonstration data
`npm run seed-demo`

This intentionally replaces the current local prototype state with records clearly marked **DEMONSTRATION DATA**. Back up/export current state first if needed.

## Tests
- `npm run check`

## Production build
The project is static frontend + Node server; there is no separate bundler build step.
Docker files are included for container deployment, but production identity/storage/security services must be added before real deployment.
