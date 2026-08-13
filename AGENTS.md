# Project guidance

This repository is a learning-focused full-stack application.

- Use JavaScript, Node.js 24, React, Express, MySQL, and raw SQL through `mysql2`.
- Do not introduce an ORM, Redux, or React Router. Authentication is single-owner, session-cookie based, and every application query must remain ownership-scoped.
- Keep API JSON in camelCase and database columns in snake_case.
- Add or update tests with every behavior change.
- Run `npm run lint`, `npm test`, and `npm run build` before declaring code complete.
- Run Playwright, Compose health checks, and the restore drill for runtime, delivery, or schema changes.
- Treat database migrations as append-only once committed.
- Never commit `.env`, credentials, build output, Playwright reports, or dependency directories.
- Prefer vertical slices that leave the application demonstrably working.
- Use subagents for independent review or exploration; avoid parallel edits to the same files.
- For UI redesign work, explicitly use the repo skill `redesign-existing-projects` after reading its full `SKILL.md`.
- Keep MySQL as the source of truth; Redis/BullMQ coordinates reminders and SSE fan-out, not application caching.
- Deploy only matched immutable GHCR `sha-<full-commit-sha>` image pairs and preserve a documented rollback tag.
