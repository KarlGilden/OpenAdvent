import type { FastifyInstance } from "fastify";
import type { AdventRepository } from "../../core/repositories/advent.repository.js";
import { AdventService, adventDateFormatter } from "../../core/services/advent.service.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalidCalendarRequest = {
  error: { code: "INVALID_REQUEST", message: "Provide a valid calendar ID, time zone and day where applicable." },
};
const calendarNotFound = {
  error: { code: "NOT_FOUND", message: "Calendar or door not found." },
};

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

  app.get<{ Params: { adventId: string }; Querystring: { timeZone?: unknown } }>(
    "/api/advent/:adventId", async (request, reply) => {
      const { adventId } = request.params;
      const formatter = adventDateFormatter(request.query.timeZone);
      if (!uuid.test(adventId) || !formatter) return reply.code(400).send(invalidCalendarRequest);

      const calendar = await service.getCalendar(request.CurrentUserId!, adventId, formatter);
      if (!calendar) return reply.code(404).send(calendarNotFound);
      return calendar;
    },
  );

  app.post<{ Params: { adventId: string; day: string }; Body: { timeZone?: unknown } }>(
    "/api/advent/:adventId/days/:day/open", async (request, reply) => {
      const { adventId, day } = request.params;
      const formatter = adventDateFormatter(request.body?.timeZone);
      if (!uuid.test(adventId) || !/^(?:[1-9]|1[0-9]|2[0-5])$/.test(day) || !formatter) {
        return reply.code(400).send(invalidCalendarRequest);
      }
      const result = await service.openDay(request.CurrentUserId!, adventId, Number(day), formatter);
      if (result === "missing") return reply.code(404).send(calendarNotFound);
      if (result === "locked") {
        return reply.code(403).send({
          error: { code: "DOOR_LOCKED", message: "This door is not available yet." },
        });
      }
      return reply.code(204).send();
    },
  );

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
