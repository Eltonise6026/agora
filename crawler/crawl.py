"""Quick crawl script to populate the Agora index with real products."""
import os
import sys
import json
import hashlib
from datetime import datetime, timezone

import psycopg2
from psycopg2.extras import Json
from openai import OpenAI

# Shopify stores expose /products.json publicly
SHOPIFY_STORES = [
    # Shoes & apparel
    "https://www.allbirds.com",
    "https://www.tentree.com",
    "https://www.taylorstitch.com",
    "https://www.greysonclothiers.com",
    "https://www.girlfriend.com",
    # Accessories & lifestyle
    "https://www.ridgewallet.com",
    "https://www.puravidabracelets.com",
    "https://hautehijab.com",
    "https://www.nativecos.com",
    # Home & food
    "https://www.brooklinen.com",
    "https://www.deathwishcoffee.com",
    # Cosmetics
    "https://colourpop.com",
]


def generate_product_id(source: str, source_url: str) -> str:
    hash_input = f"{source}:{source_url}"
    short_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:12]
    return f"agr_{short_hash}"


def fetch_shopify_products(store_url: str) -> list[dict]:
    """Fetch products from Shopify's public JSON API."""
    import urllib.request

    products = []
    page = 1
    while True:
        url = f"{store_url.rstrip('/')}/products.json?limit=50&page={page}"
        print(f"  Fetching {url}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Agora Crawler/0.1"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read())
                batch = data.get("products", [])
                if not batch:
                    break
                products.extend(batch)
                if len(batch) < 50:
                    break
                page += 1
        except Exception as e:
            print(f"  Error fetching {url}: {e}")
            break

    return products


def normalize_shopify_product(product: dict, store_url: str) -> dict:
    """Convert Shopify JSON product to our normalized schema."""
    handle = product.get("handle", "")
    product_url = f"{store_url.rstrip('/')}/products/{handle}"

    # Get first variant for price
    variants = product.get("variants", [])
    price = variants[0].get("price") if variants else None
    currency = "USD"  # Shopify defaults

    # Availability from first variant
    available = any(v.get("available", False) for v in variants)

    # Images
    images = [img.get("src", "") for img in product.get("images", []) if img.get("src")]

    # Categories from product_type and tags
    categories = []
    if product.get("product_type"):
        categories.append(product["product_type"])
    tags = product.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")]
    categories.extend(tags[:3])  # Add first 3 tags as categories

    # Attributes from options
    attributes = {}
    for option in product.get("options", []):
        name = option.get("name", "")
        values = option.get("values", [])
        if name and values:
            attributes[name] = ", ".join(values[:5])

    return {
        "source_url": product_url,
        "source": "shopify",
        "name": product.get("title", ""),
        "description": product.get("body_html", "")
            .replace("<br>", " ")
            .replace("<br/>", " ")
            .replace("<p>", " ")
            .replace("</p>", " ")
            .replace("<strong>", "")
            .replace("</strong>", "")
            .replace("<em>", "")
            .replace("</em>", "")
            .replace("<ul>", " ")
            .replace("</ul>", " ")
            .replace("<li>", "- ")
            .replace("</li>", " ")
            .replace("&nbsp;", " ")
            .strip()[:2000] if product.get("body_html") else "",
        "price_amount": price,
        "price_currency": currency,
        "images": images[:5],
        "categories": categories,
        "attributes": attributes,
        "availability": "in_stock" if available else "out_of_stock",
        "seller_name": product.get("vendor", ""),
        "seller_url": store_url,
        "seller_rating": None,
    }


def insert_product(conn, product: dict) -> str:
    """Insert a product into the database."""
    product_id = generate_product_id(product["source"], product["source_url"])
    now = datetime.now(timezone.utc)

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
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                price_amount = EXCLUDED.price_amount,
                images = EXCLUDED.images,
                categories = EXCLUDED.categories,
                attributes = EXCLUDED.attributes,
                availability = EXCLUDED.availability,
                last_crawled = EXCLUDED.last_crawled
            """,
            (
                product_id,
                product["source_url"],
                product["source"],
                product["name"],
                product["description"],
                product["price_amount"],
                product["price_currency"],
                Json(product["images"]),
                Json(product["categories"]),
                Json(product["attributes"]),
                product["availability"],
                product["seller_name"],
                product["seller_url"],
                product["seller_rating"],
                now,
            ),
        )

        # Price history
        if product["price_amount"]:
            cur.execute(
                "INSERT INTO price_history (product_id, amount, currency) VALUES (%s, %s, %s)",
                (product_id, product["price_amount"], product["price_currency"]),
            )

    return product_id


def generate_and_store_embedding(conn, openai_client, product_id: str, text: str):
    """Generate embedding and store it."""
    try:
        response = openai_client.embeddings.create(
            input=text[:8000],
            model="text-embedding-3-small",
        )
        embedding = response.data[0].embedding

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO product_embeddings (product_id, embedding, updated_at)
                VALUES (%s, %s::vector, %s)
                ON CONFLICT (product_id) DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    updated_at = EXCLUDED.updated_at
                """,
                (product_id, str(embedding), datetime.now(timezone.utc)),
            )
    except Exception as e:
        print(f"    Embedding error: {e}")


def main():
    db_url = os.environ.get("DATABASE_URL")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    conn.autocommit = True

    openai_client = None
    if openai_key:
        openai_client = OpenAI(api_key=openai_key)
        print("OpenAI embeddings enabled")
    else:
        print("WARNING: No OPENAI_API_KEY — skipping embeddings")

    total_products = 0

    for store_url in SHOPIFY_STORES:
        print(f"\nCrawling {store_url}...")
        raw_products = fetch_shopify_products(store_url)
        print(f"  Found {len(raw_products)} products")

        for raw in raw_products:
            product = normalize_shopify_product(raw, store_url)
            if not product["name"]:
                continue

            product_id = insert_product(conn, product)
            total_products += 1

            # Generate embedding
            if openai_client:
                embed_text = f"{product['name']} {product['description'][:500]}"
                generate_and_store_embedding(conn, openai_client, product_id, embed_text)

            if total_products % 10 == 0:
                print(f"  Indexed {total_products} products...")

    conn.close()
    print(f"\nDone! Indexed {total_products} products total.")


if __name__ == "__main__":
    main()
