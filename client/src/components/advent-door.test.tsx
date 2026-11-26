import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdventDoor, type AdventDoorProps } from "./advent-door";

const DEFAULT_PROPS: AdventDoorProps = {
	day: 8,
	isOpened: false,
	isLoading: false,
	onOpen: vi.fn(),
};

describe("AdventDoor", () => {
	it("requests its exact day from the closed state", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(<AdventDoor {...DEFAULT_PROPS} onOpen={onOpen} />);

		await user.click(screen.getByRole("button", { name: "Day 8, unopened" }));

		expect(onOpen).toHaveBeenCalledOnce();
		expect(onOpen).toHaveBeenCalledWith(8);
		expect(screen.getByText("8")).toBeVisible();
		expect(screen.queryByText(/surprise/i)).not.toBeInTheDocument();
	});

	it("disables duplicate actions while loading", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(
			<AdventDoor
				{...DEFAULT_PROPS}
				isLoading
				content="Content that is not ready yet"
				onOpen={onOpen}
			/>,
		);

		const door = screen.getByRole("button", { name: "Day 8, opening" });
		await user.click(door);

		expect(door).toBeDisabled();
		expect(onOpen).not.toHaveBeenCalled();
		expect(screen.getByText("Opening…")).toBeVisible();
		expect(
			screen.queryByText("Content that is not ready yet"),
		).not.toBeInTheDocument();
	});

	it("shows a dated lock and prevents future-day actions", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(<AdventDoor {...DEFAULT_PROPS} day={21} isLocked onOpen={onOpen} />);

		const door = screen.getByRole("button", { name: "Day 21, locked" });
		await user.click(door);

		expect(door).toBeDisabled();
		expect(door).toHaveAttribute("data-state", "locked");
		expect(door.querySelector(".advent-door__lock-mark")).toBeInTheDocument();
		expect(onOpen).not.toHaveBeenCalled();
	});

	it("shows returned content and allows it to be revisited", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(
			<AdventDoor
				{...DEFAULT_PROPS}
				isOpened
				content="You bring warmth wherever you go."
				onOpen={onOpen}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: "Day 8, opened. Revisit" }),
		);

		expect(screen.getByText("You bring warmth wherever you go.")).toBeVisible();
		expect(onOpen).toHaveBeenCalledWith(8);
	});

	it("opens with native keyboard controls and preserves focus", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		const { rerender } = render(
			<AdventDoor {...DEFAULT_PROPS} onOpen={onOpen} />,
		);
		const door = screen.getByRole("button", { name: "Day 8, unopened" });

		door.focus();
		await user.keyboard("{Enter}");
		expect(onOpen).toHaveBeenCalledWith(8);

		rerender(
			<AdventDoor
				{...DEFAULT_PROPS}
				isOpened
				content="You bring warmth wherever you go."
				onOpen={onOpen}
			/>,
		);

		expect(door).toHaveFocus();
		await user.keyboard(" ");
		expect(onOpen).toHaveBeenCalledTimes(2);
	});

	it("explains an error and keeps the door retryable", async () => {
		const user = userEvent.setup();
		const onOpen = vi.fn();
		render(
			<AdventDoor
				{...DEFAULT_PROPS}
				error="The compliment could not be found."
				onOpen={onOpen}
			/>,
		);

		const door = screen.getByRole("button", {
			name: "Day 8, unavailable. Try again",
		});
		expect(door).toHaveTextContent("The compliment could not be found.");

		await user.click(door);

		expect(onOpen).toHaveBeenCalledWith(8);
	});
});
