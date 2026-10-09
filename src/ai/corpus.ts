import data from "./corpus.json";
import type { CorpusCase } from "./evaluation";

// Held-out evaluation inputs (AI-003/AI-005). Text and expected slots only; this
// is neither transit data nor a substitute for model output.
export const HELD_OUT_CORPUS = data as unknown as { version: string; description: string; cases: CorpusCase[] };
