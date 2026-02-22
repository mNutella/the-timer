import { createFileRoute } from "@tanstack/react-router";
import { Monitor, PanelTop } from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/(app)/settings")({
	component: SettingsPage,
});

const isTauri =
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function SettingsPage() {
	const { settings, updateSetting } = useSettings();

	return (
		<div className="flex flex-1 flex-col gap-4 px-4 py-6">
			<div className="mb-2">
				<h1 className="font-serif text-2xl font-bold">Settings</h1>
				<p className="text-muted-foreground text-sm">
					Manage your application preferences.
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>
						Control how the app appears on your desktop.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-0">
					{!isTauri && (
						<p className="text-muted-foreground mb-4 text-sm">
							These settings are only available in the desktop app.
						</p>
					)}

					<div className="flex items-center justify-between py-3">
						<div className="flex items-center gap-3">
							<PanelTop className="text-muted-foreground size-5" />
							<div>
								<p className="text-sm font-medium">Dynamic Island</p>
								<p className="text-muted-foreground text-xs">
									Show the floating overlay at the top of your screen.
								</p>
							</div>
						</div>
						<Switch
							checked={settings.enableIsland}
							onCheckedChange={(checked) =>
								updateSetting("enableIsland", checked)
							}
							disabled={!isTauri}
						/>
					</div>

					<Separator />

					<div className="flex items-center justify-between py-3">
						<div className="flex items-center gap-3">
							<Monitor className="text-muted-foreground size-5" />
							<div>
								<p className="text-sm font-medium">Tray Timer</p>
								<p className="text-muted-foreground text-xs">
									Show elapsed time in the menu bar.
								</p>
							</div>
						</div>
						<Switch
							checked={settings.enableTrayTimer}
							onCheckedChange={(checked) =>
								updateSetting("enableTrayTimer", checked)
							}
							disabled={!isTauri}
						/>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
