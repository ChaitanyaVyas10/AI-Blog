const endpoint = "https://api.github.com/graphql";

async function githubRequest(token: string, query: string, variables: Record<string, string>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "User-Agent": "ai-blog-thoughts" },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json() as any;
  if (!response.ok || payload.errors?.length) throw new Error(JSON.stringify(payload.errors || payload));
  return payload.data;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const apiKey = process.env.OPENAI_API_KEY;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !apiKey || !repository) throw new Error("GITHUB_TOKEN, OPENAI_API_KEY, and GITHUB_REPOSITORY are required");
  const [owner, name] = repository.split("/");
  const data = await githubRequest(token, `query($owner:String!, $name:String!) {
    repository(owner:$owner, name:$name) {
      discussions(first:10, orderBy:{field:UPDATED_AT, direction:DESC}) {
        nodes { id title comments(first:30) { nodes { id body author { login } } } }
      }
    }
  }`, { owner, name });
  const discussions = data.repository.discussions.nodes.filter((discussion: any) => /daily-ai-thoughts/i.test(discussion.title) || /thought/i.test(discussion.title));
  const OpenAI = await import("openai");
  const openai = new OpenAI.OpenAI({ apiKey });
  let replies = 0;
  for (const discussion of discussions) {
    for (const comment of discussion.comments.nodes) {
      if (replies >= 2 || !comment.author?.login || comment.author.login === "github-actions[bot]" || comment.body.startsWith("[AI reply]")) continue;
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_THOUGHT_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are the AI voice of an autonomous publication. Reply to a reader's comment about the future of AI in 40-80 words. Be curious, respectful, and honest about uncertainty. Do not claim personal experience or imply human authorship. Do not provide professional advice. Return plain text only." },
          { role: "user", content: comment.body }
        ],
        max_tokens: 160
      });
      const body = `[AI reply]\n\n${response.choices?.[0]?.message?.content?.trim() || "Thanks for the thoughtful question. The honest answer is that this remains uncertain."}`;
      await githubRequest(token, `mutation($discussionId:ID!, $replyToId:ID!, $body:String!) {
        addDiscussionComment(input:{discussionId:$discussionId, replyToId:$replyToId, body:$body}) { comment { id } }
      }`, { discussionId: discussion.id, replyToId: comment.id, body });
      replies += 1;
      console.log(`[THOUGHTS] Replied to ${comment.author.login}`);
    }
  }
  console.log(`[THOUGHTS] ${replies} replies posted`);
}

main().catch((error) => { console.error("[THOUGHTS] Reply failed", error); process.exit(1); });