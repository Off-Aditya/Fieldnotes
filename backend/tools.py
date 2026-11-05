import os
import requests

from langchain.tools import tool
from bs4 import BeautifulSoup
from tavily import TavilyClient
from urllib.parse import urlparse

# from rich import print
from dotenv import load_dotenv

load_dotenv()

tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@tool
def web_search(query: str) -> str:
    """Search the web for recent and reliable information on a given topic.
    Args:
        query: The topic or question to search for.
    Returns:
        A string containing search result titles, URLs, and snippets.
    """

    results = tavily.search(query=query, max_results=5)

    out = []

    for r in results["results"]:
        out.append(
            f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['content'][:200]}\n"
        )

    return "\n----\n".join(out)


@tool
def scrape_url(url: str) -> str:
    """Scrape and extract readable text content from a webpage.
    Args:
        url: The HTTP or HTTPS URL of the webpage to scrape.
    Returns:
        The extracted webpage text, limited to 3000 characters,
        or an error message if scraping fails.
    """
    parsed_url = urlparse(url)

    if parsed_url.scheme not in ("http", "https") or not parsed_url.netloc:
        return "Error: Please provide a valid HTTP or HTTPS URL."

    try:
        response = requests.get(
            url,
            timeout=8,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        for tag in soup(
            [
                "script",
                "style",
                "nav",
                "footer",
                "header",
                "aside",
                "noscript",
                "iframe",
            ]
        ):
            tag.decompose()

        text = soup.get_text(separator=" ", strip=True)

        return text[:2000] if text else "No readable text found on the webpage."

    except requests.exceptions.Timeout:
        return "Error: The webpage request timed out."
    except requests.exceptions.RequestException as e:
        return f"Error fetching webpage: {e}"
