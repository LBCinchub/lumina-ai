// Text for the chat PDF export. The PDF's built-in font can only draw the
// Windows Latin character set, and a single character outside it garbles the
// whole line, so emoji are dropped, common symbols get plain equivalents and
// anything else unsupported prints as "?". Chat markers and Markdown become
// readable text.
const SYMBOLS = [
  [/[→⟶➔➜]/g, '->'], [/[←⟵]/g, '<-'], [/≥/g, '>='], [/≤/g, '<='], [/≈/g, '~'], [/≠/g, '!='],
  [/[−‐‑]/g, '-'], [/[✓✔☑]/g, '-'], [/[\u2007\u2009\u200A\u202F]/g, ' '], [/[\u200B\u2060]/g, ''], [/\t/g, '    '],
];
// An emoji run plus the space before it (©, ® and ™ are printable, so kept).
const EMOJI_RUN = /[ ]?(?:(?![\u00A9\u00AE\u2122])[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D\u20E3])+/gu;
const UNSUPPORTED = /[^\n\x20-\x7E\xA0-\xFF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]/gu;

export function pdfSafe(text) {
  let s = String(text || '').normalize('NFC');
  for (const [re, to] of SYMBOLS) s = s.replace(re, to);
  return s.replace(EMOJI_RUN, '').replace(/^ (?=\S)/gm, '').replace(UNSUPPORTED, '?');
}

export function pdfMessageText(content) {
  let c = String(content || '');
  if (c.startsWith('__IMAGE__')) {
    const caption = (c.split('__CAPTION__')[1] || '').trim();
    return pdfSafe(`[Image${caption ? `: ${caption}` : ''}]`);
  }
  if (c.startsWith('__AUTOPILOT__')) {
    const nl = c.indexOf('\n');
    c = nl === -1 ? '' : c.slice(nl + 1);
  }
  return pdfSafe(c
    .replace(/^[ \t]*```.*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => `[Image${alt ? `: ${alt}` : ''}]`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^([ \t]*)[-*+][ \t]+/gm, '$1• ')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/`([^`]*)`/g, '$1'));
}