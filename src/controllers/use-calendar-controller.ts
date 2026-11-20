import { useCallback, useEffect, useState } from "react";
import { ADVENT_DAYS, type AdventDay } from "../domain/advent";
import type { AdventService } from "../services/interfaces/advent-service";
import type { OpenedAdventStore } from "../services/interfaces/advent-store";

export type RevealedAdventContent = Readonly<
	Partial<Record<AdventDay, string>>
>;

export interface CalendarController {
	readonly days: typeof ADVENT_DAYS;
	readonly openedAdvents: readonly AdventDay[];
	readonly revealedContent: RevealedAdventContent;
	readonly isLoading: boolean;
	readonly error: string | null;
	readonly openAdvent: (advent: AdventDay) => Promise<void>;
}

function errorMessage(prefix: string, error: unknown): string {
	if (error instanceof Error && error.message.trim() !== "") {
		return `${prefix} ${error.message}`;
	}

	return prefix;
}

function normalizeOpenedAdvents(
	openedAdvents: readonly AdventDay[],
): readonly AdventDay[] {
	return ADVENT_DAYS.filter((day) => openedAdvents.includes(day));
}

export function useCalendarController(
	adventService: AdventService,
	openedAdventStore: OpenedAdventStore,
): CalendarController {
	const [openedAdvents, setOpenedAdvents] = useState<readonly AdventDay[]>([]);
	const [revealedContent, setRevealedContent] = useState<RevealedAdventContent>(
		{},
	);
	const [initializedStore, setInitializedStore] =
		useState<OpenedAdventStore | null>(null);
	const [activeOpenCount, setActiveOpenCount] = useState(0);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;

		void openedAdventStore
			.loadOpenedAdvents()
			.then((storedAdvents) => {
				if (isCurrent) {
					setOpenedAdvents(normalizeOpenedAdvents(storedAdvents));
					setError(null);
				}
			})
			.catch((loadError: unknown) => {
				if (isCurrent) {
					setOpenedAdvents([]);
					setError(
						errorMessage("Unable to restore opened advents.", loadError),
					);
				}
			})
			.finally(() => {
				if (isCurrent) {
					setInitializedStore(openedAdventStore);
				}
			});

		return () => {
			isCurrent = false;
		};
	}, [openedAdventStore]);

	const isInitializing = initializedStore !== openedAdventStore;

	const openAdvent = useCallback(
		async (advent: AdventDay): Promise<void> => {
			setActiveOpenCount((count) => count + 1);
			setError(null);

			try {
				let content: string;

				try {
					content = await adventService.openAdvent(advent);
				} catch (openError) {
					setError(errorMessage(`Unable to open day ${advent}.`, openError));
					return;
				}

				setRevealedContent((currentContent) => ({
					...currentContent,
					[advent]: content,
				}));
				setOpenedAdvents((currentAdvents) =>
					currentAdvents.includes(advent)
						? currentAdvents
						: normalizeOpenedAdvents([...currentAdvents, advent]),
				);

				try {
					await openedAdventStore.markAdventOpened(advent);
				} catch (persistenceError) {
					setError(
						errorMessage(
							`Day ${advent} opened, but its progress could not be saved.`,
							persistenceError,
						),
					);
				}
			} finally {
				setActiveOpenCount((count) => count - 1);
			}
		},
		[adventService, openedAdventStore],
	);

	return {
		days: ADVENT_DAYS,
		openedAdvents,
		revealedContent,
		isLoading: isInitializing || activeOpenCount > 0,
		error,
		openAdvent,
	};
}
