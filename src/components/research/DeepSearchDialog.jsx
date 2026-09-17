import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import moment from 'moment';
import DeepSearchReportView from './DeepSearchReportView';

const STATUS_LABEL = { processing: 'In Progress', ready: 'Ready', error: 'Interrupted' };

// Deep Search — LBC AI Ultra flagship research. All orchestration runs
// server-side; this dialog only launches runs and revisits saved reports.
export default function DeepSearchDialog({ open, onOpenChange }) {
  const [view, setView] = useState('list'); // list | new | report
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DeepSearchReport.list('-created_date', 20);
      setReports(data);
    } catch (_) {
      setReports([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setView('list');
      setError(null);
      setReport(null);
      loadReports();
    }
  }, [open, loadReports]);

  const runSearch = async () => {
    if (!question.trim() || running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('deepSearch', { question: question.trim() });
      const data = res?.data || res;
      if (data?.error) {
        setError(data.error);
      } else {
        setReport({ question: question.trim(), status: 'ready', ...data });
        setView('report');
        setQuestion('');
        loadReports();
      }
    } catch (err) {
      const errData = err?.response?.data || err?.data || {};
      setError(errData.error || 'Deep Search Failed — Please Try Again');
    }
    setRunning(false);
  };

  const openReport = (r) => {
    setReport(r);
    setView('report');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-minimal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="p-1 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                title="Back To Reports"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
            <Search className="w-4 h-4" strokeWidth={1.75} />
            Deep Search
          </DialogTitle>
          <DialogDescription>
            {view === 'report'
              ? 'Your structured research report — with evidence, sources, and honest confidence levels.'
              : 'Multi-round live research: decompose, search, read sources, cross-check, report. An LBC AI Ultra capability.'}
          </DialogDescription>
        </DialogHeader>

        {view === 'list' && (
          <div className="space-y-3">
            <Button onClick={() => { setError(null); setView('new'); }} size="sm" className="w-full">
              <Plus className="w-3.5 h-3.5" /> New Deep Search
            </Button>
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-6">Loading Reports…</p>
            ) : reports.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No Research Reports Yet — Run Your First Deep Search.
              </p>
            ) : (
              <div className="space-y-1.5">
                {reports.map(r => (
                  <button
                    key={r.id}
                    onClick={() => openReport(r)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate flex-1">{r.question}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {moment(r.created_date).format('MMM D · HH:mm')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'new' && (
          <div className="space-y-3">
            <Textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="What should LBC AI deeply research for you?"
              rows={3}
              maxLength={2000}
              disabled={running}
            />
            <Button onClick={runSearch} disabled={running || !question.trim()} className="w-full">
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {running ? 'Researching…' : 'Run Deep Search'}
            </Button>
            {running && (
              <p className="text-[11px] text-muted-foreground text-center animate-pulse-soft">
                Decomposing Your Question, Searching The Live Web, Reading Sources, And Cross-Checking Claims — This Usually Takes About A Minute.
              </p>
            )}
          </div>
        )}

        {view === 'report' && report && <DeepSearchReportView report={report} />}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}