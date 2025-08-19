"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ComboboxState<T> {
	isOpen: boolean;
	value?: T;
	isMobile: boolean;
	setIsOpen: (isOpen: boolean) => void;
	onValueChange?: (value?: T) => void;
	onPopoverOpenChange?: (open: boolean) => void;
}

const ComboboxContext = React.createContext<ComboboxState<any> | undefined>(
	undefined,
);

export function useComboboxContext<T>() {
	const context = React.useContext(ComboboxContext);
	if (!context) {
		throw new Error(
			"useComboboxContext must be used within a ComboboxProvider",
		);
	}
	return context as ComboboxState<T>;
}

export function ComboboxProvider<T>({
	children,
	value,
	onValueChange,
	onPopoverOpenChange,
}: {
	children: React.ReactNode;
	value?: T;
	onValueChange?: (value?: T) => void;
	onPopoverOpenChange?: (open: boolean) => void;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const isMobile = useIsMobile();
	const contextValue: ComboboxState<T> = {
		isMobile,
		isOpen,
		setIsOpen,
		value,
		onValueChange,
		onPopoverOpenChange,
	};

	return (
		<ComboboxContext.Provider value={contextValue}>
			{children}
		</ComboboxContext.Provider>
	);
}
