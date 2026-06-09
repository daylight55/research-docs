from fastmcp import Client

from weather_mcp_demo.server import create_mcp


class FakeWeatherService:
    def list_locations(self):
        return [{"key": "tokyo", "name": "Tokyo", "country": "Japan"}]

    async def search_locations(self, query: str, count: int = 5):
        return [{"key": "tokyo", "name": "Tokyo", "country": "Japan"}]

    async def get_forecast(self, location: str, days: int = 5):
        return {
            "location": {"key": "tokyo", "name": "Tokyo", "country": "Japan"},
            "current": {
                "temperature_c": 24.5,
                "apparent_temperature_c": 25.1,
                "humidity": 65,
                "precipitation_mm": 0.0,
                "condition": "Partly cloudy",
                "wind_speed_kmh": 10.2,
            },
            "daily": [
                {
                    "date": "2026-06-08",
                    "condition": "Partly cloudy",
                    "high_c": 27.0,
                    "low_c": 20.0,
                    "precipitation_probability": 20,
                    "wind_speed_kmh": 18.0,
                }
            ],
            "decision": "Good weather for going outside.",
        }


async def test_mcp_tools_are_listed_and_callable():
    mcp = create_mcp(FakeWeatherService())

    async with Client(mcp) as client:
        tools = await client.list_tools()
        tool_names = {tool.name for tool in tools}

        assert {
            "list_weather_locations",
            "search_weather_locations",
            "get_weather_forecast",
            "show_weather_explorer",
        }.issubset(tool_names)

        result = await client.call_tool("get_weather_forecast", {"location": "tokyo", "days": 1})
        assert result.data["location"]["name"] == "Tokyo"
        assert result.data["decision"] == "Good weather for going outside."


async def test_mcp_app_tool_returns_structured_content_for_host_rendering():
    mcp = create_mcp(FakeWeatherService())

    async with Client(mcp) as client:
        result = await client.call_tool("show_weather_explorer", {"location": "tokyo", "days": 1})

        assert result.structured_content is not None
        assert result.content[0].text.startswith("Rendered weather explorer")
