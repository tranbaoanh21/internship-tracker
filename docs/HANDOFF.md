# Local completion and GitHub handoff

## Current local state

- Git is initialized on branch `main`; there are no commits or remotes yet.
- The pinned project skill is installed at `.agents/skills/redesign-skill/SKILL.md` and has been applied.
- MySQL integration tests pass against the disposable `db-test` container.
- The full Docker stack is healthy at <http://127.0.0.1:8080>.
- Health, seed, CRUD, search/filter, statistics, restart recovery, data persistence, and migration idempotency have been verified locally.
- Lint, unit/component tests, integration tests, production build, and Playwright E2E pass.
- Playwright passed on both `chromium` and `mobile-chromium`; failed-run E2E records were cleaned and successful runs self-clean in `finally`.
- Before/after UI evidence is in `docs/ui/`.

## Local quality evidence

Run these from a normal terminal with Node 24 whenever you change behavior:

```bash
cd "/Users/trannhathuy/Documents/baoanh/getReadyForInternship/sub-agents"
nvm use
npm run lint
npm test
npm run build
npm run test:e2e
```

Current result: backend `41/41`, frontend `13/13`, and E2E `2/2` pass.

The machine has a stale `/usr/local/bin/node` v16 and a broken `/opt/homebrew/bin/brew` line in `~/.zprofile`. The repository includes `.nvmrc`; confirm `node --version` reports `v24.19.0` before running npm commands.

## Useful runtime commands

```bash
docker compose ps
curl --fail http://127.0.0.1:8080/api/health
docker compose logs --no-color
docker compose down
```

The development MySQL service uses host port `3308`; containers use `db:3306`. The test database uses host port `3307`. Do not use `docker compose down -v` unless you intentionally want to erase development data.

## Commit the local repository

Review the untracked files, then stage explicit project paths:

```bash
git status --short
git add .agents/skills/redesign-skill/SKILL.md .agents/skills/redesign-skill/SOURCE.md \
  .dockerignore .editorconfig .env.example .env.release.example .gitignore .nvmrc \
  AGENTS.md README.md package.json package-lock.json \
  backend frontend database docs e2e \
  docker-compose.yml docker-compose.release.yml playwright.config.js .github
git status --short
git commit -m "feat: build internship application tracker"
```

Generated dependencies, build output, test results, reports, and `.env` remain ignored.

## Create GitHub repository manually

The user will create and connect the public GitHub repository manually. Do not run `gh repo create` automatically. After the user adds `origin`, push `main`; GitHub Actions will run CI and publish these packages after quality and E2E gates pass:

- `ghcr.io/tranbaoanh21/internship-application-tracker-backend`
- `ghcr.io/tranbaoanh21/internship-application-tracker-frontend`

After the first publish, set both package visibilities to public. Copy `.env.release.example` to the ignored `.env.release`, choose the shared immutable `sha-<full-commit-sha>` tag, then follow the release Compose commands in README. The publish workflow verifies that both tags expose `linux/amd64` and `linux/arm64` manifests.
