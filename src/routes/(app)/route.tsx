import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useIslandDataBridge } from "@/hooks/use-island-data-bridge";

export const Route = createFileRoute("/(app)")({
	component: RouteComponent,
});

function RouteComponent() {
	const location = useLocation();
	useIslandDataBridge();

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>
				<SiteHeader
					pageTitle={
						location.pathname === "/"
							? "Dashboard"
							: location.pathname.charAt(1).toUpperCase() +
								location.pathname.slice(2)
					}
				/>
				<div className="flex flex-1 flex-col relative">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<Outlet />
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
