import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ContextToggle({ currentContext, onContextChange, myPlatform }) {
  const [sisterConversations, setSisterConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded) {
      loadSisterConversations();
    }
  }, [expanded]);

  const loadSisterConversations = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fetchSisterConversations', {
        myPlatform
      });
      setSisterConversations(res.data.conversations || []);
    } catch (err) {
      console.error('Failed to load sister conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchContext = (conversation) => {
    onContextChange({
      contextType: 'sister',
      conversation
    });
    setExpanded(false);
  };

  return (
    <div className="border-t border-border/60 pt-4 px-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">Context</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-foreground">
          {currentContext === 'yours' ? 'Your memories' : "Sister's memories"}
        </span>
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => onContextChange({ contextType: 'yours' })}
          variant={currentContext === 'yours' ? 'default' : 'outline'}
          className="w-full justify-start text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Your conversation history
        </Button>

        <div className="relative">
          <Button
            onClick={() => setExpanded(!expanded)}
            variant={currentContext === 'sister' ? 'default' : 'outline'}
            className="w-full justify-start text-xs"
          >
            <Users className="w-3.5 h-3.5 mr-2" />
            {currentContext === 'sister' ? "Sister's memories" : "Browse sister's history"}
          </Button>

          {expanded && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg p-2 z-50 max-h-48 overflow-y-auto">
              {loading ? (
                <div className="text-xs text-muted-foreground px-2 py-2">Loading…</div>
              ) : sisterConversations.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2 py-2">No shared conversations yet</div>
              ) : (
                sisterConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => switchContext(conv)}
                    className="w-full text-left px-2 py-2 rounded text-xs text-foreground/70 hover:bg-accent hover:text-foreground transition-colors truncate"
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}