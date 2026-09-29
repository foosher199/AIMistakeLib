# SaaS Development Plan

## Product Direction

Transform the personal mistake notebook into a student-and-parent SaaS product built around a complete learning loop: capture a question, organize it, diagnose the mistake, practise variations, review, and print. The initial audience is individual families acquired through invitation campaigns; school and classroom tenancy comes later.

## Phase 1: Core Learning Workflow

- Store uploaded question images in a private Supabase Storage bucket and keep durable database references instead of public URLs.
- Associate one source image with multiple recognized questions and allow a question to reference multiple images.
- Add batch selection to the question library.
- Provide a worksheet builder with A4 preview, student and answer editions, answer space, one/two-column layouts, browser printing, and PDF saving.
- Keep exports free of AI charges; only new recognition, analysis, or variation generation consumes credits.
- Show clear progress, empty states, retry actions, credit balance, and source-image access throughout the workflow.

## Phase 2: Commercial Readiness

- Add trial, paid-plan, entitlement, payment, refund, and invoice flows.
- Add export history, saved worksheet templates, DOCX export, and more print layouts.
- Move long AI operations to durable background jobs with progress polling and retry handling.
- Add account deletion, personal-data export, privacy policy, terms, and minor-protection disclosures.
- Expand the administrator area with users, model cost, task failures, invite campaigns, and conversion metrics.

## Phase 3: Family and School Features

- Parent-to-student account relationships and weekly learning reports.
- Teacher, class, assignment, and batch worksheet workflows.
- Class-level mistake distribution, knowledge-point mastery, and printable teaching editions.

## UX Structure

- **Dashboard:** review queue, weak subjects, recent questions, credits, and primary capture/worksheet actions.
- **Capture:** upload → recognition → correction → save, with durable task status.
- **Question library:** filtering, batch actions, worksheet selection, source image, and mastery state.
- **Question detail:** source image, structured question, collapsible answer, analysis, variations, and review history.
- **Worksheet builder:** selected questions, ordering, layout controls, print preview, PDF, and later DOCX.

## Delivery Rules

- Use private storage and short-lived signed URLs for student images.
- Store storage paths and image metadata; never persist signed URLs.
- Preserve backward compatibility while Web, iOS, and Mini Program migrate from `image_url` to image IDs.
- Version model prices and product entitlements in the database rather than hard-coding them in clients.
- Release each phase behind observable APIs with RLS, ownership checks, and cleanup of orphaned assets.
