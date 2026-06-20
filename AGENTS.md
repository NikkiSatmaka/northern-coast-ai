# AGENTS.md

## Purpose

This folder contains the Test 1 submission for the Northern Coast Beverages AI Platform Engineer take-home. Build a small, production-minded HTTP lead-scoring endpoint that accepts a conversation transcript and returns a valid routing decision.

The work should demonstrate senior engineering judgment: ship the contract, handle failure cleanly, explain choices briefly, and avoid unnecessary architecture.

## Non-Negotiable Requirements

- Use Hono, TypeScript, and Bun.
- Deploy target is Vercel free tier serverless.
- Use Zod for runtime validation.
- Bun natively reads `.env` files for local support.
- Use OpenRouter through its OpenAI-compatible API.
- Default model is `qwen/qwen3.5-9b`.
- Support `OPENROUTER_BASE_URL` so local testing can point at OpenAI-compatible llama.cpp later.
- Use structured output for the LLM response.
- Always provide a deterministic rule-based fallback if the LLM is unavailable, slow, malformed, or invalid.
- Provide a local dev command for testing.
- Provide tests and TypeScript typecheck; both must pass before considering the submission ready.

## API Contract

The endpoint must accept `POST` JSON in this shape:

```json
{
  "lead_id": "L001",
  "channel": "whatsapp",
  "conversation": [
    { "role": "lead", "text": "Hi, looking for wholesale Monster Energy supply for Singapore. 1 FCL/month." },
    { "role": "agent", "text": "Could you confirm your import license and history?" },
    { "role": "lead", "text": "Yes, licensed 4 years. Currently import 2 brands." }
  ]
}
```

The endpoint must return:

```json
{
  "lead_id": "L001",
  "score": 78,
  "tier": "Warm",
  "routing": "kam_handoff",
  "reasoning": "Licensed importer, moderate volume single-brand focus - eligible for KAM follow-up."
}
```

Rules:

- `score` is an integer from 0 to 100.
- `tier` is one of `Hot`, `Warm`, or `Cold`.
- `routing` is one of `kam_handoff`, `nurture_pool`, or `auto_archive`.
- `reasoning` is one or two concise sentences.
- Malformed input should return a clear JSON `400` response.
- Unsupported methods should return a clear JSON error.

## Runtime And Deployment Constraints

- Vercel free tier/serverless is the production target.
- Keep request latency comfortably below the free-tier function limit.
- Use a hard timeout around the LLM call.
- Do not retry LLM calls inside the request path.
- Do not require persistent storage.
- Do not rely on background jobs.
- Do not commit secrets.
- Vercel deployment will happen later from Fedora Linux; keep scripts and docs portable.

## Environment Variables

Use these names:

```text
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=qwen/qwen3.5-9b
APP_URL=
APP_NAME=Northern Coast Lead Scoring Agent
PORT=3000
```

`OPENROUTER_BASE_URL` must remain configurable. The default documented value should be OpenRouter, but the implementation should also work with a local OpenAI-compatible llama.cpp server later.

## LLM Behavior

- Call the OpenAI-compatible chat completions endpoint.
- Prefer `/chat/completions` for compatibility with OpenRouter and llama.cpp-style local testing.
- Request structured JSON output using `response_format` where supported.
- The prompt should be short and explicit.
- The model should score only from the supplied transcript and deterministic baseline.
- Never trust model output directly; parse and validate it with Zod.
- If the response is missing, non-JSON, schema-invalid, mismatched on `lead_id`, or semantically invalid, return the rule-based fallback.

## Rule-Based Fallback

The fallback scorer must work without any API key or network access.

It should use simple, explainable signals:

- Import license or import readiness.
- Product fit for wholesale beverage distribution.
- Volume, especially `>= 1 FCL/month`.
- Importer, distributor, wholesaler, retail-account, or real-business evidence.
- Importing history or operating history.
- Negative signals for consumer-scale requests such as office parties or a few cans.

The fallback does not need to be perfect. It needs to be deterministic, defensible, and good enough to satisfy the sample payloads and provide safe behavior during LLM failure.

## Code Style

- Keep the app small and lean.
- Prefer direct functions over classes.
- Avoid abstractions unless they remove real duplication or clarify a boundary.
- Keep dependency count low.
- Use explicit types at module boundaries.
- Keep validation, scoring, LLM call, and HTTP handling easy to inspect.
- Do not add a database, queue, auth layer, frontend, agent framework, tracing stack, or eval framework.
- Do not build features not requested by the brief.
- Use ASCII unless there is a clear reason not to.

## Suggested Shape

The final project may use this shape, but it can be simplified if a file feels ceremonial:

```text
submission/
  AGENTS.md
  .gitignore
  .env.example
  package.json
  tsconfig.json
  vercel.json
  api/
    score.ts
  src/
    app.ts
    config.ts
    schema.ts
    scoring.ts
    llm.ts
    dev.ts
  test/
    score.test.ts
  README.md
  DEPLOY.md
```

## Testing Expectations

Tests should cover:

- The three sample payloads from the brief.
- Malformed JSON or invalid payloads.
- Rule-based fallback without an API key.
- LLM failure or invalid model output if practical without heavy mocking.
- HTTP route behavior through the Hono app.

Verification commands should include:

```bash
bun test
bun run typecheck
```

## Documentation Expectations

`README.md` should be brief and practical:

- What the endpoint does.
- How to run locally.
- Model choice and why.
- Fallback behavior.
- Scoring rationale.
- What would be improved with more time.

`DEPLOY.md` should be Fedora/Vercel friendly:

- Install dependencies.
- Set Vercel environment variables.
- Deploy.
- Smoke-test with `curl`.

## Definition Of Done

The Test 1 submission is ready only when:

- The endpoint contract is implemented.
- Local dev server works.
- Tests pass.
- Typecheck passes.
- README and DEPLOY are concise and accurate.
- No secrets are committed.
- The app remains small enough to understand in one sitting.
