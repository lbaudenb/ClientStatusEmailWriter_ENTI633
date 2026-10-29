import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: Date.now() });
});

// Shared Gemini client setup following Gemini API guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface StatusEmailPayload {
  meetingNotes: string;
  ticketList: string;
  clientEmail?: string;
}

const SYSTEM_INSTRUCTION = `You are an expert executive consulting communications specialist. Your sole job is to transform raw meeting notes and an internal ticket list (and optional client email) into a clean, safe, client-ready weekly status email.

CRITICAL BOUNDARIES AND RULES:
1. OUTPUT STRUCTURE:
   Draft email in English consisting of:
   - Subject line: Concise, clear subject line (e.g., "Project Status Update – Oct 21").
   - Exactly four sections with exact headers:
     Summary
     Progress
     What we need from you
     Next meeting
   - Open questions: A distinct list of any missing items, unclear points, conflicting facts, or out-of-scope requests requiring client or internal resolution.

2. TARGET AUDIENCE & FORMAT:
   - Written for non-technical client executives reading on their mobile phones.
   - Keep the entire draft email strictly UNDER 250 words.
   - Use plain sentences. ABSOLUTELY NO tables. Bullet points with short plain sentences are permitted within sections for readability.

3. DATES:
   - All dates MUST be formatted strictly as "Mon Day" (e.g. "Oct 7", "Oct 14", "Oct 21", "Oct 28", "Nov 2", "Nov 18", "Nov 30").
   - NEVER use German/European formats like "21. Okt." or "21.10." or ISO formats like "2026-10-21". Convert all dates to standard English "Oct 21" style.

4. FACTUAL RIGOR & EXACT STATUS:
   - Use ONLY facts explicitly present in the provided meeting notes, tickets, and pasted client email.
   - Use the EXACT status from the notes and tickets. Do NOT soften, embellish, or upgrade status.
   - If a task is at risk, state that it is at risk. Do NOT invent new catch-up dates or recovery plans.
   - If a login bug or ticket is still in review/testing or pending, do NOT report it as simply done.
   - If a data file move was only promised, state that it was promised or in progress; do NOT label it "blocked" unless the notes explicitly state it is blocked.
   - Normal meeting questions (e.g. asking which phone number to use) are valid open items or next steps, NOT "out of scope".

5. TICKET DUE DATES & INTERNAL DATA:
   - Internal ticket due dates are internal estimates/plans. NEVER present internal ticket due dates as client commitments.
   - NEVER name our developers, engineers, or ticket owners (e.g., Alex, Sarah, Dave, Jonas, Michael, etc.). Always refer to "our team" or "we", or use passive phrasing. Never leak ticket owner fields.

6. MISSING INFORMATION & CONFLICTS:
   - If a date, decision, status, or owner is missing or the sources conflict (e.g. notes say file received but tickets say pending, or meeting date not scheduled), insert a clear bracketed placeholder in the email draft like [Confirm next meeting date] or [Status of data file to be verified].
   - Simultaneously add an explicit, concise question to "openQuestions" explaining what is missing or conflicting.

7. OUT-OF-SCOPE CLIENT REQUESTS:
   - If the client asks for something new (e.g., extra features, new scope, uncontracted training), state that it is out of scope or that we will follow up separately, and say nothing more. Never quote prices, invent plans, or offer new proposals.

8. ABSOLUTE PROHIBITIONS:
   - NEVER write "on track" or "as planned" unless the notes explicitly say so.
   - NEVER offer follow-up projects, extra work, proposals, prices, or new plans.
   - NEVER invent dates, facts, client actions, or decisions.
   - Keep the language crisp, direct, respectful, and professional.`;

