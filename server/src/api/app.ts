import { clerkPlugin } from "@clerk/fastify";
import Fastify from "fastify";
import type { UserService } from "../core/services/user.service.js";
import type { ExampleService } from "../core/services/example.service.js";
import { exampleRoutes } from "./routes/example.route.js";
import { healthRoutes } from "./routes/health.route.js";
import { userRoutes } from "./routes/user.route.js";

interface AppDependencies {
  clerk: { publishableKey: string; secretKey: string; jwtKey?: string };
  userService: Pick<UserService, "getCurrentUser">;
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
    await protectedApp.register(userRoutes, { userService: dependencies.userService });
  });

  return app;
}
