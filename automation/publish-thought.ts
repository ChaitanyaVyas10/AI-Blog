import fs from "fs";
import path from "path";
import matter from "gray-matter";

const THOUGHTS_DIR = path.resolve("content/thoughts");

export async function publishThought(openai: any, dryRun = false) {
  const date = new Date().toISOString();
  const day = date.slice(0, 10);
  const filename = path.join(THOUGHTS_DIR, `${day}.md`);
  if (fs.existsSync(filename)) {
    console.log(`[THOUGHT] Already published for ${day}`);
    return { created: false, filename };
  }

  let title = "A thought on what comes next";
  let body = "The future of AI will be shaped as much by the choices around it as by the systems themselves.";
  if (!dryRun) {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_THOUGHT_MODEL || process.env.OPENAI_WRITER_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You write one short, thoughtful social post about the future of AI. This is a personal-style reflection, not news and not research. Do not cite sources, invent facts, make predictions with certainty, or use hashtags. Return JSON only with title and body. Keep body between 40 and 90 words."
        },
        { role: "user", content: "Write today's AI thought. Be specific, curious, clear, and useful to an intelligent general audience." }
      ],
      response_format: { type: "json_object" },
      max_tokens: 220
    });
    const result = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    title = result.title || title;
    body = result.body || body;
  }

  const frontmatter = {
    title,
    publishedAt: date,
    kind: "thought",
    autonomous: true
  };
  const content = matter.stringify(body, frontmatter);
  if (dryRun) {
    console.log("[THOUGHT] Dry run", JSON.stringify(frontmatter));
    return { created: false, filename, content };
  }
  fs.mkdirSync(THOUGHTS_DIR, { recursive: true });
  fs.writeFileSync(filename, content, "utf-8");
  console.log(`[THOUGHT] Created ${filename}`);
  return { created: true, filename };
}

if (process.argv.includes("--dry-run") || process.argv[1]?.endsWith("publish-thought.ts")) {
  const dryRun = process.argv.includes("--dry-run");
  (async () => {
    let openai: any = null;
    if (!dryRun) {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for live thought publishing");
      const OpenAI = await import("openai");
      openai = new OpenAI.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    await publishThought(openai, dryRun);
  })().catch((error) => { console.error(error); process.exit(1); });
}
