"use client";

import { useMemo, useState } from "react";

type Result = { vanilla: string; unhinged: string };

const SAMPLE =
  "We're excited to announce that our protocol has completed its security audit and will launch its mainnet next quarter. Staking rewards begin at launch.";

export default function Page() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [intensity, setIntensity] = useState(50); // 0 = vanilla, 100 = unhinged
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
      if (!res.ok) {
        throw new Error(data?.error || "Request failed.");
      }
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

  const canGo = text.trim().length > 0 && !loading;

  return (
    <main className="wrap">
      <header className="masthead">
        <h1 className="brand">vanillizator</h1>
        <p className="tagline">
          Paste anything. Slide from clean copy to 4am crypto degen. Same
          facts, opposite vibes.
        </p>
      </header>

      <section className="row">
        <span className="label">Your text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="A tweet, an announcement, a whitepaper paragraph, a press release..."
          maxLength={6000}
        />
        <div className="controls">
          <button className="go" onClick={transform} disabled={!canGo}>
            {loading ? (
              <>
                <span className="spin" />
                Vanillizing
              </>
            ) : (
              "Vanillize →"
            )}
          </button>
          <button
            className="ghost"
            onClick={() => setText(SAMPLE)}
            disabled={loading}
          >
            Try a sample
          </button>
          <span className="count" style={{ marginLeft: "auto" }}>
            {text.length}/6000
          </span>
        </div>
        {error && <div className="err">{error}</div>}
      </section>

      <section className="blender" data-empty={!result}>
        <div className="sliderhead">
          <span className="l" data-active={intensity < 50}>
            Vanilla
          </span>
          <span className="r" data-active={intensity >= 50 ? "true" : undefined}>
            Unhinged
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          style={{ ["--pct" as string]: `${intensity}%` }}
          aria-label="Intensity"
        />
        <div className="pctline">
          Intensity <b>{intensity}%</b> degen
        </div>

        <div
          className="toggle"
          role="switch"
          aria-checked={killDashes}
          tabIndex={0}
          onClick={() => setKillDashes((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setKillDashes((v) => !v);
            }
          }}
        >
          <span className="switch" data-on={killDashes}>
            <i />
          </span>
          <span>
            Em-dash kill switch <b>{killDashes ? "ON" : "OFF"}</b>
          </span>
        </div>

        <div className="output" data-empty={!result}>
          {result
            ? blended
            : "Your blended output shows up here once you vanillize something."}
        </div>

        {result && (
          <div className="copybar">
            <button className="ghost" onClick={copy}>
              {copied ? "Copied ✓" : "Copy output"}
            </button>
          </div>
        )}
      </section>

      <p className="foot">Vanillizator by Mascarenhas Productions LLC</p>
    </main>
  );
}

/**
 * Sentence-level blend. Split both versions into sentences; for each output
 * sentence slot, pick the unhinged version with probability `eased`, otherwise
 * the vanilla one. Picking whole sentences (rather than interleaving words)
 * eliminates the repeated-word artifacts the word-interleave used to produce.
 *
 * Perceptual easing: each unhinged sentence carries far more chaos signal
 * than each vanilla sentence carries order signal, so we raise the slider
 * value to a power > 1. At intensity^2.0:
 *   25% slider → ~6% unhinged sentences
 *   50% slider → 25% (firmly vanilla with a degen tinge — "a bit more normal")
 *   75% slider → ~56%
 *   100% → 100%
 * Endpoints (0/100) are preserved exactly.
 */
function blend(vanilla: string, unhinged: string, p: number): string {
  if (p <= 0) return vanilla;
  if (p >= 1) return unhinged;

  const eased = p * p;

  const vSents = splitSentences(vanilla);
  const uSents = splitSentences(unhinged);
  const n = Math.max(vSents.length, uSents.length);

  // For very short inputs (1 sentence both sides), the slider behaves as a
  // binary switch with threshold = eased. That's the honest UX for short text:
  // either the clean version or the degen one, no interleave nonsense.
  const PHI = 0.6180339887498949;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    // Offset by 1 so the sequence doesn't open at r=0 (which would force the
    // first sentence to flip to unhinged at any non-zero slider position).
    // With the offset, short inputs at 50% read as "clean opener, degen pivot"
    // rather than degen-first.
    const r = ((i + 1) * PHI) % 1;
    const useUnhinged = r < eased;
    const src = useUnhinged ? uSents : vSents;
    const idx = Math.min(src.length - 1, i);
    out.push(src[idx] ?? "");
  }

  return out.join(" ").replace(/\s+/g, " ").trim();
}

// Split on sentence boundaries; preserve trailing punctuation on each sentence.
// Falls back to clause-level (commas) for inputs without sentence punctuation,
// so the slider still has something to switch on for short single-clause text.
function splitSentences(s: string): string[] {
  const sentences = s.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 1) {
    return sentences.map((x) => x.trim()).filter(Boolean);
  }
  // Fallback to clause-level splits for tweets/headlines with no full stops.
  const clauses = s.split(/(?<=[,;:])\s+/);
  if (clauses.length > 1) return clauses.map((x) => x.trim()).filter(Boolean);
  return [s.trim()];
}

// Replace em/en dashes (and the surrounding spaces) with a comma + space.
function stripDashes(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}
