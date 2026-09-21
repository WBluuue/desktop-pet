import { desktopCapturer, type BrowserWindow } from "electron";

const START_SYSTEM_AUDIO_EVENT = "desktop-pet:start-system-audio";

type DisplayMediaCallback = (streams: Electron.Streams) => void;

function denyCapture(callback: DisplayMediaCallback): void {
  (callback as (streams: Electron.Streams | null) => void)(null);
}

export function installSystemAudioCaptureHandler(
  petWindow: BrowserWindow,
): void {
  if (process.platform !== "win32") {
    return;
  }

  petWindow.webContents.session.setDisplayMediaRequestHandler(
    (request, callback) => {
      const isPetRenderer =
        request.frame !== null &&
        request.frame === request.frame.top &&
        request.frame === petWindow.webContents.mainFrame &&
        petWindow.webContents.getURL().startsWith("file://");

      if (
        !isPetRenderer ||
        !request.userGesture ||
        !request.audioRequested ||
        !request.videoRequested
      ) {
        console.warn("Denied an unexpected display-media capture request.");
        denyCapture(callback);
        return;
      }

      void grantSystemAudioCapture(callback);
    },
  );
}

async function grantSystemAudioCapture(
  callback: DisplayMediaCallback,
): Promise<void> {
  let source: Electron.DesktopCapturerSource | undefined;

  try {
    [source] = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 0, height: 0 },
    });
  } catch (error: unknown) {
    console.error("Failed to enumerate screens for system audio capture:", error);
    denyCapture(callback);
    return;
  }

  if (!source) {
    console.error("System audio capture is unavailable: no screen source found.");
    denyCapture(callback);
    return;
  }

  try {
    callback({
      video: { id: source.id, name: source.name },
      audio: "loopback",
    });
  } catch (error: unknown) {
    console.error("Failed to grant system audio capture:", error);
  }
}

export function startSystemAudioCapture(petWindow: BrowserWindow): void {
  if (process.platform !== "win32") {
    return;
  }

  void petWindow.webContents
    .executeJavaScript(
      `window.dispatchEvent(new Event(${JSON.stringify(START_SYSTEM_AUDIO_EVENT)}))`,
      true,
    )
    .catch((error: unknown) => {
      console.error("Failed to request system audio capture:", error);
    });
}
