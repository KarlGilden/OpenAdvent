import type { FastifyInstance } from "fastify";
import type { AdventRepository } from "../../core/repositories/advent.repository.js";
import { AdventService, adventDateFormatter } from "../../core/services/advent.service.js";
import { ApiError } from "../api-error.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const adventDay = /^(?:[1-9]|1[0-9]|2[0-5])$/;

function invalidCalendarRequest() {
  return new ApiError(400, "INVALID_REQUEST", "Provide a valid calendar ID, time zone and day where applicable.");
}

export async function adventRoutes(app: FastifyInstance, options: {
  adventRepository: AdventRepository;
}): Promise<void> {
  const service = new AdventService(options.adventRepository);

  app.get("/api/advent", async (request) => options.adventRepository.listForMember(request.CurrentUserId!));

  app.get<{ Params: { adventId: string }; Querystring: { timeZone?: unknown } }>(
    "/api/advent/:adventId", async (request) => {
      const { adventId } = request.params;
      const formatter = adventDateFormatter(request.query.timeZone);
      if (!uuid.test(adventId) || !formatter) throw invalidCalendarRequest();
      return service.getCalendar(request.CurrentUserId!, adventId, formatter);
    },
  );

  app.get<{ Params: { adventId: string }; Querystring: { timeZone?: unknown } }>(
    "/api/advent/:adventId/days", async (request) => {
      const { adventId } = request.params;
      const formatter = adventDateFormatter(request.query.timeZone);
      if (!uuid.test(adventId) || !formatter) throw invalidCalendarRequest();
      return service.getEditableDays(request.CurrentUserId!, adventId, formatter);
    },
  );

  app.patch<{ Params: { adventId: string }; Body: { name?: unknown; year?: unknown } }>(
    "/api/advent/:adventId", async (request) => {
      const { adventId } = request.params;
      if (!uuid.test(adventId)) throw invalidCalendarRequest();
      if (request.body?.year !== undefined) {
        throw new ApiError(400, "INVALID_REQUEST", "The calendar year cannot be changed.");
      }
      return service.renameCalendar(request.CurrentUserId!, adventId, request.body?.name);
    },
  );

  app.patch<{ Params: { adventId: string; day: string }; Body: { content?: unknown; timeZone?: unknown } }>(
    "/api/advent/:adventId/days/:day", async (request) => {
      const { adventId, day } = request.params;
      const formatter = adventDateFormatter(request.body?.timeZone);
      if (!uuid.test(adventId) || !adventDay.test(day) || !formatter) throw invalidCalendarRequest();
      return service.updateDay(request.CurrentUserId!, adventId, Number(day), request.body?.content, formatter);
    },
  );

  app.post<{ Params: { adventId: string; day: string }; Body: { timeZone?: unknown } }>(
    "/api/advent/:adventId/days/:day/open", async (request, reply) => {
      const { adventId, day } = request.params;
      const formatter = adventDateFormatter(request.body?.timeZone);
      if (!uuid.test(adventId) || !adventDay.test(day) || !formatter) throw invalidCalendarRequest();
      await service.openDay(request.CurrentUserId!, adventId, Number(day), formatter);
      return reply.code(204).send();
    },
  );

  app.post<{ Body: { name?: unknown; year?: unknown; contents?: unknown } }>("/api/advent", async (request, reply) => {
    const created = await service.createCalendar(request.CurrentUserId!, request.body ?? {});
    return reply.code(201).header("Location", `/api/advent/${created.id}`).send(created);
  });

  app.post<{ Body: { token?: unknown } }>("/api/advent/join", async (request) => {
    const token = request.body?.token;
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new ApiError(400, "INVALID_TOKEN", "Enter a valid invitation token.");
    }
    const adventId = await service.joinCalendar(request.CurrentUserId!, token);
    return { adventId };
  });
}
