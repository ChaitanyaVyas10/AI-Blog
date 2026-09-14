import { researchSystem } from "./prompts/research";
import { parseJsonResponse } from "./utilities";

export async function researchTopic(openai: any, topic: any, dryRun = false) {
  if (dryRun) {
    return {
      topic: topic.title || topic.topic,
      facts: ["Fact A from reputable source."],
      disputedClaims: [],
      majorPerspectives: [],
      unknowns: [],
      timeline: [],
      statistics: [],
      sources: [
        {
          title: "Sample Source",
          publisher: "Reuters",
          url: "https://example.com/sample",
          publishedAt: new Date().toISOString()
        }
      ]
    };
  }

  // TODO: Implement web search and source extraction using OpenAI web search where supported.
  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_RESEARCH_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: researchSystem },
        { role: "user", content: `Research the following topic and produce a structured JSON research package: ${JSON.stringify(topic)}` }
      ],
      max_tokens: 2000
    });
    const raw = resp.choices?.[0]?.message?.content || resp.choices?.[0]?.text || "";
    const parsed = parseJsonResponse(raw);
    return parsed;
  } catch (err) {
    console.error("[RESEARCH] OpenAI error", err);
    throw err;
  }
}
