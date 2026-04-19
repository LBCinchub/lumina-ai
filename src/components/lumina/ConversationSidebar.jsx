import { motion } from "framer-motion";
import { Plus, MessageSquare, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import LuminaOrb from "./LuminaOrb";

export default function ConversationSidebar({ conversations, activeId, onSelect, onNew, onDelete, collapsed, onToggle }) {
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center py-4 gap-3 border-r border-border"
        style={{ width: 56, background: "hsl(220,20%,7%)" }}
      >
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <LuminaOrb size="sm" />
        </button>
        <div className="w-px h-4 bg-border" />
        <button onClick={onNew} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-primary">
          <Plus className="w-4 h-4" />
        </button>
        {conversations.slice(0, 6).map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`p-2 rounded-lg transition-colors ${c.id === activeId ? "bg-primary/10 text-primary" : "hover:bg-secondary text-muted-foreground"}`}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      className="flex flex-col border-r border-border overflow-hidden"
      style={{ background: "hsl(220,20%,7%)", minWidth: 240 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <LuminaOrb size="sm" />
          <span className="font-playfair text-sm font-semibold text-foreground tracking-wide">Lumina</span>
        </div>
        <button onClick={onToggle} className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New chat */}
      <div className="px-3 py-3">
        <Button
          onClick={onNew}
          variant="outline"
          className="w-full h-8 text-xs gap-1.5 border-border hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          New Conversation
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">
            Start your first conversation with Lumina.
          </p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`group flex items-start justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
              conv.id === activeId
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-secondary border border-transparent"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${conv.id === activeId ? "text-primary" : "text-foreground/80"}`}>
                {conv.title || "Untitled"}
              </p>
              {conv.last_message_at && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(conv.last_message_at), "MMM d")}
                </p>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 ml-1 rounded text-muted-foreground hover:text-destructive transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}