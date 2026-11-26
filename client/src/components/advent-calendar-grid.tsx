import { useMemo } from "react";
import { isAdventDayLocked, type AdventDay } from "../domain/advent";
import { AdventDoor } from "./advent-door";

export type AdventContent = Readonly<Partial<Record<AdventDay, string>>>;
export type AdventErrors = Readonly<Partial<Record<AdventDay, string>>>;

const NO_ADVENTS: readonly AdventDay[] = [];
const NO_CONTENT: AdventContent = {};
const NO_ERRORS: AdventErrors = {};

interface AdventCalendarGridProps {
	readonly days: readonly AdventDay[];
	readonly openedAdvents: readonly AdventDay[];
	readonly loadingAdvents?: readonly AdventDay[];
	readonly revealedContent?: AdventContent;
	readonly errors?: AdventErrors;
	readonly today?: Date;
	readonly isDoorLocked?: (day: AdventDay) => boolean;
	readonly adventMonth?: number;
	readonly onOpenAdvent: (day: AdventDay) => void;
}

export function AdventCalendarGrid({
	days,
	openedAdvents,
	loadingAdvents = NO_ADVENTS,
	revealedContent = NO_CONTENT,
	errors = NO_ERRORS,
	today = new Date(),
	isDoorLocked = (day) => isAdventDayLocked(day, today),
	onOpenAdvent,
}: AdventCalendarGridProps) {
	const openedAdventSet = useMemo(
		() => new Set(openedAdvents),
		[openedAdvents],
	);
	const loadingAdventSet = useMemo(
		() => new Set(loadingAdvents),
		[loadingAdvents],
	);

	return (
		<section
			className="calendar"
			id="calendar"
			aria-busy={loadingAdvents.length > 0}
			aria-labelledby="calendar-title"
		>
			<div className="calendar__heading">
				<p id="calendar-title">Choose a numbered door. Opened doors wear a golden seal.</p>
			</div>

			<ol className="calendar__grid" aria-label="Advent calendar days">
				{days.map((day) => (
					<li className="calendar__day" key={day}>
						<AdventDoor
							day={day}
							isOpened={openedAdventSet.has(day)}
							isLoading={loadingAdventSet.has(day)}
							isLocked={isDoorLocked(day)}
							content={revealedContent[day]}
							error={errors[day]}
							onOpen={onOpenAdvent}
						/>
					</li>
				))}
			</ol>
		</section>
	);
}
