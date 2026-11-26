import type { UserProfile, UserRepository } from "../repositories/user.repository.js";

export interface UserIdentityProvider {
  getProfile(providerId: string): Promise<{
    firstName: string | null;
    lastName: string | null;
    primaryEmail: string | null;
  }>;
}

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly identities: UserIdentityProvider,
  ) {}

  async getCurrentUser(providerId: string): Promise<UserProfile> {
    const existingUser = await this.users.findByProviderId(providerId);
    if (existingUser) {
      return existingUser;
    }

    const profile = await this.identities.getProfile(providerId);
    const email = profile.primaryEmail?.trim();
    if (!email) {
      throw new Error("Identity has no primary email");
    }

    const name = [profile.firstName?.trim(), profile.lastName?.trim()].filter(Boolean).join(" ");
    return this.users.insertIfAbsent({ providerId, name: name || email, email });
  }
}
