import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { AppErrorBoundary } from "@/components/app-error-boundary";
import { loadSettings } from "@/lib/settings";
import { createRouter } from "@/router";

import "./globals.css";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const router = createRouter();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<AppErrorBoundary>
				<RouterProvider router={router} />
			</AppErrorBoundary>
		</StrictMode>,
	);
}

if (isTauri) {
	// Add drag region for Tauri window (no-op on web)
	const dragRegion = document.createElement("div");
	dragRegion.setAttribute("data-tauri-drag-region", "");
	Object.assign(dragRegion.style, {
		position: "fixed",
		top: "0",
		left: "0",
		right: "0",
		zIndex: "1000",
		height: "20px",
	});
	document.body.prepend(dragRegion);

	// Create the Dynamic Island overlay after the main window is ready (unless disabled in settings)
	const storedSettings = loadSettings();
	if (storedSettings.enableIsland !== false) {
		import("@tauri-apps/api/core").then(({ invoke }) => {
			invoke("create_island").catch(console.error);
		});
	}
}
