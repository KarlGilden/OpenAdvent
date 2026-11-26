import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ExampleService } from "../../core/services/example.service.js";

export async function exampleRoutes(
  app: FastifyInstance,
  options: { service: ExampleService },
): Promise<void> {
  app.get("/api/example", async (request, reply) => {
    const auth = getAuth(request, { acceptsToken: "session_token" });
    if (!auth.isAuthenticated || !auth.userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    try {
      return await options.service.run();
    } catch {
      request.log.error("Example database query failed");
      return reply.code(503).send({ error: "Database unavailable" });
    }
  });
}
