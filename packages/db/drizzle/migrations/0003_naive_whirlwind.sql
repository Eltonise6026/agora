CREATE TABLE "store_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"query_count" integer DEFAULT 0 NOT NULL,
	"product_views" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_analytics" ADD CONSTRAINT "store_analytics_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_store_analytics_store_date" ON "store_analytics" USING btree ("store_id","date");--> statement-breakpoint
CREATE INDEX "idx_store_analytics_store" ON "store_analytics" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_analytics_date" ON "store_analytics" USING btree ("date");