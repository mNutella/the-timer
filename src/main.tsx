import { RouterProvider } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { createRouter } from "@/router";
import "./globals.css";

const router = createRouter();

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<RouterProvider router={router} />
		</StrictMode>,
	);
}

// Create the Dynamic Island overlay after the main window is ready (unless disabled in settings)
const storedSettings = JSON.parse(localStorage.getItem("app-settings") || "{}");
if (storedSettings.enableIsland !== false) {
	invoke("create_island").catch(console.error);
}
