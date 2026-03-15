/**
 * Randomize coordinates within a given radius (in meters) for privacy.
 * Uses random bearing + random distance to produce a uniform distribution.
 */
export function randomizeCoordinates(
  lat: number,
  lng: number,
  maxOffsetMeters: number = 50
): { lat: number; lng: number } {
  const earthRadius = 6371000; // meters

  // Random distance (0 to maxOffset) and bearing (0 to 2π)
  const distance = Math.random() * maxOffsetMeters;
  const bearing = Math.random() * 2 * Math.PI;

  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDistance = distance / earthRadius;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}
