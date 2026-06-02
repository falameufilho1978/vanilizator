import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Always run on the server, never statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5";
const MAX_INPUT_CHARS = 6000;

// Canonical anchor points the slider interpolates between. Keep in sync with
// the prompt below — every value here must appear in the model's response.
const ANCHOR_ATS = [0, 15, 30, 50, 65, 85, 100] as const;

const SYSTEM_PROMPT = `You are vanillizator, a crypto text engine. You receive a user's text and return 7 rewrites at different "degen intensity" voices, from corporate-clean to terminally-online.

Return ONLY a single JSON object, no prose, no markdown fences, with exactly this shape:
{
  "versions": [
    { "at": 0,   "text": "<pure vanilla rewrite>" },
    { "at": 15,  "text": "<LinkedIn voice rewrite>" },
    { "at": 30,  "text": "<group chat voice rewrite>" },
    { "at": 50,  "text": "<caramelized: lowercase with light crypto seasoning>" },
    { "at": 65,  "text": "<crypto twitter voice rewrite>" },
    { "at": 85,  "text": "<posting through it: chaotic, lots of typos>" },
    { "at": 100, "text": "<unhinged AF: maximum 4am degen energy>" }
  ]
}

THE 7 VOICES, in order:

at 0 - PURE VANILLA: comms-team copy. Proper grammar, full capitalization, neutral confident tone. Like a press release headline.

at 15 - LINKEDIN: polished but slightly more contemporary. Full capitalization preserved. Like a LinkedIn announcement post by a founder. Maybe one emoji.

at 30 - GROUP CHAT: all-lowercase. Casual texting energy. Like messaging a coworker after work. Mild contemporary phrasing. No crypto-specific slang yet.

at 50 - CARAMELIZED: all-lowercase. Light crypto seasoning ("gm" or "ser" sprinkled in once, maybe twice). Still readable. Casual with a clear degen hint. This is where vanilla meets crypto.

at 65 - CRYPTO TWITTER: all-lowercase, multiple CT terms used naturally ("ser", "wagmi", "ngmi", "fren", "ape", "lfg", "bags"). Tweet-style brevity, dropped articles, "we're so back" energy.

at 85 - POSTING THROUGH IT: chaotic. Deliberate typos. "lets goooo", repeated punctuation, vowel stretching, keyboard-mashing energy. Still readable but feels intoxicated. Some random ALL CAPS for emphasis.

at 100 - UNHINGED AF: peak 4am degen. Heavy typos, mashed-together words, random ALL CAPS, crypto slang stuffed in. Maximum chaos while still being a coherent rewrite of the original.

CRITICAL RULES FOR ALL VERSIONS:
- Keep every factual claim TRUE to the input. Numbers, names, dates, partnerships, percentages, promises: do not invent or alter any of them. Voice changes, facts do not.
- Each version should preserve approximate length (within ±30% of the input).
- NEVER use em-dashes or en-dashes in any version. Use commas, periods, semicolons, or parentheses.
- Each version must be visibly distinct from its neighbors in voice and vocabulary. A user sliding through them should clearly feel the gradient.
- No disclaimers, no commentary, no markdown fences, no preamble. Just the JSON object.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let text: string;
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  text = text.trim();
  if (!text) {
    return NextResponse.json({ error: "Please provide some text." }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Text is too long (max ${MAX_INPUT_CHARS} characters).` },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 3072, // 7 versions of typical input — usually ~1.2K, headroom for long inputs
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // system prompt is stable, eligible to cache
        },
      ],
      messages: [
        {
          role: "user",
          content: `Rewrite the following text at the 7 intensity levels. Return only the JSON object with all 7 versions.\n\n<text>\n${text}\n</text>`,
        },
      ],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const parsed = extractJson(raw);
    if (!parsed || !Array.isArray(parsed.versions)) {
      return NextResponse.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    // Verify every anchor came back. Re-order by `at` so the slider can rely
    // on monotonic ordering when finding adjacent anchors.
    const versions: Array<{ at: number; text: string }> = [];
    for (const at of ANCHOR_ATS) {
      const v = parsed.versions.find(
        (x) => typeof x === "object" && x !== null && (x as { at?: unknown }).at === at
      ) as { at: number; text?: unknown } | undefined;
      if (!v || typeof v.text !== "string" || !v.text.trim()) {
        return NextResponse.json(
          { error: `The model skipped intensity ${at}. Please try again.` },
          { status: 502 }
        );
      }
      versions.push({ at, text: v.text.trim() });
    }

    return NextResponse.json({ versions });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
      return NextResponse.json({ error: `Upstream error: ${err.message}` }, { status });
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function extractJson(s: string): { versions?: unknown } | null {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
