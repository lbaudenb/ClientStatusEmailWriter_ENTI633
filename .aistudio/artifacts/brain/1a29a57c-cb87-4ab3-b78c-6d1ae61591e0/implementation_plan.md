# Client Status Email Writer

A focused, single-screen productivity workstation for consultants to transform unstructured meeting notes and internal ticket dumps into safe, succinct, phone-readable client status emails with guaranteed safeguards against date leaks and accidental commitments.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1 clarification:
> - **Initial State**: Clean, empty text areas ready for immediate paste without distracting preloaded clutter.
> - **Visual Direction**: Executive slate and minimal desk aesthetic (high-contrast neutral slate `#0F172A`, crisp borders, refined typographic rhythm, and tabular numerals).
> - **Draft Interaction**: In-place editable email draft with live word count tracking (ensuring < 250 words) and one-click copy affordances for the full email and subject line.

---

## 1. Overview & Core Concept

- **What It Does**: Accepts messy meeting notes, an internal ticket list, and an optional client email. Uses Gemini (server-side via `@google/genai`) configured with strict boundary rules to generate a client-ready status email with a clean Subject line, exactly 4 sections (**Summary**, **Progress**, **What we need from you**, **Next meeting**), and a separate dedicated **Open questions** box below.
- **Target Audience**: Management consultants, client partners, technical leads, and agency directors who spend 30+ minutes weekly sanitizing notes and risk leaking internal developer estimates or making unintended commitments.
- **Key Value**: 
  - Eliminates internal developer names and ticket assignees.
  - Formats all dates consistently as "Oct 21" (never European "21. Okt." or ISO "2026-10-21").
  - Keeps ticket due dates strictly internal rather than client commitments.
  - Flags conflicts or missing details with `[brackets]` in the draft and enumerates them in the Open Questions card.
  - Strictly stays under 250 words, optimized for client executive mobile screens.
  - Zero outgoing connections or data leakage; user copies the draft directly to their clipboard.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Input Phase**:
   - Consultant sees two primary input text areas: **Meeting Notes** (required) and **Ticket List** (required), plus a collapsible/secondary input for **Client Email / Context** (optional).
   - Clear placeholders demonstrate expected unstructured inputs without cluttering the fields.
   - Quick action: "Generate Client Status Email" button (disabled when required inputs are empty).
   - Reset button to clear all inputs and start fresh.

2. **Generation & Verification Phase**:
   - Click "Generate Client Status Email" triggers server-side processing with an unobtrusive loading pulse.
   - Results render side-by-side on wide screens (split view) or directly beneath on narrower screens.
   - Live word counter tracks total email draft words with a visual indicator ensuring the strict `< 250 words` rule is satisfied.

3. **Review, Edit & Copy Phase**:
   - **Subject Line**: Prominently displayed with a single-click "Copy Subject" button.
   - **Draft Email**: Editable text area preserving standard 4-section formatting (Summary, Progress, What we need from you, Next meeting). User can tweak wording directly.
   - "Copy Full Email" button provides instant feedback (2s copied state).
   - **Open Questions Box**: Distinct card below the email listing every missing date, conflicting status, or out-of-scope client request requiring clarification. Includes an individual "Copy Questions" button.
   - **Rule Inspector / Safety Check Pill Bar**: A quiet status bar displaying checks passed (e.g. `No developer names detected · Date format verified · Word count within budget · Due date protection active`).

### Visual Identity & Theme (Executive Slate)
- **Palette**: Neutral Slate Canvas (`#F8FAFC` light canvas, `#0F172A` deep executive card headers and primary actions, `#334155` body text, `#E2E8F0` hairline dividers).
- **Typography**: Display/Headings in `Plus Jakarta Sans` with high scannability; Body and draft editing in `DM Sans` / `Plus Jakarta Sans`; Tabular metrics and word count in `font-mono tabular-nums`.
- **Top Bar Contract**: Minimal single-line brand title (`Client Status Email Writer`), clean utility links (`Guidelines`, `Safety Rules`), and a primary "New Draft" reset action.
- **Zero-Pill Discipline**: Metadata, section labels, and word counts rendered as clean unboxed typographic labels (`Word count: 184 / 250 · Status: Ready to copy`).

---

## 3. Key Product Decisions & Trade-Offs

- **Server-Side Gemini Execution**:
  - *Chosen Approach*: Node.js Express endpoint `/api/generate-status-email` using `@google/genai` with `gemini-3.8-flash`.
  - *Why*: Strict security requirement (never expose `GEMINI_API_KEY` to the browser) and central enforcement of system instructions and safety invariants.
  - *Model Selection*: `gemini-3.8-flash` delivers ultra-fast generation with high instruction compliance for structured text extraction, date conversion, and strict redaction.
