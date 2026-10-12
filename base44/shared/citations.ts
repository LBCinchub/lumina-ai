// Boundary repair for web-grounded replies. The grounded model emits numeric
// grounding markers like "[1]" or "[4, 6]", but InvokeLLM returns only the
// text, so those markers usually reference nothing the user can see.
//
// Rules (narrow by design):
// - Only marker-shaped tokens are touched: "[n]" / "[n, m]" NOT followed by
//   "(" (a markdown link) or ":" (a reference definition) and not preceded
//   by "]" or "!" / a word char (array index like a[1], links, images).
// - Code fences and inline code are never modified.
// - If the reply carries resolvable reference definitions ("[1]: url" or a
//   "[1] Title - url" source line), markers become readable named links.
//   Otherwise unresolved markers are removed (they had no destination).
// - Every other digit, bracket and character is preserved exactly.

const MARKER = /( ?)(?<![\w\[\]!\\])\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\](?![(:\w\]])/g;
const DEF_LINE = /^\s*\[(\d{1,3})\]:?\s+(?:(.+?)\s+[-–:]\s+)?<?(https?:\/\/[^\s>]+)>?\s*$/;

function splitCode(text: string): { code: boolean; s: string }[] {
  const parts: { code: boolean; s: string }[] = [];
  const re = /```[\s\S]*?(?:```|$)|`[^`\n]+`/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ code: false, s: text.slice(last, m.index) });
    parts.push({ code: true, s: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ code: false, s: text.slice(last) });
  return parts;
}

function hostLabel(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Source'; }
}

export function repairGroundingMarkers(text: string): string {
  if (typeof text !== 'string' || !text) return text;
  const refs = new Map<string, { label: string; url: string }>();
  for (const line of text.split('\n')) {
    const d = line.match(DEF_LINE);
    if (d) refs.set(d[1], { label: (d[2] || hostLabel(d[3])).trim(), url: d[3] });
  }
  return splitCode(text).map(p => {
    if (p.code) return p.s;
    return p.s.split('\n').map(line => {
      if (DEF_LINE.test(line)) return line; // keep the user-visible source list
      return line.replace(MARKER, (_all, pre, nums) => {
        const ids = String(nums).split(/\s*[,–-]\s*/);
        const links = ids.map(n => refs.get(n)).filter(Boolean)
          .map(r => `[${r!.label}](${r!.url})`);
        return links.length ? ` (${links.join(', ')})` : '';
      });
    }).join('\n');
  }).join('');
}