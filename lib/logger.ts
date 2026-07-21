export type LogLevel = "off" | "error" | "warn" | "info" | "debug";

const LEVELS: Record<LogLevel, number> = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const PREFIX = "[La Bonne Note]";

let currentLevel: LogLevel = "error";

export async function loadLogLevel(): Promise<void> {
  const s = await chrome.storage.sync.get("logLevel");
  currentLevel = (s.logLevel as LogLevel) || "error";
}

export function watchLogLevel(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.logLevel) {
      currentLevel = (changes.logLevel.newValue as LogLevel) || "error";
    }
  });
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] <= LEVELS[currentLevel];
}

export const log = {
  error(msg: string, ...args: unknown[]): void {
    if (shouldLog("error")) console.error(PREFIX, msg, ...args);
  },
  warn(msg: string, ...args: unknown[]): void {
    if (shouldLog("warn")) console.warn(PREFIX, msg, ...args);
  },
  info(msg: string, ...args: unknown[]): void {
    if (shouldLog("info")) console.info(PREFIX, msg, ...args);
  },
  debug(msg: string, ...args: unknown[]): void {
    if (shouldLog("debug")) console.debug(PREFIX, msg, ...args);
  },
};