app.post('/api/generate-status-email', async (req, res) => {
  try {
    const { meetingNotes, ticketList, clientEmail } = req.body as StatusEmailPayload;

    if (!meetingNotes?.trim() && !ticketList?.trim()) {
      return res.status(400).json({
        error: 'Please provide meeting notes or a ticket list to generate the status email.',
      });
    }

    const prompt = `Please process the following inputs according to all the strict rules:

=== MEETING NOTES ===
${meetingNotes || '(None provided)'}

=== TICKET LIST ===
${ticketList || '(None provided)'}

=== CLIENT EMAIL / CONTEXT (OPTIONAL) ===
${clientEmail || '(None provided)'}

Generate:
1. Subject line
2. Four sections:
   - Summary
   - Progress
   - What we need from you
   - Next meeting
3. Open questions: An array of strings with any missing dates, conflicting information, unclear items, or out-of-scope items.
4. Full email draft combining the subject and all four sections into a cohesive plain-text email under 250 words.`;

    const generateWithModel = async (model: string): Promise<GenerateContentResponse> => {
      const genResponse = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.1,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subject: {
                type: Type.STRING,
                description: 'The email subject line, e.g. Project Status Update – Oct 21',
              },
              sections: {
                type: Type.OBJECT,
                properties: {
                  summary: {
                    type: Type.STRING,
                    description: 'Summary section content in plain sentences.',
                  },
                  progress: {
                    type: Type.STRING,
                    description: 'Progress section content in plain sentences.',
                  },
                  whatWeNeedFromYou: {
                    type: Type.STRING,
                    description: 'What we need from you section content in plain sentences.',
                  },
                  nextMeeting: {
                    type: Type.STRING,
                    description: 'Next meeting section content in plain sentences.',
                  },
                },
                required: ['summary', 'progress', 'whatWeNeedFromYou', 'nextMeeting'],
              },
              openQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: 'List of missing dates, unclear decisions, conflicting facts, or out-of-scope items.',
              },
              emailDraft: {
                type: Type.STRING,
                description: 'The complete cohesive email draft with Subject, Summary, Progress, What we need from you, and Next meeting under 250 words.',
              },
            },
            required: ['subject', 'sections', 'openQuestions', 'emailDraft'],
          },
        },
      });
      return genResponse;
    };

    let responseText: string | null = null;
    let lastError: any = null;

    try {
      const genResult = await generateWithModel('gemini-3-flash-preview');
      if (genResult.text) responseText = genResult.text;
    } catch (e: any) {
      lastError = e;
      try {
        const genResult2 = await generateWithModel('gemini-3.8-flash');
        if (genResult2.text) responseText = genResult2.text;
      } catch (e2: any) {
        lastError = e2;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Service temporarily unavailable. Please try again.');
    }

    const text = responseText || '{}';
    const parsed = JSON.parse(text);

    // Format clean cohesive email draft if not already spaced
    const sections = parsed.sections || {};
    const formattedDraft = parsed.emailDraft && parsed.emailDraft.includes('\n')
      ? parsed.emailDraft
      : `Summary:\n${sections.summary || ''}\n\nProgress:\n${sections.progress || ''}\n\nWhat we need from you:\n${sections.whatWeNeedFromYou || ''}\n\nNext meeting:\n${sections.nextMeeting || ''}`;

    // Calculate word count of the email draft (excluding open questions)
    const draftWords = formattedDraft
      .trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 0).length;

    // Safety checks for transparency in the UI
    const bannedDateRegex = /\b\d{1,2}\.\s*(?:Okt|Nov|Dez|Jan|Feb|Mär|Apr|Mai|Jun|Jul|Aug|Sep)\.?\b|\b\d{4}-\d{2}-\d{2}\b/i;
    const hasBannedDate = bannedDateRegex.test(formattedDraft);
    const hasBrackets = /\[.*?\]/.test(formattedDraft);

    return res.json({
      subject: parsed.subject || 'Weekly Project Status Update',
      sections: parsed.sections,
      openQuestions: parsed.openQuestions || [],
      emailDraft: formattedDraft,
      wordCount: draftWords,
      safetyCheck: {
        wordCountUnder250: draftWords <= 250,
        hasBannedDate,
        hasBrackets,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/generate-status-email:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate status email. Please try again.',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Client Status Email Writer server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
