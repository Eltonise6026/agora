import os
import hashlib
from datetime import datetime, timezone

import psycopg2
from psycopg2.extras import execute_values
from pgvector.psycopg2 import register_vector


def get_connection():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    register_vector(conn)
    return conn


def generate_product_id(source: str, source_url: str) -> str:
    hash_input = f"{source}:{source_url}"
    short_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:12]
    return f"agr_{short_hash}"


def upsert_product(conn, product: dict):
    product_id = generate_product_id(product["source"], product["source_url"])

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO products (
                id, source_url, source, name, description,
                price_amount, price_currency, images, categories,
                attributes, availability, seller_name, seller_url,
                seller_rating, last_crawled
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s::jsonb, %s::jsonb,
                %s::jsonb, %s, %s, %s,
                %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                price_amount = EXCLUDED.price_amount,
                price_currency = EXCLUDED.price_currency,
                images = EXCLUDED.images,
                categories = EXCLUDED.categories,
                attributes = EXCLUDED.attributes,
                availability = EXCLUDED.availability,
                seller_name = EXCLUDED.seller_name,
                seller_url = EXCLUDED.seller_url,
                seller_rating = EXCLUDED.seller_rating,
                last_crawled = EXCLUDED.last_crawled
            """,
            (
                product_id,
                product["source_url"],
                product["source"],
                product["name"],
                product.get("description", ""),
                product.get("price_amount"),
                product.get("price_currency", "USD"),
                psycopg2.extras.Json(product.get("images", [])),
                psycopg2.extras.Json(product.get("categories", [])),
                psycopg2.extras.Json(product.get("attributes", {})),
                product.get("availability", "unknown"),
                product.get("seller_name"),
                product.get("seller_url"),
                product.get("seller_rating"),
                datetime.now(timezone.utc),
            ),
        )

        if product.get("price_amount"):
            cur.execute(
                """
                INSERT INTO price_history (product_id, amount, currency)
                VALUES (%s, %s, %s)
                """,
                (product_id, product["price_amount"], product.get("price_currency", "USD")),
            )

    conn.commit()
    return product_id


def upsert_embedding(conn, product_id: str, embedding: list[float]):
    import numpy as np

    vector = np.array(embedding, dtype=np.float32)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO product_embeddings (product_id, embedding, updated_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (product_id) DO UPDATE SET
                embedding = EXCLUDED.embedding,
                updated_at = EXCLUDED.updated_at
            """,
            (product_id, vector, datetime.now(timezone.utc)),
        )
    conn.commit()
