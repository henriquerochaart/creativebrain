import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  boolean,
  vector,
  index,
  uniqueIndex,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

/** Postgres tsvector as a generated column for keyword search. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export type ReferenceMetadata = {
  author?: string | null;
  authorUrl?: string | null;
  brand?: string | null;
  title?: string | null;
  publishedAt?: string | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  pageCount?: number | null;
  siteName?: string | null;
  language?: string | null;
  /** Origin of the stored thumbnail, so /api/media can fall back when storage loses the object. */
  sourceThumbnailUrl?: string | null;
  [key: string]: unknown;
};

export type VisualAnalysis = {
  environment?: string[];
  subjects?: string[];
  colors?: string[];
  typography?: string[];
  composition?: string[];
  motion?: string[];
  audio?: string[];
  onScreenText?: string[];
  narrative?: string[];
  description?: string;
};

export type ReferenceContent = {
  transcript?: string | null;
  ocr?: string | null;
  description?: string | null;
  pageText?: string | null;
  userNote?: string | null;
  visualAnalysis?: VisualAnalysis | null;
};

export type ReferenceAI = {
  summary?: string;
  whatItIs?: string;
  whyInteresting?: string;
  creativeMechanism?: string;
  coreIdea?: string;
  concepts?: string[];
  tags?: string[];
  creativePrinciples?: string[];
  emotionalAttributes?: string[];
  strategicAttributes?: string[];
  subjects?: string[];
  formats?: string[];
  brands?: string[];
  people?: string[];
  audience?: string;
  model?: string;
  generatedAt?: string;
};

export const references = pgTable(
  "references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originalUrl: text("original_url"),
    canonicalUrl: text("canonical_url"),
    sourcePlatform: text("source_platform").notNull().default("other"),
    mediaType: text("media_type").notNull().default("website"),
    title: text("title"),
    brand: text("brand"),
    thumbnailUrl: text("thumbnail_url"),
    mediaKey: text("media_key"),
    mediaMime: text("media_mime"),
    mediaBytes: integer("media_bytes"),
    status: text("status").notNull().default("queued"),
    processingStep: text("processing_step"),
    error: text("error"),
    metadata: jsonb("metadata").$type<ReferenceMetadata>().notNull().default({}),
    content: jsonb("content").$type<ReferenceContent>().notNull().default({}),
    ai: jsonb("ai").$type<ReferenceAI>().notNull().default({}),
    subjects: text("subjects").array().notNull().default(sql`'{}'::text[]`),
    formats: text("formats").array().notNull().default(sql`'{}'::text[]`),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    principles: text("principles").array().notNull().default(sql`'{}'::text[]`),
    concepts: text("concepts").array().notNull().default(sql`'{}'::text[]`),
    saved: boolean("saved").notNull().default(false),
    userNote: text("user_note"),
    // Four embeddings = four kinds of similarity (conceptual, visual, strategic, execution).
    embeddingContent: vector("embedding_content", { dimensions: EMBEDDING_DIMENSIONS }),
    embeddingVisual: vector("embedding_visual", { dimensions: EMBEDDING_DIMENSIONS }),
    embeddingStrategic: vector("embedding_strategic", { dimensions: EMBEDDING_DIMENSIONS }),
    embeddingExecution: vector("embedding_execution", { dimensions: EMBEDDING_DIMENSIONS }),
    searchText: text("search_text"),
    fts: tsvector("fts").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(search_text, ''))`,
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [
    index("references_status_idx").on(t.status),
    index("references_platform_idx").on(t.sourcePlatform),
    index("references_created_idx").on(t.createdAt),
    index("references_fts_idx").using("gin", t.fts),
    index("references_tags_idx").using("gin", t.tags),
    index("references_subjects_idx").using("gin", t.subjects),
    index("references_formats_idx").using("gin", t.formats),
    index("references_principles_idx").using("gin", t.principles),
    index("references_emb_content_idx").using("hnsw", t.embeddingContent.op("vector_cosine_ops")),
    index("references_emb_visual_idx").using("hnsw", t.embeddingVisual.op("vector_cosine_ops")),
    index("references_emb_strategic_idx").using("hnsw", t.embeddingStrategic.op("vector_cosine_ops")),
    index("references_emb_execution_idx").using("hnsw", t.embeddingExecution.op("vector_cosine_ops")),
  ],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    emoji: text("emoji"),
    description: text("description"),
    position: integer("position").notNull().default(0),
    auto: boolean("auto").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("collections_slug_idx").on(t.slug)],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => references.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.referenceId] })],
);

/** Knowledge graph edges between references, one row per similarity kind. */
export const referenceRelations = pgTable(
  "reference_relations",
  {
    sourceId: uuid("source_id")
      .notNull()
      .references(() => references.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => references.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // visual | conceptual | strategic | execution | same_brand | same_concept | same_mechanism
    score: real("score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sourceId, t.targetId, t.kind] }),
    index("reference_relations_target_idx").on(t.targetId),
  ],
);

/** Conversations with a reference ("Ask this reference") and Think mode, kept for memory. */
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceId: uuid("reference_id").references(() => references.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(), // ask | think
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Saved boards (moodboards) generated from a brief over the repertoire. */
export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  brief: text("brief").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** V3: a project is a creative process — references → concepts → patterns → directions → ideas → output. */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brief: text("brief"),
  status: text("status").notNull().default("open"), // open | archived
  analysis: jsonb("analysis").$type<Record<string, unknown>>().notNull().default({}),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectReferences = pgTable(
  "project_references",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => references.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    note: text("note"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.referenceId] })],
);

/** Behavioural signals that feed Personal Taste: view | ask | save | collect | project. */
export const referenceEvents = pgTable(
  "reference_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceId: uuid("reference_id")
      .notNull()
      .references(() => references.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reference_events_ref_idx").on(t.referenceId), index("reference_events_created_idx").on(t.createdAt)],
);

export const referencesRelations = relations(references, ({ many }) => ({
  collectionItems: many(collectionItems),
}));
export const collectionsRelations = relations(collections, ({ many }) => ({
  items: many(collectionItems),
}));
export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, { fields: [collectionItems.collectionId], references: [collections.id] }),
  reference: one(references, { fields: [collectionItems.referenceId], references: [references.id] }),
}));

export type Reference = typeof references.$inferSelect;
export type NewReference = typeof references.$inferInsert;
export type Collection = typeof collections.$inferSelect;
export type ReferenceRelation = typeof referenceRelations.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type Project = typeof projects.$inferSelect;
