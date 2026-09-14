#!/usr/bin/env node
import path from "path";
import fs from "fs";
import { discoverTopics } from "./discover-topic";
import { researchTopic } from "./research-topic";
import { writeArticle } from "./write-article";
import { editorialReview } from "./editorial-review";
import { publishArticle } from "./publish-article";
import { readTopicHistory } from "./utilities";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  // Minimal OpenAI shim when no key is present: allow dry-run only
  let openai: any = null;
  if (OPENAI_KEY) {
    // Use openai npm client
    const OpenAI = await import("openai");
    openai = new OpenAI.OpenAI({ apiKey: OPENAI_KEY });
  }

  console.log(`[RUN] dryRun=${dryRun}`);

  const history = readTopicHistory();
  const candidates = await discoverTopics(openai, dryRun);
  if (!candidates || candidates.length === 0) {
    console.log("[DISCOVERY] No candidates; exiting");
    return;
  }

  // pick top by importanceScore*sourceQualityScore*novelty
  candidates.sort((a:any,b:any)=> (b.importanceScore||0)*(b.sourceQualityScore||0)*(b.noveltyScore||0) - (a.importanceScore||0)*(a.sourceQualityScore||0)*(a.noveltyScore||0));
  const chosen = candidates[0];
  console.log(`[DISCOVERY] Selected: ${chosen.title || chosen.topic}`);

  // duplicate protection: check last 60 days
  const recent = history.slice(0,60).map((h:any)=>h.title || h.topic);
  if (recent.includes(chosen.title)) {
    console.log(`[DUPLICATE] Topic too similar to recent; skipping`);
    return;
  }

  const research = await researchTopic(openai, chosen, dryRun);
  if (!research || !research.sources || research.sources.length < 1) {
    console.log("[RESEARCH] insufficient sources; aborting");
    return;
  }

  const draft = await writeArticle(openai, research, dryRun);
  const review = await editorialReview(openai, draft, research, dryRun);
  if (!review.approved) {
    console.log(`[EDITOR] Not approved:`, review.issues);
    return;
  }

  const finalArticle = review.revisedArticle || draft;
  const fm = finalArticle.frontmatter || finalArticle.frontmatter || { title: chosen.title, description: chosen.reason, publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), category: chosen.category || "World", tags: (chosen.keywords||[]), author: "AI Editorial System", readingTime: 6, featured: false, sources: research.sources };
  const body = finalArticle.body || finalArticle.raw || "";

  if (dryRun) {
    console.log("---DRY RUN OUTPUT---");
    console.log(JSON.stringify({ frontmatter: fm, body: body.substring(0,200) }, null, 2));
    return;
  }

  const pub = await publishArticle(fm, body, true);
  console.log(`[PUBLISH] Done: ${pub.slug}`);
}

main().catch(err=>{ console.error(err); process.exit(1); });
