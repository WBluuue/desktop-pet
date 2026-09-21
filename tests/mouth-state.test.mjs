import assert from "node:assert/strict";
import test from "node:test";

import {
  AudioLevelSmoother,
  calculateRms,
  samplesToDbfs,
} from "../dist/renderer/audio-level.mjs";
import { MouthStateSelector } from "../dist/renderer/mouth-state.mjs";

function updateRepeatedly(selector, levelDbfs, count) {
  let state = "idle";

  for (let index = 0; index < count; index += 1) {
    state = selector.update(levelDbfs);
  }

  return state;
}

test("RMS and dBFS processing treats silence as the practical floor", () => {
  const samples = new Float32Array(32);

  assert.equal(calculateRms(samples), 0);
  assert.equal(samplesToDbfs(samples), -100);
});

test("RMS and dBFS processing handles a full-scale signal", () => {
  const samples = Float32Array.from([1, -1, 1, -1]);

  assert.equal(calculateRms(samples), 1);
  assert.equal(samplesToDbfs(samples), 0);
});

test("smoothing uses a faster attack than release", () => {
  const smoother = new AudioLevelSmoother();

  assert.equal(smoother.update(-20), -64);
  assert.equal(smoother.update(-100), -68.32);
});

test("silence remains idle", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -100, 10), "idle");
});

test("sustained normal audio becomes speak", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -30, 2), "idle");
  assert.equal(selector.update(-30), "speak");
});

test("candidate dwell samples must be consecutive", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -30, 2), "idle");
  assert.equal(selector.update(-60), "idle");
  assert.equal(updateRepeatedly(selector, -30, 2), "idle");
  assert.equal(selector.update(-30), "speak");
});

test("sustained loud audio becomes loud", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -30, 3), "speak");
  assert.equal(updateRepeatedly(selector, -10, 2), "speak");
  assert.equal(selector.update(-10), "loud");
});

test("brief spikes do not immediately change state", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -30, 3), "speak");
  assert.equal(updateRepeatedly(selector, -10, 2), "speak");
  assert.equal(selector.update(-30), "speak");
});

test("oscillation inside hysteresis ranges does not flicker", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -30, 3), "speak");

  for (const level of [-54, -50, -53, -49, -52, -54]) {
    assert.equal(selector.update(level), "speak");
  }

  assert.equal(updateRepeatedly(selector, -10, 3), "loud");

  for (const level of [-23, -20, -22, -19, -23, -21]) {
    assert.equal(selector.update(level), "loud");
  }
});

test("sustained decreases return through speak to idle", () => {
  const selector = new MouthStateSelector();

  assert.equal(updateRepeatedly(selector, -30, 3), "speak");
  assert.equal(updateRepeatedly(selector, -10, 3), "loud");
  assert.equal(updateRepeatedly(selector, -30, 3), "speak");
  assert.equal(updateRepeatedly(selector, -60, 3), "idle");
});
