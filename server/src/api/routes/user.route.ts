import type { FastifyInstance } from "fastify";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/user", async (request) => request.currentUserProfile);
}
