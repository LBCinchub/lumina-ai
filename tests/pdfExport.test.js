import { test, expect } from 'vitest';
import { pdfSafe, pdfMessageText } from '@/lib/pdfText';
import { buildThreadPdf, pdfFileName } from '@/lib/threadPdf';

const pdfBytes = (doc) => Buffer.from(doc.output('arraybuffer')).toString('latin1');

test('drops emoji and maps symbols the PDF font cannot draw', () => {
  expect(pdfSafe('Great idea 🚀. ✅ Done → next ≥ 3 ™')).toBe('Great idea. Done -> next >= 3 ™');
  expect(pdfSafe('✅ First')).toBe('First');
});

test('turns chat markers and Markdown into readable text', () => {
  expect(pdfMessageText('__IMAGE__https://x/y.png__CAPTION__A red fox')).toBe('[Image: A red fox]');
  expect(pdfMessageText('__AUTOPILOT__run_123456\nTask started')).toBe('Task started');
  expect(pdfMessageText('## Plan\n- **Deep work** first\n* see [Reuters](https://reuters.com/a)\n`code`'))
    .toBe('Plan\n• Deep work first\n• see Reuters (https://reuters.com/a)\ncode');
});

test('long replies continue on new pages and every line prints as real text', () => {
  const long = Array.from({ length: 150 }, (_, i) => `Line ${i + 1} of the schedule 🚀 → keep going`).join('\n');
  const doc = buildThreadPdf('Tips for remote focus 🎯', [
    { id: 'm1', role: 'user', content: 'Give me an example schedule' },
    { id: 'm2', role: 'assistant', content: long },
    { id: 'error-1', role: 'assistant', content: 'The Reply Did Not Arrive.' },
  ]);
  expect(doc.internal.getNumberOfPages()).toBeGreaterThanOrEqual(3);
  const raw = pdfBytes(doc);
  expect(raw).toContain('Line 1 of the schedule -> keep going');
  expect(raw).toContain('Line 150 of the schedule -> keep going');
  expect(raw).not.toContain('\u0000'); // no line fell back to garbled two-byte text
  expect(raw).not.toContain('Did Not Arrive');
  expect(pdfFileName('Tips for remote focus')).toBe('lumina-tips-for-remote-focus.pdf');
});