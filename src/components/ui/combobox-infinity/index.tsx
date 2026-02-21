"use client";

import { ChevronsUpDown } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ComboboxProvider, useComboboxContext } from "./hooks";

function Combobox<T>({
	children,
	selectedItems,
	onValueChange,
	onPopoverOpenChange,
}: {
	children: React.ReactNode;
	selectedItems?: Map<string, T>;
	onValueChange?: (value: T | undefined) => void;
	onPopoverOpenChange?: (open: boolean) => void;
}) {
	return (
		<ComboboxProvider
			selectedItems={selectedItems}
			onValueChange={onValueChange}
		>
			<ComboboxView onPopoverOpenChange={onPopoverOpenChange}>
				{children}
			</ComboboxView>
		</ComboboxProvider>
	);
}

function ComboboxView({
	children,
	onPopoverOpenChange,
}: {
	children: React.ReactNode;
	onPopoverOpenChange?: (open: boolean) => void;
}) {
	const { isMobile, isOpen, setIsOpen } = useComboboxContext();
	const Parent = isMobile ? Drawer : Popover;

	return (
		<Parent
			open={isOpen}
			onOpenChange={(open) => {
				setIsOpen(open);

				onPopoverOpenChange?.(open);
			}}
		>
			{children}
		</Parent>
	);
}

function ComboboxTrigger({
	id,
	children,
	className,
	showChevron = false,
}: {
	id?: string;
	children: React.ReactNode;
	className?: string;
	showChevron?: boolean;
}) {
	const { isMobile, isOpen } = useComboboxContext();
	const Trigger = isMobile ? DrawerTrigger : PopoverTrigger;

	return (
		<Trigger asChild>
			<Button
				id={id}
				variant="outline"
				role="combobox"
				aria-expanded={isOpen}
				className={className}
			>
				{children}
				{showChevron && (
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				)}
			</Button>
		</Trigger>
	);
}

function ComboboxContent({ children }: { children: React.ReactNode }) {
	const { isMobile } = useComboboxContext();
	const Content = isMobile ? DrawerContent : PopoverContent;

	const content = (
		<Command shouldFilter={false}>
			{children}
		</Command>
	);

	return (
		<Content className="w-[200px] p-0">
			{isMobile ? <div className="mt-4 border-t">{content}</div> : content}
		</Content>
	);
}

function ComboboxInput(props: React.ComponentProps<typeof CommandInput>) {
	return <CommandInput {...props} />;
}

function ComboboxList({ children }: { children: React.ReactNode }) {
	return <CommandList>{children}</CommandList>;
}

export {
	Combobox,
	ComboboxContent,
	ComboboxInput,
	ComboboxList,
	ComboboxTrigger,
};
