import { eq } from "drizzle-orm";
import type {
  NewUserProfile,
  UserProfile,
  UserRepository,
} from "../../core/repositories/user.repository.js";
import type { Database } from "../data/db.js";
import { appUser } from "../data/schema.js";

const profileColumns = { id: appUser.id, name: appUser.name, email: appUser.email };

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findByProviderId(providerId: string): Promise<UserProfile | undefined> {
    const [user] = await this.db.select(profileColumns).from(appUser)
      .where(eq(appUser.providerId, providerId));
    return user;
  }

  async insertIfAbsent(profile: NewUserProfile): Promise<UserProfile> {
    const [inserted] = await this.db.insert(appUser).values(profile)
      .onConflictDoNothing({ target: appUser.providerId })
      .returning(profileColumns);
    if (inserted) {
      return inserted;
    }

    // A separate statement can see the row committed by a concurrent insert.
    const existingUser = await this.findByProviderId(profile.providerId);
    if (!existingUser) {
      throw new Error("Conflicting user could not be loaded");
    }
    return existingUser;
  }
}
