import { and, desc, eq, lte } from "drizzle-orm";
import type { AdventRepository } from "../../core/repositories/advent.repository.js";
import type { Database } from "../data/db.js";
import { advent, adventDay, adventDayOpening, adventMember } from "../data/schema.js";

const summary = { id: advent.id, name: advent.name, year: advent.year };
const membershipSummary = { ...summary, isAdmin: adventMember.isAdmin };
const dayContent = { day: adventDay.adventDay, content: adventDay.content };

export class DrizzleAdventRepository implements AdventRepository {
  constructor(private readonly db: Database) {}

  listForMember(userId: string) {
    return this.db.select(membershipSummary).from(adventMember)
      .innerJoin(advent, eq(adventMember.adventId, advent.id))
      .where(eq(adventMember.userId, userId))
      .orderBy(desc(advent.year), advent.name, advent.id);
  }

  async findForMember(userId: string, adventId: string) {
    const [calendar] = await this.db.select(membershipSummary).from(adventMember)
      .innerJoin(advent, eq(adventMember.adventId, advent.id))
      .where(and(eq(adventMember.userId, userId), eq(adventMember.adventId, adventId)));
    return calendar;
  }

  listDays(adventId: string) {
    return this.db.select(dayContent).from(adventDay)
      .where(eq(adventDay.adventId, adventId))
      .orderBy(adventDay.adventDay);
  }

  async updateName(adventId: string, name: string) {
    const [calendar] = await this.db.update(advent).set({ name })
      .where(eq(advent.id, adventId)).returning(summary);
    return calendar;
  }

  async updateDayContent(adventId: string, day: number, content: string) {
    const [updated] = await this.db.update(adventDay).set({ content })
      .where(and(eq(adventDay.adventId, adventId), eq(adventDay.adventDay, day)))
      .returning(dayContent);
    return updated;
  }

  listAvailableDays(userId: string, adventId: string, lastDay: number) {
    return this.db.select({
      ...dayContent, openedAt: adventDayOpening.openedAt,
    }).from(adventDay)
      .innerJoin(adventMember, and(eq(adventMember.adventId, adventDay.adventId), eq(adventMember.userId, userId)))
      .leftJoin(adventDayOpening, and(
        eq(adventDayOpening.adventId, adventDay.adventId),
        eq(adventDayOpening.adventDay, adventDay.adventDay),
        eq(adventDayOpening.userId, userId),
      ))
      .where(and(eq(adventDay.adventId, adventId), lte(adventDay.adventDay, lastDay)))
      .orderBy(adventDay.adventDay);
  }

  async recordOpening(userId: string, adventId: string, day: number) {
    return this.db.transaction(async (transaction) => {
      const [door] = await transaction.select({ day: adventDay.adventDay }).from(adventDay)
        .where(and(eq(adventDay.adventId, adventId), eq(adventDay.adventDay, day)));
      if (!door) return false;

      await transaction.insert(adventDayOpening).values({ userId, adventId, adventDay: day })
        .onConflictDoNothing({
          target: [adventDayOpening.adventId, adventDayOpening.userId, adventDayOpening.adventDay],
        });
      return true;
    });
  }

  async createWithDaysAndAdmin({
    creatorUserId, contents, ...input
  }: Parameters<AdventRepository["createWithDaysAndAdmin"]>[0]) {
    return this.db.transaction(async (transaction) => {
      const [created] = await transaction.insert(advent).values(input).returning(summary);
      if (!created) throw new Error("Advent insert returned no row");

      await transaction.insert(adventMember).values({ adventId: created.id, userId: creatorUserId, isAdmin: true });
      await transaction.insert(adventDay).values(
        contents.map((content, index) => ({ adventId: created.id, adventDay: index + 1, content })),
      );
      return created;
    });
  }

  async joinByTokenHash(userId: string, tokenHash: string) {
    return this.db.transaction(async (transaction) => {
      const [calendar] = await transaction.select({ id: advent.id }).from(advent)
        .where(eq(advent.inviteTokenHash, tokenHash)).for("share");
      if (!calendar) return null;

      await transaction.insert(adventMember).values({ adventId: calendar.id, userId })
        .onConflictDoNothing({ target: [adventMember.adventId, adventMember.userId] });
      return calendar.id;
    });
  }
}
