import os
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from scrapy.http import HtmlResponse, Request

from crawler.spiders.amazon import AmazonSpider


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def fake_response(filename: str, url: str = "https://www.amazon.com/dp/B001TEST"):
    body = (FIXTURES_DIR / filename).read_bytes()
    request = Request(url=url)
    return HtmlResponse(url=url, request=request, body=body)


def test_amazon_parses_product_name():
    spider = AmazonSpider()
    response = fake_response("amazon_product.html")
    items = list(spider.parse_product(response))
    assert len(items) == 1
    assert items[0]["name"] == "Test Waterproof Hiking Boots"


def test_amazon_parses_price():
    spider = AmazonSpider()
    response = fake_response("amazon_product.html")
    items = list(spider.parse_product(response))
    assert items[0]["price_amount"] == "89.99"
    assert items[0]["price_currency"] == "USD"


def test_amazon_parses_availability():
    spider = AmazonSpider()
    response = fake_response("amazon_product.html")
    items = list(spider.parse_product(response))
    assert items[0]["availability"] == "in_stock"


def test_amazon_parses_categories():
    spider = AmazonSpider()
    response = fake_response("amazon_product.html")
    items = list(spider.parse_product(response))
    assert items[0]["categories"] == ["Clothing", "Shoes", "Hiking"]
