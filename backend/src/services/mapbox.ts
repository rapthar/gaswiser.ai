/**
 * Mapbox Directions + Geocoding helpers.
 * Falls back gracefully when MAPBOX_TOKEN is not set (uses straight-line distance).
 */
import type { Waypoint } from '../lib/types.js';

const BASE = 'https://api.mapbox.com';

function token() {
  return process.env.MAPBOX_TOKEN ?? '';
}

export interface DirectionsResult {
  distance_meters: number;
  distance_miles: number;
  duration_seconds: number;
  polyline: string;
  waypoints: Array<{ lat: number; lng: number }>;
}

export async function getDirections(waypoints: Waypoint[]): Promise<DirectionsResult | null> {
  if (!token() || waypoints.length < 2) return null;

  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
  const url = `${BASE}/directions/v5/mapbox/driving/${coords}?geometries=polyline&overview=full&access_token=${token()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes: Array<{
        distance: number;
        duration: number;
        geometry: string;
        legs: Array<{ steps: Array<{ maneuver: { location: [number, number] } }> }>;
      }>;
    };

    const route = data.routes[0];
    if (!route) return null;

    return {
      distance_meters: route.distance,
      distance_miles: Math.round((route.distance / 1609.34) * 10) / 10,
      duration_seconds: route.duration,
      polyline: route.geometry,
      waypoints: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
    };
  } catch {
    return null;
  }
}

export async function geocode(address: string): Promise<{ lat: number; lng: number; place_name: string } | null> {
  if (!token()) return null;

  const encoded = encodeURIComponent(address);
  const url = `${BASE}/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token()}&limit=1&country=us,ca`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features: Array<{
        center: [number, number];
        place_name: string;
      }>;
    };

    const f = data.features[0];
    if (!f) return null;
    return { lat: f.center[1], lng: f.center[0], place_name: f.place_name };
  } catch {
    return null;
  }
}

/** Haversine distance in miles between two lat/lng points */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
