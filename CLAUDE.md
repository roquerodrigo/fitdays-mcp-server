# fitdays-mcp-server

MCP ([Model Context Protocol](https://modelcontextprotocol.io)) server that
exposes the unofficial [FitDays / iComon smart-scale API](https://github.com/roquerodrigo/fitdays-api)
as tools an LLM client (Claude Desktop, Claude Code, etc.) can call. It logs
into a FitDays account once, caches a full sync in memory (5-minute TTL), and
serves the data as structured tool responses over stdio.

Published to npm as `fitdays-mcp-server`; installed/run via `npx fitdays-mcp-server`.
Also published as a Docker image at `ghcr.io/roquerodrigo/fitdays-mcp-server`
(see "Docker image" below).

**Read `CODE_STYLE.md` before adding or restructuring code** — it is the
detailed style guide (naming, typing, imports, logging, error format,
commit conventions, releasing). This file covers project shape and things
that aren't obvious from skimming source.

## Structure

Three top-level files: `src/index.ts` (entry point / `bin` script),
`src/fitdays.ts` (`FitDaysSession`, wrapping the `fitdays-api` SDK), and
`src/server.ts` (builds the `McpServer`, registers the 5 tools). The
`src/summaries/` modules turn SDK records into the LLM-facing response
shapes (user, weight, and the weight `ext_data` context). `dist/` is
gitignored compiled output — what `bin`/`main`/`exports` in `package.json`
point at. There's no `tools/`/`prompts/` subdirectory yet; split further only
once file count grows.

## Run / build

```sh
npm install
npm run build                                    # tsc -> dist/
FITDAYS_EMAIL=… FITDAYS_PASSWORD=… npm start      # node dist/index.js
```

`FITDAYS_REGION` is optional (defaults to `us`).

## Docker image

`Dockerfile` is a two-stage build: the first stage runs `npm ci` + `npm pack`
on the build platform, the second installs that tarball globally next to
`supergateway` (pinned) and runs as the `node` user. The image's default
command bridges the stdio server to Streamable HTTP on port 8000 (`/mcp`,
health at `/healthz`); passing `fitdays-mcp-server` as the container command
gives plain stdio. `--stateful` on the gateway is deliberate — stateless
mode leaks one child process per tool call.

```sh
docker build -t fitdays-mcp-server:dev .
docker run --rm -e FITDAYS_EMAIL=… -e FITDAYS_PASSWORD=… -p 8000:8000 fitdays-mcp-server:dev
```

## Lint

```sh
npm run lint     # eslint --fix (flat config in eslint.config.mjs)
```

ESLint = typescript-eslint recommended + `@stylistic` (customized) +
`eslint-plugin-perfectionist` (enforces import/member ordering — let
`--fix` handle it, don't hand-sort).

## Testing — currently none

There is **no `npm test` script and no `*.test.ts` files** in this repo yet,
even though `CODE_STYLE.md` describes a `node --test` setup as the intended
convention (tests next to source, `fitdays-api` mocked, never hitting real
FitDays endpoints). If you add tests, wire up the `test` script in
`package.json` to match that convention rather than inventing a new one.

## CI

`ci.yml` gates lint and build on push to `main` and on every PR, by calling
the shared `npm-*` reusables from `roquerodrigo/.github`. Two things worth
knowing:

- The lint job runs `eslint` directly, **not** `npm run lint` — that script
  carries `--fix`, so in CI it would rewrite files and pass on anything
  auto-fixable.
- Both jobs install with `npm ci`, which aborts when `package-lock.json` and
  `package.json` disagree.

There is no `tests` job because there is no suite yet (see above). Add it to
`ci.yml` alongside the `test` script.

The `docker` job builds the image (single platform, no push) so a broken
`Dockerfile` fails the PR instead of the release.

## Releasing

`release-please` owns `package.json`'s `version` and `CHANGELOG.md` — driven
by Conventional Commits (see `CODE_STYLE.md` for the type→bump table). Don't
hand-edit the version. Merging the release-please PR publishes to npm via
OIDC (npm Trusted Publisher, no token in repo secrets) and pushes the
multi-arch Docker image to ghcr, tagged `<version>`, `<major>.<minor>`,
`<major>` and `latest` from the same release tag (`publish-docker` job in
`release.yml`, authenticated with `GITHUB_TOKEN`).

## Gotchas

- **MCP server's own `version` is hardcoded** in `src/server.ts`
  (`new McpServer({ name: 'fitdays-mcp-server', version: '1.0.0' })`) and is
  *not* kept in sync with `package.json`'s `version` — that one is
  release-please-managed and moves with each release while the hardcoded one
  stays `1.0.0`. Don't assume they match.
- **`include_deleted` defaults differ by tool**: `get_weight_history`
  defaults to `true` (FitDays' mobile app marks edited records
  `is_deleted: 1` instead of removing them server-side, so history should
  show them by default); `get_latest_weight` defaults to `false` (you
  usually want the current, non-tombstoned reading).
- **`include_ext_data` defaults differ by tool too**: `get_latest_weight`
  defaults to `true` (one record, the FitDays reference ranges help interpret
  it); `get_weight_history` defaults to `false` (up to 1000 records, and the
  ~45-field `ext_data` object would dominate the payload on trend queries).
- **Never `console.log`** — stdout is the JSON-RPC channel; any stray write
  corrupts the protocol stream. Diagnostics go to `console.error` (stderr),
  prefixed `[debug]`/`[info]`/`[warn]`/`[error]` per `CODE_STYLE.md`.
- **`FitDaysSession.getClient` dedupes concurrent logins** via a shared
  `loginPromise` — if you touch that method, preserve the single-flight
  behavior or concurrent tool calls will trigger duplicate logins.
- Repo is **public**, but `main` has **no GitHub branch protection or
  ruleset configured** — nothing technically blocks a direct push. The
  PR-per-feature workflow (visible in `git log` as merge commits) is a
  self-imposed convention from the user's global git conventions, not a
  repo-enforced gate. Follow it anyway: branch, PR, merge commit — don't
  push straight to `main`, and update `main` from remote before branching.
