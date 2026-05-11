/**
 * Service to fetch building footprint polygons and heights from OpenStreetMap
 * using the Overpass API.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export const osmService = {
  /**
   * Fetch buildings within a lat/lon bounding box
   * bbox: [minLat, minLon, maxLat, maxLon]
   */
  async fetchBuildings(bbox) {
    const query = `
      [out:json][timeout:25];
      (
        way["building"](${bbox.join(',')});
        relation["building"](${bbox.join(',')});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'data=' + encodeURIComponent(query),
      });

      if (!response.ok) {
        throw new Error('Overpass API returned ' + response.status);
      }

      const data = await response.json();
      return parseOSMData(data, bbox);
    } catch (err) {
      console.error('OSM fetch err:', err);
      throw err;
    }
  }
};

/**
 * Converts raw OSM nodes and ways into an array of building polygons
 * normalized around a central 0,0 point for Three.js rendering.
 */
function parseOSMData(data, bbox) {
  const nodes = new Map();
  const buildings = [];

  // Center of the bounding box to offset all coordinates to local 0,0
  const centerLat = (bbox[0] + bbox[2]) / 2;
  const centerLon = (bbox[1] + bbox[3]) / 2;
  
  // Rough meters per degree approximations
  const mPerDegLat = 111132;
  const mPerDegLon = 111132 * Math.cos(centerLat * (Math.PI / 180));

  data.elements.forEach(el => {
    if (el.type === 'node') {
      nodes.set(el.id, {
        x: (el.lon - centerLon) * mPerDegLon,
        y: (el.lat - centerLat) * mPerDegLat
      });
    }
  });

  data.elements.forEach(el => {
    // Both ways and relations with building tag
    if ((el.type === 'way' || el.type === 'relation') && el.tags && el.tags.building) {
      if (el.type === 'way' && el.nodes) {
        const polygon = [];
        for (const nodeId of el.nodes) {
          if (nodes.has(nodeId)) {
            polygon.push(nodes.get(nodeId));
          }
        }
        
        // Estimate height: if height is explicitly specified, use it
        // Otherwise use building:levels * 3 meters, fallback to 15 meters
        let heightMeters = 15;
        if (el.tags.height) {
          const parsed = parseFloat(el.tags.height);
          if (!isNaN(parsed)) heightMeters = parsed;
        } else if (el.tags['building:levels']) {
          const parsed = parseFloat(el.tags['building:levels']);
          if (!isNaN(parsed)) heightMeters = parsed * 3;
        }
        
        // Generate an ID and Name
        const name = el.tags.name || `Building ${el.id}`;
        
        if (polygon.length >= 3) {
          buildings.push({
            id: el.id,
            name,
            polygon,
            height: heightMeters
          });
        }
      }
    }
  });

  return buildings;
}
