import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Botão “Ir para minha posição” como um Leaflet Control.
 * - Deve ser renderizado DENTRO do <MapContainer>.
 * - Fica desabilitado enquanto não houver userPos.
 */
export default function LocateMeButton({ userPos, position = "bottomright" }) {
  const map = useMap();
  const controlRef = useRef(null);
  const btnRef = useRef(null);
  const userPosRef = useRef(userPos);

  // Mantém a posição do usuário atualizada para o handler do botão
  useEffect(() => {
    userPosRef.current = userPos;
    if (btnRef.current) {
      btnRef.current.disabled = !userPos;
      btnRef.current.title = userPos ? "Ir para minha posição" : "Aguardando localização…";
      btnRef.current.setAttribute("aria-disabled", !userPos ? "true" : "false");
    }
  }, [userPos]);

  // Cria o controle Leaflet uma única vez
  useEffect(() => {
    const container = L.DomUtil.create("div", "leaflet-control-locate");
    const btn = L.DomUtil.create("button", "locate-btn", container);
    btn.type = "button";
    btn.innerHTML = "📍";
    btn.title = userPos ? "Ir para minha posição" : "Aguardando localização…";
    btn.disabled = !userPos;
    btn.setAttribute("aria-label", "Ir para minha posição");

    // Evita que o clique arraste/zoom o mapa
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.on(btn, "click", () => {
      const pos = userPosRef.current;
      if (!pos) return;
      map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 16), { duration: 0.8 });
    });

    const ctrl = L.control({ position });
    ctrl.onAdd = () => container;
    ctrl.addTo(map);

    controlRef.current = ctrl;
    btnRef.current = btn;

    return () => {
      if (controlRef.current) {
        controlRef.current.remove();
        controlRef.current = null;
      }
      btnRef.current = null;
    };
  }, [map, position]);

  // Este componente não renderiza nada no React DOM; o botão é inserido via Leaflet Control
  return null;
}