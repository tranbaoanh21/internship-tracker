# Reusable full-stack workflow

## Delivery loop

```text
Plan contract and evidence
-> append-only migration
-> repository transaction
-> service/controller/routes
-> OpenAPI + integration tests
-> UI states + component tests
-> Docker/runtime/E2E evidence
-> security/operations review
-> immutable release + rollback evidence
-> retrospective
```

Build vertical slices so each milestone leaves the real application usable. Keep camelCase in JSON, snake_case in MySQL, parameterize all input, and update OpenAPI together with behavior.

## How the Codex mechanisms were used

- **Plan:** locked architecture, interfaces, risks, milestones and evidence before code.
- **Goal:** held a long measurable outcome across repeated implementation, test, runtime, CI and fix cycles. It is complete only when evidence is green—not when files merely exist.
- **Subagents:** performed independent read-only backend, accessibility and delivery reviews; the main agent retained edit ownership.
- **Skill:** `redesign-existing-projects` supplied the `scan -> diagnose -> fix -> compare` UI workflow. Product behavior and accessibility stayed higher priority than decoration.
- **MCP/browser:** tested the running app, authenticated UI, mobile overflow, console output and control sizes against live state rather than source alone.

## Feature definition of done

- Works through UI and real API.
- Happy path plus meaningful validation, auth, concurrency and database failures are tested.
- Loading, empty, filtered-empty, updating, success, retry, focus and pressed states exist.
- Existing data survives migrations; stale writes fail explicitly.
- OpenAPI and operational docs match reality.
- No credentials, build output, dependency directories or reports are committed.
- `npm run lint`, `npm test`, `npm run build` and relevant E2E/runtime gates pass.

## Production definition of done

- Authenticated owner-only CRUD works through HTTPS.
- Secrets enter through protected files/environment and do not appear in Git/logs.
- Exact GHCR SHA pair is attested, pulled and smoke-tested.
- Encrypted off-host backup schedule exists and a restore drill has current evidence.
- Health, structured logs, metrics and actionable alerts are observable.
- Previous immutable image pair and rollback instructions are recorded.
- Domain/DNS, ports 80/443 and human alert receiver are explicitly verified outside the repository.

## Choosing scope

Use a prompt for one focused edit, a Plan for ambiguous architecture, a Goal for long test/fix loops, a Skill for repeatable expert procedure, subagents for isolated review, and MCP for live systems or external state. Do not add infrastructure to demonstrate vocabulary; attach it to a real failure mode or product behavior.
