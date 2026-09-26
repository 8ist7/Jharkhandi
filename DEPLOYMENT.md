# Jharkhandi Civic Ledger  — Local Deployment

Default local URL: **http://localhost:5785**

## Windows quick start

1. Extract the ZIP into a fresh folder.
2. Double-click `RUN_JHARKHANDI.bat`.
3. The launcher selects Node.js 18+ when available, otherwise it uses the Python 3 fallback.
4. It waits until `/api/health` returns HTTP 200 before opening the browser.
5. Startup errors remain visible in the console; a fresh `logs/server.log` is created automatically when needed.

## Node runtime

```text
node server.mjs
```

Optional environment variables:

- `PORT` — overrides the default port.
- `DATA_DIR` — overrides the bundled `data/` directory.

## Python fallback

```text
python server_fallback.py
```

The Node runtime is preferred because it exposes the complete local API surface used by the prototype. The fallback is provided for demo reliability.

## Production boundary

A public deployment still requires HTTPS/reverse proxying, approved identity/SSO, rate limiting/WAF, malware scanning, secrets management, backup/retention policy, monitoring, privacy controls and any authorized government integrations.
