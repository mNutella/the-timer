"use client";

import * as React from "react";

import { useIsMobile } from "@/hooks/use-mobile";

interface ComboboxState<T> {
	isOpen: boolean;
	selectedItems?: Map<string, T>;
	isMobile: boolean;
	setIsOpen: (isOpen: boolean) => void;
	onValueChange?: (newSelectedItem: T | undefined) => void;
	onPopoverOpenChange?: (open: boolean) => void;
}

const ComboboxContext = React.createContext<ComboboxState<any> | undefined>(undefined);

export function useComboboxContext<T>() {
	const context = React.useContext(ComboboxContext);
	if (!context) {
		throw new Error("useComboboxContext must be used within a ComboboxProvider");
	}
	return context as ComboboxState<T>;
}

export function ComboboxProvider<T>({
	children,
	selectedItems,
	onValueChange,
	onPopoverOpenChange,
}: {
	children: React.ReactNode;
	selectedItems?: Map<string, T>;
	onValueChange?: (newSelectedItem: T | undefined) => void;
	onPopoverOpenChange?: (open: boolean) => void;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const isMobile = useIsMobile();
	const contextValue: ComboboxState<T> = {
		isMobile,
		isOpen,
		setIsOpen,
		selectedItems,
		onValueChange,
		onPopoverOpenChange,
	};

	return <ComboboxContext.Provider value={contextValue}>{children}</ComboboxContext.Provider>;
}
