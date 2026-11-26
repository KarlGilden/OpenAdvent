import { createHash, randomBytes } from "node:crypto";
import type { AdventRepository } from "../repositories/advent.repository.js";
import { ApplicationError } from "../application-error.js";

function calendarNotFound() {
  return new ApplicationError("notFound", "NOT_FOUND", "Calendar or door not found.");
}

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

function decemberCutoff(
  year: number,
  now: Date,
  formatter: Intl.DateTimeFormat,
  includeToday: boolean,
): number {
  const parts = formatter.formatToParts(now);
  const localYear = Number(parts.find(({ type }) => type === "year")?.value);
  const month = Number(parts.find(({ type }) => type === "month")?.value);
  const day = Number(parts.find(({ type }) => type === "day")?.value);
  if (localYear > year) return 25;
  return localYear === year && month === 12 ? Math.min(includeToday ? day : day - 1, 25) : 0;
}

function readCalendarName(value: unknown): string | undefined {
  const name = typeof value === "string" ? value.trim() : "";
  return name && !name.includes("\u0000") ? name : undefined;
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
    if (!calendar) throw calendarNotFound();

    const lastDay = decemberCutoff(calendar.year, this.now(), formatter, true);
    const days = lastDay ? await this.advents.listAvailableDays(userId, adventId, lastDay) : [];
    return { ...calendar, days };
  }

  async openDay(userId: string, adventId: string, day: number, formatter: Intl.DateTimeFormat) {
    const calendar = await this.advents.findForMember(userId, adventId);
    if (!calendar) throw calendarNotFound();
    if (day > decemberCutoff(calendar.year, this.now(), formatter, true)) {
      throw new ApplicationError("forbidden", "DOOR_LOCKED", "This door is not available yet.");
    }
    if (!await this.advents.recordOpening(userId, adventId, day)) throw calendarNotFound();
  }

  private async findOwnedCalendar(userId: string, adventId: string) {
    const calendar = await this.advents.findForMember(userId, adventId);
    if (!calendar) throw calendarNotFound();
    if (!calendar.isAdmin) {
      throw new ApplicationError("forbidden", "EDIT_FORBIDDEN", "Only the calendar owner can edit this calendar.");
    }
    return calendar;
  }

  async getEditableDays(userId: string, adventId: string, formatter: Intl.DateTimeFormat) {
    const calendar = await this.findOwnedCalendar(userId, adventId);
    const days = await this.advents.listDays(adventId);
    const pastDay = decemberCutoff(calendar.year, this.now(), formatter, false);
    return days.map((day) => ({ ...day, isEditable: day.day > pastDay }));
  }

  async renameCalendar(userId: string, adventId: string, value: unknown) {
    await this.findOwnedCalendar(userId, adventId);
    const name = readCalendarName(value);
    if (!name) throw new ApplicationError("invalid", "INVALID_REQUEST", "Provide a valid calendar name.");
    const updated = await this.advents.updateName(adventId, name);
    if (!updated) throw calendarNotFound();
    return updated;
  }

  async updateDay(
    userId: string,
    adventId: string,
    day: number,
    content: unknown,
    formatter: Intl.DateTimeFormat,
  ) {
    const calendar = await this.findOwnedCalendar(userId, adventId);
    if (typeof content !== "string" || content.includes("\u0000")) {
      throw new ApplicationError("invalid", "INVALID_REQUEST", "Provide valid plain-text door content.");
    }
    if (day <= decemberCutoff(calendar.year, this.now(), formatter, false)) {
      throw new ApplicationError("forbidden", "PAST_DAY", "This door's date has passed and its content can no longer be changed.");
    }
    const updated = await this.advents.updateDayContent(adventId, day, content);
    if (!updated) throw calendarNotFound();
    return updated;
  }

  async createCalendar(userId: string, input: { name?: unknown; year?: unknown; contents?: unknown }) {
    const name = readCalendarName(input.name);
    const { year, contents = Array<string>(25).fill("") } = input;
    if (!name || typeof year !== "number" || !Number.isInteger(year)
      || year < 1 || year > 9999 || !Array.isArray(contents) || contents.length !== 25
      || !contents.every((content) => typeof content === "string" && !content.includes("\u0000"))) {
      throw new ApplicationError(
        "invalid", "INVALID_ADVENT", "Enter a name, a whole year from 1 to 9999, and valid text for each door.",
      );
    }

    const token = randomBytes(32).toString("base64url");
    const calendar = await this.advents.createWithDaysAndAdmin({
      name, year, contents, creatorUserId: userId, inviteTokenHash: hashToken(token),
    });
    return { ...calendar, inviteUrl: `/advent/join#${token}` };
  }

  async joinCalendar(userId: string, token: string) {
    const adventId = await this.advents.joinByTokenHash(userId, hashToken(token));
    if (!adventId) throw new ApplicationError("notFound", "INVITATION_NOT_FOUND", "This invitation is unavailable.");
    return adventId;
  }
}
