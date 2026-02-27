import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { DollarSign, Laptop, Monitor, Moon, PanelTop, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { api } from "@/../convex/_generated/api";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

function BillingSection() {
	const userSettings = useQuery(api.user_settings.get, {});
	const upsertSettings = useMutation(api.user_settings.upsert);
	const [rateInput, setRateInput] = useState("");

	// Sync rate from server
	useEffect(() => {
		if (userSettings?.default_hourly_rate !== undefined) {
			setRateInput((userSettings.default_hourly_rate / 100).toString());
		}
	}, [userSettings?.default_hourly_rate]);

	const handleRateBlur = () => {
		const parsed = Number.parseFloat(rateInput);
		if (Number.isNaN(parsed) || parsed < 0) {
			// Reset to server value
			setRateInput(
				userSettings?.default_hourly_rate
					? (userSettings.default_hourly_rate / 100).toString()
					: "",
			);
			return;
		}
		const cents = Math.round(parsed * 100);
		upsertSettings({ default_hourly_rate: cents }).catch(() =>
			toast.error("Failed to update rate"),
		);
	};

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>Billing</CardTitle>
				<CardDescription>
					Set your default hourly rate for invoicing.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between py-3">
					<div className="flex items-center gap-3">
						<DollarSign className="text-muted-foreground size-5" />
						<div>
							<p className="text-sm font-medium">Default Hourly Rate</p>
							<p className="text-muted-foreground text-xs">
								Used when no client or project rate is set.
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">$</span>
						<Input
							type="number"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={rateInput}
							onChange={(e) => setRateInput(e.target.value)}
							onBlur={handleRateBlur}
							onKeyDown={(e) => {
								if (e.key === "Enter") e.currentTarget.blur();
							}}
							className="h-9 w-28 text-right"
						/>
						<span className="text-muted-foreground text-sm">/hr</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function SettingsPage() {
	const { settings, updateSetting } = useSettings();
	const { theme, setTheme } = useTheme();

	return (
		<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
			<div>
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage your application preferences.
					</p>
				</div>

				<BillingSection />

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
