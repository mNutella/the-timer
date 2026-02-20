import { type Icon, IconCirclePlusFilled } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
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
import { withToast } from "@/lib/utils";

export function NavMain({
	items,
	label,
}: {
	items: {
		title: string;
		url: string;
		icon?: Icon;
	}[];
	label?: string;
}) {
	const createTimerMutation = useMutation(api.time_entries.create);

	const startTimer = () => {
		const wrappedMutation = withToast(
			createTimerMutation,
			"Starting timer...",
			"Timer started",
			"Failed to start timer",
		);

		wrappedMutation({
			userId: import.meta.env.VITE_USER_ID as Id<"users">,
			name: "New Time Entry",
		});
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
								<IconCirclePlusFilled />
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
