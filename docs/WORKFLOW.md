# Reusable full-stack workflow

This project is built as vertical slices. Each slice crosses the database, API, UI, and verification surfaces needed to demonstrate user-visible behavior.

## The loop

1. Plan the outcome, public contract, constraints, and evidence before editing.
2. Add the smallest schema or migration required by the behavior.
3. Implement repository, service, controller, and route changes in that order.
4. Connect one UI interaction to the real API.
5. Add integration and component tests before expanding scope.
6. Run lint, tests, build, and a human-observable demo.
7. Record decisions and unexpected findings while they are fresh.

## Choosing the Codex surface

- **Prompt:** one focused change with a short, obvious path.
- **Plan:** ambiguity, architecture, interface design, or a risky migration.
- **Goal:** a measurable outcome that needs repeated test/fix cycles.
- **Subagents:** independent exploration and review. Prefer read-heavy assignments; keep write ownership separate.
- **Skill:** a repeatable workflow that deserves instructions, references, or scripts.
- **MCP:** live data or actions outside the repository.

## Definition of done for a feature

- The behavior works through the user interface, not only in an isolated function.
- API validation and failure behavior are explicit.
- Tests cover the happy path and material edge cases.
- Loading, empty, error, success, focus, and pressed states are handled.
- No credentials, generated output, or local state are committed.
- Relevant docs and project guidance are updated.

## Review pattern with subagents

Use separate read-only reviews for backend correctness, frontend accessibility, and delivery readiness. The main agent owns synthesis and changes so agents do not overwrite one another.
