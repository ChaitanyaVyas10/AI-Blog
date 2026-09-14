import { editorSystem } from "./prompts/editor";
import { parseJsonResponse } from "./utilities";

export async function editorialReview(openai: any, draft: any, researchPackage: any, dryRun = false) {
  if (dryRun) {
    return { approved: true, issues: [], revisedArticle: draft };
  }

  try {
    const resp = await openai.chat.completions.create({
      model: process.env.OPENAI_EDITOR_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: editorSystem },
        { role: "user", content: `Review the following draft and research package. Draft: ${JSON.stringify(draft)} Research: ${JSON.stringify(researchPackage)}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });
    const raw = resp.choices?.[0]?.message?.content || resp.choices?.[0]?.text || "";
    try {
      return parseJsonResponse(raw);
    } catch (e) {
      return { approved: false, issues: [{ message: "Editor output not valid JSON" }], revisedArticle: draft };
    }
  } catch (err) {
    console.error("[EDITOR] OpenAI error", err);
    throw err;
  }
}
