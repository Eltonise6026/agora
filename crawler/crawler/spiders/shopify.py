import json

from crawler.spiders.base import BaseProductSpider


class ShopifySpider(BaseProductSpider):
    name = "shopify"

    def __init__(self, store_urls=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.store_urls = store_urls or []

    def start_requests(self):
        import scrapy
        for store_url in self.store_urls:
            yield scrapy.Request(
                f"{store_url.rstrip('/')}/products.json",
                callback=self.parse_product_list,
                meta={"store_url": store_url},
            )

    def parse_product_list(self, response):
        import scrapy
        data = json.loads(response.text)
        for product in data.get("products", []):
            url = f"{response.meta['store_url'].rstrip('/')}/products/{product['handle']}"
            yield scrapy.Request(url, callback=self.parse_product)

    def parse_product(self, response):
        json_ld = self._extract_json_ld(response)
        if not json_ld:
            return

        name = json_ld.get("name", "")
        if not name:
            return

        offers = json_ld.get("offers", {})
        if isinstance(offers, list):
            offers = offers[0] if offers else {}

        price_amount = offers.get("price")
        price_currency = offers.get("priceCurrency", "USD")
        if price_amount:
            price_amount = f"{float(price_amount):.2f}"

        avail_url = offers.get("availability", "")
        if "InStock" in avail_url:
            availability = "in_stock"
        elif "OutOfStock" in avail_url:
            availability = "out_of_stock"
        else:
            availability = "unknown"

        images = json_ld.get("image", [])
        if isinstance(images, str):
            images = [images]

        brand = json_ld.get("brand", {})
        seller_name = brand.get("name") if isinstance(brand, dict) else None

        categories = [
            self.clean_text(a.css("::text").get())
            for a in response.css(".breadcrumb a, nav[aria-label='breadcrumb'] a")
            if self.clean_text(a.css("::text").get())
        ]

        yield self.make_item(
            source="shopify",
            source_url=response.url,
            name=name,
            description=self.clean_text(json_ld.get("description", "")),
            price_text=f"${price_amount}" if price_amount else None,
            images=images,
            categories=categories,
            availability=availability,
            seller_name=seller_name,
        )

    def _extract_json_ld(self, response) -> dict | None:
        for script in response.css('script[type="application/ld+json"]::text').getall():
            try:
                data = json.loads(script)
                if isinstance(data, dict) and data.get("@type") == "Product":
                    return data
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") == "Product":
                            return item
            except json.JSONDecodeError:
                continue
        return None
