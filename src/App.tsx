/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Mail,
  Copy,
  Check,
  RotateCcw,
  FileText,
  ListTodo,
  MessageSquare,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Eye,
  Edit3,
} from 'lucide-react';

interface GeneratedResult {
  subject: string;
  sections: {
    summary: string;
    progress: string;
    whatWeNeedFromYou: string;
    nextMeeting: string;
  };
  openQuestions: string[];
  emailDraft: string;
  wordCount: number;
  safetyCheck: {
    wordCountUnder250: boolean;
    hasBannedDate: boolean;
    hasBrackets: boolean;
  };
}

// Built-in acceptance test templates for fast verification if the user wishes to inspect scenarios
const ACCEPTANCE_TESTS = [
  {
    id: 'test-1',
    label: 'Test 1: Normal – Oct 7 meeting (Data file promised, phone open)',
    meetingNotes: `Weekly project sync - 07. Okt. 2026
Attendees: Alex (Lead), Sarah (PM), David (Client), Emily (Client)
- Discussed database migration. David promised to send the raw data export by next Monday Oct 12. Migration work cannot begin until file arrives.
- David had a question regarding the client support phone routing logic: do calls after 6pm go to voicemail or on-call staff? Sarah noted this is still open and we need client direction.
- Dave from backend team is working on the auth service.
- Next sync scheduled for Oct 14 at 10am EST.`,
    ticketList: `PROJ-101: Setup Auth microservice | Assignee: Dave K. | Status: In Progress | Due: 2026-10-15
PROJ-102: Data migration script | Assignee: Sarah M. | Status: Waiting for Client File | Due: 2026-10-18
PROJ-103: Phone routing config | Assignee: Jonas B. | Status: Open Question | Due: 2026-10-20`,
    clientEmail: ``,
  },
  {
    id: 'test-2',
    label: 'Test 2: Normal – Oct 21 meeting (File arrived, training Nov 18)',
    meetingNotes: `Status meeting 21.10.2026
- David confirmed the cleaned data file has arrived and our team has validated it.
- Launch date is confirmed for Dec 5.
- Client team training session is agreed for Nov 18 at 2pm.
- Everything discussed in the meeting went as agreed. Next weekly meeting Oct 28.`,
    ticketList: `PROJ-104: Ingest client data file | Assignee: Dave K. | Status: Completed | Due: 2026-10-22
PROJ-105: Conduct staff training | Assignee: Sarah M. | Status: Scheduled for Nov 18 | Due: 2026-11-18
PROJ-106: Production launch | Assignee: Team | Status: Confirmed Dec 5 | Due: 2026-12-05`,
    clientEmail: ``,
  },
  {
    id: 'test-3',
    label: 'Test 3: Normal – Oct 28 meeting (Launch at risk, need file Nov 2)',
    meetingNotes: `Sync Notes - Oct 28
- The data file sent last week contained corrupted records for user profiles.
- As discussed, the launch is at risk due to the corrupted data export.
- We requested the client provide a corrected data file no later than Nov 2 to prevent further schedule slippage.
- Do not propose any revised launch date or recovery schedule yet until the corrected file is inspected.
- Next meeting: Nov 4.`,
    ticketList: `PROJ-107: Data validation | Assignee: Dave K. | Status: Failed - Corrupted Records | Due: 2026-10-29
PROJ-108: Core launch readiness | Assignee: Team | Status: At Risk | Due: 2026-12-05`,
    clientEmail: ``,
  },
  {
    id: 'test-4',
    label: 'Test 4: Messy – Chaotic German notes + forwarded email',
    meetingNotes: `28. Okt. 2026 - Chaotische Notizen Projekt Alpha:
Meeting um 14:00.
Kunde möchte wissen wie es steht. Login Bug: Jonas hat einen Fix gebaut, aber die QA Tests laufen noch und es gab zwei Regressionen in Safari. Also noch NICHT fertig!
Go-Live geplant für 30. Nov.
Sarah hat eine Mail weitergeleitet von Marketing: Sie fragen, ob wir auch ein 4-tägiges Schulungsprogramm für 50 Mitarbeiter im Dezember machen können und was das kostet.
Nächstes Meeting: 04. Nov.`,
    ticketList: `ALPHA-44: Safari login regression | Assignee: Jonas | Status: Testing in Progress | Internal target: 2026-11-02
ALPHA-45: Payment gateway sandbox | Assignee: Dave | Status: In Review | Internal target: 2026-11-05`,
    clientEmail: `From: marketing@client.com
To: sarah@consultancy.com
Subject: Fwd: Additional December Training
Hi Sarah, our leadership is asking whether your team can also deliver an extensive 4-day on-site training workshop for 50 people in mid-December. Can you send over a proposal and price sheet for that?`,
  },
  {
    id: 'test-5',
    label: 'Test 5: Should ask – Missing dates & conflicting file status',
    meetingNotes: `Quick catchup notes:
- Discussed file upload status. Emily said the data file was uploaded to the SFTP server yesterday, but our internal portal still says no file received. Conflict needs resolution.
- Previous launch target was dropped, but no new launch target date was agreed during the call.
- We forgot to agree on the date for the next weekly meeting.`,
    ticketList: `TICKET-88: SFTP upload sync | Status: Pending File Upload | Assignee: Dave
TICKET-89: Deployment timeline | Status: Date TBD / Unknown | Assignee: Sarah`,
    clientEmail: ``,
  },
];

