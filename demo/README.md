# Weather MCP Apps Demo

FastMCP demo server that exposes Open-Meteo weather tools and an MCP Apps UI.

The demo has two surfaces:

- Normal MCP tools for Codex App and other MCP clients.
- `show_weather_explorer`, an MCP Apps tool that returns a Prefab UI for hosts that support Apps rendering.

## Tools

- `list_weather_locations`: built-in locations that do not need geocoding.
- `search_weather_locations`: searches the Open-Meteo Geocoding API.
- `get_weather_forecast`: returns JSON forecast data and a short decision.
- `show_weather_explorer`: renders a weather dashboard/table through MCP Apps.

## Run tests

```bash
cd demo
uv run pytest
```

## Verify through MCP

The tests use FastMCP's in-memory `Client` so the MCP initialization, tool listing, and tool calls run through the MCP protocol stack.

Manual check:

```bash
cd demo
uv run python - <<'PY'
import asyncio
from fastmcp import Client
from weather_mcp_demo.server import mcp

async def main():
    async with Client(mcp) as client:
        print([tool.name for tool in await client.list_tools()])
        result = await client.call_tool("get_weather_forecast", {"location": "tokyo", "days": 3})
        print(result.data["decision"])

asyncio.run(main())
PY
```

## Preview the MCP Apps UI

```bash
cd demo
uv run fastmcp dev apps src/weather_mcp_demo/server.py:mcp
```

Open the dev UI at `http://localhost:8080`, choose `show_weather_explorer`, and launch it.

## Claude Desktop config

Claude Desktop reads local MCP server settings from `claude_desktop_config.json`.
Open Claude Desktop, then use the macOS menu bar:

1. `Claude` -> `Settings...`
2. `Developer`
3. `Edit Config`

On macOS, the file is:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

On Windows, the file is:

```text
%APPDATA%\Claude\claude_desktop_config.json
```

If the file already has an `mcpServers` object, add only the `weather-app-demo`
entry inside it. If the file is empty, use the full JSON below.

Use the absolute path for this checkout:

```json
{
  "mcpServers": {
    "weather-app-demo": {
      "command": "/Users/tanimura/.local/share/mise/installs/uv/latest/uv-aarch64-apple-darwin/uv",
      "args": [
        "--directory",
        "/Users/tanimura/.codex/worktrees/6450/research-docs/demo",
        "run",
        "python",
        "-m",
        "weather_mcp_demo.server"
      ]
    }
  }
}
```

After saving the file, completely quit and restart Claude Desktop. A successful
connection should show the MCP server indicator in the message composer. Use a
prompt like:

```text
Use weather-app-demo to show the Tokyo weather forecast.
```

Claude should be able to call:

- `list_weather_locations`
- `search_weather_locations`
- `get_weather_forecast`
- `show_weather_explorer`

`show_weather_explorer` is the MCP Apps UI entry point. If the host supports MCP
Apps rendering, it displays an inline weather table; otherwise, use
`get_weather_forecast` for a normal structured response.

### Claude Desktop troubleshooting

Run the server command manually first if Claude does not show the server:

```bash
/Users/tanimura/.local/share/mise/installs/uv/latest/uv-aarch64-apple-darwin/uv \
  --directory /Users/tanimura/.codex/worktrees/6450/research-docs/demo \
  run python -m weather_mcp_demo.server
```

The command should start a FastMCP server over stdio. Stop it with `Ctrl+C`.

Claude Desktop MCP logs are written under:

```text
~/Library/Logs/Claude
```

Useful log command:

```bash
tail -n 50 -f ~/Library/Logs/Claude/mcp*.log
```

Common issues:

- JSON syntax errors in `claude_desktop_config.json`.
- Relative paths in `command` or `args`; use absolute paths.
- Claude Desktop was not fully restarted after editing config.
- `uv` path changed; check with `which uv` and update `command`.

Open-Meteo does not require an API key for non-commercial use. See the Open-Meteo terms before using it commercially or at high volume.
