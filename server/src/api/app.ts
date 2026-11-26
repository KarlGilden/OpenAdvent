import { clerkPlugin } from "@clerk/fastify";
import Fastify from "fastify";
import type { ExampleService } from "../core/services/example.service.js";
import { exampleRoutes } from "./routes/example.route.js";
import { healthRoutes } from "./routes/health.route.js";

interface AppDependencies {
  clerk: { publishableKey: string; secretKey: string };
  exampleService: ExampleService;
  close: () => Promise<void>;
}

export function buildApp(dependencies: AppDependencies) {
  const app = Fastify({
    logger: { redact: ["req.headers.authorization", "req.headers.cookie"] },
  });

  app.addHook("onClose", dependencies.close);
  app.register(healthRoutes);
  app.register(async (protectedApp) => {
    await protectedApp.register(clerkPlugin, {
      ...dependencies.clerk,
      hookName: "onRequest",
    });
    await protectedApp.register(exampleRoutes, { service: dependencies.exampleService });
  });

  return app;
}
