class CrawlerError(Exception):
    pass


class ArticleExtractionError(CrawlerError):
    pass


class ArticleFetchError(CrawlerError):
    pass