import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { IslandApp } from "./island-app";

// Read notch layout from URL query params (set by Rust)
const params = new URLSearchParams(window.location.search);
const hasNotch = params.get("notch") === "true";
const notchWidth = Number(params.get("notchWidth") || "0");

const rootElement = document.getElementById("island-root")!;
if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<IslandApp hasNotch={hasNotch} notchWidth={notchWidth} />
		</StrictMode>,
	);
}
