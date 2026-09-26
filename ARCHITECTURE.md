# Jharkhandi Civic Pro  — Architecture

## Runtime

- Frontend: responsive HTML/CSS/JavaScript Progressive Web App.
- Backend: Node.js built-in HTTP server; Python fallback for local-demo resilience.
- Persistence: SQLite at `data/jharkhandi.sqlite`, with JSON fallback where needed.
- Evidence storage: `data/uploads/` with upload metadata stored by the backend.
- Live synchronization: Server-Sent Events (SSE).
- Offline/PWA: web manifest, service worker and local draft storage.
- Packaging: Windows launcher, Dockerfile and Render blueprint.

## Product model

Jharkhandi connects four working spaces—Citizen/Community, Government, University and Industry/Startup/MSME/CSR—through one shared challenge and project state. Each role has role-specific navigation, actions, notifications and review responsibilities.

## Decision loop

Citizen evidence → AI intake → priority/duplicate context → Government validation → Challenge DNA / Problem Family / root causes → Reuse/Adapt/Invent + transferability + failure learning → University capability match → team/proposal → Industry support → pre-mortem → prototype/pilot/deployment → community and government verification → Innovation Memory.

## AI / ML prototype

- Local Multinomial Naive Bayes classifier trained from labelled SIH problem statements.
- Controlled societal-domain taxonomy and regional-language normalization.
- Context and rule signals combined with classifier output for explainability.
- Reviewer correction path for low-confidence/context-sensitive decisions.
- Local context similarity and transferability logic for the hackathon prototype.

The report's production recommendation of hosted embeddings/vector search remains an external infrastructure step rather than being falsely presented as production-grade inside this local ZIP.

## Data model

Shared state includes users/profiles, challenges, Challenge DNA, relations, universities/faculty/students, industries, projects, milestones, solutions, failure records, impact records, notifications and audit activity. Evidence files are stored outside the database under `data/uploads/`.

## UX architecture

Complete  is a presentation-layer redesign over the audited functional base. The public experience uses an editorial civic-product layout and a live case-file decision trail. Authenticated workspaces use a darker command rail, flatter surfaces, stronger hierarchy and touch-first responsive behavior. The single-document mobile scroll model, mobile login scrolling and mobile language sheet are preserved.
