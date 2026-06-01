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
        <h1 className="brand">vanilizator</h1>
        <p className="tagline">
          paste anything. slide between a clean, professional rewrite and a 4am
          crypto degen one. facts stay true, vibes do not.
        </p>
      </header>

      <section className="row">
        <span className="label">Your text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="paste a tweet, an announcement, a whitepaper paragraph, a press release..."
          maxLength={6000}
        />
        <div className="controls" style={{ marginTop: 14 }}>
          <button className="go" onClick={transform} disabled={!canGo}>
            {loading ? (
              <>
                <span className="spin" />
                vanilizing
              </>
            ) : (
              "vanilize →"
            )}
          </button>
          <button
            className="ghost"
            onClick={() => setText(SAMPLE)}
            disabled={loading}
          >
            try a sample
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
            vanilla
          </span>
          <span className="r" data-active={intensity >= 50 ? "true" : undefined}>
            unhinged
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          style={{ ["--pct" as string]: `${intensity}%` }}
          aria-label="intensity"
        />
        <div className="pctline">
          intensity <b>{intensity}%</b> degen
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
            em-dash kill switch <b>{killDashes ? "ON" : "OFF"}</b>
          </span>
        </div>

        <div className="output" data-empty={!result}>
          {result ? blended : "your blended output shows up here once you vanilize something."}
        </div>

        {result && (
          <div className="copybar">
            <button className="ghost" onClick={copy}>
              {copied ? "copied ✓" : "copy output"}
            </button>
          </div>
        )}
      </section>

      <p className="foot">
        100% soy wax. side effects may include irreversibly going full degen.
      </p>
    </main>
  );
}

/**
 * Blend two strings word-by-word by intensity p (0..1).
 * Each output slot picks the unhinged word vs the vanilla word using a stable,
 * evenly-spread pseudo-random threshold (golden-ratio low-discrepancy sequence),
 * so the mix shifts smoothly and deterministically as the slider moves.
 */
function blend(vanilla: string, unhinged: string, p: number): string {
  if (p <= 0) return vanilla;
  if (p >= 1) return unhinged;

  const v = vanilla.split(/(\s+)/); // keep whitespace tokens
  const u = unhinged.split(/(\s+)/);
  const len = Math.round(v.length + (u.length - v.length) * p);

  const PHI = 0.6180339887498949;
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    const r = (i * PHI) % 1; // evenly distributed in [0,1)
    const fromUnhinged = r < p;
    const src = fromUnhinged ? u : v;
    // map output index into the source array proportionally so we don't run off the end
    const idx = Math.min(src.length - 1, Math.round((i / Math.max(1, len - 1)) * (src.length - 1)));
    const token = src[idx] ?? "";
    out.push(token);
  }

  // collapse any doubled whitespace produced by interleaving
  return out.join("").replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n").trim();
}

// Replace em/en dashes (and the surrounding spaces) with a comma + space.
function stripDashes(s: string): string {
  return s
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+,/g, ",");
}
