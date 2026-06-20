import { Hono, type Context } from "hono";
import { LeadScoreRequestSchema, LeadScoreResponseSchema } from "./schema";
import { scoreWithLlm } from "./llm";
import { scoreWithRules } from "./scoring";

export const app = new Hono();

const scoreHandler = async (c: Context) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON." }, 400);
  }

  const payload = LeadScoreRequestSchema.safeParse(body);
  if (!payload.success) {
    return c.json({
      error: "Invalid lead scoring payload.",
      issues: payload.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    }, 400);
  }

  const fallback = scoreWithRules(payload.data);
  const decision = await scoreWithLlm(payload.data, fallback);
  return c.json(LeadScoreResponseSchema.parse(decision));
};

app.post("/score", scoreHandler);
app.post("/api/score", scoreHandler);
app.all("/score", (c) => c.json({ error: "Method not allowed. Use POST /score." }, 405));
app.all("/api/score", (c) => c.json({ error: "Method not allowed. Use POST /api/score." }, 405));
app.notFound((c) => c.json({ error: "Not found. Use POST /score." }, 404));
