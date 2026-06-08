from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search"


POPULAR_LOCATIONS: list[dict[str, Any]] = [
    {
        "key": "tokyo",
        "name": "Tokyo",
        "country": "Japan",
        "latitude": 35.6762,
        "longitude": 139.6503,
        "timezone": "Asia/Tokyo",
    },
    {
        "key": "san_francisco",
        "name": "San Francisco",
        "country": "United States",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "timezone": "America/Los_Angeles",
    },
    {
        "key": "new_york",
        "name": "New York",
        "country": "United States",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "timezone": "America/New_York",
    },
    {
        "key": "london",
        "name": "London",
        "country": "United Kingdom",
        "latitude": 51.5072,
        "longitude": -0.1276,
        "timezone": "Europe/London",
    },
    {
        "key": "berlin",
        "name": "Berlin",
        "country": "Germany",
        "latitude": 52.5200,
        "longitude": 13.4050,
        "timezone": "Europe/Berlin",
    },
    {
        "key": "singapore",
        "name": "Singapore",
        "country": "Singapore",
        "latitude": 1.3521,
        "longitude": 103.8198,
        "timezone": "Asia/Singapore",
    },
]


WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Drizzle: light",
    53: "Drizzle: moderate",
    55: "Drizzle: dense",
    56: "Freezing drizzle: light",
    57: "Freezing drizzle: dense",
    61: "Rain: slight",
    63: "Rain: moderate",
    65: "Rain: heavy",
    66: "Freezing rain: light",
    67: "Freezing rain: heavy",
    71: "Snow fall: slight",
    73: "Snow fall: moderate",
    75: "Snow fall: heavy",
    77: "Snow grains",
    80: "Rain showers: slight",
    81: "Rain showers: moderate",
    82: "Rain showers: violent",
    85: "Snow showers: slight",
    86: "Snow showers: heavy",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def describe_weather_code(code: int | None) -> str:
    if code is None:
        return "Unknown"
    return WEATHER_CODES.get(int(code), "Unknown")


def list_popular_locations() -> list[dict[str, Any]]:
    return [
        {
            "key": location["key"],
            "name": location["name"],
            "country": location["country"],
            "timezone": location["timezone"],
        }
        for location in POPULAR_LOCATIONS
    ]


def _normalize(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def _find_popular_location(location: str) -> dict[str, Any] | None:
    normalized = _normalize(location)
    for candidate in POPULAR_LOCATIONS:
        aliases = {
            _normalize(candidate["key"]),
            _normalize(candidate["name"]),
            _normalize(f"{candidate['name']}, {candidate['country']}"),
        }
        if normalized in aliases:
            return dict(candidate)
    return None


def build_daily_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    daily = payload["daily"]
    rows = []
    for index, date in enumerate(daily["time"]):
        rows.append(
            {
                "date": date,
                "condition": describe_weather_code(daily["weather_code"][index]),
                "high_c": daily["temperature_2m_max"][index],
                "low_c": daily["temperature_2m_min"][index],
                "precipitation_probability": daily["precipitation_probability_max"][index],
                "wind_speed_kmh": daily["wind_speed_10m_max"][index],
            }
        )
    return rows


def _decision_from_daily(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "No forecast rows were returned."
    tomorrow = rows[1] if len(rows) > 1 else rows[0]
    precipitation = tomorrow["precipitation_probability"] or 0
    wind = tomorrow["wind_speed_kmh"] or 0
    high = tomorrow["high_c"] or 0
    if precipitation >= 70:
        return "Carry an umbrella tomorrow."
    if wind >= 35:
        return "Expect strong wind; check outdoor plans."
    if high >= 32:
        return "Plan for heat and hydration."
    return "Good weather for going outside."


@dataclass
class OpenMeteoClient:
    client: httpx.AsyncClient | None = None

    async def geocode(self, query: str, count: int = 5) -> list[dict[str, Any]]:
        async with self._client_context() as client:
            response = await client.get(
                GEOCODING_API_URL,
                params={"name": query, "count": count, "language": "en", "format": "json"},
            )
            response.raise_for_status()
            payload = response.json()
        return [
            {
                "key": _normalize(f"{item['name']}_{item.get('country_code', '')}"),
                "name": item["name"],
                "country": item.get("country", ""),
                "latitude": item["latitude"],
                "longitude": item["longitude"],
                "timezone": item.get("timezone", "auto"),
            }
            for item in payload.get("results", [])
        ]

    async def forecast(self, location: dict[str, Any], days: int) -> dict[str, Any]:
        async with self._client_context() as client:
            response = await client.get(FORECAST_API_URL, params=_forecast_params(location, days))
            response.raise_for_status()
            return response.json()

    def _client_context(self):
        if self.client is not None:
            return _ExistingClientContext(self.client)
        return httpx.AsyncClient(timeout=10.0)


class _ExistingClientContext:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client

    async def __aenter__(self) -> httpx.AsyncClient:
        return self.client

    async def __aexit__(self, exc_type, exc, traceback) -> None:
        return None


def _forecast_params(location: dict[str, Any], days: int) -> dict[str, Any]:
    safe_days = max(1, min(days, 7))
    return {
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "timezone": location.get("timezone", "auto"),
        "forecast_days": safe_days,
        "current": ",".join(
            [
                "temperature_2m",
                "apparent_temperature",
                "relative_humidity_2m",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
            ]
        ),
        "daily": ",".join(
            [
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_probability_max",
                "wind_speed_10m_max",
            ]
        ),
    }


@dataclass
class WeatherService:
    api: OpenMeteoClient

    def list_locations(self) -> list[dict[str, Any]]:
        return list_popular_locations()

    async def search_locations(self, query: str, count: int = 5) -> list[dict[str, Any]]:
        popular = _find_popular_location(query)
        if popular is not None:
            return [
                {
                    "key": popular["key"],
                    "name": popular["name"],
                    "country": popular["country"],
                    "timezone": popular["timezone"],
                }
            ]
        results = await self.api.geocode(query, count=count)
        return [
            {
                "key": result["key"],
                "name": result["name"],
                "country": result["country"],
                "timezone": result["timezone"],
            }
            for result in results
        ]

    async def get_forecast(self, location: str, days: int = 5) -> dict[str, Any]:
        resolved = await self._resolve_location(location)
        payload = await self.api.forecast(resolved, days=days)
        current = payload["current"]
        daily = build_daily_rows(payload)
        return {
            "location": {
                "key": resolved["key"],
                "name": resolved["name"],
                "country": resolved["country"],
                "timezone": payload.get("timezone", resolved.get("timezone", "auto")),
            },
            "current": {
                "time": current.get("time"),
                "temperature_c": current.get("temperature_2m"),
                "apparent_temperature_c": current.get("apparent_temperature"),
                "humidity": current.get("relative_humidity_2m"),
                "precipitation_mm": current.get("precipitation"),
                "condition": describe_weather_code(current.get("weather_code")),
                "wind_speed_kmh": current.get("wind_speed_10m"),
            },
            "daily": daily,
            "decision": _decision_from_daily(daily),
        }

    async def _resolve_location(self, location: str) -> dict[str, Any]:
        popular = _find_popular_location(location)
        if popular is not None:
            return popular

        matches = await self.api.geocode(location, count=1)
        if not matches:
            raise ValueError(f"No matching location found for {location!r}")
        return matches[0]


def create_weather_service() -> WeatherService:
    return WeatherService(OpenMeteoClient())
