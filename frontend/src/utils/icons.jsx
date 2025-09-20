import L from "leaflet";

import L from "leaflet";

// Se você quiser usar o pin padrão do Leaflet para o usuário:
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Caso em algum lugar ainda tentem usar o Default, garanta que as URLs estejam corretas:
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Ícone do usuário (pin padrão do Leaflet)
export function userIcon() {
  return L.icon({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
  });
}

// Ícone de ocorrência como “bolinha” colorida (divIcon)
export function categoryIcon(color = "#3b82f6") {
  const size = 18;
  return L.divIcon({
    className: "occ-marker-dot",
    html: `<div class="occ-marker-dot-inner" style="--dot:${color}; width:${size}px; height:${size}px; border-radius:50%; box-shadow:0 0 0 2px #fff, 0 2px 8px rgba(0,0,0,0.25); background:${color};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -10],
  });
}

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