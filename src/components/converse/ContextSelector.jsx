import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, MessageSquare, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function ContextSelector({ onContextChange }) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');

  useEffect(() => {
    loadContextItems();
  }, []);

  const loadContextItems = async () => {
    setLoading(true);
    try {
      const [docs, convos] = await Promise.all([
        base44.entities.Document.filter({ status: 'ready' }, '-created_date', 20),
        base44.entities.Conversation.list('-last_message_at', 15)
      ]);
      setDocuments(docs);
      setConversations(convos);
    } catch (err) {
      console.error('Failed to load context items:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    const selectedDocs = documents.filter(d => selected.includes(d.id));
    const selectedConvos = conversations.filter(c => selected.includes(c.id));
    onContextChange({ documents: selectedDocs, conversations: selectedConvos });
    setOpen(false);
  };

  const selectedCount = selected.length;

  return (
    <div className="relative">
      <Button
        onClick={() => setOpen(!open)}
        variant="outline"
        className="gap-2 text-xs"
      >
        <FileText className="w-3.5 h-3.5" />
        Context
        {selectedCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-accent rounded text-foreground text-[10px] font-medium">{selectedCount}</span>}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-72 border border-border rounded-lg bg-card shadow-lg z-40">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('documents')}
              className={cn(
                "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                activeTab === 'documents'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={cn(
                "flex-1 px-3 py-2.5 text-xs font-medium transition-colors border-l border-border",
                activeTab === 'conversations'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Conversations
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto scrollbar-minimal">
            {activeTab === 'documents' ? (
              documents.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No documents available
                </div>
              ) : (
                documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => toggleSelect(doc.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-accent/60 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      selected.includes(doc.id) ? 'bg-primary border-primary' : 'border-border hover:border-foreground/30'
                    )}>
                      {selected.includes(doc.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-foreground/80 font-medium">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">{doc.file_size ? `${(doc.file_size / 1024).toFixed(1)}KB` : 'Unknown size'}</p>
                    </div>
                  </button>
                ))
              )
            ) : (
              conversations.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  No conversations available
                </div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => toggleSelect(conv.id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-accent/60 transition-colors border-b border-border/50 last:border-0"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                      selected.includes(conv.id) ? 'bg-primary border-primary' : 'border-border hover:border-foreground/30'
                    )}>
                      {selected.includes(conv.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-foreground/80 font-medium">{conv.title}</p>
                      <p className="text-[10px] text-muted-foreground">{conv.summary ? conv.summary.slice(0, 40) : 'No summary'}</p>
                    </div>
                  </button>
                ))
              )
            )}
          </div>

          <div className="flex gap-2 p-3 border-t border-border">
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              className="flex-1 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 text-xs"
              disabled={selected.length === 0}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}