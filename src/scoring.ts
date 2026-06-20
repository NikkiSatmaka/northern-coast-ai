import type { LeadScoreRequest, LeadScoreResponse, Tier } from "./schema";

const PRODUCT_PATTERNS = [
  /red\s*bull/i,
  /monster/i,
  /coca[-\s]?cola/i,
  /\bcoke\b/i,
  /energy\s+drinks?/i,
  /beverages?/i
];

const LICENSE_POSITIVE = /\b(licensed|license|import\s+license|permit|authorized|registered)\b/i;
const LICENSE_PENDING = /\b(in\s+process|pending|expected|awaiting|applying|application)\b/i;
const BUSINESS_SIGNAL = /\b(distributor|wholesaler|importer|retail\s+accounts?|supermarkets?|chains?|horeca|b2b|brands?)\b/i;
const CONSUMER_SIGNAL = /\b(office\s+party|few\s+cans|personal|birthday|wedding|home|sample only)\b/i;

type Signals = {
  hasProductFit: boolean;
  hasActiveLicense: boolean;
  hasPendingLicense: boolean;
  hasBusinessSignal: boolean;
  hasConsumerSignal: boolean;
  maxFcl: number;
  yearsImporting: number;
  retailAccounts: number;
};

export function scoreWithRules(payload: LeadScoreRequest): LeadScoreResponse {
  const transcript = payload.conversation.map((turn) => `${turn.role}: ${turn.text}`).join("\n");
  const signals = extractSignals(transcript);
  const reasons: string[] = [];
  let score = 10;

  if (signals.hasProductFit) {
    score += 20;
    reasons.push("priority beverage product fit");
  }

  if (signals.maxFcl >= 2) {
    score += 25;
    reasons.push(`${signals.maxFcl} FCL/month demand`);
  } else if (signals.maxFcl >= 1) {
    score += 18;
    reasons.push("container-load demand");
  }

  if (signals.hasActiveLicense) {
    score += 20;
    reasons.push("active import license");
  } else if (signals.hasPendingLicense) {
    score += 8;
    reasons.push("license not yet active");
  }

  if (signals.yearsImporting >= 5) {
    score += 15;
    reasons.push(`${signals.yearsImporting} years importing history`);
  } else if (signals.yearsImporting > 0) {
    score += 10;
    reasons.push("some importing history");
  }

  if (signals.retailAccounts >= 100) {
    score += 10;
    reasons.push("established retail account base");
  } else if (signals.hasBusinessSignal) {
    score += 8;
    reasons.push("real distributor signal");
  }

  if (signals.hasConsumerSignal) {
    score -= 35;
    reasons.push("consumer-scale request");
  }
  if (!signals.hasProductFit) score -= 10;
  if (!signals.hasBusinessSignal && signals.maxFcl === 0) score -= 15;

  const finalScore = clamp(score);
  const tier = tierForScore(finalScore);

  return {
    lead_id: payload.lead_id,
    score: finalScore,
    tier,
    routing: routingForTier(tier),
    reasoning: reasoningFor(tier, reasons, signals)
  };
}

export function extractSignals(transcript: string): Signals {
  const lower = transcript.toLowerCase();
  const fclValues = [...lower.matchAll(/(\d+(?:\.\d+)?)\s*[-–]?\s*(?:to\s*)?(\d+(?:\.\d+)?)?\s*fcl/g)]
    .map((match) => Number(match[2] ?? match[1]))
    .filter(Number.isFinite);
  const years = [...lower.matchAll(/(\d+)\s*(?:\+?\s*)?(?:years?|yrs?)\s+(?:importing|licensed|in\s+business|experience)/g)]
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);
  const accountsMatch = lower.match(/(\d+)\s*(?:retail\s+)?accounts?/);
  const hasPendingLicense = LICENSE_PENDING.test(transcript);

  return {
    hasProductFit: PRODUCT_PATTERNS.some((pattern) => pattern.test(transcript)),
    hasActiveLicense: LICENSE_POSITIVE.test(transcript) && !hasPendingLicense,
    hasPendingLicense,
    hasBusinessSignal: BUSINESS_SIGNAL.test(transcript) || years.length > 0 || Boolean(accountsMatch),
    hasConsumerSignal: CONSUMER_SIGNAL.test(transcript),
    maxFcl: fclValues.length > 0 ? Math.max(...fclValues) : 0,
    yearsImporting: years.length > 0 ? Math.max(...years) : 0,
    retailAccounts: accountsMatch ? Number(accountsMatch[1]) : 0
  };
}

function tierForScore(score: number): Tier {
  if (score >= 75) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

function routingForTier(tier: Tier): LeadScoreResponse["routing"] {
  if (tier === "Hot") return "kam_handoff";
  if (tier === "Warm") return "nurture_pool";
  return "auto_archive";
}

function reasoningFor(tier: Tier, reasons: string[], signals: Signals): string {
  const summary = toSentence(reasons.slice(0, 3).join(", ") || "limited qualified wholesale signal");
  if (tier === "Hot") return `${summary}. Ready for KAM handoff.`;
  if (signals.hasPendingLicense) {
    return "Good product and volume signal, but import licensing is not active yet. Keep in nurture until readiness is confirmed.";
  }
  if (tier === "Warm") return `${summary}. Worth nurturing while confirming readiness and buying authority.`;
  return `${summary}. Not enough qualified wholesale signal for KAM follow-up.`;
}

function toSentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
