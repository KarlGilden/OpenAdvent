import type { ClerkClient } from "@clerk/fastify";
import type { UserIdentityProvider } from "../../core/services/user.service.js";

export class ClerkUserIdentityProvider implements UserIdentityProvider {
  constructor(private readonly users: ClerkClient["users"]) {}

  async getProfile(providerId: string) {
    const user = await this.users.getUser(providerId);
    const primaryEmail = user.emailAddresses.find(({ id }) => id === user.primaryEmailAddressId);
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      primaryEmail: primaryEmail?.emailAddress ?? null,
    };
  }
}
