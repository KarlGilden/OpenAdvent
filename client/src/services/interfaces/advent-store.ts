import type { AdventDay } from "../../domain/advent";

/**
 * Persists which advent days have been opened, independently of the storage
 * technology used by an implementation.
 */
export interface OpenedAdventStore {
	loadOpenedAdvents(): Promise<readonly AdventDay[]>;
	markAdventOpened(advent: AdventDay): Promise<void>;
}
