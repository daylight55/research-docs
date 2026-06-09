from __future__ import annotations

from typing import Protocol

from fastmcp import FastMCP
from fastmcp.tools import ToolResult
from prefab_ui.app import PrefabApp
from prefab_ui.components import (
    Badge,
    Column,
    DataTable,
    DataTableColumn,
    Heading,
    Metric,
    Row,
    Separator,
    Text,
)

from weather_mcp_demo.weather import WeatherService, create_weather_service


class WeatherServiceLike(Protocol):
    def list_locations(self) -> list[dict]:
        ...

    async def search_locations(self, query: str, count: int = 5) -> list[dict]:
        ...

    async def get_forecast(self, location: str, days: int = 5) -> dict:
        ...


def create_mcp(service: WeatherServiceLike | None = None) -> FastMCP:
    weather_service = service or create_weather_service()
    mcp = FastMCP(
        "Weather MCP Apps Demo",
        instructions=(
            "Use list_weather_locations or search_weather_locations first when the user "
            "wants to choose a place. Use get_weather_forecast for text/JSON answers, "
            "and show_weather_explorer when the host supports MCP Apps UI."
        ),
    )

    @mcp.tool
    def list_weather_locations() -> list[dict]:
        """List built-in weather demo locations that require no geocoding call."""
        return weather_service.list_locations()

    @mcp.tool
    async def search_weather_locations(query: str, count: int = 5) -> list[dict]:
        """Search locations through the Open-Meteo Geocoding API."""
        return await weather_service.search_locations(query=query, count=count)

    @mcp.tool
    async def get_weather_forecast(location: str, days: int = 5) -> dict:
        """Fetch an Open-Meteo forecast for a location key or city name."""
        return await weather_service.get_forecast(location=location, days=days)

    @mcp.tool(app=True)
    async def show_weather_explorer(location: str = "tokyo", days: int = 5) -> ToolResult:
        """Render an interactive weather forecast table for MCP Apps hosts."""
        forecast = await weather_service.get_forecast(location=location, days=days)
        app = _build_weather_app(forecast)
        return ToolResult(
            content=(
                f"Rendered weather explorer for {forecast['location']['name']}. "
                f"Decision: {forecast['decision']}"
            ),
            structured_content=app,
        )

    return mcp


def _build_weather_app(forecast: dict) -> PrefabApp:
    current = forecast["current"]
    location = forecast["location"]
    daily_rows = [_daily_row_for_table(row) for row in forecast["daily"]]

    with Column(gap=4, css_class="p-6") as view:
        Heading(f"{location['name']} Weather")
        Text(f"{location.get('country', '')} | {location.get('timezone', 'auto')}")
        Badge(forecast["decision"], variant=_decision_variant(forecast["decision"]))

        with Row(gap=4):
            Metric(label="Temperature", value=f"{current['temperature_c']} C")
            Metric(label="Feels Like", value=f"{current['apparent_temperature_c']} C")
            Metric(label="Humidity", value=f"{current['humidity']}%")
            Metric(label="Wind", value=f"{current['wind_speed_kmh']} km/h")

        Separator()
        DataTable(
            columns=[
                DataTableColumn(key="date", header="Date", sortable=True),
                DataTableColumn(key="condition", header="Condition"),
                DataTableColumn(key="high_low", header="High / Low"),
                DataTableColumn(key="rain", header="Rain", sortable=True),
                DataTableColumn(key="wind", header="Wind", sortable=True),
            ],
            rows=daily_rows,
            search=False,
            paginated=False,
        )

    return PrefabApp(title=f"{location['name']} Weather", view=view)


def _daily_row_for_table(row: dict) -> dict:
    rain = row["precipitation_probability"]
    return {
        "date": row["date"],
        "condition": Badge(row["condition"], variant=_condition_variant(rain)),
        "high_low": f"{row['high_c']} / {row['low_c']} C",
        "rain": f"{rain}%",
        "wind": f"{row['wind_speed_kmh']} km/h",
    }


def _condition_variant(precipitation_probability: int | float | None) -> str:
    if precipitation_probability is not None and precipitation_probability >= 70:
        return "warning"
    return "secondary"


def _decision_variant(decision: str) -> str:
    if "umbrella" in decision.lower() or "wind" in decision.lower():
        return "warning"
    if "heat" in decision.lower():
        return "destructive"
    return "success"


mcp = create_mcp()


if __name__ == "__main__":
    mcp.run()
