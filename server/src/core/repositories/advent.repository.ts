export interface NewAdvent {
  name: string;
  year: number;
}

export interface CreatedAdvent extends NewAdvent {
  id: string;
}

export interface MemberAdvent extends CreatedAdvent {
  isAdmin: boolean;
}

export interface AdventDayContent {
  day: number;
  content: string;
}

export interface AvailableAdventDay extends AdventDayContent {
  openedAt: Date | null;
}

export interface AdventRepository {
  listForMember(userId: string): Promise<MemberAdvent[]>;
  findForMember(userId: string, adventId: string): Promise<MemberAdvent | undefined>;
  listDays(adventId: string): Promise<AdventDayContent[]>;
  updateName(adventId: string, name: string): Promise<CreatedAdvent | undefined>;
  updateDayContent(adventId: string, day: number, content: string): Promise<AdventDayContent | undefined>;
  listAvailableDays(userId: string, adventId: string, lastDay: number): Promise<AvailableAdventDay[]>;
  recordOpening(userId: string, adventId: string, day: number): Promise<boolean>;
  createWithDaysAndAdmin(input: NewAdvent & {
    creatorUserId: string;
    inviteTokenHash: string;
    contents: string[];
  }): Promise<CreatedAdvent>;
  joinByTokenHash(userId: string, tokenHash: string): Promise<string | null>;
}
