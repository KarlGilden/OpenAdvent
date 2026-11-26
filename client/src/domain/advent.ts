export const ADVENT_DAYS = [
	1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
	23, 24, 25,
] as const;

export type AdventDay = (typeof ADVENT_DAYS)[number];

export const FIRST_ADVENT_DAY: AdventDay = ADVENT_DAYS[0];
export const LAST_ADVENT_DAY: AdventDay = ADVENT_DAYS[ADVENT_DAYS.length - 1];
const TEST_ADVENT_MONTH = 11;

const adventDayValues = new Set<unknown>(ADVENT_DAYS);

export class InvalidAdventDayError extends RangeError {
	readonly value: unknown;

	constructor(value: unknown) {
		super(
			`Invalid advent day: ${String(value)}. Expected an integer from ${FIRST_ADVENT_DAY} through ${LAST_ADVENT_DAY}.`,
		);
		this.name = "InvalidAdventDayError";
		this.value = value;
	}
}

export class AdventContentNotFoundError extends Error {
	readonly advent: AdventDay;

	constructor(advent: AdventDay) {
		super(`No advent content was found for day ${advent}.`);
		this.name = "AdventContentNotFoundError";
		this.advent = advent;
	}
}

export function isAdventDay(value: unknown): value is AdventDay {
	return adventDayValues.has(value);
}

export function isAdventDayLocked(day: AdventDay, today: Date): boolean {
	const currentMonth = today.getMonth() + 1;

	return currentMonth !== TEST_ADVENT_MONTH || day > today.getDate();
}

export function parseAdventDay(value: unknown): AdventDay {
	if (!isAdventDay(value)) {
		throw new InvalidAdventDayError(value);
	}

	return value;
}
