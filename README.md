# fitdays-mcp-server

[![npm](https://img.shields.io/npm/v/fitdays-mcp-server)](https://www.npmjs.com/package/fitdays-mcp-server)

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=githubsponsors&logoColor=white&style=for-the-badge)](https://github.com/sponsors/roquerodrigo)

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
| `get_weight_history` | Body-composition / weight measurements. Filters: `suid`, `since`, `until`, `limit`, `include_deleted` (default `true` — the FitDays mobile app marks edited records `is_deleted: 1` rather than removing them server-side), `include_ext_data` (default `false` — adds the FitDays reference ranges, targets and body-type classification to each record). |
| `get_latest_weight` | Most recent weight measurement (filter by `suid`; `include_deleted` defaults to `false`; `include_ext_data` defaults to `true`). |
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

## Run with Docker

A multi-arch image (`linux/amd64`, `linux/arm64`) is published to GitHub
Container Registry on every release, tagged with the release version
(`1.2.0`, `1.2`, `1`) and `latest`:

```sh
docker run -d --name fitdays-mcp \
  -e FITDAYS_EMAIL=you@example.com \
  -e FITDAYS_PASSWORD=your-password \
  -p 8000:8000 \
  ghcr.io/roquerodrigo/fitdays-mcp-server:latest
```

The container serves the server over
[Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http)
at `http://localhost:8000/mcp`, with a health endpoint at `/healthz`, so
remote MCP clients can connect to it directly:

```json
{
  "mcpServers": {
    "fitdays": {
      "type": "http",
      "url": "http://localhost:8000/mcp"
    }
  }
}
```

Credentials are read only from the environment; nothing is baked into the
image. To use the stdio transport instead, run the server binary as the
container command:

```json
{
  "mcpServers": {
    "fitdays": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "FITDAYS_EMAIL", "-e", "FITDAYS_PASSWORD",
        "ghcr.io/roquerodrigo/fitdays-mcp-server:latest",
        "fitdays-mcp-server"
      ],
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

## Support

This MCP server is built and maintained on personal time, on hardware bought for the purpose. If it is useful to you, consider [sponsoring the work](https://github.com/sponsors/roquerodrigo) — it keeps the devices, the testing and the releases coming.

## License

MIT
