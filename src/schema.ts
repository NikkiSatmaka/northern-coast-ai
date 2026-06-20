import { z } from "zod";

export const TierSchema = z.enum(["Hot", "Warm", "Cold"]);
export const RoutingSchema = z.enum(["kam_handoff", "nurture_pool", "auto_archive"]);

export const LeadScoreRequestSchema = z.object({
  lead_id: z.string().trim().min(1),
  channel: z.string().trim().min(1),
  conversation: z.array(
    z.object({
      role: z.enum(["lead", "agent"]),
      text: z.string().trim().min(1).max(4000)
    })
  ).min(1).max(50)
});

export const LeadScoreResponseSchema = z.object({
  lead_id: z.string().min(1),
  score: z.number().int().min(0).max(100),
  tier: TierSchema,
  routing: RoutingSchema,
  reasoning: z.string().min(1).max(500)
});

export type LeadScoreRequest = z.infer<typeof LeadScoreRequestSchema>;
export type LeadScoreResponse = z.infer<typeof LeadScoreResponseSchema>;
export type Tier = z.infer<typeof TierSchema>;

export const LeadScoreJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["lead_id", "score", "tier", "routing", "reasoning"],
  properties: {
    lead_id: { type: "string" },
    score: { type: "integer", minimum: 0, maximum: 100 },
    tier: { type: "string", enum: ["Hot", "Warm", "Cold"] },
    routing: { type: "string", enum: ["kam_handoff", "nurture_pool", "auto_archive"] },
    reasoning: {
      type: "string",
      description: "One or two concise sentences explaining the decision."
    }
  }
} as const;
