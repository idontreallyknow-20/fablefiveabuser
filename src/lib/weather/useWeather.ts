"use client";

import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/lib/settings/store";
import type { WeatherGate } from "@/lib/themes/registry";

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  code: number;
  label: string;
  kind: WeatherGate;
  isStorm: boolean;
  precipitation: number;
  snowfall: number;
  cloudCover: number;
  visibility: number;
  windKph: number;
  humidity: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: string;
  code: number;
  label: string;
  kind: WeatherGate;
  max: number;
  min: number;
  sunrise: string;
  sunset: string;
  precipProbability: number | null;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: { time: string; temperature: number; code: number; precipProbability: number | null }[];
  timezone: string;
  fetchedAt: string;
}

export function useWeather() {
  const location = useSettings((s) => s.settings.location);
  return useQuery<WeatherData>({
    queryKey: ["weather", location.lat, location.lon],
    queryFn: async () => {
      const res = await fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}`);
      if (!res.ok) throw new Error("Weather unavailable");
      return res.json();
    },
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: 2,
  });
}
