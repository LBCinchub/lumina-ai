import React from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import ContextToggle from '@/components/converse/ContextToggle';
import TwinPanel from '@/components/twin/TwinPanel';
import TwinRecommendations from '@/components/twin/TwinRecommendations';

// Existing context, recall-consent and Twin controls, unchanged — only moved
// into an on-demand panel.
export default function ChatContextDrawer({ open, onOpenChange, currentContext, onContextChange, onRecommendation }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] max-w-[380px] p-0 flex flex-col overflow-y-auto scrollbar-minimal">
        <div className="px-5 pt-5 pb-2">
          <SheetTitle className="text-base font-medium">Context And Memory</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground mt-1">
            What LBC AI May Use In This Chat. Changes Save Through Your Existing Settings.
          </SheetDescription>
        </div>
        <ContextToggle currentContext={currentContext} onContextChange={onContextChange} myPlatform="lbchub.site" />
        <TwinPanel />
        <div className="px-5 py-4 border-t border-border">
          <TwinRecommendations onAct={onRecommendation} />
        </div>
      </SheetContent>
    </Sheet>
  );
}