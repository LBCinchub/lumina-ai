// Pure memory-consent policy for LBC AI Ultra. No I/O, no runtime imports, so
// deterministic tests run in any runtime. Fail closed everywhere.
import { sha256Hex } from './hash.ts';

export const POLICY_VERSION = 2;
export const SENSITIVE_CATEGORIES = ['financial', 'health', 'legal', 'personal_hardship'];

export const DEFAULT_SETTINGS = Object.freeze({
  memory_enabled: true,
  history_access_enabled: false,
  sensitive_memory_enabled: false,
  sensitive_scopes: [],
});

// Used whenever settings cannot be loaded: nothing is read or written.
export const FAIL_CLOSED_SETTINGS = Object.freeze({
  memory_enabled: false,
  history_access_enabled: false,
  sensitive_memory_enabled: false,
  sensitive_scopes: [],
});

export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const scopes = Array.isArray(r.sensitive_scopes)
    ? r.sensitive_scopes.filter(s => SENSITIVE_CATEGORIES.includes(s))
    : [];
  return {
    memory_enabled: typeof r.memory_enabled === 'boolean' ? r.memory_enabled : DEFAULT_SETTINGS.memory_enabled,
    history_access_enabled: r.history_access_enabled === true,
    sensitive_memory_enabled: r.sensitive_memory_enabled === true,
    sensitive_scopes: [...new Set(scopes)],
  };
}

export function validTimezone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch (_) {
    return 'UTC';
  }
}

const SENSITIVE_PATTERNS = {
  financial: /\b(debts?|loans?|mortgage|rent|income|salary|paycheck|wages?|balances?|overdraft|bankrupt\w*|credit score|budget\w*|savings|owe|owing|bills?|afford|broke|paid|payday|\d+\s?(dollars|cad|usd))\b|\$\s?\d/i,
  health: /\b(diagnos\w*|illness|disease|medications?|therapy|therapist|depress\w*|anxiety|pregnan\w*|surgery|disorder|mental health|doctor|symptoms?)\b/i,
  legal: /\b(lawsuit|sued|court|lawyer|attorney|arrest\w*|charged|custody|divorce|immigration|visa status|eviction|criminal)\b/i,
  personal_hardship: /\b(abus\w*|grief|grieving|suicid\w*|self-harm|homeless\w*|breakup|addict\w*)\b/i,
};

export function classifySensitivity(text) {
  const s = String(text || '');
  return SENSITIVE_CATEGORIES.filter(c => SENSITIVE_PATTERNS[c].test(s));
}

const SECRET_PATTERNS = [
  /\b(?:\d[ -]?){12,19}\b/,                                  // card / account numbers
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/,                          // IBAN
  /\b\d{3}-\d{2}-\d{4}\b/,                                     // SSN-like
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/,                  // payment keys
  /\bAKIA[0-9A-Z]{16}\b/,                                      // cloud keys
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,                              // git tokens
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,              // JWT
  /\b(password|passcode|passwd|pin|cvv|cvc|ssn|social insurance|social security|account number|routing number|api[ _-]?key|secret key|access token|private key|seed phrase)\b/i,
];

export function containsSecret(text) {
  const s = String(text || '');
  return SECRET_PATTERNS.some(re => re.test(s));
}

export function redactSecrets(text) {
  let s = String(text || '');
  for (const re of SECRET_PATTERNS) s = s.replace(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'), '[REDACTED]');
  return s;
}

// Removes delimiter look-alikes so stored text cannot fake a block boundary.
// Delimiters are a containment aid, not a security guarantee.
export function neutralize(text) {
  return String(text || '').replace(/={2,}[^\n]*?(UNTRUSTED|CONTENT START|CONTENT END)[^\n]*/gi, '[removed]');
}

const STOP = new Set('the a an and or but with that this from have has had into about user users their there they them what when where which while would could should will your yours just also very really more most some such than then been being were wants want likes like prefers'.split(' '));

export function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function keywordSignature(text) {
  const words = normalizeText(text).split(' ').filter(w => w.length > 3 && !STOP.has(w));
  return [...new Set(words)].sort().slice(0, 12).join(' ');
}

// Minimal, non-content tombstone keys. The raw text is never stored.
export async function suppressionKeys(text) {
  return [
    await sha256Hex('n:' + normalizeText(text)),
    await sha256Hex('k:' + keywordSignature(text)),
  ];
}

export function isSuppressed(keys, suppressedSet) {
  return keys.some(k => suppressedSet.has(k));
}

export function sensitiveAllowed(categories, settings) {
  if (!categories || categories.length === 0) return true;
  if (!settings.sensitive_memory_enabled) return false;
  return categories.every(c => settings.sensitive_scopes.includes(c));
}

// Why a stored memory is (in)eligible for retrieval. Legacy / ambiguous /
// scope-unknown records are excluded without being modified.
export function eligibilityReason(m, settings) {
  if (!m || typeof m.content !== 'string' || !m.content.trim()) return 'empty';
  if (m.policy_version !== POLICY_VERSION) return 'needs_review';
  if (m.status !== 'active') return 'inactive';
  if (m.scope !== 'personal') return 'scope_unknown';
  if (containsSecret(m.content)) return 'contains_secret';
  const cats = [...new Set([...(m.sensitive_category ? [m.sensitive_category] : []), ...classifySensitivity(m.content)])];
  if (!sensitiveAllowed(cats, settings)) return 'sensitive_not_consented';
  return null;
}