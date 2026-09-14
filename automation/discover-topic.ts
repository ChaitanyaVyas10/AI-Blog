import fs from "fs";
import { topicDiscoverySystem, topicDiscoveryUser } from "./prompts/topic-discovery";
import { parseJsonResponse } from "./utilities";

export async function discoverTopics(openai: any, dryRun = false) {
  // For now this uses the OpenAI chat completion. In dry-run mode we return a few hard-coded candidates.
  if (dryRun) {
    return [
      {
        title: "Sample: International climate summit outcomes",
        topic: "climate-summit-outcomes",
        category: "Environment",
        reason: "New commitments and debates emerged at the recent summit.",
        importanceScore: 80,
        interestScore: 60,
        sourceQualityScore: 80,
        noveltyScore: 50,
        keywords: ["climate", "summit", "emissions"]
      }
    ];
  }

  // Real implementation: call OpenAI with a system+user prompt and parse JSON.
  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_RESEARCH_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: topicDiscoverySystem },
        { role: "user", content: topicDiscoveryUser }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800
    });
    const raw = resp.choices?.[0]?.message?.content || resp.choices?.[0]?.text || "";
    const parsed = parseJsonResponse(raw);
    return Array.isArray(parsed) ? parsed : parsed.candidates || [];
  } catch (err) {
    console.error("[DISCOVERY] OpenAI error", err);
    return [];
  }
}

