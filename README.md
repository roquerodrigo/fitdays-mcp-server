# fitdays-mcp-server

[Model Context Protocol](https://modelcontextprotocol.io) server that exposes
the unofficial [FitDays / iComon smart-scale API](https://github.com/roquerodrigo/fitdays-api)
as tools that an LLM client (Claude Desktop, Claude Code, etc.) can call.

It logs into your FitDays account once, caches a full ~6-year sync in memory,
and serves the data as structured tool responses.

## Tools

| Tool | What it does |
| --- | --- |
| `list_users` | Sub-users (people) registered under the account. |
| `list_devices` | FitDays-compatible devices known to the account. |
| `get_weight_history` | Body-composition / weight measurements. Filters: `suid`, `since`, `until`, `limit`, `include_deleted` (default `true` — the FitDays mobile app marks edited records `is_deleted: 1` rather than removing them server-side). |
| `get_latest_weight` | Most recent weight measurement (filter by `suid`; `include_deleted` defaults to `false`). |
| `refresh_sync` | Force-refresh the cached sync data. Returns counts including the `active` / `deleted` / `total` split for weight records. |

## Install

```sh
npm install -g fitdays-mcp-server
```

Requires Node.js ≥ 22.

## Configuration

The server reads credentials from environment variables:

| Variable | Required | Default |
| --- | --- | --- |
| `FITDAYS_EMAIL` | yes | — |
| `FITDAYS_PASSWORD` | yes | — |
| `FITDAYS_REGION` | no | `us` (other values: see [`fitdays-api` regions](https://github.com/roquerodrigo/fitdays-api)) |

## Use with Claude Desktop / Claude Code

Add it to your MCP client config (`claude_desktop_config.json` or
`~/.claude.json` / `.mcp.json`):

```json
{
  "mcpServers": {
    "fitdays": {
      "command": "npx",
      "args": ["-y", "fitdays-mcp-server"],
      "env": {
        "FITDAYS_EMAIL": "you@example.com",
        "FITDAYS_PASSWORD": "your-password"
      }
    }
  }
}
```

## Run from source

```sh
git clone https://github.com/roquerodrigo/fitdays-mcp-server.git
cd fitdays-mcp-server
npm install
npm run build
FITDAYS_EMAIL=… FITDAYS_PASSWORD=… npm start
```

## License

MIT
