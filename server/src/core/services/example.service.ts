import type { ExampleRepository } from "../repositories/example.repository.js";

export class ExampleService {
  constructor(private readonly repository: ExampleRepository) {}

  async run(): Promise<{ status: "ok" }> {
    await this.repository.checkConnection();
    return { status: "ok" };
  }
}
