import L from "leaflet";



// Ícone do usuário (azul com aro branco)
export function userIcon(color = "#2563eb") {
  const size = 22;
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
    "></div>
  `;
  return L.divIcon({
    className: "divicon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Ícone por categoria (ponto colorido)
export function categoryIcon(color = "#0ea5e9") {
  const size = 16;
  const html = `
    <div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:2px solid #fff;
      box-shadow:0 1px 6px rgba(0,0,0,0.25);
    "></div>
  `;
  return L.divIcon({
    className: "divicon",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}