import { Link } from "@tanstack/react-router";
import {
	BarChart3,
	Briefcase,
	Folder,
	HelpCircle,
	LayoutDashboard,
	Search,
	Settings,
	Tag,
	Timer,
} from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	navMain: [
		{
			title: "Dashboard",
			url: "/",
			icon: LayoutDashboard,
		},
		{
			title: "Analytics",
			url: "/analytics",
			icon: BarChart3,
		},
	],
	navManage: [
		{
			title: "Clients",
			url: "/clients",
			icon: Briefcase,
		},
		{
			title: "Projects",
			url: "/projects",
			icon: Folder,
		},
		{
			title: "Categories",
			url: "/categories",
			icon: Tag,
		},
	],
	navSecondary: [
		{
			title: "Settings",
			url: "#",
			icon: Settings,
		},
		{
			title: "Get Help",
			url: "#",
			icon: HelpCircle,
		},
		{
			title: "Search",
			url: "#",
			icon: Search,
		},
	],
	// documents: [
	// 	{
	// 		name: "Data Library",
	// 		url: "#",
	// 		icon: IconDatabase,
	// 	},
	// 	{
	// 		name: "Reports",
	// 		url: "#",
	// 		icon: IconReport,
	// 	},
	// 	{
	// 		name: "Word Assistant",
	// 		url: "#",
	// 		icon: IconFileWord,
	// 	},
	// ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader className="pt-8">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<Link to="/" className="[&.active]:font-bold">
								<Timer className="!size-5" />
								<span className="text-base font-semibold">The Timer.</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavMain items={data.navManage} label="Manage" />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
