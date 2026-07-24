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

export async function generateScript({ show, idea }) {
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
        SCRIPT_SCHEMA_HINT,
      messages: [
        {
          role: "user",
          content: `${writingContext(show)}\n\nEPISODE IDEA: ${idea}\n\nWrite the episode script as JSON.`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.map((b) => b.text ?? "").join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(json);
}
