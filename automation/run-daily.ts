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

  if (!dryRun) {
    const today = new Date().toISOString().slice(0, 10);
    const postsDir = path.resolve("content/posts");
    const existingArticle = fs.existsSync(postsDir) && fs.readdirSync(postsDir).some((file) => file.startsWith(`${today}-`) && file.endsWith(".md"));
    if (existingArticle) {
      console.log(`[PUBLISH] Article already exists for ${today}; skipping all AI calls`);
      return;
    }
  }

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
  console.log(`[DISCOVERY] Linked current sources: ${chosen.sourceItems?.length || 0}`);

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
  const reviewHistory: any[] = [];
  let reviewedArticle = draft;
  let review: any = null;
  for (let pass = 1; pass <= 2; pass += 1) {
    review = await editorialReview(openai, reviewedArticle, research, dryRun);
    reviewHistory.push({ pass, approved: review.approved, issues: review.issues || [] });
    if (review.revisedArticle) reviewedArticle = review.revisedArticle;
    if (review.approved) break;
    if (!review.revisedArticle || pass === 2) break;
    console.warn(`[EDITOR] Revision required on pass ${pass}; reviewing corrected draft`);
    reviewedArticle = review.revisedArticle;
  }
  const unresolvedIssues = review?.issues || [];
  const highSeverity = unresolvedIssues.some((issue: any) => issue.severity === "high");
  if (!review?.approved && highSeverity) {
    const issues = JSON.stringify(unresolvedIssues);
    console.error(`[EDITOR] High-severity issues remain: ${issues}`);
    throw new Error(`Editorial review rejected the article: ${issues}`);
  }
  if (!review?.approved) console.warn("[EDITOR] Publishing corrected draft with no high-severity issues");
  else console.log("[EDITOR] Approved");

  const finalArticle = reviewedArticle;
  const publicationTime = new Date().toISOString();
  const fm = {
    title: chosen.title,
    description: chosen.reason,
    category: chosen.category || "World",
    tags: chosen.keywords || [],
    author: "AI Editorial System",
    readingTime: 6,
    featured: false,
    sources: research.sources,
    ...(finalArticle.frontmatter || {}),
    publishedAt: publicationTime,
    updatedAt: publicationTime,
    generation: {
      ...(finalArticle.frontmatter?.generation || {}),
      autonomous: true,
      researchedAt: publicationTime,
      factCheckedAt: publicationTime
    },
    editorialReview: {
      passes: reviewHistory.length,
      approved: Boolean(review?.approved),
      notes: reviewHistory.flatMap((entry) => entry.issues)
    }
  };
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
