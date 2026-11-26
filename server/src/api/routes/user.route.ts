import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { UserService } from "../../core/services/user.service.js";

export async function userRoutes(
  app: FastifyInstance,
  options: { userService: Pick<UserService, "getCurrentUser"> },
): Promise<void> {
  app.get("/api/user", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    const auth = getAuth(request, { acceptsToken: "session_token" });
    if (!auth.isAuthenticated || !auth.userId) {
      return reply.code(401).send({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    try {
      const { id, name, email } = await options.userService.getCurrentUser(auth.userId);
      return { id, name, email };
    } catch {
      request.log.error("Current user lookup failed");
      return reply.code(500).send({
        error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to load current user" },
      });
    }
  });
}
