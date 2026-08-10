import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import TextImageCanvas from '@/components/twin/TextImageCanvas';
import { cn } from '@/lib/utils';

export default function ImageStudio({ open, onOpenChange }) {
  const [prompt, setPrompt] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('generate');
  const [saved, setSaved] = useState([]);
  const fileRef = useRef(null);

  const loadSaved = async () => {
    try {
      const res = await base44.functions.invoke('lbcTwinImage', { action: 'get_saved_images' });
      setSaved(res?.data?.images || res?.images || []);
    } catch (_) {
      setSaved([]);
    }
  };

  useEffect(() => {
    if (open) loadSaved();
  }, [open]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setError('');
    try {
      const up = await base44.integrations.Core.UploadFile({ file: f });
      setReferenceUrl(up.file_url);
    } catch (_) {
      setError('Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    setOverlays([]);
    try {
      if (referenceUrl) {
        const res = await base44.functions.invoke('lbcTwinImage', {
          action: 'edit_reference',
          prompt,
          reference_image_url: referenceUrl
        });
        const d = res?.data || res || {};
        if (d.image_url) {
          setResult(d.image_url);
          setOverlays([]);
        } else {
          setError(d.error || 'Failed to edit image');
        }
      } else {
        const res = await base44.functions.invoke('lbcTwinImage', { action: 'generate_with_text', prompt });
        const d = res?.data || res || {};
        if (d.base_image_url) {
          setResult(d.base_image_url);
          setOverlays(Array.isArray(d.overlays) ? d.overlays : []);
        } else {
          setError(d.error || 'Failed to generate image');
        }
      }
      loadSaved();
    } catch (e) {
      setError(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Image Studio</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border mb-3">
          {['generate', 'saved'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 text-xs capitalize border-b-2 -mb-px transition-colors',
                tab === t ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'
              )}
            >
              {t === 'generate' ? 'Generate' : 'Saved Images'}
            </button>
          ))}
        </div>

        {tab === 'generate' ? (
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the image. Include any text for signs, banners, or captions."
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm resize-none"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
              >
                <Upload className="w-3.5 h-3.5" />
                {referenceUrl ? 'Reference added' : 'Reference photo (optional)'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              {referenceUrl && (
                <button
                  onClick={() => setReferenceUrl('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Remove reference
                </button>
              )}
            </div>
            <Button onClick={generate} disabled={busy || !prompt.trim()} className="w-full">
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating…
                </>
              ) : referenceUrl ? (
                'Edit Reference'
              ) : (
                'Generate'
              )}
            </Button>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {result && (
              <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
                {overlays.length > 0 ? (
                  <TextImageCanvas baseImageUrl={result} overlays={overlays} className="w-full" />
                ) : (
                  <img src={result} alt="generated" className="w-full" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {saved.length === 0 ? (
              <p className="col-span-2 text-sm text-muted-foreground text-center py-8">No saved images yet.</p>
            ) : (
              saved.map(s => (
                <div key={s.id} className="rounded-lg border border-border overflow-hidden">
                  <img src={s.image_url} alt={s.prompt || 'image'} className="w-full h-32 object-cover" />
                  <p className="text-[11px] text-muted-foreground px-2 py-1.5 truncate">{s.prompt || s.kind}</p>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}