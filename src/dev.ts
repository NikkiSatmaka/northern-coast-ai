import { getConfig } from "./config";
import { app } from "./app";

const config = getConfig();

Bun.serve({
  port: config.port,
  fetch: app.fetch
});

console.log(`Lead scoring dev server running on http://localhost:${config.port}`);
console.log(`POST http://localhost:${config.port}/score`);
