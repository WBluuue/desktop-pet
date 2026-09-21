import { AudioLevelSmoother, samplesToDbfs } from "./audio-level.mjs";
import { MouthStateSelector, type MouthState } from "./mouth-state.mjs";

const START_SYSTEM_AUDIO_EVENT = "desktop-pet:start-system-audio";
const SAMPLE_INTERVAL_MS = 50;

const SPRITE_PATHS: Record<MouthState, string> = {
  idle: "../../assets/pet/idle.png",
  speak: "../../assets/pet/speak.png",
  loud: "../../assets/pet/loud.png",
};

const petSprite = document.querySelector<HTMLImageElement>(".pet-sprite");
let renderedState: MouthState = "idle";

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

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let intervalId: number | null = null;
  let cleanupStarted = false;

  const cleanup = async (): Promise<void> => {
    if (cleanupStarted) {
      return;
    }

    cleanupStarted = true;

    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }

    for (const track of stream?.getTracks() ?? []) {
      track.stop();
    }

    stream = null;
    sourceNode?.disconnect();
    sourceNode = null;

    if (audioContext && audioContext.state !== "closed") {
      try {
        await audioContext.close();
      } catch (error: unknown) {
        console.error("Failed to close the system audio context:", error);
      }
    }

    audioContext = null;
    renderMouthState("idle");
  };

  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

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
    await cleanup();
    console.error("System audio capture is unavailable; remaining idle:", error);
  }
}

window.addEventListener(
  START_SYSTEM_AUDIO_EVENT,
  () => {
    void monitorSystemAudio();
  },
  { once: true },
);
