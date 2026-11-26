import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { test, type TestContext } from "node:test";
import { buildApp } from "../../src/api/app.js";
import type { AdventRepository } from "../../src/core/repositories/advent.repository.js";
import type { NewUserProfile, UserProfile } from "../../src/core/repositories/user.repository.js";
import { UserService } from "../../src/core/services/user.service.js";
import { AdventService, adventDateFormatter } from "../../src/core/services/advent.service.js";

const issuer = "https://clerk.example.test";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const clerk = {
  publishableKey: `pk_live_${Buffer.from("clerk.example.test$").toString("base64")}`,
  secretKey: "sk_live_offline_test",
  jwtKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
};
const providerId = "user_authenticated";
const otherProviderId = "user_other";
const profile = { id: "b17f26d3-517f-4f4c-a2f1-ff9549cbfd94", name: "Ada Lovelace", email: "ada@example.test" };

function sessionToken(subject: string): string {
  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(JSON.stringify({
    alg: "RS256", typ: "JWT", kid: "test", cat: "cl_B7d4PD111AAA",
  })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: issuer, sub: subject, sid: "sess_test", iat: now, nbf: now, exp: now + 60,
  })).toString("base64url");
  const content = `${header}.${claims}`;
  return `${content}.${sign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64url")}`;
}

function setupApp(
  t: TestContext,
  userService: Pick<UserService, "getCurrentUser">,
  adventRepository: Partial<AdventRepository> = {},
) {
  const app = buildApp({
    clerk,
    userService,
    adventRepository: {
      async createWithDaysAndAdmin() { throw new Error("Unexpected Advent creation"); },
      async listForMember() { throw new Error("Unexpected Advent listing"); },
      async findForMember() { throw new Error("Unexpected Advent lookup"); },
      async listDays() { throw new Error("Unexpected editor day listing"); },
      async updateName() { throw new Error("Unexpected Advent rename"); },
      async updateDayContent() { throw new Error("Unexpected door update"); },
      async listAvailableDays() { throw new Error("Unexpected Advent day listing"); },
      async recordOpening() { throw new Error("Unexpected Advent opening"); },
      async joinByTokenHash() { throw new Error("Unexpected Advent join"); },
      ...adventRepository,
    },
    async close() {},
  });
  t.after(() => app.close());
  return app;
}

test("rejects unauthenticated requests before calling the service", async (t) => {
  const getCurrentUser = t.mock.fn(async () => profile);
  const app = setupApp(t, { getCurrentUser });

  const response = await app.inject({ url: "/api/user" });
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), { error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  assert.equal(getCurrentUser.mock.callCount(), 0);
});

test("keeps the health check public and preserves unknown-route responses", async (t) => {
  const getCurrentUser = t.mock.fn(async () => profile);
  const app = setupApp(t, { getCurrentUser });

  const health = await app.inject({ url: "/health" });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { status: "ok" });
  assert.equal((await app.inject({ url: "/api/unknown" })).statusCode, 404);
  assert.equal(getCurrentUser.mock.callCount(), 0);
});

