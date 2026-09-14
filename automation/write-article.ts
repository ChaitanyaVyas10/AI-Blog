import { writerSystem } from "./prompts/writer";

export async function writeArticle(openai: any, researchPackage: any, dryRun = false) {
  if (dryRun) {
    return {
      frontmatter: {
        title: `Sample analysis: ${researchPackage.topic}`,
        description: `A demo analysis of ${researchPackage.topic}`,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: "World",
        tags: ["demo"],
        author: "AI Editorial System",
        readingTime: 4,
        featured: false,
        sources: researchPackage.sources || []
      },
      body: `# ${researchPackage.topic}\n\nThis is a sample article generated in dry-run mode.\n\n## What happened\n\nSample facts.\n\n## Sources\n\n- ${researchPackage.sources?.[0]?.url}`
    };
  }

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_WRITER_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: writerSystem },
        { role: "user", content: `Write an article based strictly on this research package: ${JSON.stringify(researchPackage)}` }
      ],
      max_tokens: 3000
    });
    const raw = resp.choices?.[0]?.message?.content || resp.choices?.[0]?.text || "";
    // Expect full markdown with frontmatter
    return { raw };
  } catch (err) {
    console.error("[WRITER] OpenAI error", err);
    throw err;
  }
}
