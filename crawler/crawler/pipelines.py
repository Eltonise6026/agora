import os
import logging

from openai import OpenAI
from crawler.db import get_connection, upsert_product, upsert_embedding, generate_product_id

logger = logging.getLogger(__name__)


class NormalizePipeline:
    def process_item(self, item, spider):
        item.setdefault("description", "")
        item.setdefault("images", [])
        item.setdefault("categories", [])
        item.setdefault("attributes", {})
        item.setdefault("availability", "unknown")
        item.setdefault("price_currency", "USD")
        return item


class EmbeddingPipeline:
    def open_spider(self, spider):
        api_key = os.environ.get("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
        else:
            self.client = None
            logger.warning("OPENAI_API_KEY not set — skipping embeddings")

    def process_item(self, item, spider):
        if not self.client:
            return item

        text = f"{item['name']} {item.get('description', '')}"
        try:
            response = self.client.embeddings.create(
                input=text, model="text-embedding-3-small"
            )
            item["_embedding"] = response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding failed for {item.get('name', '?')}: {e}")

        return item


class PostgresPipeline:
    def open_spider(self, spider):
        self.conn = get_connection()

    def close_spider(self, spider):
        self.conn.close()

    def process_item(self, item, spider):
        product_dict = dict(item)
        embedding = product_dict.pop("_embedding", None)

        product_id = upsert_product(self.conn, product_dict)

        if embedding:
            upsert_embedding(self.conn, product_id, embedding)

        return item
