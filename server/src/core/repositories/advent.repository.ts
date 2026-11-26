export interface NewAdvent {
  name: string;
  year: number;
}

export interface CreatedAdvent extends NewAdvent {
  id: string;
}

export interface AvailableAdventDay {
  day: number;
  content: string;
  openedAt: Date | null;
}

export interface AdventRepository {
  listForMember(userId: string): Promise<CreatedAdvent[]>;
  findForMember(userId: string, adventId: string): Promise<(CreatedAdvent & { isAdmin: boolean }) | undefined>;
  listAvailableDays(userId: string, adventId: string, lastDay: number): Promise<AvailableAdventDay[]>;
  recordOpening(userId: string, adventId: string, day: number): Promise<boolean>;
  createWithDaysAndAdmin(input: NewAdvent & {
    creatorUserId: string;
    inviteTokenHash: string;
    contents: string[];
  }): Promise<CreatedAdvent>;
  joinByTokenHash(userId: string, tokenHash: string): Promise<string | null>;
}
