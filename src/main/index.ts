import { join } from "node:path";

import { app, BrowserWindow } from "electron";

let petWindow: BrowserWindow | null = null;

async function createPetWindow(): Promise<void> {
  petWindow = new BrowserWindow({
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

  petWindow.on("closed", () => {
    petWindow = null;
  });

  await petWindow.loadFile(
    join(app.getAppPath(), "src", "renderer", "index.html"),
  );
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
