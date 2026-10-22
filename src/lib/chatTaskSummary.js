// Honest one-line summary of a run for the in-chat card. Never says
// "completed" for mock or draft-only outcomes, and never implies offline
// background execution.
export function taskCardSummary(run) {
  const steps = run?.steps || [];
  const done = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length ? `${done}/${steps.length} Steps` : '';
  const doc = [...steps].reverse().find(s => s.artifact_document_id);
  let headline = run?.plan_summary || run?.goal || 'Task';
  let nextStep = null;

  switch (run?.status) {
    case 'running':
    case 'queued':
      nextStep = 'Working While You Are Signed In To LBC AI. This Is Not Offline Background Execution.';
      break;
    case 'awaiting_input':
      nextStep = run.clarifying_question ? `One Question: ${run.clarifying_question}` : 'Answer The Question In Details To Continue.';
      break;
    case 'awaiting_approval':
      nextStep = 'Review The Exact Content In Details And Approve To Send. Nothing Has Been Sent.';
      break;
    case 'blocked':
      nextStep = run.blocked_reason || 'Blocked. Open Details For The Next Step.';
      break;
    case 'paused':
      nextStep = 'Paused. Resume In Details To Continue.';
      break;
    case 'completed':
      if (run.receipt?.mock) { headline = 'Test Only, Nothing Was Sent'; break; }
      headline = run.final_summary || headline;
      break;
    default:
      break;
  }
  return { headline: String(headline).slice(0, 160), progress, nextStep, documentId: doc?.artifact_document_id || null };
}