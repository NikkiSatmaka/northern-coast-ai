# Deploy

Target: Vercel free tier, deployed later from Fedora Linux.

## Environment Variables

Set these in Vercel:

```text
OPENROUTER_API_KEY=<your key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=qwen/qwen3.5-9b
APP_URL=https://<project>.vercel.app
APP_NAME=Northern Coast Lead Scoring Agent
```

Only `OPENROUTER_API_KEY` is required for the LLM path. Without it, the endpoint still returns rule-based fallback results.

## Deploy

```bash
cd test-1-build/submission
bun install
bun test
bun run typecheck
vercel
vercel --prod
```

The documented endpoint is:

```text
https://<project>.vercel.app/score
```

## Smoke Test

```bash
curl -X POST "https://<project>.vercel.app/score" \
  -H "content-type: application/json" \
  -d '{"lead_id":"S001","channel":"whatsapp","conversation":[{"role":"lead","text":"UAE distributor, 3 FCL/month Red Bull, 8 years importing energy drinks."}]}'
```
