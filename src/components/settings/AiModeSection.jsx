import PersistentModeToggle from '@/components/autopilot/PersistentModeToggle';
import ModelTierSelector from '@/components/settings/ModelTierSelector';

// AI Mode: Full-Auto (the same server-saved preference shown on the Autopilot
// page) and the model tier that answers in chat.
export default function AiModeSection() {
  return (
    <section aria-labelledby="ai-mode-heading" className="space-y-3">
      <div>
        <h2 id="ai-mode-heading" className="text-sm font-medium">AI Mode</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Choose How Independently LBC AI Works And Which Model Tier Answers You.</p>
      </div>
      <PersistentModeToggle />
      <ModelTierSelector />
    </section>
  );
}