import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Dock } from "@/components/dock";
import { useIslandDataBridge } from "@/hooks/use-island-data-bridge";
import { useTrayDataBridge } from "@/hooks/use-tray-data-bridge";

export const Route = createFileRoute("/(app)")({
	component: RouteComponent,
});

function RouteComponent() {
	useIslandDataBridge();
	useTrayDataBridge();

	return (
		<>
			<main className="flex flex-1 flex-col relative min-h-dvh pb-24">
				<div className="@container/main flex flex-1 flex-col gap-2 max-w-7xl mx-auto w-full px-4 lg:px-6">
					<Outlet />
				</div>
			</main>
			<Dock />
		</>
	);
}
