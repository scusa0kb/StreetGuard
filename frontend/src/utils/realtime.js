/**
 * Cliente SSE simples para eventos de ocorrências em tempo real.
 * Espera mensagens no formato:
 *   data: {"type":"occurrence.created","data":{...ocorrencia...}}
 *
 * Retorna uma função unsubscribe() para encerrar a assinatura.
 */
export function subscribeOccurrencesSSE(url, { onEvent, onError } = {}) {
  if (typeof EventSource === "undefined") {
    onError?.(new Error("EventSource não suportado neste navegador"));
    return () => {};
  }

  const es = new EventSource(url, { withCredentials: false });

  es.onmessage = (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      onEvent?.(payload);
    } catch (e) {
      console.warn("SSE parse error:", e, ev.data);
    }
  };

  es.onerror = (err) => {
    console.warn("SSE error:", err);
    onError?.(err);
    // EventSource tenta reconectar automaticamente
  };

  return () => {
    try { es.close(); } catch {}
  };
}