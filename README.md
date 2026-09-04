# Grounded

Grounded is an evidence-first AI career-agent MVP. It helps job seekers understand realistic role fit, seniority, salary position, visa constraints, transferable skills, and truthful resume changes before any application action occurs.

The included demonstration account follows a Malaysian senior data analyst targeting Singapore roles and requiring employer-sponsored work authorization. Every salary range and job in the default experience is clearly labeled as demonstration data.

## What works

- Three-step onboarding with file preview and explicit analysis authorization
- Resume, folder, and AI-conversation import surfaces for the requested formats
- Evidence ledger with source references, confidence, confirmation, privacy, resume-use, and employer-use controls
- Conflict detection and explicit user resolution
- Seniority, salary, career-change, visa, and explainable job-match views
- Mock job-source adapter with clearly labeled simulated application submission
- Public Greenhouse Job Board API connection for permitted live job discovery
- Universal official-job-link import with a controlled employer-site handoff
- Real application tracking that records `Submitted` only after the user confirms the employer form was sent
- Truthful resume side-by-side comparison, change review, interview-defense cards, and real PDF/DOCX downloads
- Application tracker, limits, pause control, audit history, feedback, and outcome-ready models
- D1-backed state, R2-backed authorized file copies, schema migrations, and typed domain models
- Optional ChatGPT identity headers, separate consent controls, data removal, and encrypted BYOK storage
- Free/Plus quotas and an aggregated demonstration admin view
- Responsive desktop/mobile UI and automated domain, rendering, and browser validation

## Local setup

Requirements: Node.js 22.13 or later and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local address shown by the development server. The default is `http://localhost:3000`.

For the demonstration workflow:

1. Choose **Analyze My Career for Free**.
2. Upload `tests/fixtures/resume.txt`, preview it, and authorize analysis; or choose **Skip for Now**.
3. Confirm Singapore, sponsorship, the salary rule, and **Prepare Applications for Review**.
4. Resolve the 2021/2022 date conflict in **Profile**.
5. Review realistic recommendations in **Jobs**.
6. Prepare and simulate an application, then inspect it in **Applications**.
7. Compare and download the country-specific resume in **Resume**.
8. Pause automation and delete imported conversation data in **Profile → Privacy & consent**.

## Validation

```bash
npm test
```

The suite covers file types, conversation classification, structured AI output validation, conflicts, seniority, salary normalization and classification, currency conversion, career changes, visa ambiguity and explicit refusals, deduplication, match explanations, resume truthfulness and differences, application safety and limits, scheduling, consent, deletion, BYOK masking, feedback learning, quotas, and server rendering.

## Architecture

- `app/` — public landing page, full product UI, and API routes
- `lib/types.ts` — typed minimum data model for all requested entities
- `lib/domain.ts` — deterministic business rules and structured-output validation
- `lib/job-sources/` — replaceable mock and Greenhouse public-board adapters
- `lib/ai/` — provider-independent AI interface
- `db/schema.ts` and `drizzle/` — D1 schema and migration
- `tests/` — domain, rendering, and browser fixtures
- `.openai/hosting.json` — logical D1 (`DB`) and R2 (`FILES`) bindings

Important AI recommendations use strict schemas. The AI layer produces a recommendation; deterministic rules decide whether preparation or submission is allowed. The AI layer never submits directly. Application actions create an audit record with the provider, prompt version, evidence IDs, and result; hidden reasoning is never stored.

The Greenhouse adapter uses the official public Job Board API GET endpoints. Those endpoints require no authentication for public board data. The adapter deliberately does not submit applications or read applicant status because that requires employer-controlled credentials and job-specific authorization. Grounded instead opens the employer's official application page, leaves the final submission to the user, and records the result only after explicit confirmation: <https://developers.greenhouse.io/job-board.html>.

## Production deployment

This repository is configured for OpenAI Sites and Cloudflare-compatible output.

1. Create the production D1 and R2 resources through Sites using the logical bindings in `.openai/hosting.json`.
2. Apply the generated migration in `drizzle/0000_bouncy_silk_fever.sql`.
3. Add `CREDENTIAL_ENCRYPTION_KEY` as an encrypted production environment value. Do not commit the real value.
4. Run `npm test` and `npm run build`.
5. Save and deploy the validated Sites version with owner-only access first.

For another Cloudflare-compatible host, preserve the `dist/server/index.js` worker entrypoint and configure equivalent `DB`, `FILES`, and secret bindings.

## Security and privacy notes

- Files are uploaded only after the user checks explicit authorization.
- The original local file is never modified or deleted.
- Current salary is private and excluded from employer answers by default.
- Anonymous analytics consent starts off and is separate from personal career analytics.
- BYOK credentials are encrypted with AES-GCM on the server, masked in responses, excluded from logs, and deletable.
- Captchas, coding tests, assessments, video interviews, and identity verification are always user-only actions.
- The mock adapter is the only submission-capable adapter, and its submissions are simulations.

## Known MVP limitations

- TXT, Markdown, CSV, JSON, and HTML can be previewed as text. PDF, DOCX, PPTX, XLSX, and images currently receive metadata preview and authorized storage; production-grade binary parsing, OCR, malware scanning, and extraction workers remain the next ingestion milestone.
- Default jobs and salary ranges are seeded demonstration data, not live market evidence.
- Greenhouse integration supports public discovery only and needs a known company board token.
- Real employer handoff opens the official application page; it does not prefill or press the employer's final submit button.
- Scheduling runs interactively in the MVP; a production queue/cron worker and notification service are not wired.
- PDF/DOCX resume exports use the confirmed demonstration profile; a production renderer should generate arbitrary layouts from stored evidence.
- ChatGPT identity headers are supported when hosted in Sites, but local development uses the demonstration account.
- Plus checkout and real payment collection are intentionally not implemented; quotas and plan configuration are present.
- BYOK credential storage is disabled until a server encryption secret is configured. Provider calls and usage metering remain a production integration.

## Recommended production steps

1. Add isolated document-processing workers for PDF, Office files, OCR, malware scanning, and page-level citations.
2. Normalize the remaining JSON state into owner-scoped relational tables and add retention policies.
3. Add calibrated outcome models only after sufficient consented outcome data exists.
4. Add official labor-statistics and reputable, dated salary sources by country.
5. Run legal/source reviews before enabling any non-simulated application adapter.
6. Add queue-backed schedules, retries, notifications, rate limits, abuse monitoring, and disaster recovery.
