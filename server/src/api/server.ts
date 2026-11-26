import "dotenv/config";
import { ExampleService } from "../core/services/example.service.js";
import { createDatabase } from "../infrastructure/data/db.js";
import { DrizzleExampleRepository } from "../infrastructure/repositories/example.repository.drizzle.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const database = createDatabase(config.databaseUrl);
const app = buildApp({
  clerk: config.clerk,
  exampleService: new ExampleService(new DrizzleExampleRepository(database.db)),
  close: database.close,
});

async function shutdown(): Promise<void> {
  try {
    await app.close();
  } catch {
    app.log.error("Failed to close the server");
    process.exitCode = 1;
  }
}

try {
  await app.listen({ host: config.host, port: config.port });
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch {
  app.log.error("Server startup failed");
  process.exitCode = 1;
  await shutdown();
}
