import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIslandDataBridge } from "@/hooks/use-island-data-bridge";
import { useTrayDataBridge } from "@/hooks/use-tray-data-bridge";

export const Route = createFileRoute("/(app)")({
	component: RouteComponent,
});

function RouteComponent() {
	useIslandDataBridge();
	useTrayDataBridge();

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-10 shrink-0 items-center px-4 md:hidden">
					<SidebarTrigger className="-ml-1" />
				</header>
				<main className="@container/main flex flex-1 flex-col gap-2 w-full px-4 lg:px-6">
					<Outlet />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
