const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type LogData = Record<string, unknown>;

function formatMessage(message: string, data?: LogData): string {
	if (!data) return message;
	return `${message} ${JSON.stringify(data)}`;
}

type LogFn = (message: string, data?: LogData) => void;

interface Logger {
	trace: LogFn;
	debug: LogFn;
	info: LogFn;
	warn: LogFn;
	error: LogFn;
	attachConsole: () => Promise<(() => void) | undefined>;
}

// Tauri plugin functions are loaded lazily and cached
let tauriLog: typeof import("@tauri-apps/plugin-log") | null = null;
const tauriLogPromise: Promise<typeof import("@tauri-apps/plugin-log")> | null = isTauri
	? import("@tauri-apps/plugin-log").then((mod) => {
			tauriLog = mod;
			return mod;
		})
	: null;

function createTauriLogFn(level: "trace" | "debug" | "info" | "warn" | "error"): LogFn {
	return (message: string, data?: LogData) => {
		const formatted = formatMessage(message, data);
		if (tauriLog) {
			tauriLog[level](formatted);
		} else {
			tauriLogPromise?.then((mod) => mod[level](formatted));
		}
	};
}

function createConsoleLogFn(level: "trace" | "debug" | "info" | "warn" | "error"): LogFn {
	const consoleFn = level === "trace" ? console.debug : console[level];
	return (message: string, data?: LogData) => {
		if (data) {
			consoleFn(message, data);
		} else {
			consoleFn(message);
		}
	};
}

export const log: Logger = isTauri
	? {
			trace: createTauriLogFn("trace"),
			debug: createTauriLogFn("debug"),
			info: createTauriLogFn("info"),
			warn: createTauriLogFn("warn"),
			error: createTauriLogFn("error"),
			attachConsole: async () => {
				const mod = await tauriLogPromise;
				return mod?.attachConsole();
			},
		}
	: {
			trace: createConsoleLogFn("trace"),
			debug: createConsoleLogFn("debug"),
			info: createConsoleLogFn("info"),
			warn: createConsoleLogFn("warn"),
			error: createConsoleLogFn("error"),
			attachConsole: async () => undefined,
		};
