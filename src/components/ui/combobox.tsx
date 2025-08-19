"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface ComboBoxContextType<T> {
	open: boolean;
	setOpen: (open: boolean) => void;
	selectedItems: T | null;
	setSelectedItems: (items: T | null) => void;
}

const ComboBoxContext = React.createContext<ComboBoxContextType<any> | undefined>(
	undefined,
);

export function useComboBox() {
	const context = React.useContext(ComboBoxContext);
	if (!context) {
		throw new Error("useComboBox must be used within a ComboBoxResponsive");
	}
	return context;
}

export function ComboBoxResponsive({
	children,
}: {
	children: React.ReactNode;
}) {
	const [open, setOpen] = React.useState(false);
	const isMobile = useIsMobile();
	const [selectedItems, setSelectedItems] = React.useState<any | null>(
		null,
	);

	const contextValue = React.useMemo(
		() => ({
			open,
			setOpen,
			selectedItems,
			setSelectedItems,
		}),
		[open, selectedItems],
	);

	if (isMobile) {
		return (
			<ComboBoxContext.Provider value={contextValue}>
				<Drawer open={open} onOpenChange={setOpen}>
					<DrawerTrigger asChild>
						<Button variant="outline" className="w-[150px] justify-start">
							{selectedItems ? <>{selectedItems.label}</> : <>+ Set status</>}
						</Button>
					</DrawerTrigger>
					<DrawerContent>
						<div className="mt-4 border-t">
							{children}
						</div>
					</DrawerContent>
				</Drawer>
			</ComboBoxContext.Provider>
		);
	}

	return (
		<ComboBoxContext.Provider value={contextValue}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" className="w-[150px] justify-start">
						{selectedItems ? <>{selectedItems.label}</> : <>+ Set status</>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0" align="start">
					{children}
				</PopoverContent>
			</Popover>
		</ComboBoxContext.Provider>
	);
}