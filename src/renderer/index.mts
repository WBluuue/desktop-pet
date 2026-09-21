import { AudioLevelSmoother, samplesToDbfs } from "./audio-level.mjs";
import { MouthStateSelector, type MouthState } from "./mouth-state.mjs";

const START_SYSTEM_AUDIO_EVENT = "desktop-pet:start-system-audio";
const STOP_SYSTEM_AUDIO_EVENT = "desktop-pet:stop-system-audio";
const SAMPLE_INTERVAL_MS = 50;

const SPRITE_PATHS: Record<MouthState, string> = {
  idle: "../../assets/pet/idle.png",
  speak: "../../assets/pet/speak.png",
  loud: "../../assets/pet/loud.png",
};

const petSprite = document.querySelector<HTMLImageElement>(".pet-sprite");
let renderedState: MouthState = "idle";
let activeCleanup: (() => Promise<void>) | null = null;
let monitoringEnabled = false;
let restartAfterCleanup = false;

function renderMouthState(state: MouthState): void {
  if (!petSprite || state === renderedState) {
    return;
  }

  petSprite.src = SPRITE_PATHS[state];
  renderedState = state;
}

async function monitorSystemAudio(): Promise<void> {
  if (!petSprite) {
    console.error("Cannot render mouth state: pet sprite element was not found.");
    return;
  }

  if (activeCleanup !== null) {
    restartAfterCleanup = true;
    return;
  }

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let intervalId: number | null = null;
  let stopped = false;

  const cleanup = async (): Promise<void> => {
    stopped = true;

    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    const currentStream = stream;
    stream = null;

    for (const track of currentStream?.getTracks() ?? []) {
      track.stop();
    }

    sourceNode?.disconnect();
    sourceNode = null;

    const currentAudioContext = audioContext;
    audioContext = null;
    renderMouthState("idle");

    if (currentAudioContext && currentAudioContext.state !== "closed") {
      try {
        await currentAudioContext.close();
      } catch (error: unknown) {
        console.error("Failed to close the system audio context:", error);
      }
    }

    if (activeCleanup === cleanup) {
      activeCleanup = null;

      if (restartAfterCleanup && monitoringEnabled) {
        restartAfterCleanup = false;
        void monitorSystemAudio();
      }
    }
  };

  activeCleanup = cleanup;

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    if (stopped) {
      await cleanup();
      return;
    }

    for (const videoTrack of stream.getVideoTracks()) {
      videoTrack.stop();
      stream.removeTrack(videoTrack);
    }

    const audioTracks = stream.getAudioTracks();

    if (audioTracks.length === 0) {
      throw new Error("The display-media stream did not include loopback audio.");
    }

    audioContext = new AudioContext();
    await audioContext.resume();

    if (stopped) {
      await cleanup();
      return;
    }

    sourceNode = audioContext.createMediaStreamSource(stream);
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    sourceNode.connect(analyserNode);

    const samples = new Float32Array(analyserNode.fftSize);
    const smoother = new AudioLevelSmoother();
    const stateSelector = new MouthStateSelector();

    intervalId = window.setInterval(() => {
      analyserNode.getFloatTimeDomainData(samples);
      const smoothedDbfs = smoother.update(samplesToDbfs(samples));
      renderMouthState(stateSelector.update(smoothedDbfs));
    }, SAMPLE_INTERVAL_MS);

    audioTracks[0].addEventListener(
      "ended",
      () => {
        void cleanup();
      },
      { once: true },
    );
  } catch (error: unknown) {
    const wasStopped = stopped;
    await cleanup();

    if (!wasStopped) {
      console.error(
        "System audio capture is unavailable; remaining idle:",
        error,
      );
    }
  }
}

window.addEventListener(START_SYSTEM_AUDIO_EVENT, () => {
  if (monitoringEnabled) {
    return;
  }

  monitoringEnabled = true;
  void monitorSystemAudio();
});

window.addEventListener(STOP_SYSTEM_AUDIO_EVENT, () => {
  monitoringEnabled = false;
  restartAfterCleanup = false;

  if (activeCleanup) {
    void activeCleanup();
  } else {
    renderMouthState("idle");
  }
});
