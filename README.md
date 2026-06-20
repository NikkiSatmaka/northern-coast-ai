# Northern Coast Lead Scoring Agent

Small Hono + TypeScript + Bun endpoint for Test 1. It accepts a lead conversation transcript at `POST /score` and returns a score, tier, routing decision, and short rationale.

The primary model path uses OpenRouter's OpenAI-compatible `/chat/completions` API with `qwen/qwen3.5-9b`. The request asks for structured JSON output and the response is validated with Zod before it can be returned. `OPENROUTER_BASE_URL` is configurable, so the same code can later point at a local OpenAI-compatible llama.cpp server for testing.

The reliability baseline is a deterministic rule-based scorer. It weights product fit, active or pending import license, FCL volume, importer/distributor signals, importing history, and consumer-scale negative signals. If the LLM is missing, slow, unavailable, malformed, or schema-invalid, the endpoint returns the rule-based fallback.

With more time, I would add a small labeled eval set, record fallback rates, tune thresholds against converted leads, and add a human-review queue for high-upside ambiguous leads.

## Local

```bash
bun install
bun run dev
```

```bash
curl -X POST "http://localhost:3000/score" \
  -H "content-type: application/json" \
  -d '{"lead_id":"S002","channel":"email","conversation":[{"role":"lead","text":"hey can I get a few cans of red bull for my office party"}]}'
```

## Verify

```bash
bun test
bun run typecheck
```
