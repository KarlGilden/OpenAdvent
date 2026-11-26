import type { FastifyInstance } from "fastify";
import type { AdventRepository } from "../../core/repositories/advent.repository.js";
import { AdventService } from "../../core/services/advent.service.js";

export async function adventRoutes(app: FastifyInstance, options: {
  adventRepository: AdventRepository;
}): Promise<void> {
  const service = new AdventService(options.adventRepository);
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error && typeof error === "object" && "statusCode" in error
      ? error.statusCode
      : undefined;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 500) {
      return reply.code(statusCode).send({
        error: { code: "INVALID_REQUEST", message: "Invalid request" },
      });
    }

    request.log.error("Advent request failed");
    return reply.code(500).send({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to process Advent request" },
    });
  });

  app.get("/api/advent", async (request) => options.adventRepository.listForMember(request.CurrentUserId!));

  app.post<{ Body: { name?: unknown; year?: unknown; contents?: unknown } }>("/api/advent", async (request, reply) => {
    const created = await service.createCalendar(request.CurrentUserId!, request.body ?? {});
    if (!created) {
      return reply.code(400).send({
        error: { code: "INVALID_ADVENT", message: "Enter a name, a whole year from 1 to 9999, and valid text for each door." },
      });
    }
    return reply.code(201).header("Location", `/api/advent/${created.id}`).send(created);
  });

  app.post<{ Body: { token?: unknown } }>("/api/advent/join", async (request, reply) => {
    const token = request.body?.token;
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return reply.code(400).send({
        error: { code: "INVALID_TOKEN", message: "Enter a valid invitation token." },
      });
    }

    const adventId = await service.joinCalendar(request.CurrentUserId!, token);
    if (!adventId) {
      return reply.code(404).send({
        error: { code: "INVITATION_NOT_FOUND", message: "This invitation is unavailable." },
      });
    }
    return { adventId };
  });
}
