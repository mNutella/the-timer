import { RouterProvider } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { AppErrorBoundary } from "@/components/app-error-boundary";
import { loadSettings } from "@/lib/settings";
import { createRouter } from "@/router";
import "./globals.css";

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

// Create the Dynamic Island overlay after the main window is ready (unless disabled in settings)
const storedSettings = loadSettings();
if (storedSettings.enableIsland !== false) {
	invoke("create_island").catch(console.error);
}
