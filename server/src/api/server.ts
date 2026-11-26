import "dotenv/config";
import { createClerkClient } from "@clerk/fastify";
import { UserService } from "../core/services/user.service.js";
import { ExampleService } from "../core/services/example.service.js";
import { ClerkUserIdentityProvider } from "../infrastructure/auth/clerk-user-identity-provider.js";
import { createDatabase } from "../infrastructure/data/db.js";
import { DrizzleExampleRepository } from "../infrastructure/repositories/example.repository.drizzle.js";
import { DrizzleUserRepository } from "../infrastructure/repositories/user.repository.drizzle.js";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const database = createDatabase(config.databaseUrl);
const clerk = createClerkClient(config.clerk);
const app = buildApp({
  clerk: config.clerk,
  userService: new UserService(
    new DrizzleUserRepository(database.db),
    new ClerkUserIdentityProvider(clerk.users),
  ),
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