test("creates an Advent with content and a hashed invitation for the authenticated user", async (t) => {
  const getCurrentUser = t.mock.fn(async () => profile);
  const calendar = { id: "advent-id", name: "Family Advent", year: 2026 };
  const createWithDaysAndAdmin = t.mock.fn<AdventRepository["createWithDaysAndAdmin"]>(async () => calendar);
  const joinByTokenHash = t.mock.fn<AdventRepository["joinByTokenHash"]>(async () => calendar.id);
  const app = setupApp(t, { getCurrentUser }, { createWithDaysAndAdmin, joinByTokenHash });
  const contents = Array.from({ length: 25 }, (_, index) => `Surprise ${index + 1}`);
  const payload = { name: "  Family Advent  ", year: 2026, contents, userId: "other-id" };
  const request = { method: "POST", url: "/api/advent", payload } as const;
  const headers = { authorization: `Bearer ${sessionToken(providerId)}` };

  assert.equal((await app.inject(request)).statusCode, 401);
  assert.equal(getCurrentUser.mock.callCount(), 0);
  for (const invalid of [{ name: "   " }, { year: "2026" }, { year: 1.5 }, { year: 0 }, { year: 10000 }, { contents: [] }]) {
    assert.equal((await app.inject({ ...request, headers, payload: { ...payload, ...invalid } })).statusCode, 400);
  }
  assert.equal(createWithDaysAndAdmin.mock.callCount(), 0);

  const response = await app.inject({ ...request, headers });
  assert.equal(response.statusCode, 201, response.body);
  const { inviteUrl, ...summary } = response.json();
  assert.deepEqual(summary, calendar);
  assert.equal(response.headers.location, "/api/advent/advent-id");
  assert.match(inviteUrl, /^\/advent\/join#[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(getCurrentUser.mock.calls[0]?.arguments, [providerId]);
  const token = inviteUrl.split("#")[1];
  const hash = createHash("sha256").update(token).digest("hex");
  assert.deepEqual(createWithDaysAndAdmin.mock.calls[0]?.arguments, [{
    name: calendar.name, year: calendar.year, contents, creatorUserId: profile.id, inviteTokenHash: hash,
  }]);

  const join = await app.inject({
    method: "POST", url: "/api/advent/join", headers, payload: { token, userId: "other-id", isAdmin: true },
  });
  assert.equal(join.statusCode, 200);
  assert.deepEqual(join.json(), { adventId: calendar.id });
  assert.deepEqual(joinByTokenHash.mock.calls[0]?.arguments, [profile.id, hash]);
});

test("lists only memberships belonging to the authenticated application user", async (t) => {
  const calendars = [
    { id: "owned", name: "Owned", year: 2026, isAdmin: true },
    { id: "joined", name: "Joined", year: 2025, isAdmin: false },
  ];
  const otherUser = { ...profile, id: "other-id" };
  const getCurrentUser = t.mock.fn(async (id: string) => id === providerId ? profile : otherUser);
  const listForMember = t.mock.fn<AdventRepository["listForMember"]>(async (id) =>
    id === profile.id ? calendars : [],
  );
  const app = setupApp(t, { getCurrentUser }, { listForMember });
  assert.equal((await app.inject({ url: "/api/advent" })).statusCode, 401);
  assert.equal(listForMember.mock.callCount(), 0);
  const response = await app.inject({
    url: "/api/advent?userId=other-id", headers: { authorization: `Bearer ${sessionToken(providerId)}` },
  });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), calendars);
  assert.deepEqual(listForMember.mock.calls[0]?.arguments, [profile.id]);
  const otherResponse = await app.inject({
    url: "/api/advent", headers: { authorization: `Bearer ${sessionToken(otherProviderId)}` },
  });
  assert.equal(otherResponse.statusCode, 200);
  assert.deepEqual(otherResponse.json(), []);
  assert.deepEqual(listForMember.mock.calls[1]?.arguments, [otherUser.id]);
  assert.deepEqual(getCurrentUser.mock.calls.map(({ arguments: args }) => args), [[providerId], [otherProviderId]]);
});

test("calendar detail and opening require membership and reject future days", async (t) => {
  const adventId = "eaed8160-ae43-4e71-bf7c-f91b987f27f9";
  const calendar = { id: adventId, name: "Next Advent", year: 9999, isAdmin: false };
  const getCurrentUser = async (id: string) => id === providerId ? profile : { ...profile, id: "other-id" };
  const findForMember = t.mock.fn<AdventRepository["findForMember"]>(async (id) => id === profile.id ? calendar : undefined);
  const app = setupApp(t, { getCurrentUser }, { findForMember });
  const url = `/api/advent/${adventId}`;
  const headers = { authorization: `Bearer ${sessionToken(providerId)}` };
  const otherHeaders = { authorization: `Bearer ${sessionToken(otherProviderId)}` };

  assert.equal((await app.inject({ url: `${url}?timeZone=UTC` })).statusCode, 401);
  assert.equal((await app.inject({ url, headers })).statusCode, 400);
  assert.equal((await app.inject({ url: `${url}?timeZone=Invalid/Zone`, headers })).statusCode, 400);
  assert.equal((await app.inject({ url: "/api/advent/no-id?timeZone=UTC", headers })).statusCode, 400);
  const response = await app.inject({ url: `${url}?timeZone=UTC`, headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ...calendar, days: [] });
  assert.equal((await app.inject({ url: `${url}?timeZone=UTC`, headers: otherHeaders })).statusCode, 404);

  const open = { method: "POST", url: `${url}/days/1/open`, payload: { timeZone: "UTC" } } as const;
  const locked = await app.inject({ ...open, headers });
  assert.equal(locked.statusCode, 403);
  assert.equal(locked.json().error.code, "DOOR_LOCKED");
  assert.equal((await app.inject({ ...open, headers: otherHeaders })).statusCode, 404);
  assert.equal((await app.inject({ ...open, url: `${url}/days/26/open`, headers })).statusCode, 400);
});

