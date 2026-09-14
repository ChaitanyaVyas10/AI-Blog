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

  // Keep discovery compact so the structured response cannot be cut off mid-JSON.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const resp = await openai.chat.completions.create({
        model: process.env.OPENAI_RESEARCH_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: topicDiscoverySystem },
          { role: "user", content: `${topicDiscoveryUser} Return no more than 8 candidates.` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1800
      });
      const choice = resp.choices?.[0];
      const raw = choice?.message?.content || choice?.text || "";
      if (choice?.finish_reason === "length") {
        throw new Error("Discovery response was truncated");
      }
      const parsed = parseJsonResponse(raw);
      return Array.isArray(parsed) ? parsed : parsed.candidates || [];
    } catch (err) {
      if (attempt === 2) {
        console.error("[DISCOVERY] OpenAI error", err);
        throw err;
      }
      console.warn("[DISCOVERY] Retrying structured response", err);
    }
  }
  throw new Error("Discovery failed without a response");
}

