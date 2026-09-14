import fs from "fs";
import path from "path";
import { z } from "zod";
import slugify from "slugify";

export const TOPIC_HISTORY = path.resolve("data/topic-history.json");

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
