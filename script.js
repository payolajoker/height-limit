const mapContainer = document.getElementById('map');
const mapOption = {
    center: new kakao.maps.LatLng(37.5665, 126.9780), // Seoul City Hall
    level: 7 // Zoom level
};

const map = new kakao.maps.Map(mapContainer, mapOption);
let polygons = [];

// V-World API Configuration
const VWORLD_API_KEY = "9036E358-E38F-3C6F-9537-B03786AA1172"; // User provided key
const VWORLD_DOMAIN = "payolajoker.github.io"; // Must match registered domain for the key

const WFS_URL = "https://api.vworld.kr/req/wfs";
const LAYER_NAME = "lt_c_aisprhc"; // Prohibited Area (Testing replacement due to missing Flight Safety Zone)

document.getElementById('toggle-zones').addEventListener('change', (e) => {
    if (e.target.checked) {
        loadData();
    } else {
        clearPolygons();
    }
});

function clearPolygons() {
    polygons.forEach(p => p.setMap(null));
    polygons = [];
    document.getElementById('status').innerText = "Cleared";
}

async function loadData() {
    if (VWORLD_API_KEY === "YOUR_VWORLD_API_KEY") {
        document.getElementById('status').innerText = "Error: Missing V-World API Key";
        console.error("Please set VWORLD_API_KEY in script.js");
        return;
    }

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Construct BBOX (minx, miny, maxx, maxy) in EPSG:4326 order
    // V-World WFS 1.1.0 and 2.0.0 might swap axis depending on version and SRS.
    // EPSG:4326 usually is Lat,Lon order but in WFS 1.1 with URN it's often confusing.
    // Let's try standard Lon,Lat order first as most specific APIs accept. Or check docs.
    // V-World bbox is typically minX, minY, maxX, maxY (Lon, Lat).
    // V-World WFS 1.1.0 requires Lat,Lon (Y,X) order for EPSG:4326
    const bbox = `${sw.getLat()},${sw.getLng()},${ne.getLat()},${ne.getLng()},EPSG:4326`;

    const params = new URLSearchParams({
        SERVICE: "WFS",
        REQUEST: "GetFeature",
        TYPENAME: LAYER_NAME,
        BBOX: bbox,
        VERSION: "1.1.0",
        MAXFEATURES: "100",
        SRSNAME: "EPSG:4326",
        OUTPUT: "application/json",
        KEY: VWORLD_API_KEY,
        DOMAIN: VWORLD_DOMAIN
    });

    const url = `${WFS_URL}?${params.toString()}`;
    console.log("Fetching:", url);
    document.getElementById('status').innerText = "Loading data...";

    try {
        // Use a proxy or CORS workaround if needed.
        // V-World supports CORS if domain matches the key's registered domain.
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const geoJson = await response.json();
        console.log("Data received:", geoJson);

        if (geoJson.features && geoJson.features.length > 0) {
            console.log("Feature Example:", geoJson.features[0]);
            renderPolygons(geoJson.features);
            document.getElementById('status').innerText = `Loaded ${geoJson.features.length} zones`;
        } else {
            document.getElementById('status').innerText = "No data found";
        }

    } catch (e) {
        console.error("Fetch error:", e);
        document.getElementById('status').innerText = "Error loading data (Check console)";
    }
}

function renderPolygons(features) {
    clearPolygons();

    features.forEach(feature => {
        const props = feature.properties;
        // Try to identify zone number from properties
        // Prohibited Area (lt_c_aisprhc) usually doesn't have "Zone 1-6".
        // Just render everything in RED for now to verify it works.
        zoneColor = '#FF0000';
        zoneName = props.lbl || props.nam || "Prohibited Area";

        const geometry = feature.geometry;
        if (geometry.type === "Polygon") {
            drawPolygon(geometry.coordinates, zoneColor, props, zoneName);
        } else if (geometry.type === "MultiPolygon") {
            geometry.coordinates.forEach(coords => drawPolygon(coords, zoneColor, props, zoneName));
        }
    });

    function drawPolygon(coordinates, color, properties, name) {
        const path = [];
        // Handle outer ring
        const outerRing = coordinates[0].map(coord => new kakao.maps.LatLng(coord[1], coord[0]));
        path.push(outerRing);

        // Handle inner rings (holes)
        for (let i = 1; i < coordinates.length; i++) {
            const innerRing = coordinates[i].map(coord => new kakao.maps.LatLng(coord[1], coord[0]));
            path.push(innerRing);
        }

        const polygon = new kakao.maps.Polygon({
            map: map,
            path: path.length === 1 ? path[0] : path,
            strokeWeight: 2,
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeStyle: 'solid',
            fillColor: color,
            fillOpacity: 0.3
        });

        polygons.push(polygon);

        // Click event for metadata and height restriction
        kakao.maps.event.addListener(polygon, 'click', function (mouseEvent) {
            // Create a table of all properties for inspection
            let contentHtml = `<div style="padding:10px; min-width:200px;"><h4>${name}</h4>`;
            contentHtml += `<table style="font-size:12px; border-collapse: collapse; width:100%;">`;

            for (const [key, value] of Object.entries(properties)) {
                contentHtml += `<tr style="border-bottom:1px solid #eee;">
                    <td style="font-weight:bold; padding:2px;">${key}</td>
                    <td style="padding:2px;">${value}</td>
                 </tr>`;
            }
            contentHtml += `</table></div>`;

            const infowindow = new kakao.maps.InfoWindow({
                position: mouseEvent.latLng,
                content: contentHtml,
                removable: true
            });
            infowindow.open(map);
        });
    }
}

// Initial load attempt
loadData(); 
