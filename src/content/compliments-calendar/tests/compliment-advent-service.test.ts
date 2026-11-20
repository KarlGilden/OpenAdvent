import { describe, expect, it } from "vitest";
import compliments from "../compliments.json";
import {
	ADVENT_DAYS,
	AdventContentNotFoundError,
	InvalidAdventDayError,
	type AdventDay,
} from "../../../domain/advent";
import { ComplimentAdventService } from "../compliment-advent-service";
import type { AdventService } from "../../../services/interfaces/advent-service";

describe("ComplimentAdventService", () => {
	const service: AdventService = new ComplimentAdventService();

	it.each(ADVENT_DAYS)(
		"returns the configured compliment for day %s",
		async (day) => {
			await expect(service.openAdvent(day)).resolves.toBe(compliments[day]);
		},
	);

	it("rejects an invalid runtime day value", async () => {
		await expect(service.openAdvent(0 as AdventDay)).rejects.toMatchObject({
			name: "InvalidAdventDayError",
			value: 0,
		});
		await expect(service.openAdvent(0 as AdventDay)).rejects.toBeInstanceOf(
			InvalidAdventDayError,
		);
	});

	it("rejects when a valid day has no content", async () => {
		const serviceWithMissingContent = new ComplimentAdventService({});

		await expect(serviceWithMissingContent.openAdvent(1)).rejects.toMatchObject(
			{
				name: "AdventContentNotFoundError",
				advent: 1,
			},
		);
		await expect(
			serviceWithMissingContent.openAdvent(1),
		).rejects.toBeInstanceOf(AdventContentNotFoundError);
	});

	it("treats blank content as missing", async () => {
		const serviceWithBlankContent = new ComplimentAdventService({ 1: "   " });

		await expect(serviceWithBlankContent.openAdvent(1)).rejects.toThrow(
			"No advent content was found for day 1.",
		);
	});
});
