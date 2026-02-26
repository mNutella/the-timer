import { Link, useLocation } from "@tanstack/react-router";
import { CirclePlus, type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { StartTimerDialog } from "@/components/start-timer-dialog";

export function NavMain({
	items,
	label,
}: {
	items: {
		title: string;
		url: string;
		icon?: LucideIcon;
	}[];
	label?: string;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { pathname } = useLocation();

	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarGroupContent className="flex flex-col gap-2">
				{!label && (
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								tooltip="Start Timer"
								className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
								onClick={() => setDialogOpen(true)}
							>
								<CirclePlus />
								<span>Start Timer</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				)}
				<SidebarMenu>
					{items.map((item) => {
						const active =
							item.url === "/"
								? pathname === "/"
								: pathname.startsWith(item.url);
						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									isActive={active}
									tooltip={item.title}
								>
									<Link to={item.url}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
			<StartTimerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
		</SidebarGroup>
	);
}
