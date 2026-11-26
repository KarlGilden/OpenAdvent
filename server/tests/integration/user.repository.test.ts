import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { UserService } from "../../src/core/services/user.service.js";
import { createDatabase } from "../../src/infrastructure/data/db.js";
import { appUser } from "../../src/infrastructure/data/schema.js";
import { DrizzleUserRepository } from "../../src/infrastructure/repositories/user.repository.drizzle.js";

test("current-user provisioning against PostgreSQL", async (t) => {
  const url = process.env.TEST_DATABASE_URL?.trim();
  assert.ok(url, "Set TEST_DATABASE_URL to a dedicated PostgreSQL test database (see server/README.md)");

  const database = createDatabase(url);
  const namespace = `user_test_${randomUUID()}`;
  const repeatedId = `${namespace}_repeated`;
  const concurrentId = `${namespace}_concurrent`;
  const distinctId = `${namespace}_distinct`;
  let migrated = false;
  t.after(async () => {
    try {
      if (migrated) {
        await database.db.delete(appUser).where(inArray(appUser.providerId, [repeatedId, concurrentId, distinctId]));
      }
    } finally {
      await database.close();
    }
  });

  await migrate(database.db, { migrationsFolder: "./migrations" });
  migrated = true;

  const repository = new DrizzleUserRepository(database.db);
  const service = new UserService(repository, {
    async getProfile(providerId) {
      return { firstName: "Test", lastName: "User", primaryEmail: `${providerId}@example.test` };
    },
  });

  await t.test("provisions once and returns the same stored profile on repeat", async () => {
    assert.equal(await repository.findByProviderId(repeatedId), undefined);
    const first = await service.getCurrentUser(repeatedId);
    assert.match(first.id, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
    assert.deepEqual(await service.getCurrentUser(repeatedId), first);
    assert.equal(await database.db.$count(appUser, eq(appUser.providerId, repeatedId)), 1);
  });

  await t.test("concurrent calls return one stored profile and one UUID", async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => service.getCurrentUser(concurrentId)));
    const stored = await repository.findByProviderId(concurrentId);
    assert.ok(stored);
    assert.deepEqual(results, Array(8).fill(stored));
    assert.equal(await database.db.$count(appUser, eq(appUser.providerId, concurrentId)), 1);
  });

  await t.test("a conflicting insert preserves the existing profile", async () => {
    const original = await service.getCurrentUser(repeatedId);
    const result = await repository.insertIfAbsent({
      providerId: repeatedId,
      name: "Different Name",
      email: "different@example.test",
    });
    assert.deepEqual(result, original);
    assert.deepEqual(await repository.findByProviderId(repeatedId), original);
  });

  await t.test("different provider IDs resolve to distinct local users", async () => {
    const first = await service.getCurrentUser(repeatedId);
    const second = await service.getCurrentUser(distinctId);
    assert.notEqual(first.id, second.id);
    assert.equal(second.email, `${distinctId}@example.test`);
  });
});
