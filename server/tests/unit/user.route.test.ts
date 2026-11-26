import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { test, type TestContext } from "node:test";
import { buildApp } from "../../src/api/app.js";
import type { AdventRepository } from "../../src/core/repositories/advent.repository.js";
import type { NewUserProfile, UserProfile } from "../../src/core/repositories/user.repository.js";
import { UserService } from "../../src/core/services/user.service.js";
import { ExampleService } from "../../src/core/services/example.service.js";

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
      async joinByTokenHash() { throw new Error("Unexpected Advent join"); },
      ...adventRepository,
    },
    exampleService: new ExampleService({ async checkConnection() {} }),
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
  const calendars = [{ id: "owned", name: "Owned", year: 2026 }, { id: "joined", name: "Joined", year: 2025 }];
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
