import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import type { UserRepository } from "../../src/core/repositories/user.repository.js";
import { UserService, type UserIdentityProvider } from "../../src/core/services/user.service.js";

const storedUser = { id: "local-id", name: "Stored Name", email: "stored@example.test" };
const providerId = "user_clerk";

function setup(t: TestContext) {
  const lookup = t.mock.fn<UserRepository["findByProviderId"]>(async () => undefined);
  const insert = t.mock.fn<UserRepository["insertIfAbsent"]>(async () => storedUser);
  const getProfile = t.mock.fn<UserIdentityProvider["getProfile"]>(async () => ({
    firstName: " Ada ", lastName: " Lovelace ", primaryEmail: "ada@example.test",
  }));
  const service = new UserService({ findByProviderId: lookup, insertIfAbsent: insert }, { getProfile });
  return { service, lookup, insert, getProfile };
}

test("returns an existing local user without fetching or inserting", async (t) => {
  const { service, lookup, insert, getProfile } = setup(t);
  lookup.mock.mockImplementation(async () => storedUser);

  assert.deepEqual(await service.getCurrentUser(providerId), storedUser);
  assert.deepEqual(lookup.mock.calls[0]?.arguments, [providerId]);
  assert.equal(getProfile.mock.callCount(), 0);
  assert.equal(insert.mock.callCount(), 0);
});

test("provisions the authenticated identity using its name and primary email", async (t) => {
  const { service, insert, getProfile } = setup(t);

  assert.deepEqual(await service.getCurrentUser(providerId), storedUser);
  assert.deepEqual(getProfile.mock.calls[0]?.arguments, [providerId]);
  assert.deepEqual(insert.mock.calls[0]?.arguments, [{
    providerId, name: "Ada Lovelace", email: "ada@example.test",
  }]);
});

test("uses a single available name or falls back to the primary email", async (t) => {
  const { service, insert, getProfile } = setup(t);
  const primaryEmail = "ada@example.test";
  getProfile.mock.mockImplementationOnce(async () => ({ firstName: " ", lastName: " Lovelace ", primaryEmail }), 0);
  getProfile.mock.mockImplementationOnce(async () => ({ firstName: null, lastName: " ", primaryEmail }), 1);

  await service.getCurrentUser(providerId);
  await service.getCurrentUser(providerId);
  assert.deepEqual(insert.mock.calls.map(({ arguments: [profile] }) => profile.name), ["Lovelace", primaryEmail]);
});

test("rejects a missing primary email before inserting", async (t) => {
  const { service, insert, getProfile } = setup(t);
  getProfile.mock.mockImplementation(async () => ({ firstName: "Ada", lastName: null, primaryEmail: null }));

  await assert.rejects(service.getCurrentUser(providerId), /no primary email/);
  assert.equal(insert.mock.callCount(), 0);
});

test("propagates lookup errors before fetching a profile", async (t) => {
  const { service, lookup, insert, getProfile } = setup(t);
  const failure = new Error("Lookup failed");
  lookup.mock.mockImplementation(async () => { throw failure; });

  await assert.rejects(service.getCurrentUser(providerId), failure);
  assert.equal(getProfile.mock.callCount(), 0);
  assert.equal(insert.mock.callCount(), 0);
});

test("propagates identity provider errors before inserting", async (t) => {
  const { service, insert, getProfile } = setup(t);
  const failure = new Error("Provider failed");
  getProfile.mock.mockImplementation(async () => { throw failure; });

  await assert.rejects(service.getCurrentUser(providerId), failure);
  assert.equal(insert.mock.callCount(), 0);
});
