// Provider gateway (docs/plan/02-architecture.md): every modality resolves to
// a real provider when its key is present, otherwise to the local mock.
// `--mock` forces mocks even with keys set.

import * as mockLLM from "./mock/llm.js";
import * as mockMedia from "./mock/media.js";
import { log } from "../util.js";

export function getProviders({ forceMock = false } = {}) {
  const anthropic = () => import("./real/anthropic.js");
  const fal = () => import("./real/fal.js");
  const el = () => import("./real/elevenlabs.js");

  return {
    llm: {
      generateScript: async (args) =>
        (await pickAsync("llm", "ANTHROPIC_API_KEY", anthropic, mockLLM, forceMock)).generateScript(args),
      generateSeason: async (args) =>
        (await pickAsync("llm", "ANTHROPIC_API_KEY", anthropic, mockLLM, forceMock)).generateSeason(args),
    },
    image: {
      generateKeyframe: async (args) =>
        (await pickAsync("image", "FAL_KEY", fal, mockMedia, forceMock)).generateKeyframe(args),
    },
    video: {
      generateClip: async (args) =>
        (await pickAsync("video", "FAL_KEY", fal, mockMedia, forceMock)).generateClip(args),
    },
    tts: {
      generateLineAudio: async (args) =>
        (await pickAsync("tts", "ELEVENLABS_API_KEY", el, mockMedia, forceMock)).generateLineAudio(args),
    },
    music: {
      // MUSIC_PROVIDER=apiframe routes to the unofficial Suno wrapper
      // (prototype-only, see providers/real/apiframe.js). Default: ElevenLabs.
      generateMusic: async (args) => {
        if (process.env.MUSIC_PROVIDER === "apiframe" && !forceMock && process.env.APIFRAME_API_KEY) {
          const mod = await pickAsync("music", "APIFRAME_API_KEY", () => import("./real/apiframe.js"), mockMedia, forceMock);
          return mod.generateMusic(args);
        }
        return (await pickAsync("music", "ELEVENLABS_API_KEY", el, mockMedia, forceMock)).generateMusic(args);
      },
    },
    qc: {
      checkKeyframe: async (args) => {
        if (forceMock || !process.env.ANTHROPIC_API_KEY) return { pass: true, person_count: -1, artifacts: [], mock: true };
        try {
          return await (await import("./real/anthropic.js")).checkKeyframe(args);
        } catch (e) {
          log("gateway", `WARN qc.checkKeyframe failed (${String(e.message).slice(0, 80)}) -> pass-through`);
          return { pass: true, person_count: -1, artifacts: [], error: true };
        }
      },
    },
    lipsync: {
      applyLipSync: async (args) =>
        (await pickAsync("lipsync", "FAL_KEY", fal, mockMedia, forceMock)).applyLipSync(args),
    },
    voice: {
      // Real-only capability (mock voices are pitch-mapped in mock TTS);
      // callers gate on ELEVENLABS_API_KEY before invoking.
      designVoice: async (args) => (await el()).designVoice(args),
    },
  };
}

const logged = new Set();
async function pickAsync(name, keyEnv, realLoader, mockModule, forceMock) {
  const useReal = !forceMock && !!process.env[keyEnv];
  if (!logged.has(name)) {
    log("gateway", `${name}: ${useReal ? `REAL (${keyEnv} set)` : "mock"}`);
    logged.add(name);
  }
  if (!useReal) return mockModule;
  // Fallback ladder (docs/plan/02): a failing real provider degrades that
  // call to the mock with a warning instead of killing the episode.
  const real = await realLoader();
  return new Proxy(real, {
    get(target, prop) {
      const fn = target[prop];
      if (typeof fn !== "function" || !(prop in mockModule)) return fn;
      return async (...args) => {
        try {
          return await fn(...args);
        } catch (e) {
          log("gateway", `WARN ${name}.${String(prop)} real provider failed (${String(e.message).slice(0, 90)}) -> mock fallback`);
          return mockModule[prop](...args);
        }
      };
    },
  });
}
