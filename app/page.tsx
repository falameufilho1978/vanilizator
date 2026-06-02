"use client";

import { useMemo, useState } from "react";

type Result = { vanilla: string; unhinged: string };

const SAMPLE =
  "We're excited to announce that our protocol has completed its security audit and will launch its mainnet next quarter. Staking rewards begin at launch.";

// Vibe ladder. 17 distinct tiers so the label visibly changes as the user
// drags the slider (~every 5–7 units). Arc: corporate/formal at the bottom,
// online-casual in the middle, crypto-online → degen at the top. Dessert
// metaphors (toasted / caramelized) thread through the middle as a callback
// to the brand. Default 50% lands exactly on "Caramelized".
const INTENSITY_LEVELS: ReadonlyArray<{ at: number; name: string }> = [
  { at: 0, name: "Pure vanilla" },
  { at: 1, name: "Boardroom" },
  { at: 8, name: "Press release" },
  { at: 15, name: "LinkedIn" },
  { at: 22, name: "Casual Friday" },
  { at: 30, name: "Group chat" },
  { at: 37, name: "Lightly toasted" },
  { at: 44, name: "Quote tweet" },
  { at: 50, name: "Caramelized" },
  { at: 57, name: "Locked in" },
  { at: 64, name: "Crypto Twitter" },
  { at: 71, name: "Reply guy" },
  { at: 78, name: "Down bad" },
  { at: 84, name: "Posting through it" },
  { at: 90, name: "WAGMI delirium" },
  { at: 96, name: "Terminally online" },
  { at: 100, name: "Unhinged AF" },
];

function vibeFor(n: number): string {
  for (let i = INTENSITY_LEVELS.length - 1; i >= 0; i--) {
    if (n >= INTENSITY_LEVELS[i].at) return INTENSITY_LEVELS[i].name;
  }
  return INTENSITY_LEVELS[0].name;
}

export default function Page() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [intensity, setIntensity] = useState(50);
  const [killDashes, setKillDashes] = useState(true);
  const [copied, setCopied] = useState(false);

  async function transform() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed.");
      setResult({ vanilla: data.vanilla, unhinged: data.unhinged });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const blended = useMemo(() => {
    if (!result) return "";
    const out = blend(result.vanilla, result.unhinged, intensity / 100);
    return killDashes ? stripDashes(out) : out;
  }, [result, intensity, killDashes]);

  async function copy() {
    if (!blended) return;
    await navigator.clipboard.writeText(blended);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  const canSend = text.trim().length > 0 && !loading;

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSend) {
      e.preventDefault();
      transform();
    }
  }

  return (
    <main className="app">
      <header className="hero">
        <h1 className="brand">vanillizator</h1>
        <p className="tagline">
          Paste anything. Slide from clean copy to 4am crypto degen. Same
          facts, opposite vibes.
        </p>
      </header>

      <section className="composer-wrap">
        <div className="composer">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Paste a tweet, an announcement, a whitepaper paragraph..."
            maxLength={6000}
            rows={3}
            disabled={loading}
          />
          <div className="composer-bottom">
            <button
              type="button"
              className="chip ghost"
              onClick={() => setText(SAMPLE)}
              disabled={loading}
            >
              Try a sample
            </button>
            <div className="composer-right">
              <span className="count">{text.length}/6000</span>
              <button
                type="button"
                className="send"
                onClick={transform}
                disabled={!canSend}
                aria-label="Vanillize"
              >
                {loading ? <span className="spin" /> : <ArrowIcon />}
              </button>
            </div>
          </div>
        </div>
        {error && <div className="err">{error}</div>}
      </section>

      {result && (
        <section className="result">
          <div className="output-card">
            <div className="output-labels">
              <span className="output-label">Vanillized</span>
              <span className="vibe-label" aria-live="polite">
                {vibeFor(intensity)} <span className="dot">·</span> {intensity}%
              </span>
            </div>
            <div className="output-text">{blended}</div>
          </div>

          <div className="controls-row">
            <div className="chip slider-chip" role="group" aria-label="Intensity">
              <span className="lbl" data-active={intensity < 50}>Vanilla</span>
              <input
                type="range"
                min={0}
                max={100}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                style={{ ["--pct" as string]: `${intensity}%` }}
                aria-label="Degen intensity"
              />
              <span className="lbl" data-active={intensity >= 50}>Unhinged</span>
            </div>

            <button
              type="button"
              className="chip toggle-chip"
              data-on={killDashes}
              aria-pressed={killDashes}
              onClick={() => setKillDashes((v) => !v)}
            >
              <span className="switch" aria-hidden>
                <i />
              </span>
              Em-dash kill
            </button>

            <button type="button" className="chip ghost" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>
      )}

      <p className="foot">Vanillizator by Mascarenhas Productions LLC</p>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 12V2M2.5 6.5L7 2l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Sentence-level blend with perceptual easing. See engineering notes in
 * previous version: word-interleave produced repeated words; switching to
 * sentence-level eliminates that. p^2 easing pushes 50% slider toward ~25%
 * unhinged sentences so the middle reads vanilla-with-a-tinge.
 */
function blend(vanilla: string, unhinged: string, p: number): string {
  if (p <= 0) return vanilla;
  if (p >= 1) return unhinged;
  const eased = p * p;
  const vSents = splitSentences(vanilla);
  const uSents = splitSentences(unhinged);
  const n = Math.max(vSents.length, uSents.length);
  const PHI = 0.6180339887498949;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = ((i + 1) * PHI) % 1;
    const useUnhinged = r < eased;
    const src = useUnhinged ? uSents : vSents;
    const idx = Math.min(src.length - 1, i);
    out.push(src[idx] ?? "");
  }
  return out.join(" ").replace(/\s+/g, " ").trim();
}

function splitSentences(s: string): string[] {
  const sentences = s.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((x) => x.trim()).filter(Boolean);
  }
  const clauses = s.split(/(?<=[,;:])\s+/);
  if (clauses.length > 1) return clauses.map((x) => x.trim()).filter(Boolean);
  return [s.trim()];
}

function stripDashes(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}
