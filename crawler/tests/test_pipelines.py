from crawler.pipelines import NormalizePipeline
from crawler.items import ProductItem


def test_normalize_sets_defaults():
    pipeline = NormalizePipeline()

    item = ProductItem()
    item["name"] = "Test Product"
    item["source"] = "test"
    item["source_url"] = "https://example.com"

    result = pipeline.process_item(item, None)

    assert result["description"] == ""
    assert result["images"] == []
    assert result["categories"] == []
    assert result["attributes"] == {}
    assert result["availability"] == "unknown"
    assert result["price_currency"] == "USD"


def test_normalize_preserves_existing_values():
    pipeline = NormalizePipeline()

    item = ProductItem()
    item["name"] = "Test"
    item["source"] = "test"
    item["source_url"] = "https://example.com"
    item["description"] = "A real description"
    item["categories"] = ["Shoes"]
    item["availability"] = "in_stock"

    result = pipeline.process_item(item, None)

    assert result["description"] == "A real description"
    assert result["categories"] == ["Shoes"]
    assert result["availability"] == "in_stock"
