from crawler.spiders.base import BaseProductSpider


class AmazonSpider(BaseProductSpider):
    name = "amazon"
    allowed_domains = ["amazon.com"]

    def __init__(self, start_urls=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if start_urls:
            self.start_urls = start_urls
        else:
            self.start_urls = []

    def start_requests(self):
        for url in self.start_urls:
            yield self.make_playwright_request(url)

    def make_playwright_request(self, url):
        import scrapy
        return scrapy.Request(
            url,
            callback=self.parse_product,
            meta={"playwright": True, "playwright_include_page": False},
        )

    def parse_product(self, response):
        name = self.clean_text(response.css("#productTitle::text").get())
        if not name:
            return

        whole = response.css(".a-price-whole::text").get("").strip().rstrip(".")
        fraction = response.css(".a-price-fraction::text").get("00").strip()
        symbol = response.css(".a-price-symbol::text").get("$").strip()
        price_text = f"{symbol}{whole}.{fraction}" if whole else None

        avail_text = self.clean_text(
            response.css("#availability span::text").get("")
        ).lower()
        if "in stock" in avail_text:
            availability = "in_stock"
        elif "unavailable" in avail_text or "out of stock" in avail_text:
            availability = "out_of_stock"
        else:
            availability = "unknown"

        description = self.clean_text(
            response.css("#productDescription p::text").get("")
        )

        images = []
        main_img = response.css("#landingImage::attr(data-old-hires)").get()
        if main_img:
            images.append(main_img)

        categories = [
            self.clean_text(a.css("::text").get())
            for a in response.css("#wayfinding-breadcrumbs_container a")
            if self.clean_text(a.css("::text").get())
        ]

        seller_name = self.clean_text(
            response.css("#bylineInfo::text").get()
        )

        yield self.make_item(
            source="amazon",
            source_url=response.url,
            name=name,
            description=description,
            price_text=price_text,
            images=images,
            categories=categories,
            availability=availability,
            seller_name=seller_name or None,
        )
