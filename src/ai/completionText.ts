// Picks the completion text to validate from llama.rn's result. Measured on a real phone
// (Honor X9b, AI-001 probe runs 1 and 2, 2026-10-10): llama.rn 0.12.9 returns `text`
// beginning with the chat template's assistant header ("<|im_start|>assistant\n") even
// though add_generation_prompt is on by default, while `content` holds its chat
// parser's output without that header. Strict JSON validation still follows, so this
// never lets malformed output through; it only removes the template header.
const ASSISTANT_HEADER = /^\s*<\|im_start\|>\s*assistant[ \t]*\r?\n?/;

export function extractCompletionText(
  rawText: string,
  content: string | undefined,
): { text: string; rawText?: string } {
  const parsed = typeof content === "string" ? content.trim() : "";
  if (parsed.startsWith("{")) return parsed === rawText ? { text: rawText } : { text: parsed, rawText };
  const stripped = rawText.replace(ASSISTANT_HEADER, "");
  return stripped === rawText ? { text: rawText } : { text: stripped, rawText };
}
