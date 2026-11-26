import { sql } from "drizzle-orm";
import type { ExampleRepository } from "../../core/repositories/example.repository.js";
import type { Database } from "../data/db.js";

export class DrizzleExampleRepository implements ExampleRepository {
  constructor(private readonly db: Database) {}

  async checkConnection(): Promise<void> {
    await this.db.execute(sql.raw("select 1"));
  }
}
