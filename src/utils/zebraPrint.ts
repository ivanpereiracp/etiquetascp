// Sends raw ZPL to a configurable HTTP print agent running on the internal
// Windows server. The agent is expected to accept a POST with the ZPL body
// and forward it to the named Zebra printer (e.g. via LPR / raw 9100).
//
// Request format:
//   POST {endpoint}?printer={printerName}
//   Content-Type: text/plain
//   Body: <ZPL>
//
// This is intentionally simple so it works with custom agents, PrintNode-style
// bridges, or a small Node/Python service the user already runs.

export interface PrintAgentConfig {
  endpoint: string;     // e.g. http://servidor-interno:9100/print
  printerName?: string; // optional printer name on the agent side
}

export async function sendZPLToAgent(zpl: string, cfg: PrintAgentConfig): Promise<void> {
  if (!cfg.endpoint) throw new Error('Endpoint da impressora Zebra não configurado.');
  const url = cfg.printerName
    ? `${cfg.endpoint}${cfg.endpoint.includes('?') ? '&' : '?'}printer=${encodeURIComponent(cfg.printerName)}`
    : cfg.endpoint;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    body: zpl,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha na impressão (HTTP ${res.status}): ${text || res.statusText}`);
  }
}

/**
 * Wraps a GRF (~DG) command into a complete printable ZPL block that draws
 * the image at the origin — the same way SAP sends graphics to a Zebra:
 *
 *   ^XA
 *   ~DGNAME,total,perRow,<hex...>
 *   ^FO0,0^XGNAME,1,1^FS
 *   ^XZ
 */
export function wrapGRFForPrint(grf: string, name: string, opts?: { x?: number; y?: number }): string {
  const x = opts?.x ?? 0;
  const y = opts?.y ?? 0;
  const safeName = name.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 8) || 'IMAGE';
  return `^XA\n${grf}\n^FO${x},${y}^XG${safeName},1,1^FS\n^XZ\n`;
}
