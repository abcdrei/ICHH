const map = L.map("map").setView([32.8, -97.0], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

/* ===== REGION POLYGONS (SIMPLIFIED SHAPES) ===== */

// Dallas–Plano–Irving (green)
const dallasRegion = L.polygon([
  [33.35, -96.35],
  [32.95, -96.20],
  [32.45, -96.60],
  [32.50, -97.00],
  [33.10, -97.10],
  [33.35, -96.70]
], {
  color: "#22c55e",
  fillColor: "#22c55e",
  fillOpacity: 0.35
}).addTo(map);

// Fort Worth–Arlington (blue)
const fortWorthRegion = L.polygon([
  [33.15, -97.45],
  [32.80, -97.30],
  [32.35, -97.55],
  [32.40, -97.95],
  [32.85, -98.05],
  [33.15, -97.75]
], {
  color: "#3b82f6",
  fillColor: "#3b82f6",
  fillOpacity: 0.35
}).addTo(map);

/* ===== MARKERS ===== */

const locations = [
  { name: "Dallas", coords: [32.7767, -96.7970] },
  { name: "Plano", coords: [33.0198, -96.6989] },
  { name: "Denton", coords: [33.2148, -97.1331] },
  { name: "McKinney", coords: [33.1972, -96.6398] },
  { name: "Fort Worth", coords: [32.7555, -97.3308] },
  { name: "Arlington", coords: [32.7357, -97.1081] }
];

locations.forEach(loc => {
  L.marker(loc.coords)
    .addTo(map)
    .bindPopup(`<strong>${loc.name}</strong>`);
});

/* ===== LEGEND ===== */

const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");
  div.innerHTML = `
    <div><span style="background:#22c55e"></span> Dallas–Plano–Irving</div>
    <div><span style="background:#3b82f6"></span> Fort Worth–Arlington</div>
  `;
  return div;
};

legend.addTo(map);
