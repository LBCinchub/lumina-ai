import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invokeAutopilot } from '@/hooks/useAutopilot';
import { base44 } from '@/api/base44Client';

const CONDITIONS = [
  ['new', 'New'], ['like_new', 'Like New'], ['good', 'Good'], ['fair', 'Fair'], ['poor', 'Poor'],
];
const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'];

// Photo uploads are stored privately — no public URL; access follows the
// app's permissions (UploadPrivateFile).
async function uploadPhotos(files) {
  const out = [];
  for (const f of files) {
    const res = await base44.integrations.Core.UploadPrivateFile({ file: f });
    if (res?.file_uri) out.push(res.file_uri);
  }
  return out;
}

const inputCls = 'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm';

export default function ActionDraftForm({ kind, destinations, onDrafted }) {
  const [destinationId, setDestinationId] = useState('');
  const [fields, setFields] = useState({});
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const options = (destinations || []).filter(d => (d.kinds || []).includes(kind));
  const set = (k, v) => setFields(f => ({ ...f, [k]: v }));
  const isEmail = kind === 'email_send';

  const submit = async (kindOverride) => {
    setBusy(true); setError(null);
    try {
      const actualKind = kindOverride || kind;
      const attachments = actualKind === 'email_send' || actualKind === 'email_draft' ? [] : (photos.length ? await uploadPhotos(photos) : []);
      const res = await invokeAutopilot({ action: 'draft_action', kind: actualKind, destination_id: destinationId, fields, attachments });
      if (res.data?.error) setError(res.data.error + (res.data.missing ? ` (${res.data.missing.join(', ')})` : ''));
      else onDrafted(res.data?.run_id);
    } catch (e) {
      setError(e?.message || 'Drafting Failed — Please Try Again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Destination — You Choose, Nothing Is Picked For You</label>
        <select className={`${inputCls} mt-1`} value={destinationId} onChange={e => setDestinationId(e.target.value)}>
          <option value="">Select A Destination</option>
          {options.map(d => (
            <option key={d.id} value={d.id}>
              {d.label}{d.status !== 'available' ? ' — Not Connected' : ''}
            </option>
          ))}
        </select>
      </div>

      {isEmail ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input className="mt-1" type="email" value={fields.to || ''} onChange={e => set('to', e.target.value)} placeholder="name@example.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Subject</label>
            <Input className="mt-1" value={fields.subject || ''} onChange={e => set('subject', e.target.value)} placeholder="Subject" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Message (Sent Exactly As You Approve It)</label>
            <textarea className={`${inputCls} mt-1 h-32`} value={fields.body || ''} onChange={e => set('body', e.target.value)} placeholder="Write Your Message…" />
          </div>
        </div>
      ) : kind === 'social_post' ? (
        <div>
          <label className="text-xs text-muted-foreground">Post Text Or Notes For The Caption</label>
          <textarea className={`${inputCls} mt-1 h-24`} value={fields.text || ''} onChange={e => set('text', e.target.value)} placeholder="What Should The Caption Say?" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Item</label>
            <Input className="mt-1" value={fields.item || ''} onChange={e => set('item', e.target.value)} placeholder="Item Name" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Category</label>
            <Input className="mt-1" value={fields.category || ''} onChange={e => set('category', e.target.value)} placeholder="Category" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Condition</label>
            <select className={`${inputCls} mt-1`} value={fields.condition || ''} onChange={e => set('condition', e.target.value)}>
              <option value="">Select Condition</option>
              {CONDITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Price</label>
            <div className="flex gap-2 mt-1">
              <Input type="number" min="0" step="0.01" value={fields.price ?? ''} onChange={e => set('price', e.target.value)} placeholder="0.00" />
              <select className={inputCls} value={fields.currency || ''} onChange={e => set('currency', e.target.value)}>
                <option value="">Cur</option>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Location</label>
            <Input className="mt-1" value={fields.location || ''} onChange={e => set('location', e.target.value)} placeholder="City / Region" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Details (Optional — Only Facts You Provide Are Used)</label>
            <textarea className={`${inputCls} mt-1 h-20`} value={fields.details || ''} onChange={e => set('details', e.target.value)} />
          </div>
        </div>
      )}

      {!isEmail && (
        <div>
          <label className="text-xs text-muted-foreground">Photos (Stored Privately)</label>
          <input type="file" accept="image/*" multiple className="mt-1 block text-sm" onChange={e => setPhotos(Array.from(e.target.files || []))} />
          {photos.length > 0 && <div className="text-xs text-muted-foreground mt-1">{photos.length} Photo(s) Selected</div>}
        </div>
      )}

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !destinationId} onClick={() => submit()}>
          {busy ? 'Drafting…' : isEmail ? 'Draft For My Review' : 'Draft For My Review'}
        </Button>
        {isEmail && (
          <Button variant="outline" disabled={busy || !destinationId} onClick={() => submit('email_draft')}>
            Save To Gmail Drafts Instead
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Drafting Never Publishes. The Exact Preview Appears Below For Approval.</p>
    </div>
  );
}