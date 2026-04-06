import os
from pathlib import Path

import pytest
from scrapy.http import HtmlResponse, Request

from crawler.spiders.shopify import ShopifySpider


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def fake_response(filename: str, url: str = "https://store.example.com/products/sneaker"):
    body = (FIXTURES_DIR / filename).read_bytes()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body)


def test_shopify_parses_product_from_json_ld():
    spider = ShopifySpider()
    response = fake_response("shopify_product.html")
    items = list(spider.parse_product(response))
    assert len(items) == 1
    assert items[0]["name"] == "Classic Canvas Sneaker"


def test_shopify_parses_price():
    spider = ShopifySpider()
    response = fake_response("shopify_product.html")
    items = list(spider.parse_product(response))
    assert items[0]["price_amount"] == "59.00"
    assert items[0]["price_currency"] == "USD"


def test_shopify_parses_availability():
    spider = ShopifySpider()
    response = fake_response("shopify_product.html")
    items = list(spider.parse_product(response))
    assert items[0]["availability"] == "in_stock"


def test_shopify_parses_seller():
    spider = ShopifySpider()
    response = fake_response("shopify_product.html")
    items = list(spider.parse_product(response))
    assert items[0]["seller_name"] == "UrbanKicks"
