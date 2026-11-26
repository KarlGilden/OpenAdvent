export interface NewAdvent {
  name: string;
  year: number;
}

export interface CreatedAdvent extends NewAdvent {
  id: string;
}

export interface AdventRepository {
  listForMember(userId: string): Promise<CreatedAdvent[]>;
  createWithDaysAndAdmin(input: NewAdvent & {
    creatorUserId: string;
    inviteTokenHash: string;
    contents: string[];
  }): Promise<CreatedAdvent>;
  joinByTokenHash(userId: string, tokenHash: string): Promise<string | null>;
}
