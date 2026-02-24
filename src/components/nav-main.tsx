import { Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CirclePlus, type LucideIcon } from "lucide-react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { optimisticCreateTimer } from "@/lib/optimistic-updates";
import { toast } from "sonner";

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
	const createTimerMutation = useMutation(api.time_entries.create).withOptimisticUpdate(optimisticCreateTimer);

	const startTimer = () => {
		createTimerMutation({
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			name: "New Time Entry",
		}).catch(() => toast.error("Failed to start timer"));
	};

	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarGroupContent className="flex flex-col gap-2">
				{!label && (
					<SidebarMenu>
						<SidebarMenuItem className="flex items-center gap-2">
							<SidebarMenuButton
								tooltip="Start Timer"
								className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
								onClick={startTimer}
							>
								<CirclePlus />
								<span>Start Timer</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				)}
				<SidebarMenu>
					{items.map((item) => (
						<Link key={item.url} to={item.url} className="[&.active]:font-bold">
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton tooltip={item.title}>
									{item.icon && <item.icon />}
									<span>{item.title}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</Link>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
