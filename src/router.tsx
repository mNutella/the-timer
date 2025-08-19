import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ConvexReactClient, ConvexProvider } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";

import { routeTree } from "./routeTree.gen";

export function createRouter() {
	const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!;
	if (!CONVEX_URL) {
		console.error("missing envar VITE_CONVEX_URL");
	}
	const convexQueryClient = new ConvexReactClient(CONVEX_URL);

	const router = createTanStackRouter({
		routeTree,
		defaultPreload: "intent",
		context: { convexQueryClient },
		defaultSsr: false,
		Wrap: ({ children }) => (
			<ConvexProvider client={convexQueryClient}>
				<ConvexQueryCacheProvider >{children}</ConvexQueryCacheProvider>
			</ConvexProvider>
		),
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}
