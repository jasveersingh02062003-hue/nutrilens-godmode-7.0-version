// Auto-location detection for Smart Market
// Uses browser geolocation + OpenWeatherMap reverse geocoding + IP fallback
// Falls back to profile city or "India" average

import { resolveCity, SUPPORTED_CITIES } from './market-service';

const OWM_API_KEY = '708b0cc287416ed807b6fb5f7d4f3a66';
const LOCATION_CACHE_KEY = 'nutrilens_auto_city';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLocation {
  city: string;
  resolvedCity: string;
  isAlias: boolean;
  detectedAt: number;
  lat?: number;
  lon?: number;
}

function getCachedLocation(): CachedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedLocation = JSON.parse(raw);
    if (Date.now() - cached.detectedAt < CACHE_TTL) return cached;
  } catch {}
  return null;
}

function cacheLocation(loc: CachedLocation) {
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc));
  } catch {}
}

/** Get user coordinates via browser geolocation */
function getCoords(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: CACHE_TTL }
    );
  });
}

/** Reverse geocode lat/lon to city name using OpenWeatherMap */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.name || null;
  } catch {
    return null;
  }
}

/** IP-based geolocation fallback using ipapi.co (free, no key needed) */
async function ipGeolocate(): Promise<string | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.city || null;
  } catch {
    return null;
  }
}

export interface AutoLocationResult {
  city: string;
  resolvedCity: string;
  isAlias: boolean;
  isAutoDetected: boolean;
  isLoading: boolean;
}

/**
 * Detect user's city automatically.
 * Resolution order:
 * 1. Check cache (24h TTL)
 * 2. Browser geolocation → OWM reverse geocode → resolveCity()
 * 3. IP geolocation fallback (ipapi.co)
 * 4. Fall back to profileCity or 'India'
 */
export async function detectCity(profileCity?: string): Promise<AutoLocationResult> {
  // If profile already has a city set, use it
  if (profileCity && profileCity.trim()) {
    const resolved = resolveCity(profileCity);
    return {
      city: profileCity,
      resolvedCity: resolved.resolved,
      isAlias: resolved.isAlias,
      isAutoDetected: false,
      isLoading: false,
    };
  }

  // Check cache
  const cached = getCachedLocation();
  if (cached) {
    return {
      city: cached.city,
      resolvedCity: cached.resolvedCity,
      isAlias: cached.isAlias,
      isAutoDetected: true,
      isLoading: false,
    };
  }

  // Try geolocation
  const coords = await getCoords();
  if (coords) {
    const rawCity = await reverseGeocode(coords.lat, coords.lon);
    if (rawCity) {
      const resolved = resolveCity(rawCity);
      const loc: CachedLocation = {
        city: rawCity,
        resolvedCity: resolved.resolved,
        isAlias: resolved.isAlias,
        detectedAt: Date.now(),
        lat: coords.lat,
        lon: coords.lon,
      };
      cacheLocation(loc);
      return {
        city: rawCity,
        resolvedCity: resolved.resolved,
        isAlias: resolved.isAlias,
        isAutoDetected: true,
        isLoading: false,
      };
    }
  }

  // Layer 2: IP-based geolocation fallback
  const ipCity = await ipGeolocate();
  if (ipCity) {
    const resolved = resolveCity(ipCity);
    const loc: CachedLocation = {
      city: ipCity,
      resolvedCity: resolved.resolved,
      isAlias: resolved.isAlias,
      detectedAt: Date.now(),
    };
    cacheLocation(loc);
    return {
      city: ipCity,
      resolvedCity: resolved.resolved,
      isAlias: resolved.isAlias,
      isAutoDetected: true,
      isLoading: false,
    };
  }

  // Fallback
  return {
    city: 'India',
    resolvedCity: 'India',
    isAlias: false,
    isAutoDetected: false,
    isLoading: false,
  };
}
