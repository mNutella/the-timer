type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, fn: string, msg: string, data?: Record<string, unknown>) {
	const entry = JSON.stringify({ level, fn, msg, ...data });
	if (level === "error") {
		console.error(entry);
	} else {
		console.log(entry);
	}
}

export const clog = {
	info: (fn: string, msg: string, data?: Record<string, unknown>) => write("info", fn, msg, data),
	warn: (fn: string, msg: string, data?: Record<string, unknown>) => write("warn", fn, msg, data),
	error: (fn: string, msg: string, data?: Record<string, unknown>) => write("error", fn, msg, data),
};
