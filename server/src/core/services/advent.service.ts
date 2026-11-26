import { createHash, randomBytes } from "node:crypto";
import type { AdventRepository } from "../repositories/advent.repository.js";

export function adventDateFormatter(timeZone: unknown): Intl.DateTimeFormat | undefined {
  if (typeof timeZone !== "string" || !timeZone || /^[+-]/.test(timeZone)) return;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone, calendar: "gregory", numberingSystem: "latn",
      year: "numeric", month: "numeric", day: "numeric",
    });
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
  }
}

function lastAvailableDay(year: number, now: Date, formatter: Intl.DateTimeFormat): number {
  const parts = formatter.formatToParts(now);
  const localYear = Number(parts.find(({ type }) => type === "year")?.value);
  const month = Number(parts.find(({ type }) => type === "month")?.value);
  const day = Number(parts.find(({ type }) => type === "day")?.value);
  if (localYear > year) return 25;
  return localYear === year && month === 12 ? Math.min(day, 25) : 0;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class AdventService {
  constructor(
    private readonly advents: AdventRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getCalendar(userId: string, adventId: string, formatter: Intl.DateTimeFormat) {
    const calendar = await this.advents.findForMember(userId, adventId);
    if (!calendar) return null;

    const lastDay = lastAvailableDay(calendar.year, this.now(), formatter);
    const days = lastDay ? await this.advents.listAvailableDays(userId, adventId, lastDay) : [];
    return { ...calendar, days };
  }

  async openDay(userId: string, adventId: string, day: number, formatter: Intl.DateTimeFormat) {
    const calendar = await this.advents.findForMember(userId, adventId);
    if (!calendar) return "missing";
    if (day > lastAvailableDay(calendar.year, this.now(), formatter)) return "locked";
    return await this.advents.recordOpening(userId, adventId, day) ? "opened" : "missing";
  }

  async createCalendar(userId: string, input: { name?: unknown; year?: unknown; contents?: unknown }) {
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const { year, contents = Array<string>(25).fill("") } = input;
    if (!name || name.includes("\u0000") || typeof year !== "number" || !Number.isInteger(year)
      || year < 1 || year > 9999 || !Array.isArray(contents) || contents.length !== 25
      || !contents.every((content) => typeof content === "string" && !content.includes("\u0000"))) {
      return null;
    }

    const token = randomBytes(32).toString("base64url");
    const calendar = await this.advents.createWithDaysAndAdmin({
      name, year, contents, creatorUserId: userId, inviteTokenHash: hashToken(token),
    });
    return { ...calendar, inviteUrl: `/advent/join#${token}` };
  }

  joinCalendar(userId: string, token: string) {
    return this.advents.joinByTokenHash(userId, hashToken(token));
  }
}
