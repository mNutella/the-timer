import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";

export interface AppSettings {
	enableIsland: boolean;
	enableTrayTimer: boolean;
}

const STORAGE_KEY = "app-settings";

const defaults: AppSettings = {
	enableIsland: true,
	enableTrayTimer: true,
};

export function loadSettings(): AppSettings {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
		return { ...defaults, ...stored };
	} catch {
		return defaults;
	}
}

interface SettingsContextValue {
	settings: AppSettings;
	updateSetting: <K extends keyof AppSettings>(
		key: K,
		value: AppSettings[K],
	) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
	const [settings, setSettings] = useState<AppSettings>(loadSettings);

	const updateSetting = useCallback(
		<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
			setSettings((prev) => {
				const next = { ...prev, [key]: value };
				localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
				return next;
			});
		},
		[],
	);

	return (
		<SettingsContext.Provider value={{ settings, updateSetting }}>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings() {
	const ctx = useContext(SettingsContext);
	if (!ctx) {
		throw new Error("useSettings must be used within a SettingsProvider");
	}
	return ctx;
}
