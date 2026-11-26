import { desc, eq } from "drizzle-orm";
import type { AdventRepository } from "../../core/repositories/advent.repository.js";
import type { Database } from "../data/db.js";
import { advent, adventDay, adventMember } from "../data/schema.js";

const summary = { id: advent.id, name: advent.name, year: advent.year };

export class DrizzleAdventRepository implements AdventRepository {
  constructor(private readonly db: Database) {}

  listForMember(userId: string) {
    return this.db.select(summary).from(adventMember)
      .innerJoin(advent, eq(adventMember.adventId, advent.id))
      .where(eq(adventMember.userId, userId))
      .orderBy(desc(advent.year), advent.name, advent.id);
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