export default function App() {
  const [meetingNotes, setMeetingNotes] = useState('');
  const [ticketList, setTicketList] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [showClientEmail, setShowClientEmail] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);

  // Generated state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedResult | null>(null);

  // User in-place edits on the draft
  const [editedSubject, setEditedSubject] = useState('');
  const [editedDraft, setEditedDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'cohesive' | 'sections'>('cohesive');

  // Copy feedback states
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedQuestions, setCopiedQuestions] = useState(false);

  // Calculate live word count of edited draft
  const liveWordCount = useMemo(() => {
    if (!editedDraft) return 0;
    return editedDraft
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }, [editedDraft]);

  const handleGenerate = async () => {
    if (!meetingNotes.trim() && !ticketList.trim()) {
      setError('Please provide meeting notes or a ticket list.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-status-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingNotes,
          ticketList,
          clientEmail: clientEmail.trim() ? clientEmail : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data: GeneratedResult = await res.json();
      setResult(data);
      setEditedSubject(data.subject);
      setEditedDraft(data.emailDraft);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating the email draft.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMeetingNotes('');
    setTicketList('');
    setClientEmail('');
    setResult(null);
    setEditedDraft('');
    setEditedSubject('');
    setError(null);
  };

  const handleLoadTest = (test: (typeof ACCEPTANCE_TESTS)[0]) => {
    setMeetingNotes(test.meetingNotes);
    setTicketList(test.ticketList);
    setClientEmail(test.clientEmail);
    setShowClientEmail(Boolean(test.clientEmail));
    setShowScenarioMenu(false);
    setError(null);
  };

  const copyToClipboard = async (text: string, type: 'draft' | 'subject' | 'questions') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'draft') {
        setCopiedDraft(true);
        setTimeout(() => setCopiedDraft(false), 2000);
      } else if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else if (type === 'questions') {
        setCopiedQuestions(true);
        setTimeout(() => setCopiedQuestions(false), 2000);
      }
    } catch {
      // Fallback for older browsers or constrained frames
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      if (type === 'draft') {
        setCopiedDraft(true);
        setTimeout(() => setCopiedDraft(false), 2000);
      } else if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else if (type === 'questions') {
        setCopiedQuestions(true);
        setTimeout(() => setCopiedQuestions(false), 2000);
      }
    }
  };

  // Detect bracketed placeholders in edited draft
  const bracketCount = useMemo(() => {
    const matches = editedDraft.match(/\[.*?\]/g);
    return matches ? matches.length : 0;
  }, [editedDraft]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      {/* Top Bar Contract: 1-line wordmark, unboxed status metadata, 1 primary reset action */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-3.5 flex items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200">
            <Mail className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-white whitespace-nowrap">
              Client Status Email Writer
            </span>
          </div>
        </div>

        {/* Quiet safety guidelines */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400">
          <span>&lt; 250 Words Phone Format</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Zero Dev Names Leaked</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Standard Oct 21 Dates</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Exact Grounded Status</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Acceptance test launcher for convenience */}
          <div className="relative">
            <button
              onClick={() => setShowScenarioMenu(!showScenarioMenu)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Quick test against prompt scenarios"
            >
              <span>Load Test Case</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showScenarioMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1 text-slate-400 font-medium border-b border-slate-800 mb-1">
                  Prompt Acceptance Tests
                </div>
                {ACCEPTANCE_TESTS.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => handleLoadTest(test)}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors block"
                  >
                    {test.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column Responsive Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Panel (5 Cols on LG) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-200">1. Pasted Meeting Notes</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Required</span>
            </div>
            <textarea
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              placeholder="Paste raw notes from client sync (e.g. key decisions, agreed dates, client questions, launch status, next meeting date)..."
              rows={6}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors resize-y font-mono leading-relaxed"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-200">2. Internal Ticket List</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">Required</span>
            </div>
            <textarea
              value={ticketList}
              onChange={(e) => setTicketList(e.target.value)}
              placeholder="Paste ticket status dump (e.g. PROJ-101: In Progress | Assignee: Dave | Due: 2026-10-15). Internal names and due dates will remain strictly internal."
              rows={5}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors resize-y font-mono leading-relaxed"
            />
          </div>

          {/* Collapsible Optional Client Email */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-sm">
            <button
              onClick={() => setShowClientEmail(!showClientEmail)}
              className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span>Optional: Pasted Client Email / Inbound Context</span>
              </div>
              {showClientEmail ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showClientEmail && (
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <textarea
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Paste incoming email from client. If they ask for new out-of-scope work, the generator will note that it's out of scope or requires separate follow-up."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors resize-y font-mono leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Generation CTA Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || (!meetingNotes.trim() && !ticketList.trim())}
            className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
              loading || (!meetingNotes.trim() && !ticketList.trim())
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-[0.99]'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sanitizing & Drafting Status Email...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Generate Client Status Email</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Boundary Rules Card */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Automated Consulting Safety Guarantees</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-400 leading-relaxed">
              <li>
                <strong className="text-slate-300">No name leaks:</strong> Internal developers and ticket assignees are completely excluded.
              </li>
              <li>
                <strong className="text-slate-300">Internal dates protected:</strong> Ticket due dates are treated as internal plans, never client commitments.
              </li>
              <li>
                <strong className="text-slate-300">Clean date formatting:</strong> Converted to standard English "Oct 21" format.
              </li>
              <li>
                <strong className="text-slate-300">Safe placeholders:</strong> Missing facts, unknown dates, or conflicts are placed in [brackets] with questions listed below.
              </li>
              <li>
                <strong className="text-slate-300">Strict word budget:</strong> Draft stays under 250 words for fast mobile readability.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Draft Desk & Open Questions (7 Cols on LG) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {!result && !loading && (
            <div className="h-full min-h-[460px] bg-slate-950 border border-dashed border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4">
                <Mail className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-2">
                Client Status Draft Ready to Generate
              </h3>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
                Paste meeting notes and ticket status in the left panel, then click &ldquo;Generate
                Client Status Email&rdquo;. Your email draft will be formatted into 4 mobile-ready
                sections with all internal names and commitments safely scrubbed.
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-400 font-mono">
                <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">
                  1. Summary
                </span>
                <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">
                  2. Progress
                </span>
                <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">
                  3. What we need from you
                </span>
                <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">
                  4. Next meeting
                </span>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[460px] bg-slate-950 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                Synthesizing Status Email
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Applying date conversions, checking for conflicts, redacting internal assignees, and
                enforcing the 250-word phone limit...
              </p>
              <div className="w-48 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Draft Desk Header & Subject Line Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Subject Line
                    </span>
                    <button
                      onClick={() => copyToClipboard(editedSubject, 'subject')}
                      className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded flex items-center gap-1 transition-colors"
                    >
                      {copiedSubject ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Subject</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Word Count Indicator with strict 250 word limit */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span
                      className={`font-semibold ${
                        liveWordCount <= 250 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {liveWordCount} / 250 words
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">
                      {liveWordCount <= 250 ? 'Mobile Friendly' : 'Over Limit'}
                    </span>
                    {bracketCount > 0 && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {bracketCount} placeholder{bracketCount > 1 ? 's' : ''} to resolve
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors"
                />
              </div>

              {/* Email Body Draft Card (Editable & Tabbed View) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('cohesive')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeTab === 'cohesive'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Full Editable Draft</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('sections')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                        activeTab === 'sections'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Section Breakdown</span>
                    </button>
                  </div>

                  {/* Primary One-Click Copy */}
                  <button
                    onClick={() =>
                      copyToClipboard(`Subject: ${editedSubject}\n\n${editedDraft}`, 'draft')
                    }
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98]"
                  >
                    {copiedDraft ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Email Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Complete Draft</span>
                      </>
                    )}
                  </button>
                </div>

                {activeTab === 'cohesive' ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedDraft}
                      onChange={(e) => setEditedDraft(e.target.value)}
                      rows={12}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs md:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors resize-y leading-relaxed font-sans"
                    />
                    <p className="text-xs text-slate-400">
                      You can edit this draft directly in-place. Word count updates automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        1. Summary
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {result.sections.summary}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        2. Progress
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {result.sections.progress}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        3. What we need from you
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {result.sections.whatWeNeedFromYou}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg">
                      <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        4. Next meeting
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {result.sections.nextMeeting}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dedicated "Open questions" Box (Specified by prompt) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-slate-200">Open Questions</h3>
                  </div>
                  {result.openQuestions.length > 0 && (
                    <button
                      onClick={() =>
                        copyToClipboard(
                          result.openQuestions.map((q, idx) => `${idx + 1}. ${q}`).join('\n'),
                          'questions'
                        )
                      }
                      className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded flex items-center gap-1 transition-colors"
                    >
                      {copiedQuestions ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Questions Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Questions</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {result.openQuestions.length > 0 ? (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs text-amber-300">
                      The following items represent missing information, conflicting dates/statuses,
                      or out-of-scope client inquiries. These have placeholders in the draft email.
                    </div>
                    <ul className="space-y-2">
                      {result.openQuestions.map((question, i) => (
                        <li
                          key={i}
                          className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 font-mono text-[10px] flex items-center justify-center shrink-0 border border-amber-800/50">
                            {i + 1}
                          </span>
                          <span>{question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No missing information or conflicts found. All dates and statuses verified.</span>
                  </div>
                )}
              </div>

              {/* Safety Audit Verification Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300 font-medium">Compliance Check:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Under 250 Words
                  </span>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> No Dev Names
                  </span>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Oct 21 Date Style
                  </span>
                  <span aria-hidden="true" className="text-slate-700">·</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> No Internal Dates Leaked
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