test("requires owner access on every editor endpoint", async (t) => {
  const adventId = "eaed8160-ae43-4e71-bf7c-f91b987f27f9";
  const joinedId = "1d032723-a1dc-416c-ba13-afdfc1112bf6";
  const missingId = "b17f26d3-517f-4f4c-a2f1-ff9549cbfd94";
  const calendar = { id: adventId, name: "Advent", year: 9999 };
  const days = Array.from({ length: 25 }, (_, index) => ({ day: index + 1, content: "Surprise" }));
  const app = setupApp(t, { async getCurrentUser() { return profile; } }, {
    async findForMember(_userId, id) {
      if (id === adventId || id === joinedId) return { ...calendar, id, isAdmin: id === adventId };
    },
    async listDays(id) { assert.equal(id, adventId); return days; },
    async updateName(id, name) { assert.equal(id, adventId); return { ...calendar, name }; },
    async updateDayContent(id, day, content) { assert.equal(id, adventId); return { day, content }; },
  });
  const headers = { authorization: `Bearer ${sessionToken(providerId)}` };
  const editorRequests = (id: string) => [
    { method: "GET", url: `/api/advent/${id}/days?timeZone=UTC` },
    { method: "PATCH", url: `/api/advent/${id}`, payload: { name: " New name " } },
    { method: "PATCH", url: `/api/advent/${id}/days/1`, payload: { content: "", timeZone: "UTC" } },
  ] as const;

  for (const request of editorRequests(adventId)) {
    assert.equal((await app.inject(request)).statusCode, 401);
  }
  for (const request of editorRequests(joinedId)) {
    const response = await app.inject({ ...request, headers });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, "EDIT_FORBIDDEN");
  }
  for (const request of editorRequests(missingId)) {
    assert.equal((await app.inject({ ...request, headers })).statusCode, 404);
  }
  const responses = await Promise.all(editorRequests(adventId).map((request) => app.inject({ ...request, headers })));
  assert.deepEqual(responses.map((response) => response.statusCode), [200, 200, 200]);
  assert.deepEqual(responses.map((response) => response.json()), [
    days.map((day) => ({ ...day, isEditable: true })),
    { ...calendar, name: "New name" },
    { day: 1, content: "" },
  ]);
});

