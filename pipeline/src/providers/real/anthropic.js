// Real Screenwriter: Claude via the Anthropic Messages API.
// Activates automatically when ANTHROPIC_API_KEY is set.

import { writingContext } from "../../context.js";

const SCRIPT_SCHEMA_HINT = `Return ONLY valid JSON, no markdown fences, matching:
{
  "title": string,
  "scenes": [{
    "slugline": string,
    "location_id": string,        // must be one of the show's location ids
    "character_ids": string[],    // ids of characters present
    "action": string,             // one-sentence stage direction
    "lines": [{ "character_id": string, "text": string, "delivery_tags": string }]
  }]
}
Rules: total spoken text must fit the target runtime (~14 chars/second of speech).
2-4 scenes. Every scene ends on a button (a punchline beat). delivery_tags is a
short bracketed emotional direction like "[dry]" or "[tense]".`;

export async function generateScript({ show, idea, revision }) {
  const target = show.format.target_runtime_s;
  const budget = Math.round(target * 14 * 0.75); // chars of dialogue that fit
  const messages = [
    {
      role: "user",
      content:
        `${writingContext(show)}\n\nEPISODE IDEA: ${idea}\n\n` +
        `HARD CONSTRAINTS:\n` +
        `- character_id values must be exactly one of: ${show.characters.map((c) => c.id).join(", ")}\n` +
        `- location_id values must be exactly one of: ${show.locations.map((l) => l.id).join(", ")}\n` +
        `- This is a ${target}-SECOND episode. Maximum ${budget} total dialogue characters (~10-14 short lines). Count carefully.\n\n` +
        `Write the episode script as JSON.`,
    },
  ];
  if (revision) {
    messages.push({ role: "assistant", content: JSON.stringify(revision.script) });
    messages.push({
      role: "user",
      content: `Script Doctor rejected this draft. Fix ALL of the following and return the corrected full JSON:\n- ${revision.notes.join("\n- ")}`,
    });
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 4000,
      system:
        "You are the Screenwriter agent for an AI sitcom studio. Write tight, funny, structured scripts. " +
        "Brevity is the soul of the joke: short lines land harder. " +
        SCRIPT_SCHEMA_HINT,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.map((b) => b.text ?? "").join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}
