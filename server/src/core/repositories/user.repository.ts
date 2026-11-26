export interface UserProfile {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export interface NewUserProfile {
  readonly providerId: string;
  readonly name: string;
  readonly email: string;
}

export interface UserRepository {
  findByProviderId(providerId: string): Promise<UserProfile | undefined>;
  insertIfAbsent(profile: NewUserProfile): Promise<UserProfile>;
}
