import type { Table } from "@tanstack/react-table";
import { ChevronDown, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TimeEntry } from "../../lib/types";

export function CustomizeTableMenu({
	table,
	className,
}: {
	table: Table<TimeEntry>;
	className?: string;
}) {
	const hasHiddenColumns = table
		.getAllColumns()
		.some((col) => col.getCanHide() && !col.getIsVisible());

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("w-fit h-9", className)}
				>
					<Columns3 />
					<span className="hidden lg:inline">Customize</span>
					<span className="lg:hidden">Columns</span>
					<ChevronDown />
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
								{(column.columnDef.meta as { title?: string })?.title ??
									(typeof column.columnDef.header === "string"
										? column.columnDef.header
										: column.id.replace(/_/g, " "))}
							</DropdownMenuCheckboxItem>
						);
					})}
				{hasHiddenColumns && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => table.resetColumnVisibility()}
						>
							Reset to default
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
