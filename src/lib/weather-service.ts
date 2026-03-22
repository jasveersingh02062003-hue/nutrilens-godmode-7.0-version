// ============================================
// NutriLens AI – Weather & Context Service
// ============================================
// Uses OpenWeatherMap API with browser geolocation.
// Falls back to simulated weather if API/location unavailable.

const WEATHER_CACHE_KEY = 'nutrilens_weather_cache';
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
const OWM_API_KEY = '708b0cc287416ed807b6fb5f7d4f3a66';

export interface WeatherData {
  temperature: number;       // °C
  feelsLike: number;         // °C
  humidity: number;          // %
  description: string;       // e.g. "clear", "rain", "cloudy"
  icon: string;              // emoji
  city: string;
  season: 'summer' | 'monsoon' | 'winter' | 'autumn' | 'spring';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  fetchedAt: number;
  isLive: boolean;           // true if from API, false if simulated
}

function getCurrentSeason(): WeatherData['season'] {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'summer';
  if (month >= 5 && month <= 8) return 'monsoon';
  if (month >= 9 && month <= 10) return 'autumn';
  return 'winter';
}

function getTimeOfDay(): WeatherData['timeOfDay'] {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function mapOWMIcon(code: string): string {
  const map: Record<string, string> = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️',
  };
  return map[code] || '🌤️';
}

function getUserLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: CACHE_TTL_MS }
    );
  });
}

async function fetchFromAPI(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`
    );
    if (!res.ok) return null;
    const d = await res.json();
    return {
      temperature: Math.round(d.main.temp),
      feelsLike: Math.round(d.main.feels_like),
      humidity: Math.round(d.main.humidity),
      description: d.weather?.[0]?.description || 'clear',
      icon: mapOWMIcon(d.weather?.[0]?.icon || '01d'),
      city: d.name || 'Your City',
      season: getCurrentSeason(),
      timeOfDay: getTimeOfDay(),
      fetchedAt: Date.now(),
      isLive: true,
    };
  } catch {
    return null;
  }
}

function simulateWeather(): WeatherData {
  const season = getCurrentSeason();
  const timeOfDay = getTimeOfDay();
  const baseTempMap: Record<string, { min: number; max: number; humidity: number }> = {
    summer:  { min: 30, max: 44, humidity: 25 },
    monsoon: { min: 25, max: 34, humidity: 80 },
    winter:  { min: 8, max: 22, humidity: 50 },
    autumn:  { min: 20, max: 32, humidity: 55 },
    spring:  { min: 22, max: 36, humidity: 40 },
  };
  const base = baseTempMap[season];
  const timeAdj = timeOfDay === 'morning' ? -3 : timeOfDay === 'afternoon' ? 2 : timeOfDay === 'evening' ? -1 : -5;
  const daySeed = new Date().getDate();
  const rand = ((daySeed * 7 + 13) % 10) / 10;
  const temperature = Math.round(base.min + (base.max - base.min) * rand + timeAdj);
  const feelsLike = Math.round(temperature + (base.humidity > 60 ? 3 : -1));
  const humidity = Math.round(base.humidity + (rand * 20 - 10));
  const descriptions: Record<string, { text: string; icon: string }[]> = {
    summer:  [{ text: 'clear sky', icon: '☀️' }, { text: 'hot and dry', icon: '🔥' }, { text: 'sunny', icon: '☀️' }],
    monsoon: [{ text: 'light rain', icon: '🌧️' }, { text: 'heavy rain', icon: '⛈️' }, { text: 'cloudy', icon: '☁️' }, { text: 'humid', icon: '💧' }],
    winter:  [{ text: 'foggy', icon: '🌫️' }, { text: 'cold', icon: '❄️' }, { text: 'clear', icon: '🌤️' }],
    autumn:  [{ text: 'pleasant', icon: '🍂' }, { text: 'partly cloudy', icon: '⛅' }],
    spring:  [{ text: 'warm', icon: '🌸' }, { text: 'clear', icon: '☀️' }],
  };
  const descOptions = descriptions[season];
  const desc = descOptions[daySeed % descOptions.length];
  return {
    temperature, feelsLike, humidity,
    description: desc.text, icon: desc.icon,
    city: 'Your City', season, timeOfDay,
    fetchedAt: Date.now(), isLive: false,
  };
}

// Synchronous getter – returns cached or simulated data immediately
export function getWeather(): WeatherData {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const data: WeatherData = JSON.parse(cached);
      if (Date.now() - data.fetchedAt < CACHE_TTL_MS) {
        data.timeOfDay = getTimeOfDay();
        return data;
      }
    }
  } catch {}
  const weather = simulateWeather();
  try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather)); } catch {}
  return weather;
}

// Async getter – tries real API first, caches result
export async function fetchLiveWeather(): Promise<WeatherData> {
  // Check cache
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cached) {
      const data: WeatherData = JSON.parse(cached);
      if (Date.now() - data.fetchedAt < CACHE_TTL_MS && data.isLive) {
        data.timeOfDay = getTimeOfDay();
        return data;
      }
    }
  } catch {}

  // Try geolocation + API
  const coords = await getUserLocation();
  if (coords) {
    const live = await fetchFromAPI(coords.lat, coords.lon);
    if (live) {
      try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(live)); } catch {}
      return live;
    }
  }

  // Fallback to simulation
  const simulated = simulateWeather();
  try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(simulated)); } catch {}
  return simulated;
}

export function getWeatherSummary(): string {
  const w = getWeather();
  return `${w.icon} ${w.temperature}°C, ${w.description} (feels like ${w.feelsLike}°C, ${w.humidity}% humidity)`;
}
