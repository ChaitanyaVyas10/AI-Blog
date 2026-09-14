import fs from "fs";
import path from "path";
import matter from "gray-matter";
import simpleGit from "simple-git";
import { generateSlug, readTopicHistory, writeTopicHistory } from "./utilities";

const POSTS_DIR = path.resolve("content/posts");

export async function publishArticle(frontmatter: any, body: string, commit = true) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  const date = new Date(frontmatter.publishedAt || new Date()).toISOString().slice(0,10);
  const slug = frontmatter.slug || generateSlug(frontmatter.title, date);
  const filename = path.join(POSTS_DIR, `${slug.replace(/\//g, "-")}.md`);
  const content = matter.stringify(body, frontmatter);
  fs.writeFileSync(filename, content, "utf-8");

  // update topic history
  const history = readTopicHistory();
  history.unshift({ date, title: frontmatter.title, topic: frontmatter.title, category: frontmatter.category, slug });
  // keep 120 entries
  const pruned = history.slice(0, 120);
  writeTopicHistory(pruned);

  if (commit) {
    const git = simpleGit();
    try {
      await git.add([filename, "data/topic-history.json"]);
      await git.commit(`publish: daily article ${date}`);
      await git.push();
      console.log(`[PUBLISH] committed and pushed ${filename}`);
    } catch (err) {
      console.error("[PUBLISH] git commit failed", err);
    }
  }

  return { filename, slug };
}
