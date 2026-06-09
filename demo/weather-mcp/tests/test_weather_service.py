import httpx
import pytest

from weather_mcp_demo.weather import (
    OpenMeteoClient,
    WeatherService,
    build_daily_rows,
    describe_weather_code,
    list_popular_locations,
)


FORECAST_PAYLOAD = {
    "latitude": 35.6895,
    "longitude": 139.6917,
    "timezone": "Asia/Tokyo",
    "current": {
        "time": "2026-06-08T12:00",
        "temperature_2m": 24.5,
        "apparent_temperature": 25.1,
        "relative_humidity_2m": 65,
        "precipitation": 0.0,
        "weather_code": 2,
        "wind_speed_10m": 10.2,
    },
    "daily": {
        "time": ["2026-06-08", "2026-06-09"],
        "weather_code": [2, 61],
        "temperature_2m_max": [27.0, 22.0],
        "temperature_2m_min": [20.0, 18.0],
        "precipitation_probability_max": [20, 80],
        "wind_speed_10m_max": [18.0, 21.0],
    },
}


def test_describes_common_weather_codes():
    assert describe_weather_code(0) == "Clear sky"
    assert describe_weather_code(61) == "Rain: slight"
    assert describe_weather_code(999) == "Unknown"


def test_popular_locations_include_engineering_demo_cities():
    locations = list_popular_locations()

    keys = {location["key"] for location in locations}
    assert {"tokyo", "san_francisco", "london"}.issubset(keys)


def test_daily_rows_include_human_readable_conditions():
    rows = build_daily_rows(FORECAST_PAYLOAD)

    assert rows == [
        {
            "date": "2026-06-08",
            "condition": "Partly cloudy",
            "high_c": 27.0,
            "low_c": 20.0,
            "precipitation_probability": 20,
            "wind_speed_kmh": 18.0,
        },
        {
            "date": "2026-06-09",
            "condition": "Rain: slight",
            "high_c": 22.0,
            "low_c": 18.0,
            "precipitation_probability": 80,
            "wind_speed_kmh": 21.0,
        },
    ]


@pytest.mark.asyncio
async def test_weather_service_fetches_forecast_with_open_meteo_params():
    seen_request = None

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_request
        seen_request = request
        return httpx.Response(200, json=FORECAST_PAYLOAD)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    service = WeatherService(OpenMeteoClient(client=client))

    forecast = await service.get_forecast("tokyo", days=2)

    assert forecast["location"]["name"] == "Tokyo"
    assert forecast["decision"] == "Carry an umbrella tomorrow."
    assert forecast["daily"][1]["condition"] == "Rain: slight"
    assert seen_request is not None
    params = dict(seen_request.url.params)
    assert params["latitude"] == "35.6762"
    assert params["longitude"] == "139.6503"
    assert params["forecast_days"] == "2"
    await client.aclose()
