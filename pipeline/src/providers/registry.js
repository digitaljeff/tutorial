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
      generateMusic: async (args) =>
        (await pickAsync("music", "ELEVENLABS_API_KEY", el, mockMedia, forceMock)).generateMusic(args),
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
