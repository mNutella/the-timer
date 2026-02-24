import { createFileRoute } from "@tanstack/react-router";
import { Laptop, Monitor, Moon, PanelTop, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useSettings } from "@/lib/settings";

export const Route = createFileRoute("/(app)/settings")({
	component: SettingsPage,
});

const isTauri =
	typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function SettingsPage() {
	const { settings, updateSetting } = useSettings();
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div className="px-4 lg:px-6">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage your application preferences.
					</p>
				</div>

				<Card className="mt-4">
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<CardDescription>
						Control how the app appears on your desktop.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-0">
					<div className="flex items-center justify-between py-3">
						<div className="flex items-center gap-3">
							<Sun className="text-muted-foreground size-5" />
							<div>
								<p className="text-sm font-medium">Theme</p>
								<p className="text-muted-foreground text-xs">
									Choose light, dark, or match your system.
								</p>
							</div>
						</div>
						<ToggleGroup
							type="single"
							variant="outline"
							size="sm"
							value={theme}
							onValueChange={(value) => {
								if (value) setTheme(value);
							}}
						>
							<ToggleGroupItem value="light" aria-label="Light theme">
								<Sun className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem value="dark" aria-label="Dark theme">
								<Moon className="size-4" />
							</ToggleGroupItem>
							<ToggleGroupItem value="system" aria-label="System theme">
								<Laptop className="size-4" />
							</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<Separator />

					{!isTauri && (
						<p className="text-muted-foreground my-4 text-sm">
							The following settings are only available in the desktop app.
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
		</div>
	);
}
