import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface AppSettings {
  soundReactionEnabled: boolean;
}

type SettingsLogger = (message: string, error: unknown) => void;
type SettingsPersistence = (
  settingsPath: string,
  settings: AppSettings,
) => Promise<void>;

const DEFAULT_SETTINGS: AppSettings = {
  soundReactionEnabled: true,
};

function defaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

function logSettingsWarning(message: string, error: unknown): void {
  console.warn(message, error);
}

function logSettingsError(message: string, error: unknown): void {
  console.error(message, error);
}

export async function loadSettings(
  settingsPath: string,
  warn: SettingsLogger = logSettingsWarning,
): Promise<AppSettings> {
  let contents: string;

  try {
    contents = await readFile(settingsPath, "utf8");
  } catch (error: unknown) {
    if (!isMissingFile(error)) {
      warn(`Failed to read settings from ${settingsPath}; using defaults.`, error);
    }

    return defaultSettings();
  }

  try {
    const settings: unknown = JSON.parse(contents);

    if (
      typeof settings === "object" &&
      settings !== null &&
      typeof (settings as Partial<AppSettings>).soundReactionEnabled ===
        "boolean"
    ) {
      return {
        soundReactionEnabled: (settings as AppSettings).soundReactionEnabled,
      };
    }

    warn(
      `Invalid settings in ${settingsPath}; using defaults.`,
      new TypeError("soundReactionEnabled must be a boolean."),
    );
  } catch (error: unknown) {
    warn(`Failed to parse settings from ${settingsPath}; using defaults.`, error);
  }

  return defaultSettings();
}

export async function saveSettings(
  settingsPath: string,
  settings: AppSettings,
): Promise<void> {
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify(
      { soundReactionEnabled: settings.soundReactionEnabled },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function createSettingsWriter(
  settingsPath: string,
  persist: SettingsPersistence = saveSettings,
  logError: SettingsLogger = logSettingsError,
): (settings: AppSettings) => Promise<void> {
  let pendingWrite = Promise.resolve();

  return (settings: AppSettings): Promise<void> => {
    const snapshot = {
      soundReactionEnabled: settings.soundReactionEnabled,
    };

    pendingWrite = pendingWrite
      .then(() => persist(settingsPath, snapshot))
      .catch((error: unknown) => {
        logError(`Failed to save settings to ${settingsPath}.`, error);
      });

    return pendingWrite;
  };
}
