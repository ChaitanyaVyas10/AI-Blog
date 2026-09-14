# The Daily Perspective — Autonomous AI Editorial

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

Full instructions are in the README in the repository.
