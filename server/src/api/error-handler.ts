import type { FastifyReply, FastifyRequest } from "fastify";
import { ApplicationError, type ApplicationErrorKind } from "../core/application-error.js";
import { ApiError } from "./api-error.js";

const applicationStatus: Record<ApplicationErrorKind, number> = {
  invalid: 400,
  forbidden: 403,
  notFound: 404,
};

export function handleApiError(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ApplicationError) {
    return reply.code(applicationStatus[error.kind]).send({
      error: { code: error.code, message: error.message },
    });
  }

  if (error instanceof ApiError) {
    if (error.statusCode >= 500) request.log.error({ code: error.code }, error.message);
    return reply.code(error.statusCode).send({
      error: { code: error.code, message: error.message },
    });
  }

  const status = error && typeof error === "object" && "statusCode" in error
    ? error.statusCode
    : undefined;
  if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status < 500) {
    return reply.code(status).send({
      error: { code: "INVALID_REQUEST", message: "Invalid request" },
    });
  }

  request.log.error("Request failed");
  return reply.code(500).send({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to process request" },
  });
}
