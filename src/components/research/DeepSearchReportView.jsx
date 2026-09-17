import React from 'react';

const CONFIDENCE_STYLE = {
  high: 'border-emerald-500/30 text-emerald-400',
  medium: 'border-amber-500/30 text-amber-400',
  low: 'border-red-500/30 text-red-400',
};

function ConfidenceBadge({ level }) {
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide shrink-0 ${CONFIDENCE_STYLE[level] || CONFIDENCE_STYLE.low}`}>
      {level || 'low'} confidence
    </span>
  );
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toUpperCase();
  } catch (_) {
    return String(url).toUpperCase();
  }
}

// Renders one saved Deep Search report: answer, findings with honest
// per-claim confidence, what could NOT be verified, and every logged source.
export default function DeepSearchReportView({ report }) {
  if (report.status === 'processing') {
    return (
      <p className="text-xs text-muted-foreground py-6 text-center">
        This Research Run Is Still In Progress.
      </p>
    );
  }
  if (report.status === 'error') {
    return (
      <p className="text-xs text-destructive py-6 text-center">
        {report.error_message || 'This Research Run Could Not Complete.'}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Research Question</div>
        <p className="text-sm font-medium leading-relaxed">{report.question}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Answer</div>
          <ConfidenceBadge level={report.confidence} />
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.answer}</p>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span>{report.rounds_used || 0} Research Rounds</span>
        <span>{report.searches_used || 0} Targeted Searches</span>
        <span>{report.pages_read || 0} Pages Read</span>
        <span>{(report.sources || []).length} Sources Logged</span>
      </div>

      {Array.isArray(report.findings) && report.findings.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Findings</div>
          <div className="space-y-2">
            {report.findings.map((f, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs leading-relaxed flex-1">{f.claim}</p>
                  <ConfidenceBadge level={f.confidence} />
                </div>
                {f.evidence && (
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">Evidence: {f.evidence}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(report.unverified) && report.unverified.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Could Not Be Verified</div>
          <ul className="space-y-1.5">
            {report.unverified.map((u, i) => (
              <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">— {u}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(report.sources) && report.sources.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Sources</div>
          <div className="space-y-1">
            {report.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {hostOf(s.url)} — {s.title || s.url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}