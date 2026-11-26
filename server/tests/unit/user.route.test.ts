import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { test, type TestContext } from "node:test";
import { buildApp } from "../../src/api/app.js";
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

function setupApp(t: TestContext, userService: Pick<UserService, "getCurrentUser">) {
  const app = buildApp({
    clerk,
    userService,
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
