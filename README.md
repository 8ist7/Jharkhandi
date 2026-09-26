# Jharkhandi — Audited 

Audited  is an **additive audit/hardening release** built on the working  project. It preserves the existing UI and workflows while strengthening intelligence traceability, evidence handling, demonstration reliability and documentation.

## Start
Windows: `RUN_JHARKHANDI.bat`

Node: `npm start`

Default URL: **http://localhost:5855**

## What changed in 
- Persisted Challenge DNA provenance/review metadata.
- Structured root-cause records with reasoning/evidence/confidence/review state.
- Problem-family traceability and explicit human merge requirement.
- Transferability factor explanations, incompatibilities, assumptions and confidence.
- Richer pre-mortem records.
- Explicit claimed-vs-verified impact records.
- Structured Innovation Memory records used by future decision logic.
- Coherent, labelled **DEMONSTRATION DATA** seed (`npm run seed-demo`).
- Upload hardening, rate limiting, stricter CSP and server mutation audit table.
- Truthful external-integration status (`GET /api/integrations`).
- Evidence-based GREEN/YELLOW/RED audit.

## Verification executed
- `npm run check`

## Important limitation
This remains a hackathon prototype. Production authentication and backend object-level authorization are **not** implemented. Local role-entry is not a substitute for government SSO/session security. See `SECURITY_AUDIT.md`.

## Key documents
- `SECURITY_AUDIT_V22.md`
- `INTEGRATIONS_V22.md`
- `RUNTIME_V22.md`
- `DEMO_FLOW_V22.md`
