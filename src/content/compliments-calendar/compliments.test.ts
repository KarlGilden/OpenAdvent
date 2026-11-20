import { describe, expect, it } from "vitest";
import { ADVENT_DAYS } from "../../domain/advent";
import compliments from "./compliments.json";

describe("compliment advent content", () => {
	it("contains exactly one entry for every supported advent day", () => {
		const expectedDays = ADVENT_DAYS.map(String);

		expect(Object.keys(compliments)).toEqual(expectedDays);
	});

	it.each(ADVENT_DAYS)(
		"contains a display-ready compliment for day %s",
		(day) => {
			const compliment = compliments[String(day) as keyof typeof compliments];

			expect(compliment, `day ${day} must be a string`).toEqual(
				expect.any(String),
			);
			expect(compliment.trim(), `day ${day} must not be empty`).not.toBe("");
		},
	);
});
