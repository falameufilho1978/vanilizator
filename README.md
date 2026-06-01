# vanilizator

A crypto text tool. Paste any text, hit **vanilize**, and the app returns two rewrites of the same content:

- **vanilla** — clean, professional copy
- **unhinged** — 4am crypto degen energy (heavy slang, lowercase, typos, no em-dashes)

A client-side **intensity slider** blends word-by-word between the two versions, and an **em-dash kill switch** scrubs em/en dashes from the output. Facts are kept true across both rewrites — only the tone changes.

## Stack

- Next.js 14 (App Router)
- `@anthropic-ai/sdk` with model `claude-haiku-4-5`
- API route at `app/api/transform/route.ts` (server-side only)

## Local development

```bash
npm install
cp .env.example .env.local   # then paste your real key
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Name                | Where        | Notes                                              |
| ------------------- | ------------ | -------------------------------------------------- |
| `ANTHROPIC_API_KEY` | server only  | Used by the `/api/transform` route. Never exposed. |

Set it locally in `.env.local` and, for production, in your Vercel project settings.

## How it works

1. The browser POSTs `{ text }` to `/api/transform`.
2. The route calls Claude (`claude-haiku-4-5`) with a system prompt that asks for `{ "vanilla", "unhinged" }` JSON.
3. The frontend blends the two strings client-side based on the slider, optionally killing em-dashes.
