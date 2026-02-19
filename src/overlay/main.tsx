import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { IslandApp } from "./island-app";
import "../globals.css";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!;
const convexClient = new ConvexReactClient(CONVEX_URL);

// Read notch layout from URL query params (set by Rust)
const params = new URLSearchParams(window.location.search);
const hasNotch = params.get("notch") === "true";
const notchWidth = Number(params.get("notchWidth") || "0");

const rootElement = document.getElementById("island-root")!;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ConvexProvider client={convexClient}>
				<IslandApp hasNotch={hasNotch} notchWidth={notchWidth} />
			</ConvexProvider>
		</StrictMode>,
	);
}
