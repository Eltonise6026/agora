import scrapy
from crawler.items import ProductItem


class BaseProductSpider(scrapy.Spider):

    def clean_text(self, text: str | None) -> str:
        if not text:
            return ""
        return " ".join(text.split())

    def parse_price(self, price_text: str | None) -> tuple[str | None, str]:
        if not price_text:
            return None, "USD"

        price_text = price_text.strip()
        currency = "USD"

        currency_map = {"$": "USD", "£": "GBP", "€": "EUR", "¥": "JPY"}
        for symbol, code in currency_map.items():
            if symbol in price_text:
                currency = code
                price_text = price_text.replace(symbol, "")
                break

        price_text = price_text.replace(",", "").strip()

        try:
            amount = f"{float(price_text):.2f}"
            return amount, currency
        except ValueError:
            return None, currency

    def make_item(self, **kwargs) -> ProductItem:
        item = ProductItem()
        item["source"] = kwargs.get("source", self.name)
        item["source_url"] = kwargs.get("source_url", "")
        item["name"] = self.clean_text(kwargs.get("name"))
        item["description"] = self.clean_text(kwargs.get("description", ""))
        item["images"] = kwargs.get("images", [])
        item["categories"] = kwargs.get("categories", [])
        item["attributes"] = kwargs.get("attributes", {})
        item["availability"] = kwargs.get("availability", "unknown")
        item["seller_name"] = kwargs.get("seller_name")
        item["seller_url"] = kwargs.get("seller_url")
        item["seller_rating"] = kwargs.get("seller_rating")

        amount, currency = self.parse_price(kwargs.get("price_text"))
        item["price_amount"] = amount
        item["price_currency"] = currency

        return item
