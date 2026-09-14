import fs from "fs";
import path from "path";
import { z } from "zod";
import slugify from "slugify";

export const TOPIC_HISTORY = path.resolve("data/topic-history.json");

export type NewsItem = {
  title: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  summary?: string;
};

export const NEWS_FEEDS = [
  { publisher: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { publisher: "BBC News", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { publisher: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { publisher: "The Guardian", url: "https://www.theguardian.com/technology/rss" }
];

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  for (const feed of NEWS_FEEDS) {
    try {
      const response = await fetch(feed.url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) continue;
      const xml = await response.text();
      for (const item of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
        const block = item[1];
        const read = (tag: string) => {
          const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
          return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
        };
        const title = read("title");
        const url = read("link");
        if (title && url) items.push({ title, url, publisher: feed.publisher, publishedAt: read("pubDate"), summary: read("description") });
      }
    } catch (error) {
      console.warn(`[NEWS] Feed unavailable: ${feed.url}`);
    }
  }
  return items.slice(0, 40);
}

export async function fetchSourceExcerpt(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(Number(process.env.NEWS_FEED_TIMEOUT_MS || 12000)),
      headers: { "User-Agent": "AI-Blog research reader/1.0" }
    });
    if (!response.ok) return "";
    const html = await response.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);
  } catch {
    return "";
  }
}

export const topicHistorySchema = z.array(z.object({
  date: z.string(),
  title: z.string(),
  topic: z.string(),
  category: z.string(),
  slug: z.string(),
  keywords: z.array(z.string()).optional()
}));

export function readTopicHistory() {
  try {
    const raw = fs.readFileSync(TOPIC_HISTORY, "utf-8");
    const parsed = JSON.parse(raw);
    return topicHistorySchema.parse(parsed);
  } catch (err) {
    return [] as any;
  }
}

export function writeTopicHistory(history: any) {
  fs.mkdirSync(path.dirname(TOPIC_HISTORY), { recursive: true });
  fs.writeFileSync(TOPIC_HISTORY, JSON.stringify(history, null, 2), "utf-8");
}

export function generateSlug(title: string, date?: string) {
  const base = slugify(title, { lower: true, strict: true });
  if (date) return `${date}/${base}`;
  return base;
}

export function estimateReadingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function parseJsonResponse(raw: string) {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.search(/[\[{]/);
    const end = Math.max(candidate.lastIndexOf("]"), candidate.lastIndexOf("}"));
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("Model response did not contain valid JSON");
  }
}
