import { IconChevronDown, IconLayoutColumns } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Table } from "@tanstack/react-table";
import type { TimeEntry } from "./types";

export function CustomizeTableMenu({ table }: { table: Table<TimeEntry> }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="w-fit h-9">
					<IconLayoutColumns />
					<span className="hidden lg:inline">Customize</span>
					<span className="lg:hidden">Columns</span>
					<IconChevronDown />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{table
					.getAllColumns()
					.filter(
						(column) =>
							typeof column.accessorFn !== "undefined" && column.getCanHide(),
					)
					.map((column) => {
						return (
							<DropdownMenuCheckboxItem
								key={column.id}
								className="capitalize"
								checked={column.getIsVisible()}
								onCheckedChange={(value) => column.toggleVisibility(!!value)}
							>
								{(column.columnDef.header as string) || column.id}
							</DropdownMenuCheckboxItem>
						);
					})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
