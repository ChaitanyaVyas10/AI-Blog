import { topicDiscoverySystem, topicDiscoveryUser } from "./prompts/topic-discovery";
import { fetchNewsItems, parseJsonResponse } from "./utilities";

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

  const newsItems = await fetchNewsItems();
  if (newsItems.length < 4) throw new Error("Current news feeds returned too few usable items");
  const currentNews = newsItems.map((item, index) => `${index + 1}. ${item.title} | ${item.publisher} | ${item.publishedAt || "date unavailable"} | ${item.url}`).join("\n");

  // Keep discovery grounded in current feed items rather than model memory.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const resp = await openai.chat.completions.create({
        model: process.env.OPENAI_RESEARCH_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: topicDiscoverySystem },
          { role: "user", content: `${topicDiscoveryUser} Return no more than 8 candidates. Use only stories represented in this current feed. Include sourceItems as an array of source URLs supporting each candidate.\n\nCURRENT FEED ITEMS:\n${currentNews}` }
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
      const candidates = Array.isArray(parsed) ? parsed : parsed.candidates || [];
      return candidates.map((candidate: any) => ({
        ...candidate,
        sourceItems: selectCurrentSources(candidate, newsItems)
      }));
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

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().replace(/\/$/, "");
  }
}

function selectCurrentSources(candidate: any, newsItems: any[]) {
  const requested = (candidate.sourceItems || [])
    .map((source: any) => typeof source === "string" ? source : source?.url)
    .filter(Boolean)
    .map(normalizeUrl);
  const exact = newsItems.filter((item) => requested.includes(normalizeUrl(item.url)));
  if (exact.length > 0) return exact;

  const words = `${candidate.title || ""} ${candidate.topic || ""}`.toLowerCase().split(/[^a-z0-9]+/).filter((word: string) => word.length > 3);
  const related = newsItems.map((item) => ({
    item,
    score: words.filter((word: string) => item.title.toLowerCase().includes(word)).length
  })).filter((entry) => entry.score >= 2).sort((a, b) => b.score - a.score).slice(0, 5);
  return related.map((entry) => entry.item);
}

