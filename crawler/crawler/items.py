import scrapy


class ProductItem(scrapy.Item):
    source_url = scrapy.Field()
    source = scrapy.Field()
    name = scrapy.Field()
    description = scrapy.Field()
    price_amount = scrapy.Field()
    price_currency = scrapy.Field()
    images = scrapy.Field()
    categories = scrapy.Field()
    attributes = scrapy.Field()
    availability = scrapy.Field()
    seller_name = scrapy.Field()
    seller_url = scrapy.Field()
    seller_rating = scrapy.Field()
