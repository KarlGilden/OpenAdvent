import { createHash, randomBytes } from "node:crypto";
import type { AdventRepository } from "../repositories/advent.repository.js";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export class AdventService {
  constructor(private readonly advents: AdventRepository) {}

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
