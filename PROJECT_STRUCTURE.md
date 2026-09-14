# Project Structure

This document explains the responsibilities of the main files in AI-Blog.

## Top-Level Layout

```text
.
├── .github/workflows/daily-publish.yml
├── automation/
├── content/posts/
├── data/topic-history.json
├── public/
├── src/
├── tests/
├── astro.config.mjs
├── package.json
├── package-lock.json
├── tsconfig.json
└── .env.example
```

## Website

### `src/layouts/Layout.astro`

Shared document shell for the site. It renders the page title, responsive navigation, main content slot, stylesheet, and editorial footer.

### `src/pages/index.astro`

Homepage. It imports Markdown posts at build time, sorts them by `publishedAt`, and displays the latest analysis and recent story cards.

### `src/pages/posts/[slug].astro`

Dynamic static route for individual articles. Astro generates one HTML page for every Markdown file in `content/posts/`.

### `src/pages/about.astro`

Explains that the publication is autonomous AI-generated editorial work and describes its limitations.

### `src/pages/methodology.astro`

Describes the discovery, research, writing, review, and publication stages.

### `src/pages/archive.astro`

Imports Markdown posts at build time and lists available posts in date order. It does not depend on runtime filesystem access, which keeps it compatible with static Cloudflare Pages builds.

### `src/pages/thoughts.astro`

Displays the short daily AI reflection stream. It is currently read-only; comments are reserved for a later release.

### `src/config.ts`

Central site configuration. This is the place to change the publication name, description, URL, author, and supported categories.

### `public/styles.css`

Global static stylesheet. It defines the responsive editorial visual system: typography, warm paper palette, teal accents, navigation, story cards, article layouts, source lists, and mobile breakpoints. Assets in `public/` are copied directly to the final `dist/` output.

## Content and Data

### `content/posts/`

Markdown articles. Each article contains frontmatter for title, description, publication date, category, tags, reading time, sources, and generation metadata.

Published Markdown files are the production content source. The repository no longer includes placeholder demo articles.

### `data/topic-history.json`

Recent publication history used to reduce duplicate topic selection. The automation keeps recent entries so the model does not repeatedly choose the same story.

## Automation

### `automation/run-daily.ts`

Pipeline entrypoint. It coordinates discovery, research, writing, editorial review, duplicate checks, and publication.

### `automation/discover-topic.ts`

Fetches current BBC News and Guardian RSS items, then asks the model to rank only those supplied stories. It uses bounded retries and rejects malformed responses.

### `automation/research-topic.ts`

Builds a structured research package from the selected current feed items, containing facts, disputed claims, perspectives, unknowns, timelines, statistics, and sources.

### `automation/write-article.ts`

Creates the article draft from the research package. The writer is instructed not to invent facts, quotations, or citations.

### `automation/editorial-review.ts`

Runs the separate skeptical editorial pass. It checks support, attribution, dates, framing, uncertainty, source matching, and false balance.

### `automation/publish-article.ts`

Writes the final Markdown file and updates topic history. In a live run it commits and pushes the generated files.

### `automation/utilities.ts`

Shared helpers for topic history, slug generation, reading-time estimation, and tolerant JSON response parsing.

### `automation/prompts/`

Dedicated prompt modules for discovery, research, writing, and editorial review. Keeping prompts separate makes editorial rules easy to inspect and change.

### `automation/publish-thought.ts`

Creates one short, no-research AI reflection per UTC day in `content/thoughts/`. It skips the date if a thought already exists.

## Build and Deployment

### `astro.config.mjs`

Configures Astro for static output and reads `SITE_URL` when supplied.

### `package.json`

Defines dependencies and commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local Astro development server |
| `npm run build` | Type-check and build static output in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run daily` | Run live daily automation |
| `npm run daily:dry` | Run automation without publication changes |
| `npm run thoughts` | Generate the live daily AI thought |
| `npm run thoughts:dry` | Preview a thought without writing it |
| `npm test` | Run Vitest tests |

### `.github/workflows/daily-publish.yml`

Runs the daily automation on GitHub-hosted infrastructure. It installs dependencies with `npm ci`, executes the pipeline, and pushes generated content with the GitHub Actions token.

### Cloudflare Pages

Cloudflare Pages builds the `main` branch with `npm run build` and serves the `dist/` directory. A push from the daily workflow triggers the next deployment.

## Tests

Tests live in `tests/`. They cover critical pure logic such as slug generation. Add focused tests when changing duplicate detection, date handling, parsing, or publication validation.

## Security Boundaries

- API keys belong only in environment variables or GitHub Secrets.
- `.env` is ignored by Git.
- Secrets must never be placed in `src/`, `public/`, Markdown frontmatter, or logs.
- Model-generated text is treated as data; it must not become executable commands.
- External source links are rendered with `noopener noreferrer` on article pages.
