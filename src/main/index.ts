import { join } from "node:path";

import { app, BrowserWindow, Menu, screen } from "electron";

import { createSettingsWriter, loadSettings } from "./settings.js";
import {
  installSystemAudioCaptureHandler,
  startSystemAudioCapture,
  stopSystemAudioCapture,
} from "./system-audio.js";

let petWindow: BrowserWindow | null = null;
let pendingSettingsWrite = Promise.resolve();
let waitingToQuit = false;
let quitAllowed = false;

async function waitForSettingsAndQuit(): Promise<void> {
  waitingToQuit = true;

  try {
    while (true) {
      const pendingWrite = pendingSettingsWrite;
      await pendingWrite;

      if (pendingWrite === pendingSettingsWrite) {
        break;
      }
    }
  } catch (error: unknown) {
    console.error("Failed while waiting for settings persistence:", error);
  }

  quitAllowed = true;
  app.quit();
}

async function createPetWindow(): Promise<void> {
  const settingsPath = join(
    app.getPath("userData"),
    "config",
    "settings.json",
  );
  const settings = await loadSettings(settingsPath);
  const writeSettings = createSettingsWriter(settingsPath);
  let soundReactionEnabled = settings.soundReactionEnabled;

  const window = new BrowserWindow({
    width: 200,
    height: 300,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  petWindow = window;

  window.on("closed", () => {
    petWindow = null;
  });

  window.on("system-context-menu", (event, point) => {
    event.preventDefault();

    const menu = Menu.buildFromTemplate([
      {
        label: "Sound reaction",
        type: "checkbox",
        checked: soundReactionEnabled,
        click: (menuItem) => {
          soundReactionEnabled = menuItem.checked;

          if (soundReactionEnabled) {
            startSystemAudioCapture(window);
          } else {
            stopSystemAudioCapture(window);
          }

          pendingSettingsWrite = writeSettings({ soundReactionEnabled });
        },
      },
      { type: "separator" },
      { label: "Exit", role: "quit" },
    ]);
    const menuPoint = screen.screenToDipPoint(point);

    menu.popup({
      window,
      x: Math.round(menuPoint.x),
      y: Math.round(menuPoint.y),
    });
  });

  installSystemAudioCaptureHandler(window);

  await window.loadFile(
    join(app.getAppPath(), "src", "renderer", "index.html"),
  );

  if (soundReactionEnabled) {
    startSystemAudioCapture(window);
  }
}

void app
  .whenReady()
  .then(createPetWindow)
  .catch((error: unknown) => {
    console.error("Failed to start desktop pet:", error);
    app.quit();
  });

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", (event) => {
  if (quitAllowed) {
    return;
  }

  event.preventDefault();

  if (!waitingToQuit) {
    void waitForSettingsAndQuit();
  }
});
