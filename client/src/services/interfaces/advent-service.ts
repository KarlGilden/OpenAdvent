import type { AdventDay } from "../../domain/advent";

/**
 * Supplies the reveal content for an advent day.
 *
 * Implementations reject with `InvalidAdventDayError` when an unchecked
 * runtime value is not a supported day, and with
 * `AdventContentNotFoundError` when a valid day has no content.
 */
export interface AdventService {
	openAdvent(advent: AdventDay): Promise<string>;
}
