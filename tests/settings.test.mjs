import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import settingsModule from "../dist/main/settings.js";

const { createSettingsWriter, loadSettings, saveSettings } = settingsModule;

async function createSettingsPath(t) {
  const directory = await mkdtemp(join(tmpdir(), "desktop-pet-settings-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return join(directory, "config", "settings.json");
}

test("missing settings default to sound reaction enabled", async (t) => {
  const settingsPath = await createSettingsPath(t);

  assert.deepEqual(await loadSettings(settingsPath), {
    soundReactionEnabled: true,
  });
});

test("saved sound reaction values are restored", async (t) => {
  const settingsPath = await createSettingsPath(t);

  await saveSettings(settingsPath, { soundReactionEnabled: false });
  assert.deepEqual(await loadSettings(settingsPath), {
    soundReactionEnabled: false,
  });

  await saveSettings(settingsPath, { soundReactionEnabled: true });
  assert.deepEqual(await loadSettings(settingsPath), {
    soundReactionEnabled: true,
  });
});

test("malformed settings warn and default to enabled", async (t) => {
  const settingsPath = await createSettingsPath(t);
  const warnings = [];
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, "{not json", "utf8");

  const settings = await loadSettings(settingsPath, (...warning) => {
    warnings.push(warning);
  });

  assert.deepEqual(settings, { soundReactionEnabled: true });
  assert.equal(warnings.length, 1);
});

test("invalid settings warn and default to enabled", async (t) => {
  const settingsPath = await createSettingsPath(t);
  const warnings = [];
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, '{"soundReactionEnabled":"yes"}', "utf8");

  const settings = await loadSettings(settingsPath, (...warning) => {
    warnings.push(warning);
  });

  assert.deepEqual(settings, { soundReactionEnabled: true });
  assert.equal(warnings.length, 1);
});

test("settings writes only the supported boolean", async (t) => {
  const settingsPath = await createSettingsPath(t);

  await saveSettings(settingsPath, {
    soundReactionEnabled: false,
    ignored: "value",
  });

  assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
    soundReactionEnabled: false,
  });
});

test("settings write failures are logged without rejecting", async (t) => {
  const settingsPath = await createSettingsPath(t);
  const errors = [];
  const writeSettings = createSettingsWriter(
    settingsPath,
    async () => {
      throw new Error("simulated write failure");
    },
    (...error) => {
      errors.push(error);
    },
  );

  await assert.doesNotReject(
    writeSettings({ soundReactionEnabled: false }),
  );
  assert.equal(errors.length, 1);
});

test("rapid settings writes persist the final value in order", async (t) => {
  const settingsPath = await createSettingsPath(t);
  const startedValues = [];
  let releaseFirstWrite;
  const firstWriteBlocked = new Promise((resolve) => {
    releaseFirstWrite = resolve;
  });
  const writeSettings = createSettingsWriter(
    settingsPath,
    async (path, settings) => {
      startedValues.push(settings.soundReactionEnabled);

      if (startedValues.length === 1) {
        await firstWriteBlocked;
      }

      await saveSettings(path, settings);
    },
  );

  const writes = [
    writeSettings({ soundReactionEnabled: true }),
    writeSettings({ soundReactionEnabled: false }),
    writeSettings({ soundReactionEnabled: true }),
  ];

  await Promise.resolve();

  try {
    assert.deepEqual(startedValues, [true]);
  } finally {
    releaseFirstWrite();
  }

  await Promise.all(writes);

  assert.deepEqual(startedValues, [true, false, true]);
  assert.deepEqual(await loadSettings(settingsPath), {
    soundReactionEnabled: true,
  });
});
