import { getTableColumns, sql } from "drizzle-orm";
import { references } from "./schema";

/**
 * The columns a list needs: everything but the four 1536-dimension vectors and the search
 * internals, which a card never shows (about 60 KB a row, or megabytes per page of cards).
 */
const { embeddingContent: _e1, embeddingVisual: _e2, embeddingStrategic: _e3, embeddingExecution: _e4, searchText: _st, fts: _fts, ...LIST_COLUMNS } = getTableColumns(references);
export { LIST_COLUMNS };
const HEAVY = new Set(["embedding_content", "embedding_visual", "embedding_strategic", "embedding_execution", "search_text", "fts"]);
/** The same, for raw SQL over `"references" r`. */
export const LIST_SQL = sql.raw(
  Object.values(getTableColumns(references))
    .filter((c) => !HEAVY.has(c.name))
    .map((c) => `r."${c.name}"`)
    .join(", "),
);
