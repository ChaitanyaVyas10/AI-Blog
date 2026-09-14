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

  try {
    const sourceItems = topic.sourceItems || [];
    if (sourceItems.length === 0) throw new Error("Selected topic was not linked to a current feed item");
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_RESEARCH_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: researchSystem },
        { role: "user", content: `Research the following current topic using only the supplied current source items. Preserve source URLs exactly, do not invent sources, and return at least four usable sources when the source items allow it. Produce a structured JSON research package.\n\nTOPIC:\n${JSON.stringify(topic)}\n\nCURRENT SOURCE ITEMS:\n${JSON.stringify(sourceItems)}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });
    const raw = resp.choices?.[0]?.message?.content || resp.choices?.[0]?.text || "";
    const parsed = parseJsonResponse(raw);
    const allowedUrls = new Set(sourceItems.map((item: any) => typeof item === "string" ? item : item.url));
    parsed.sources = (parsed.sources || []).filter((source: any) => source?.url && allowedUrls.has(source.url));
    if (parsed.sources.length === 0) {
      parsed.sources = sourceItems.map((item: any) => typeof item === "string"
        ? { title: topic.title, publisher: "Current news feed", url: item }
        : { title: item.title, publisher: item.publisher, url: item.url, publishedAt: item.publishedAt });
    }
    if (parsed.sources.length === 0) throw new Error("Research returned no sources from the current feed packet");
    return parsed;
  } catch (err) {
    console.error("[RESEARCH] OpenAI error", err);
    throw err;
  }
}
