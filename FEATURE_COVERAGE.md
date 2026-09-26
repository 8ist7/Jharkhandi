# Jharkhandi — Production Feature Coverage

Legend: ✅ functional in the packaged application · ◐ requires external production service/credential or deeper model infrastructure

## Citizen & Community
- ✅ Citizen/community role and profile context
- ✅ Challenge submission
- ✅ Photo/video/document evidence upload
- ✅ Browser GPS capture
- ✅ Affected population, severity and urgency
- ✅ Anonymous reporting
- ✅ Offline/local draft
- ✅ Edit before Government validation
- ✅ Challenge status tracking
- ✅ Community support/validation and comments

## AI Challenge Intelligence
- ✅ Trained local domain classifier across 11 controlled domains
- ✅ Sub-domain / structured categorization support
- ✅ Classification confidence and alternatives
- ✅ Explainable priority score
- ✅ Text + context duplicate signal with human review
- ✅ Similar challenge retrieval
- ✅ Structured problem summary
- ✅ Challenge DNA
- ✅ Problem Family
- ✅ Root-cause hypotheses with Government review
- ✅ Required-skill extraction
- ✅ Explainable recommendations
- ◐ Large hosted embedding/LLM retrieval is not bundled; the local trained model + rules remain human-reviewable

## University
- ✅ Institution profile
- ✅ Departments, expertise, labs/incubators
- ✅ Faculty, students, skills and availability
- ✅ Previous projects
- ✅ Explainable challenge matching
- ✅ Multidisciplinary team composition
- ✅ Faculty mentor assignment
- ✅ Cross-university collaborators
- ✅ Proposal submission/review
- ✅ Pre-mortem
- ✅ Prototype, testing and pilot workflow

## Industry
- ✅ Industry/startup/MSME/CSR profile
- ✅ Technology capabilities
- ✅ Mentor availability
- ✅ Funding offers
- ✅ Prototype resources
- ✅ Pilot sites
- ✅ Co-development support
- ✅ Implementation feedback
- ✅ Technology-transfer record

## Project Lifecycle
- ✅ Validation and assignment
- ✅ Team formation
- ✅ Proposal and approval
- ✅ Milestones, tasks and deliverables
- ✅ Budget and risk register
- ✅ Prototype/testing/pilot/deployment evidence
- ✅ Closure and lessons learned

## Decision Intelligence
- ✅ Existing-solution retrieval from Innovation Memory
- ✅ Reuse / Adapt / Invent recommendation
- ✅ Transferability score
- ✅ Required adaptations/safeguards
- ✅ Failure-pattern learning
- ✅ AI-assisted project pre-mortem
- ✅ What-If controls
- ✅ Alternative comparison

## Impact & Governance
- ✅ Baseline/post-deployment metrics
- ✅ Community validation
- ✅ Impact evidence upload
- ✅ Government verification
- ✅ Impact Integrity Score
- ✅ Beneficiary count
- ✅ Jobs/startups/patents fields
- ✅ Moderation/rejection notes
- ✅ Audit trail
- ✅ Innovation Memory

## Platform / PWA
- ✅ Four role-based workspaces
- ✅ Distinctive dark civic-command desktop navigation + touch-first mobile navigation
- ✅ Collapsible workspace sidebar
- ✅ Search / command palette
- ✅ Notifications/comments/activity timeline
- ✅ GPS + OpenStreetMap link/context when online
- ✅ Analytics computed from created records, not fabricated counters
- ✅ High-contrast and low-bandwidth settings
- ✅ Installable PWA foundation
- ✅ Offline challenge drafts
- ✅ SQLite persistence with JSON fallback
- ✅ SSE live state synchronization
- ✅ Data export/import
- ✅ Server-side evidence storage
- ◐ Production SSO/Aadhaar/DigiLocker, SMS/email gateways and Government APIs require authorized credentials/infrastructure

## Language access
Interface/content modes available:
- ✅ English
- ✅ Hindi
- ✅ Angika
- ✅ Bengali
- ✅ Bhojpuri
- ✅ Bhumij
- ✅ Ho
- ✅ Kharia
- ✅ Khortha
- ✅ Kurmali
- ✅ Kurukh
- ✅ Magahi
- ✅ Maithili
- ✅ Mundari
- ✅ Nagpuri
- ✅ Odia
- ✅ Santali / Ol Chiki content mode
- ✅ Urdu with RTL handling

### Translation quality model
- Full editorial public/interface packs are strongest for English, Hindi, Bengali, Bhojpuri, Magahi, Maithili, Urdu and Odia.
- Other regional/tribal packs provide language-specific public copy, core navigation/intake wording, Unicode content support and bilingual technical terminology.
- For an official Government rollout, community-draft packs should be validated by native speakers/authorized language experts before being called certified translations.
