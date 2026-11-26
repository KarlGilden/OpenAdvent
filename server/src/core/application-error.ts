export type ApplicationErrorKind = "invalid" | "forbidden" | "notFound";

export class ApplicationError extends Error {
  constructor(
    readonly kind: ApplicationErrorKind,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
