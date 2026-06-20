import { getConfig } from "./config";
import {
  LeadScoreJsonSchema,
  LeadScoreResponseSchema,
  type LeadScoreRequest,
  type LeadScoreResponse
} from "./schema";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

export async function scoreWithLlm(
  payload: LeadScoreRequest,
  fallback: LeadScoreResponse
): Promise<LeadScoreResponse> {
  const config = getConfig();
  if (!config.openRouterApiKey) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.llmTimeoutMs);

  try {
    const response = await fetch(`${config.openRouterBaseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "authorization": `Bearer ${config.openRouterApiKey}`,
        "content-type": "application/json",
        "http-referer": config.appUrl,
        "x-title": config.appName
      },
      body: JSON.stringify({
        model: config.openRouterModel,
        messages: [
          {
            role: "system",
            content: [
              "You score B2B beverage import leads for Northern Coast Beverages.",
              "Return only JSON matching the requested schema.",
              "Hot means KAM-ready: priority beverage fit, credible importer/distributor signal, active or strongly credible import readiness, and container-load demand.",
              "Warm means plausible wholesale opportunity but missing readiness, authority, licensing, or confidence.",
              "Cold means consumer-scale, no wholesale fit, or no meaningful business signal.",
              "Use the deterministic baseline as a guardrail and deviate only when the transcript clearly justifies it."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({
              payload,
              deterministic_baseline: fallback
            })
          }
        ],
        temperature: 0.1,
        max_tokens: 220,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "lead_score",
            strict: true,
            schema: LeadScoreJsonSchema
          }
        }
      })
    });

    if (!response.ok) return fallback;

    const data = await response.json() as ChatCompletionResponse;
    const parsed = parseModelContent(data.choices?.[0]?.message?.content);
    const result = LeadScoreResponseSchema.safeParse(parsed);

    if (!result.success || result.data.lead_id !== payload.lead_id) return fallback;
    return result.data;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

function parseModelContent(content: unknown): unknown {
  if (typeof content === "string") return JSON.parse(content);
  return content;
}
