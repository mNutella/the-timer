import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
	Authenticated,
	Unauthenticated,
	AuthLoading,
} from "convex/react";
import type { ConvexReactClient } from "convex/react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { LoginPage } from "@/components/login-page";
import { useDeepLinkAuth } from "@/hooks/use-deep-link-auth";

export const Route = createRootRouteWithContext<{
	convexQueryClient: ConvexReactClient;
}>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "Timer" },
		],
	}),
	component: RootComponent,
});

function AppContent() {
	return (
		<div className="h-[100dvh] overflow-hidden z-10 bg-transparent">
			<Outlet />
		</div>
	);
}

function RootComponent() {
	useDeepLinkAuth();

	return (
		<>
			<AuthLoading>
				<div className="flex h-[100dvh] items-center justify-center">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			</AuthLoading>
			<Unauthenticated>
				{import.meta.env.DEV ? <AppContent /> : <LoginPage />}
			</Unauthenticated>
			<Authenticated>
				<AppContent />
			</Authenticated>
			<Toaster position="top-center" />
			<TanStackRouterDevtools position="bottom-right" />
		</>
	);
}
