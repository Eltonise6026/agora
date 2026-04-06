import {
  pgTable,
  text,
  varchar,
  numeric,
  timestamp,
  jsonb,
  index,
  integer,
  pgEnum,
  vector,
  serial,
} from "drizzle-orm/pg-core";

export const availabilityEnum = pgEnum("availability", [
  "in_stock",
  "out_of_stock",
  "unknown",
]);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(), // agr_xxx format
    sourceUrl: text("source_url").notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceAmount: numeric("price_amount", { precision: 12, scale: 2 }),
    priceCurrency: varchar("price_currency", { length: 3 }).default("USD"),
    images: jsonb("images").$type<string[]>().default([]),
    categories: jsonb("categories").$type<string[]>().default([]),
    attributes: jsonb("attributes").$type<Record<string, string>>().default({}),
    availability: availabilityEnum("availability").default("unknown"),
    sellerName: text("seller_name"),
    sellerUrl: text("seller_url"),
    sellerRating: numeric("seller_rating", { precision: 3, scale: 2 }),
    lastCrawled: timestamp("last_crawled", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_products_source").on(table.source),
    index("idx_products_availability").on(table.availability),
    index("idx_products_source_url").on(table.sourceUrl),
  ]
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_price_history_product").on(table.productId),
    index("idx_price_history_recorded").on(table.recordedAt),
  ]
);

export const productEmbeddings = pgTable(
  "product_embeddings",
  {
    productId: text("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_embeddings_vector").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    parentId: integer("parent_id"),
    source: varchar("source", { length: 50 }),
  },
  (table) => [
    index("idx_categories_slug").on(table.slug),
    index("idx_categories_parent").on(table.parentId),
  ]
);

export const apiKeys = pgTable("api_keys", {
  key: varchar("key", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  tier: varchar("tier", { length: 20 }).notNull().default("free"),
  requestCount: integer("request_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
