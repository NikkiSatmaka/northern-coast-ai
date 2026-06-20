const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "qwen/qwen3.5-9b";

export type AppConfig = {
  openRouterApiKey?: string;
  openRouterBaseUrl: string;
  openRouterModel: string;
  appUrl: string;
  appName: string;
  port: number;
  llmTimeoutMs: number;
};

export function getConfig(): AppConfig {
  return {
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterBaseUrl: stripTrailingSlash(process.env.OPENROUTER_BASE_URL || DEFAULT_BASE_URL),
    openRouterModel: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    appUrl: process.env.APP_URL || "http://localhost:3000",
    appName: process.env.APP_NAME || "Northern Coast Lead Scoring Agent",
    port: Number(process.env.PORT || 3000),
    llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS || 6000)
  };
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
