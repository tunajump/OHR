/**
 * Calculates the distance between two points using the Haversine formula.
 * @param {number} lat1 Latitude of first point
 * @param {number} lon1 Longitude of first point
 * @param {number} lat2 Latitude of second point
 * @param {number} lon2 Longitude of second point
 * @param {string} unit Unit of distance ('miles' or 'km'), defaults to 'miles'
 * @returns {number} Distance between the two points
 */
function haversineDistance(lat1, lon1, lat2, lon2, unit = 'miles') {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return Infinity;
  }
  const toRad = (value) => (value * Math.PI) / 180;
  const R = unit === 'km' ? 6371 : 3958.8; // Earth's radius in km or miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { haversineDistance };
