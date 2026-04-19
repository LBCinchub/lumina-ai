import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronRight, Save, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContextPanel({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    name: profile?.name || "",
    role: profile?.role || "",
    focus_areas: profile?.focus_areas || "",
    values: profile?.values || "",
    context: profile?.context || "",
    communication_style: profile?.communication_style || "direct",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed right-0 top-0 h-full w-80 z-40 flex flex-col"
      style={{
        background: "hsl(220,20%,7%)",
        borderLeft: "1px solid hsl(220,15%,16%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Your Context</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <p className="px-5 py-3 text-xs text-muted-foreground border-b border-border leading-relaxed">
        Lumina uses this to personalize every response. The more context you share, the more precise the insights.
      </p>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Name</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="How should Lumina address you?"
            className="bg-secondary/50 border-border text-sm h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Role / Title</Label>
          <Input
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            placeholder="Founder, Engineer, Strategist..."
            className="bg-secondary/50 border-border text-sm h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Focus</Label>
          <Textarea
            value={form.focus_areas}
            onChange={e => setForm(f => ({ ...f, focus_areas: e.target.value }))}
            placeholder="Projects, goals, priorities you're working on..."
            className="bg-secondary/50 border-border text-sm resize-none"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Core Values</Label>
          <Textarea
            value={form.values}
            onChange={e => setForm(f => ({ ...f, values: e.target.value }))}
            placeholder="What principles guide your decisions?"
            className="bg-secondary/50 border-border text-sm resize-none"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Communication Style</Label>
          <Select value={form.communication_style} onValueChange={v => setForm(f => ({ ...f, communication_style: v }))}>
            <SelectTrigger className="bg-secondary/50 border-border text-sm h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">Direct & Concise</SelectItem>
              <SelectItem value="collaborative">Collaborative & Open</SelectItem>
              <SelectItem value="analytical">Analytical & Deep</SelectItem>
              <SelectItem value="visionary">Visionary & Strategic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Additional Context</Label>
          <Textarea
            value={form.context}
            onChange={e => setForm(f => ({ ...f, context: e.target.value }))}
            placeholder="Anything else Lumina should know about you, your work, or your goals..."
            className="bg-secondary/50 border-border text-sm resize-none"
            rows={4}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-9 text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, hsl(196,80%,55%) 0%, hsl(270,60%,60%) 100%)",
            color: "white",
            border: "none",
          }}
        >
          <Save className="w-3.5 h-3.5 mr-2" />
          {saving ? "Saving..." : "Save Context"}
        </Button>
      </div>
    </motion.div>
  );
}