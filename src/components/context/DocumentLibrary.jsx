import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

function StatusIcon({ status }) {
  if (status === 'ready') return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
  if (status === 'error') return <AlertCircle className="w-3.5 h-3.5 text-destructive" />;
  return <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const loadDocs = async () => {
    const docs = await base44.entities.Document.list('-created_date', 50);
    setDocuments(docs);
  };

  useEffect(() => {
    loadDocs();
  }, []);

  // Poll for processing docs
  useEffect(() => {
    const processing = documents.filter(d => d.status === 'processing');
    if (!processing.length) return;
    const timer = setTimeout(loadDocs, 3000);
    return () => clearTimeout(timer);
  }, [documents]);

  const handleFiles = async (files) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdfs.length) return;

    setUploading(true);
    for (const file of pdfs) {
      try {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Create DB record
        const doc = await base44.entities.Document.create({
          title: file.name.replace(/\.pdf$/i, ''),
          file_url,
          file_size: file.size,
          status: 'processing'
        });

        // Trigger parsing in background
        base44.functions.invoke('parseDocument', {
          document_id: doc.id,
          file_url,
          title: doc.title
        }).catch(console.error);

        setDocuments(prev => [doc, ...prev]);
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Document.delete(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-all",
          dragOver
            ? "border-foreground/40 bg-accent/60"
            : "border-border hover:border-foreground/30 hover:bg-accent/30"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm text-foreground/70">Drop PDFs here or <span className="underline underline-offset-2">browse</span></p>
            <p className="text-xs text-muted-foreground">Lumina will read and remember these documents</p>
          </div>
        )}
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border group"
            >
              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{doc.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusIcon status={doc.status} />
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {doc.status === 'ready' ? `Ready · ${formatBytes(doc.file_size)}` : doc.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}