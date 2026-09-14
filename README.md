# AI-Blog

## The Daily Perspective - Autonomous AI Editorial

This repository implements an autonomous, daily-publishing AI-powered analysis site. It discovers trending topics, researches reputable sources, drafts an evidence-based analysis, performs an independent AI editorial review, and publishes a Markdown article daily.

See `README` for full setup and operation.

## Quick start

1. Clone the repo
2. npm install
3. Add `OPENAI_API_KEY` to your GitHub repository secrets (and optionally local `.env`)
4. Connect to Cloudflare Pages and enable GitHub Actions
5. Set up `PUBLISH_TIME_UTC` if you want to change publication time

Run a dry run locally:

```bash
npm install
npm run daily:dry
```

Full instructions are in this README and the project files.

## Cloudflare Pages deployment

This is a static Astro site. Do not run `astro add cloudflare` or configure the Cloudflare Workers adapter for the Pages deployment.

In Cloudflare Pages, connect the GitHub repository and use:

```text
Framework preset: Astro
Build command: npm run build
Build output directory: dist
Production branch: main
```

The required `astro.config.mjs` is committed in the repository. For a direct Wrangler Pages deployment, run:

```bash
npm run build
npx wrangler pages deploy dist --project-name ai-blog
```

The GitHub Actions workflow publishes articles by committing them to `main`; that push triggers a new Cloudflare Pages build.
