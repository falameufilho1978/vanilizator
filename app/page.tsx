"use client";

import { useMemo, useState } from "react";

type Version = { at: number; text: string };
type Result = { versions: Version[] };

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
      if (!Array.isArray(data?.versions) || data.versions.length === 0) {
        throw new Error("The response was missing voice variants.");
      }
      setResult({ versions: data.versions });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const blended = useMemo(() => {
    if (!result) return "";
    const out = blendAcrossAnchors(result.versions, intensity);
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
 * Find the two anchors that bracket the slider position, then sentence-blend
 * between them at the local fraction. With 7 anchors spread across 0–100,
 * each slider region (e.g. 30–50) interpolates between two semantically
 * adjacent voices — every drag produces visibly different text.
 *
 * Why no power easing here: the anchors are already spaced semantically
 * (Pure vanilla → LinkedIn → Group chat → Caramelized → Crypto Twitter →
 * Posting through it → Unhinged AF). The slider is doing local interpolation
 * inside each pair, so a linear fraction reads honestly. The "feels too
 * crazy at 50%" problem the old curve solved is dead — at 50% the slider
 * now lands ON an anchor ("Caramelized"), so what you see is exactly the
 * model's mid-tier voice, not a vanilla/unhinged interpolation.
 */
function blendAcrossAnchors(versions: Version[], intensity: number): string {
  if (versions.length === 0) return "";
  if (versions.length === 1) return versions[0].text;

  // Anchors arrive sorted from the API, but defensive-sort in case.
  const sorted = [...versions].sort((a, b) => a.at - b.at);
  const n = sorted.length;

  // Out-of-range clamps to the endpoints.
  if (intensity <= sorted[0].at) return sorted[0].text;
  if (intensity >= sorted[n - 1].at) return sorted[n - 1].text;

  // Find the bracket.
  let lower = sorted[0];
  let upper = sorted[n - 1];
  for (let i = 0; i < n - 1; i++) {
    if (sorted[i].at <= intensity && sorted[i + 1].at >= intensity) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  // Sitting exactly on an anchor — return that voice verbatim, no blend.
  if (intensity === lower.at) return lower.text;
  if (intensity === upper.at) return upper.text;

  const span = upper.at - lower.at;
  const t = span > 0 ? (intensity - lower.at) / span : 0;
  return blendSentences(lower.text, upper.text, t);
}

/**
 * Sentence-level blend between two texts. Picks whole sentences from one
 * source or the other based on a low-discrepancy threshold — eliminates the
 * repeated-word artifacts a word-interleave would produce.
 */
function blendSentences(a: string, b: string, p: number): string {
  if (p <= 0) return a;
  if (p >= 1) return b;
  const aSents = splitSentences(a);
  const bSents = splitSentences(b);
  const n = Math.max(aSents.length, bSents.length);
  const PHI = 0.6180339887498949;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const r = ((i + 1) * PHI) % 1;
    const useB = r < p;
    const src = useB ? bSents : aSents;
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
