import compliments from "./compliments.json";
import {
	AdventContentNotFoundError,
	parseAdventDay,
	type AdventDay,
} from "../../domain/advent";
import type { AdventService } from "../../services/interfaces/advent-service";

type ComplimentContent = Readonly<Partial<Record<AdventDay, string>>>;

export class ComplimentAdventService implements AdventService {
	constructor(private readonly content: ComplimentContent = compliments) {}

	async openAdvent(advent: AdventDay): Promise<string> {
		const day = parseAdventDay(advent);
		const compliment = this.content[day];

		if (typeof compliment !== "string" || compliment.trim() === "") {
			throw new AdventContentNotFoundError(day);
		}

		return compliment;
	}
}
