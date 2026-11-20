export interface FigmaRef { key: string; name: string }

export function parseFigma(input: string): FigmaRef | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try { url = new URL(/^https?:/i.test(raw) ? raw : 'https://' + raw); } catch { return null; }
  if (!/(^|\.)figma\.com$/i.test(url.hostname)) return null;
  const m = url.pathname.match(/^\/(?:file|design|proto|board|slides|make)\/([^/]+)(?:\/([^/?#]+))?/i);
  if (!m) return null;
  let name = m[2] ? decodeURIComponent(m[2]).replace(/[-_+]+/g, ' ').trim() : '';
  if (!name) name = 'Figma file ' + m[1].slice(0, 4);
  return { key: m[1], name: name.charAt(0).toUpperCase() + name.slice(1) };
}

/** TODO real data: GET https://api.figma.com/v1/files/:key with a token, then read fonts/colours/spacing. */
export async function loadFigmaFile(key: string): Promise<{ key: string }> {
  return { key };
}