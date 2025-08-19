import type { ConvexReactClient } from "convex/react";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Toaster } from "@/components/ui/sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createRootRouteWithContext<{
	convexQueryClient: ConvexReactClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Timer",
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<>
			<ScrollArea className="h-screen z-10 bg-transparent">
				<Outlet />
			</ScrollArea>
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />
			{/* <div className="absolute inset-0 bg-amber-50 blur-sm bg-[url('/futuristic-bg.png')] bg-cover bg-center" /> */}
		</>
	);
}
