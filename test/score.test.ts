import { describe, expect, test } from "bun:test";
import { app } from "../src/app";
import { scoreWithLlm } from "../src/llm";
import { LeadScoreRequestSchema } from "../src/schema";
import { scoreWithRules } from "../src/scoring";

const samples = [
  {
    name: "hot",
    expectedTier: "Hot",
    expectedRouting: "kam_handoff",
    input: {
      lead_id: "S001",
      channel: "whatsapp",
      conversation: [
        { role: "lead", text: "UAE distributor, 3 FCL/month Red Bull, 8 years importing energy drinks. Looking for original Austrian product." },
        { role: "agent", text: "Volume target on Red Bull specifically?" },
        { role: "lead", text: "2-3 FCL/month sustained. ~250 retail accounts across UAE." }
      ]
    }
  },
  {
    name: "cold",
    expectedTier: "Cold",
    expectedRouting: "auto_archive",
    input: {
      lead_id: "S002",
      channel: "email",
      conversation: [
        { role: "lead", text: "hey can I get a few cans of red bull for my office party" }
      ]
    }
  },
  {
    name: "ambiguous",
    expectedTier: "Warm",
    expectedRouting: "nurture_pool",
    input: {
      lead_id: "S003",
      channel: "email",
      conversation: [
        { role: "lead", text: "Ghana-based distributor looking for Coca-Cola products. New entrant, license in process - expected 6 weeks. Initial volume 1 FCL/month." }
      ]
    }
  }
] as const;

describe("rule-based fallback", () => {
  for (const sample of samples) {
    test(`scores ${sample.name} sample`, () => {
      const payload = LeadScoreRequestSchema.parse(sample.input);
      const result = scoreWithRules(payload);

      expect(result.lead_id).toBe(sample.input.lead_id);
      expect(result.tier).toBe(sample.expectedTier);
      expect(result.routing).toBe(sample.expectedRouting);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  }
});

describe("HTTP endpoint", () => {
  test("returns a valid score for POST /score without an API key", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await app.request("/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(samples[0].input)
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lead_id).toBe("S001");
    expect(body.tier).toBe("Hot");
    expect(body.routing).toBe("kam_handoff");
  });

  test("returns 400 for invalid payload", async () => {
    const response = await app.request("/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lead_id: "", conversation: [] })
    });

    expect(response.status).toBe(400);
  });

  test("also supports POST /api/score for Vercel function path", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const response = await app.request("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(samples[2].input)
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.lead_id).toBe("S003");
    expect(body.tier).toBe("Warm");
  });

  test("returns 405 for unsupported method on /score", async () => {
    const response = await app.request("/score", { method: "GET" });

    expect(response.status).toBe(405);
  });
});

describe("LLM fallback", () => {
  test("returns fallback when no API key is configured", async () => {
    delete process.env.OPENROUTER_API_KEY;

    const payload = LeadScoreRequestSchema.parse(samples[1].input);
    const fallback = scoreWithRules(payload);
    const result = await scoreWithLlm(payload, fallback);

    expect(result).toEqual(fallback);
  });
});
