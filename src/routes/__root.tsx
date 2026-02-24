import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ConvexReactClient } from "convex/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";

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
			<ScrollArea className="h-[100dvh] z-10 bg-transparent">
				<Outlet />
			</ScrollArea>
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />
		</>
	);
}
