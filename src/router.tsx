import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";

import { SettingsProvider } from "@/lib/settings";

import { routeTree } from "./routeTree.gen";

export function createRouter() {
	const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
	if (!CONVEX_URL) {
		throw new Error("Missing environment variable VITE_CONVEX_URL");
	}
	const convexQueryClient = new ConvexReactClient(CONVEX_URL);

	const router = createTanStackRouter({
		routeTree,
		defaultPreload: "intent",
		context: { convexQueryClient },
		defaultSsr: false,
		Wrap: ({ children }) => (
			<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
				<ConvexAuthProvider client={convexQueryClient}>
					<ConvexQueryCacheProvider>
						<SettingsProvider>{children}</SettingsProvider>
					</ConvexQueryCacheProvider>
				</ConvexAuthProvider>
			</ThemeProvider>
		),
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>;
	}
}
