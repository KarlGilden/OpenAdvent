import { useId } from "react";
import type { AdventDay } from "../domain/advent";

export interface AdventDoorProps {
	readonly day: AdventDay;
	readonly isOpened: boolean;
	readonly isLoading: boolean;
	readonly isLocked?: boolean;
	readonly content?: string;
	readonly error?: string;
	readonly onOpen: (day: AdventDay) => void;
}

function doorLabel({
	day,
	isOpened,
	isLoading,
	content,
	error,
}: Omit<AdventDoorProps, "onOpen">): string {
	if (isLoading) {
		return `Day ${day}, opening`;
	}

	if (error) {
		return `Day ${day}, unavailable. Try again`;
	}

	if (content) {
		return `Day ${day}, opened. Revisit`;
	}

	return `Day ${day}, ${isOpened ? "opened. Reveal again" : "unopened"}`;
}

export function AdventDoor(props: AdventDoorProps) {
	const {
		day,
		isOpened,
		isLoading,
		isLocked = false,
		content,
		error,
		onOpen,
	} = props;
	const labelId = useId();
	const descriptionId = useId();
	const status = isLocked
		? "locked"
		: isLoading
			? "loading"
			: error
				? "error"
				: content
					? "open"
					: "closed";
	const hasDescription = status === "open" || status === "error";

	return (
		<button
			className="advent-door"
			data-state={status}
			type="button"
			aria-busy={isLoading}
			aria-describedby={hasDescription ? descriptionId : undefined}
			aria-expanded={status === "open"}
			aria-labelledby={labelId}
			aria-pressed={isOpened || Boolean(content)}
			disabled={isLocked || isLoading}
			onClick={() => {
				if (!isLocked) {
					onOpen(day);
				}
			}}
		>
			<span
				className="visually-hidden"
				id={labelId}
				aria-live="polite"
				aria-atomic="true"
			>
				{doorLabel(props)}
			</span>

			<span className="advent-door__reveal" aria-hidden="true">
				{status === "open" ? (
					<>
						<span className="advent-door__day-label">Day {day}</span>
						<span
							className="advent-door__content"
							id={status === "open" ? descriptionId : undefined}
						>
							{content}
						</span>
						<span className="advent-door__status">
							<span className="advent-door__check">✓</span>
							Revisit
						</span>
					</>
				) : (
					<span className="advent-door__waiting-mark">✦</span>
				)}
			</span>

			<span className="advent-door__panel" aria-hidden="true">
				<span className="advent-door__number">{day}</span>
				<span className="advent-door__status">
					{status === "locked" ? (
						<>
							<span className="advent-door__lock-mark" />
						</>
					) : status === "loading" ? (
						<>
							<span className="advent-door__loading-mark">•••</span>
							Opening…
						</>
					) : status === "error" ? (
						<>
							<span className="advent-door__error-mark">!</span>
							<span className="advent-door__error-copy">
								<span id={status === "error" ? descriptionId : undefined}>
									{error}
								</span>
								<strong>Try Again</strong>
							</span>
						</>
					) : isOpened ? (
						<>
							<span className="advent-door__check">✓</span>
							Reveal Again
						</>
					) : (
						<>
							<span className="advent-door__knob" />
							Open Day
						</>
					)}
				</span>
			</span>
		</button>
	);
}