test("uses the viewer's local midnight for opening and editing December doors", async (t) => {
  const calendar = { id: "advent-id", name: "Advent", year: 2026, isAdmin: true };
  const door = { day: 1, content: "Surprise", openedAt: new Date("2026-12-01T07:00:00Z") };
  const listAvailableDays = t.mock.fn<AdventRepository["listAvailableDays"]>(async () => [door]);
  const recordOpening = t.mock.fn<AdventRepository["recordOpening"]>(async () => true);
  const updateDayContent = t.mock.fn<AdventRepository["updateDayContent"]>(async (_id, day, content) => ({ day, content }));
  const repository: AdventRepository = {
    async listForMember() { return []; },
    async findForMember() { return calendar; },
    async listDays() { return [{ day: door.day, content: door.content }]; },
    async updateName() { throw new Error("Unexpected Advent rename"); },
    updateDayContent,
    async createWithDaysAndAdmin() { return calendar; },
    async joinByTokenHash() { return null; },
    listAvailableDays,
    recordOpening,
  };
  let now = new Date("2026-12-01T00:00:00Z");
  const service = new AdventService(repository, () => now);
  const userId = profile.id;
  const west = adventDateFormatter("America/Los_Angeles")!;
  const east = adventDateFormatter("Europe/Berlin")!;
  assert.deepEqual(await service.getCalendar(userId, calendar.id, west), { ...calendar, days: [] });
  await assert.rejects(service.openDay(userId, calendar.id, 1, west), { code: "DOOR_LOCKED" });
  assert.equal(recordOpening.mock.callCount(), 0);
  assert.deepEqual(await service.getCalendar(userId, calendar.id, east), { ...calendar, days: [door] });
  assert.deepEqual(listAvailableDays.mock.calls[0]?.arguments, [userId, calendar.id, 1]);
  await service.openDay(userId, calendar.id, 1, east);
  assert.deepEqual(recordOpening.mock.calls[0]?.arguments, [userId, calendar.id, 1]);
  assert.deepEqual(await service.updateDay(userId, calendar.id, 1, "Updated", east), { day: 1, content: "Updated" });
  now = new Date("2026-12-01T23:00:00Z");
  assert.deepEqual(await service.getEditableDays(userId, calendar.id, east), [
    { day: 1, content: door.content, isEditable: false },
  ]);
  await assert.rejects(service.updateDay(userId, calendar.id, 1, "Too late", east), { code: "PAST_DAY" });
  assert.deepEqual(await service.updateDay(userId, calendar.id, 1, "Still today", west), {
    day: 1, content: "Still today",
  });
  now = new Date("2026-12-30T00:00:00Z");
  await service.getCalendar(userId, calendar.id, west);
  now = new Date("2027-01-12T00:00:00Z");
  await service.getCalendar(userId, calendar.id, west);
  await assert.rejects(service.updateDay(userId, calendar.id, 25, "Too late", west), { code: "PAST_DAY" });
  assert.equal(updateDayContent.mock.callCount(), 2);
  assert.deepEqual(listAvailableDays.mock.calls.slice(1).map(({ arguments: args }) => args[2]), [25, 25]);
});

test("provisions then returns the authenticated user with exactly the public fields", async (t) => {
  const users = new Map<string, UserProfile>([
    [otherProviderId, { id: "other-id", name: "Other User", email: "other@example.test" }],
  ]);
  const getProfile = t.mock.fn(async () => ({ firstName: "Ada", lastName: "Lovelace", primaryEmail: profile.email }));
  const insertIfAbsent = t.mock.fn(async ({ providerId, name, email }: NewUserProfile) => {
    const user = { id: profile.id, name, email, providerId };
    users.set(providerId, user);
    return user;
  });
  const app = setupApp(t, new UserService({
    async findByProviderId(id) { return users.get(id); },
    insertIfAbsent,
  }, { getProfile }));
  const headers = { authorization: `Bearer ${sessionToken(providerId)}`, "x-user-id": otherProviderId };

  for (const url of [`/api/user?userId=${otherProviderId}&providerId=${otherProviderId}`, "/api/user"]) {
    const response = await app.inject({ url, headers });
    assert.equal(response.statusCode, 200, response.body);
    assert.deepEqual(response.json(), profile);
  }
  assert.equal(getProfile.mock.callCount(), 1);
  assert.equal(insertIfAbsent.mock.callCount(), 1);
  assert.equal(insertIfAbsent.mock.calls[0]?.arguments[0].providerId, providerId);
});

test("returns a generic 500 when a dependency fails", async (t) => {
  const app = setupApp(t, {
    async getCurrentUser() { throw new Error("Internal dependency details"); },
  });

  const response = await app.inject({ url: "/api/user", headers: { authorization: `Bearer ${sessionToken(providerId)}` } });
  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json(), {
    error: { code: "INTERNAL_SERVER_ERROR", message: "Unable to load current user" },
  });
});
