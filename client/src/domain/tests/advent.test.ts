import { describe, expect, it } from "vitest";
import {
	ADVENT_DAYS,
	FIRST_ADVENT_DAY,
	InvalidAdventDayError,
	LAST_ADVENT_DAY,
	isAdventDay,
	parseAdventDay,
} from "../advent";

describe("advent day domain", () => {
	it("defines every supported day from 1 through 25", () => {
		expect(ADVENT_DAYS).toHaveLength(25);
		expect(ADVENT_DAYS).toEqual(
			Array.from({ length: 25 }, (_, index) => index + 1),
		);
		expect(FIRST_ADVENT_DAY).toBe(1);
		expect(LAST_ADVENT_DAY).toBe(25);
	});

	it.each([1, 12, 25])("accepts supported day %s", (value) => {
		expect(isAdventDay(value)).toBe(true);
		expect(parseAdventDay(value)).toBe(value);
	});

	it.each([0, 26, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
		"rejects invalid numeric value %s",
		(value) => {
			expect(isAdventDay(value)).toBe(false);
			expect(() => parseAdventDay(value)).toThrow(InvalidAdventDayError);
		},
	);

	it.each(["1", null, undefined, {}, []])(
		"rejects invalid non-numeric value %s",
		(value) => {
			expect(isAdventDay(value)).toBe(false);
			expect(() => parseAdventDay(value)).toThrow(InvalidAdventDayError);
		},
	);

	it("reports the invalid value and supported range", () => {
		expect(() => parseAdventDay(26)).toThrow(
			"Invalid advent day: 26. Expected an integer from 1 through 25.",
		);

		try {
			parseAdventDay(26);
		} catch (error) {
			expect(error).toMatchObject({
				name: "InvalidAdventDayError",
				value: 26,
			});
		}
	});
});