- **Structured JSON Response Protocol**:
  - *Chosen Approach*: The server requests a strictly typed JSON payload with `subject`, `sections: { summary, progress, whatWeNeedFromYou, nextMeeting }`, `fullDraftText`, `openQuestions: string[]`, and `ruleVerification: { wordCount, internalNamesRedacted, bracketsUsed }`.
  - *Why*: Allows rendering the draft both as an editable cohesive email and as discrete reviewable sections, while ensuring the Open Questions box is cleanly separated as specified.
- **In-Place Draft Editing**:
  - *Chosen Approach*: Two-way binding on the draft text area. When the user modifies the draft in the editor, the word counter dynamically updates in real time.
  - *Why*: Consultants often want to adjust one or two client-specific idioms before sending.

---

## 4. Technical Architecture & Data Strategy

### System Layout & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top Bar: "Client Status Email Writer"  |  Safety Invariants  |  Reset  │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴──────────────────────────────┐
    ▼                                                              ▼
┌─────────────────────────────────┐   ┌──────────────────────────────────┐
│ Left Column: Input Workspace    │   │ Right Column: Client Draft Desk  │
│                                 │   │                                  │
│ 1. Meeting Notes (Textarea)     │   │ • Subject Line + Copy Button     │
│ 2. Ticket List (Textarea)       │   │ • Live Word Counter (e.g. 178w)  │
│ 3. Client Email / Context (Opt) │   │ • 4-Section Draft Area (Editable)│
│                                 │   │   - Summary                      │
│ [ Generate Email Draft (CTA) ]  │   │   - Progress                     │
│ [ Clear All Fields ]            │   │   - What we need from you        │
│                                 │   │   - Next meeting                 │
│ • Acceptance Test Reference Bar │   │ [ Copy Formatted Email ]         │
└─────────────────────────────────┘   │                                  │
                                      │ • Open Questions Box             │
                                      │   - Missing decisions/dates      │
                                      │   - Conflicting facts [bracketed]│
                                      │   - Out-of-scope follow-up items │
                                      │   [ Copy Open Questions ]        │
                                      └──────────────────────────────────┘
```

### Data Model & Server Contract

```typescript
// Client-to-Server Request Payload
interface StatusEmailRequest {
  meetingNotes: string;
  ticketList: string;
  clientEmail?: string;
}

// Server-to-Client Response Payload
interface StatusEmailResponse {
  subject: string;
  emailDraft: string; // Ready-to-copy plaintext with 4 sections
  sections: {
    summary: string;
    progress: string;
    whatWeNeedFromYou: string;
    nextMeeting: string;
  };
  openQuestions: string[]; // Items missing, conflicting, or out of scope
  wordCount: number;
  safetyCheck: {
    datesStandardized: boolean; // "Oct 21" style
    internalOwnersExcluded: boolean;
    hasPlaceholders: boolean;
  };
}
```

### Gemini Prompting & Boundary Rules
The server enforces the complete rule set:
1. **Four Sections Only**: Summary, Progress, What we need from you, Next meeting.
2. **Word Count**: Under 250 words total for the email. Plain sentences only, absolutely no markdown tables.
3. **Date Format**: Every date must be formatted strictly as "Oct 21" (e.g., Oct 7, Oct 14, Nov 2, Nov 18, Nov 30). Never "21. Okt.", "21/10", or "2026-10-21".
4. **Internal Redaction**: Never mention developer names (e.g., Alex, Sarah, Dave, Jonas) or ticket owners. Never expose internal deadlines as client commitments.
5. **Exact Status & Grounding**: Use only facts explicitly in notes/tickets. If notes don't state "on track" or "as planned", do not write it. If a project is at risk, state it is at risk without inventing new catch-up dates.
6. **Out-of-Scope Requests**: If client asks for new items (e.g., new training, extra features), state that it is out of scope or will be followed up separately, and say nothing more.
7. **Bracketed Placeholders & Open Questions**: If a date, decision, or owner is missing or sources conflict, write a bracketed placeholder like `[date missing]` or `[confirm data file status]` in the draft, and list the exact clarification required in `openQuestions`.

---

## 5. Verification & Acceptance Criteria Plan

The implementation will be verified against all five acceptance scenarios from the prompt:
1. **Test 1 (Normal – Oct 7 meeting)**: Data file promised, phone question open -> 4 sections, "Oct 14" date format, no developer names, phone question not marked out of scope, data migration not marked "blocked".
2. **Test 2 (Normal – Oct 21 meeting)**: File arrived, training agreed Nov 18 -> Launch confirmed, Nov 18 training included, no invented client obligations.
3. **Test 3 (Normal – Oct 28 meeting)**: Launch at risk -> Explicitly states launch at risk, no invented date/plan, requests corrected file by Nov 2.
4. **Test 4 (Messy chaotic notes & German dates)**: German formats converted to "Nov 30" style, Sarah's forwarded email sanitized, login bug not claimed as simply completed, no unrequested training proposal offered.
5. **Test 5 (Should ask – gaps & conflicts)**: Missing meeting date, unknown launch date, conflicting file status -> Bracketed placeholders inserted in email body and all 3 gaps populated in Open Questions box.
