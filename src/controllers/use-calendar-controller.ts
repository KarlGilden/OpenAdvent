import { useCallback, useEffect, useRef, useState } from "react";
import { ADVENT_DAYS, type AdventDay } from "../domain/advent";
import type { AdventService } from "../services/interfaces/advent-service";
import type { OpenedAdventStore } from "../services/interfaces/advent-store";

export type RevealedAdventContent = Readonly<
	Partial<Record<AdventDay, string>>
>;
export type AdventErrors = Readonly<Partial<Record<AdventDay, string>>>;

export interface CalendarController {
	readonly days: typeof ADVENT_DAYS;
	readonly openedAdvents: readonly AdventDay[];
	readonly loadingAdvents: readonly AdventDay[];
	readonly revealedContent: RevealedAdventContent;
	readonly adventErrors: AdventErrors;
	readonly isInitializing: boolean;
	readonly isLoading: boolean;
	readonly initializationError: string | null;
	readonly persistenceError: string | null;
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

function withoutAdventError(
	errors: AdventErrors,
	advent: AdventDay,
): AdventErrors {
	const nextErrors = { ...errors };
	delete nextErrors[advent];
	return nextErrors;
}

export function useCalendarController(
	adventService: AdventService,
	openedAdventStore: OpenedAdventStore,
): CalendarController {
	const [openedAdvents, setOpenedAdvents] = useState<readonly AdventDay[]>([]);
	const [loadingAdvents, setLoadingAdvents] = useState<readonly AdventDay[]>(
		[],
	);
	const [revealedContent, setRevealedContent] = useState<RevealedAdventContent>(
		{},
	);
	const [adventErrors, setAdventErrors] = useState<AdventErrors>({});
	const [initializedStore, setInitializedStore] =
		useState<OpenedAdventStore | null>(null);
	const [initializationError, setInitializationError] = useState<string | null>(
		null,
	);
	const [persistenceError, setPersistenceError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const openingAdvents = useRef(new Set<AdventDay>());

	useEffect(() => {
		let isCurrent = true;

		void openedAdventStore
			.loadOpenedAdvents()
			.then((storedAdvents) => {
				if (isCurrent) {
					setOpenedAdvents(normalizeOpenedAdvents(storedAdvents));
					setInitializationError(null);
					setError(null);
				}
			})
			.catch((loadError: unknown) => {
				if (isCurrent) {
					const message = errorMessage(
						"Unable to restore opened advents.",
						loadError,
					);
					setOpenedAdvents([]);
					setInitializationError(message);
					setError(message);
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
			if (openingAdvents.current.has(advent)) {
				return;
			}

			openingAdvents.current.add(advent);

			setLoadingAdvents((currentAdvents) => [...currentAdvents, advent]);

			setAdventErrors((currentErrors) =>
				withoutAdventError(currentErrors, advent),
			);

			setPersistenceError(null);
			setError(null);

			try {
				let content: string;

				try {
					content = await adventService.openAdvent(advent);
				} catch (openError) {
					const message = errorMessage(
						`Unable to open day ${advent}.`,
						openError,
					);

					setAdventErrors((currentErrors) => ({
						...currentErrors,
						[advent]: message,
					}));

					setError(message);

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
				} catch (saveError) {
					const message = errorMessage(
						`Day ${advent} opened, but its progress could not be saved.`,
						saveError,
					);
					setPersistenceError(message);
					setError(message);
				}
			} finally {
				openingAdvents.current.delete(advent);

				setLoadingAdvents((currentAdvents) =>
					currentAdvents.filter((currentAdvent) => currentAdvent !== advent),
				);
			}
		},
		[adventService, openedAdventStore],
	);

	return {
		days: ADVENT_DAYS,
		openedAdvents,
		loadingAdvents,
		revealedContent,
		adventErrors,
		isInitializing,
		isLoading: isInitializing || loadingAdvents.length > 0,
		initializationError,
		persistenceError,
		error,
		openAdvent,
	};
}
