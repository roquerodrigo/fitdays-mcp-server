# Code Style Guide

Style conventions for the `fitdays-mcp-server` TypeScript project — an MCP
server exposing the unofficial FitDays / iComon smart-scale API as tools for
LLM clients. Run `npm run lint` before committing — it executes ESLint with
`--fix`. `npm test` follows.

**Always read this file before adding or restructuring code.**

## Language

- Code is written in **English**: file names, type names, function names,
  variable names, object keys, identifier strings.
- The conversation language with the user can be Portuguese or anything else;
  what is committed to disk stays English.

## File organization

- **Source layout is `src/`.** Compiled output goes to `dist/` (gitignored).
- **`src/index.ts`** is the entry point — its built form
  (`dist/index.js`) is exposed as the `bin` script.
- **`src/server.ts`** wires the `@modelcontextprotocol/sdk` server, registers
  tools, and forwards them to the underlying SDK in `src/fitdays.ts`.
- **`src/fitdays.ts`** wraps the `fitdays-api` SDK with credential management
  and tool-friendly response shapes.
- Add subdirectories (`tools/`, `prompts/`, etc.) when the file count grows
  beyond a handful.

## Naming

- Public classes / interfaces / types are `PascalCase`.
- Functions and variables are `camelCase`.
- Module file names are `kebab-case`.
- Tool names exposed to LLM clients are `snake_case` (the MCP convention).

## Typing

**Strict TypeScript. No `any`.** `tsconfig.json` has `"strict": true`.

Banned: `any`, `Function` as a type, untyped object literals leaked to the
public API.

Required:

- `interface` for object shapes that may be extended; `type` for unions
  and aliases.
- `readonly` on collection fields that don't mutate after construction.
- Tool input schemas use `zod` — never accept raw `unknown` from the MCP
  framework without parsing it through a schema.
- Always type return values explicitly on exported functions.

## Imports

- ESM only (`"type": "module"`). Always include the `.js` extension on
  relative imports — Node's NodeNext resolver requires it.
- Type-only imports use `import type`.
- `eslint-plugin-perfectionist` enforces import ordering; let `npm run lint`
  fix it.

## Docstrings

- TSDoc comments on every exported symbol that's part of the public surface
  (the tool functions and the wiring layer).
- Tool descriptions visible to LLM clients live in the `description` field
  of the MCP tool registration — those are user-facing and need to be
  precise enough that the model picks the right tool.

## Comments

- Default to **no comments**. Add one only when the *why* is not obvious
  from the code: a hidden constraint, a workaround, an MCP-protocol quirk.
- Never describe *what* the code does — well-named identifiers handle that.
- **No section dividers** like `// --- Tools ---`. Split into files instead.

## Logging

- MCP servers communicate over stdio (JSON-RPC). **Never `console.log` to
  stdout** — it corrupts the protocol stream. Always use `console.error`
  for diagnostics; `stderr` is safe.
- Levels via prefix:
  - `[debug]` — verbose request/response traces (gated behind a `DEBUG`
    env var).
  - `[info]` — server lifecycle (started, tool registered).
  - `[warn]` — recoverable upstream failures.
  - `[error]` — unrecoverable in current call.
- Never log raw `username` / `password` / OAuth tokens. Truncate or hash
  for correlation.

## Error messages

- Format: `"Failed to <verb> <object>: <cause>"`. Keep them short and
  grep-able.
- When an MCP tool fails, return a structured `{ isError: true, content: [...] }`
  with a human-readable message — don't throw across the JSON-RPC boundary.
- Pre-validate tool inputs via `zod.parse(...)` so schema violations point
  at the bad input.

## Public API surface

- The MCP tool list is the public contract. Adding a tool is `feat`,
  removing or renaming one is `BREAKING CHANGE:` (LLM clients hard-code
  tool names).

## Pre-commit hooks

`pre-commit` is recommended. Add `.pre-commit-config.yaml` invoking
`npm run lint` and install once per clone:

```bash
pre-commit install
```

Skip it only on emergency `git commit --no-verify` and immediately re-run
`npm run lint`.

## Conventional commits

All commits follow [Conventional Commits](https://www.conventionalcommits.org/),
which `release-please` parses to bump `package.json` `version` and generate
`CHANGELOG.md`:

| Type | Meaning | Bump |
|---|---|---|
| `feat` | New feature (e.g. new tool) | minor |
| `fix` | Bug fix | patch |
| `perf` | Performance improvement | patch |
| `deps` | Dependency bump | patch |
| `docs` | Documentation only | none |
| `refactor` | Refactor without behavior change | none |
| `test` | Test-only change | none |
| `ci` | CI / tooling change | none |
| `chore` | Anything else (rarely) | none |

- Subject line: imperative mood, lowercase, no trailing period.
- Use scopes when useful: `feat(tools): add weight_history tool`.
- A `BREAKING CHANGE:` footer (or `!` after type) bumps the major version.

## Packaging

- `"type": "module"`. ESM only.
- `"bin": "dist/index.js"` exposes the server as an executable for
  `npx fitdays-mcp-server`.
- `"main"` / `"types"` / `"exports"` point at `dist/index.{js,d.ts}` — keep
  consumers routed through the map.
- `"sideEffects": false` — bundlers can tree-shake.
- `"files": ["dist"]` — only the build output ships.

## Releasing

- `release-please` runs on `main` and opens a release-PR with the next
  version + `CHANGELOG.md`. Merging that PR triggers the publish job
  (`npm publish` via OIDC + npm Trusted Publisher — no token in repo
  secrets).
- Don't manually edit `package.json` `version` — release-please owns it.

## Testing

- Tests live next to source as `*.test.ts`. `npm test` compiles with `tsc`
  and runs them via `node --test`.
- Mock the underlying `fitdays-api` SDK; never hit real FitDays endpoints
  from the test suite.

## Linting and verification

- ESLint flat-config in `eslint.config.mjs`: typescript-eslint recommended
  + `@stylistic` + `perfectionist`. `npm run lint` applies fixes
  automatically.
- `tsc --noEmit` (via `npm test`'s `tsc` step) catches type errors.
- After every change run `npm run lint && npm test`. Both gates mirror CI.
