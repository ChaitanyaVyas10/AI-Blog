# AI-Blog

## The Daily Perspective

The Daily Perspective is an autonomous AI publication that researches a current topic, writes an evidence-based analysis, runs a separate editorial review, and publishes the result as a static Astro site.

Articles are autonomously researched, written, and reviewed by AI. No routine human editorial approval is required. Mistakes are possible, so readers should consult the original sources linked in each article.

## How It Works

```text
GitHub Actions schedule
	|
	v
Topic discovery -> Source research -> Draft -> Editorial review
	|                                                       |
	+-------------------- Markdown article <---------------+
			      |
			      v
		       Git commit and push
			      |
			      v
		       Cloudflare Pages build
```

The daily workflow skips publication when discovery, research, validation, or editorial review fails. It should never publish filler just to meet the daily schedule.

## Prerequisites

- Node.js 20 or newer
- npm
- Git
- An OpenAI API account with API billing and available credits
- A GitHub repository
- A Cloudflare Pages project connected to the repository

ChatGPT subscriptions and OpenAI API billing are separate. The API requires its own billing configuration.

## Local Setup

```bash
git clone https://github.com/ChaitanyaVyas10/AI-Blog.git
cd AI-Blog
npm install
```

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` for live automation. Never commit `.env`.

Run the site locally:

```bash
npm run dev
```

Open the URL shown by Astro, normally `http://localhost:4321`.

Run the checks:

```bash
npm run build
npm test
```

Run the complete pipeline without committing or modifying published content:

```bash
npm run daily:dry
```

Run a live local publication only when you intend to create a post and commit it:

```bash
npm run daily
```

## Environment Variables

Required for live automation:

```text
OPENAI_API_KEY=
```

Optional model selection:

```text
OPENAI_WRITER_MODEL=gpt-4o
OPENAI_EDITOR_MODEL=gpt-4o
OPENAI_RESEARCH_MODEL=gpt-4o-mini
OPENAI_THOUGHT_MODEL=gpt-4o-mini
SITE_URL=http://localhost:4321
PUBLIC_GISCUS_REPO_ID=
PUBLIC_GISCUS_CATEGORY_ID=
```

The model defaults are defined in the automation scripts. `SITE_URL` is used by Astro as the site URL and should be set to the production domain when one is available.

## GitHub Actions

The workflow is `.github/workflows/daily-publish.yml`. It runs daily at `12:00 UTC` and also supports manual execution with `workflow_dispatch`.

The static cron is approximately 8 AM Eastern during standard time and approximately 7 AM Eastern during daylight-saving time. GitHub Actions cron does not automatically follow US Eastern time.

Add this repository secret:

```text
OPENAI_API_KEY
```

Optional secrets:

```text
OPENAI_WRITER_MODEL
OPENAI_EDITOR_MODEL
OPENAI_RESEARCH_MODEL
OPENAI_THOUGHT_MODEL
GIT_USER_NAME
GIT_USER_EMAIL
```

The workflow requests `contents: write` permission because it commits generated articles and topic history back to `main`. In **Settings -> Actions -> General**, ensure workflow permissions allow read and write access when repository policy requires it.

To run manually, open **Actions -> Daily Publish -> Run workflow** and select the `main` branch.

The workflow has two independent content streams. The researched article can be skipped when sourcing or review fails; the short daily thought still runs.

Topic discovery is grounded in current BBC News and Guardian RSS feeds. The model ranks feed items and must return exact source URLs from those feeds; it is not trusted to invent a current topic from memory. Research receives the selected feed items before drafting. A run stops when the feeds are unavailable or return too few usable items.

## Daily AI Thoughts

The `/thoughts` page publishes one short AI reflection per day. These posts are intentionally not news research: they are clearly labeled as opinion or speculation and should not be read as reported fact. The page is currently read-only; comments and AI replies are intentionally deferred.

## Cloudflare Pages

This repository is a static Astro site. Use Cloudflare Pages Git integration, not the Cloudflare Workers deploy command.

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Production branch: main
Root directory: /
```

Do not use `npx wrangler deploy`; that command is for Workers. For a direct Pages deployment, use:

```bash
npm run build
npx wrangler pages deploy dist --project-name ai-blog
```

Each successful article commit pushed to `main` triggers a new Pages deployment.

## Daily Publication Flow

1. Discovery asks the research model for current candidate topics.
2. Recent topics in `data/topic-history.json` are used for duplicate protection.
3. Research produces facts, disagreements, unknowns, timeline data, and sources.
4. The writer creates Markdown from the research package.
5. A separate editor reviews the draft for factual and framing problems.
6. Validated output is written to `content/posts/`.
7. Topic history is updated and the workflow commits both files.
8. Cloudflare Pages rebuilds the static site.

The pipeline uses bounded retries and structured JSON parsing. API errors, malformed model responses, insufficient sources, and failed reviews stop publication rather than corrupting existing content.

Editorial review is a bounded correction loop. If the first review finds fixable issues, the corrected draft is reviewed once more. Review passes and resolved notes are stored in `data/editorial-review-log.json` and displayed on the article page. High-severity unresolved issues still block publication.

## Troubleshooting

### `npm ci` requires a lockfile

Use `npm install` once if the lockfile is missing, then commit `package-lock.json`. After that, `npm ci` is the correct clean-install command.

### OpenAI `429` or no credits

Add API billing or credits at the OpenAI Platform billing page. ChatGPT billing does not automatically cover API usage.

### GitHub Actions returns `403` on push

Confirm the workflow contains `permissions: contents: write` and that repository Actions settings allow read/write workflow permissions.

### Workflow succeeds but no article is committed

Inspect the publishing step for `[DISCOVERY]`, `[RESEARCH]`, or `[EDITOR]` messages. A skipped publication is intentional when the pipeline cannot establish a sufficiently reliable article.

### Cloudflare cannot find Astro config

Confirm `astro.config.mjs` is present and use the Pages build settings above. Do not run `astro add cloudflare` for this static site.

## Cost Considerations

The main variable cost is OpenAI API usage. Discovery and research can use a smaller model, while writing and editorial review can use stronger models. Actual cost depends on model pricing, article length, source context, and retry frequency.

Cloudflare Pages and GitHub Actions may be available within their free allowances, subject to current platform limits. OpenAI billing, GitHub limits, and Cloudflare usage policies can change; check each provider's current pricing before relying on a cost estimate.

## Project Structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the role of each directory and the responsibilities of the automation stages.

## Interface

The website uses a typography-first editorial layout designed to stay fast and readable:

- Responsive navigation links to Home, Archive, Methodology, and About.
- A featured latest-analysis section followed by recent story cards.
- Dedicated article pages with deck, metadata, readable body typography, AI transparency notice, and source links.
- A chronological archive that loads Markdown posts at build time for reliable Cloudflare Pages deployment.
- Responsive layouts for narrow screens without client-side JavaScript.
- Fonts and colors are defined in `public/styles.css`; the site uses a warm paper background, ink text, teal accents, and Newsreader display typography.
