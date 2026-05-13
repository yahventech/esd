"""Scrape latest Kenya sports news from free sources and create stories automatically.

Usage:
    python manage.py scrape_kenya_sports [--dry-run] [--limit 10]

Sources:
- BBC Sport (Kenya section)
- The Standard (Kenya sports)
- Nation Media Group (sports section)
- Goal.com (Kenya news)
- ESPN Africa (Kenya sports)

Idempotent: skips stories with duplicate titles/headlines.
"""

import json
import re
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin, urlparse, parse_qs, unquote

import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.categories.models import Category
from apps.stories.models import Story, Tag


class Command(BaseCommand):
    help = "Scrape Kenya sports news and create stories automatically."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be created without actually creating stories.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=10,
            help="Maximum number of stories to create per source.",
        )
        parser.add_argument(
            "--source",
            choices=["bbc", "standard", "nation", "goal", "espn", "bing", "all"],
            default="all",
            help="Specific source to scrape, or 'all' for all sources.",
        )

    def handle(self, *args, **opts):
        dry_run = opts["dry_run"]
        limit = opts["limit"]
        source_filter = opts["source"]

        sources = {
            "bbc": self.scrape_bbc_sport,
            "standard": self.scrape_standard,
            "nation": self.scrape_nation,
            "goal": self.scrape_goal,
            "espn": self.scrape_espn,
            "bing": self.scrape_bing_news,
        }

        if source_filter != "all":
            sources = {source_filter: sources[source_filter]}

        total_created = 0

        for source_name, scraper_func in sources.items():
            self.stdout.write(f"\nScraping {source_name}...")
            try:
                stories = scraper_func(limit)
                self.stdout.write(f"Found {len(stories)} story candidates from {source_name}")
                created_count = self.create_stories(stories, dry_run)
                total_created += created_count
                self.stdout.write(
                    self.style.SUCCESS(f"Created {created_count} stories from {source_name}")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Failed to scrape {source_name}: {e}")
                )

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"\nDry run complete. Would create {total_created} stories.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\nCreated {total_created} stories total.")
            )

    def create_stories(self, scraped_stories, dry_run=False):
        """Create Story objects from scraped data, skipping duplicates."""
        created_count = 0
        sports_category, created = Category.objects.get_or_create(
            slug="sports",
            defaults={
                "name": "Sports",
                "icon": "⚽",
                "color": "#10B981",
                "is_nav": False,
                "order": 100,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS("Created fallback sports category 'Sports'."))

        for story_data in scraped_stories:
            headline = story_data["title"].strip()
            body = story_data.get("content") or story_data.get("summary", "")
            summary = story_data.get("summary", "")

            # Skip if story with similar headline exists (within last 30 days)
            thirty_days_ago = datetime.now() - timedelta(days=30)
            existing = Story.objects.filter(
                headline__icontains=headline[:50],
                published_at__gte=thirty_days_ago
            ).exists()

            if existing:
                continue

            if dry_run:
                self.stdout.write(f"Would create: {headline}")
                created_count += 1
                continue

            story = Story.objects.create(
                headline=headline,
                summary=summary[:500],
                body=body,
                author=None,
                status="published",
                placement="none",
                placement_rank=0,
                story_format="news",
                published_at=story_data.get("published_at", datetime.now()),
                category=sports_category,
            )

            for tag_name in ["kenya", "sports"]:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                story.tags.add(tag)

            created_count += 1

        return created_count

    def _clean_html(self, html):
        return BeautifulSoup(html or "", "html.parser").get_text(separator=" ", strip=True)

    def _parse_rss_datetime(self, pub_date_text):
        if not pub_date_text:
            return datetime.now()
        try:
            return parsedate_to_datetime(pub_date_text)
        except Exception:
            return datetime.now()

    def _unpack_redirect_url(self, url):
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if "url" in params:
            return unquote(params["url"][0])
        if "u" in params:
            return unquote(params["u"][0])
        return url

    def _scrape_rss_feed(self, url, source, limit=10):
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, "xml")
        stories = []

        for item in soup.find_all("item", limit=limit * 3):
            title_elem = item.find("title")
            link_elem = item.find("link")
            desc_elem = item.find("description")
            date_elem = item.find("pubDate")

            if not title_elem or not link_elem:
                continue

            title = title_elem.get_text().strip()
            if not self._is_kenya_related(title):
                continue

            raw_url = link_elem.get_text().strip()
            stories.append({
                "title": title,
                "summary": self._clean_html(desc_elem.get_text() if desc_elem else ""),
                "url": self._unpack_redirect_url(raw_url),
                "source": source,
                "published_at": self._parse_rss_datetime(date_elem.get_text() if date_elem else None),
            })
            if len(stories) >= limit:
                break

        return stories

    def scrape_bbc_sport(self, limit=10):
        """Scrape BBC Africa news via RSS."""
        return self._scrape_rss_feed(
            "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
            "BBC Africa",
            limit,
        )

    def scrape_bing_news(self, limit=10):
        """Scrape Kenya sports headlines from Bing News search RSS."""
        return self._scrape_rss_feed(
            "https://www.bing.com/news/search?q=Kenya+sports&format=rss",
            "Bing News",
            limit,
        )

    def scrape_standard(self, limit=10):
        """Scrape The Standard Kenya sports news."""
        url = "https://www.standardmedia.co.ke/sports"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }

        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, "html.parser")

        stories = []
        articles = soup.find_all("article", limit=limit * 2)

        for article in articles[:limit]:
            title_elem = article.find("h2") or article.find("h3") or article.find("a")
            if not title_elem:
                continue

            title = title_elem.get_text().strip()
            if not self._is_kenya_related(title):
                continue

            link_elem = article.find("a")
            url = urljoin("https://www.standardmedia.co.ke", link_elem["href"]) if link_elem else ""

            summary_elem = article.find("p")
            summary = summary_elem.get_text().strip() if summary_elem else ""

            stories.append({
                "title": title,
                "summary": summary,
                "url": url,
                "source": "The Standard",
                "published_at": datetime.now(),
            })

        return stories

    def scrape_nation(self, limit=10):
        """Scrape Nation Media Group sports news."""
        url = "https://nation.africa/kenya/sports"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }

        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, "html.parser")

        stories = []
        articles = soup.find_all("article", limit=limit * 2)

        for article in articles[:limit]:
            title_elem = article.find("h2") or article.find("h3")
            if not title_elem:
                continue

            title = title_elem.get_text().strip()
            if not self._is_kenya_related(title):
                continue

            link_elem = article.find("a")
            url = urljoin("https://nation.africa", link_elem["href"]) if link_elem else ""

            summary_elem = article.find("p")
            summary = summary_elem.get_text().strip() if summary_elem else ""

            stories.append({
                "title": title,
                "summary": summary,
                "url": url,
                "source": "Daily Nation",
                "published_at": datetime.now(),
            })

        return stories

    def scrape_goal(self, limit=10):
        """Scrape Goal.com Kenya news."""
        url = "https://www.goal.com/en-ke/news"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }

        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, "html.parser")
        stories = []

        script = soup.find("script", attrs={"type": "application/ld+json"})
        if script:
            try:
                data = json.loads(script.string)
                items = data.get("itemListElement") or []
                for item in items:
                    article = item.get("item", {})
                    title = article.get("headline") or article.get("name")
                    if not title or not self._is_kenya_related(title):
                        continue

                    url = article.get("url") or article.get("@id")
                    published_at = datetime.now()
                    if article.get("datePublished"):
                        try:
                            published_at_text = article.get("datePublished")
                            if published_at_text.endswith("Z"):
                                published_at_text = published_at_text[:-1] + "+00:00"
                            published_at = datetime.fromisoformat(published_at_text)
                        except Exception:
                            published_at = datetime.now()

                    stories.append({
                        "title": title.strip(),
                        "summary": article.get("description", ""),
                        "url": url,
                        "source": "Goal.com",
                        "published_at": published_at,
                    })
                    if len(stories) >= limit:
                        break
            except json.JSONDecodeError:
                pass

        return stories

    def scrape_espn(self, limit=10):
        """Scrape ESPN soccer RSS feed."""
        return self._scrape_rss_feed(
            "https://www.espn.com/espn/rss/soccer/news",
            "ESPN",
            limit,
        )

    def _is_kenya_related(self, title):
        """Check if a title is related to Kenya sports."""
        title_lower = title.lower()

        kenya_terms = [
            "kenya", "kenyan", "nairobi", "harambee", "harambee stars",
            "gor mahia", "afc leopards", "kpl", "fkf", "simba",
            "yang", "rudisha", "kiprop", "kemboi", "makau", "wanjiru",
            "east africa", "uganda", "tanzania", "ethiopia", "somalia",
            "rwanda", "burundi", "south sudan"
        ]

        east_africa_terms = [
            "east africa", "uganda", "tanzania", "ethiopia", "somalia",
            "rwanda", "burundi", "south sudan",
        ]
        sports_terms = [
            "football", "soccer", "rugby", "athletics", "marathon",
            "basketball", "cricket", "boxing", "netball", "sevens",
            "afcon", "world cup", "olympic", "league", "match",
            "score", "goal", "win", "cup", "tournament", "wnba",
            "nba", "mls", "runner", "race", "athlete", "track",
            "field",
        ]

        if any(term in title_lower for term in kenya_terms):
            return True

        if any(term in title_lower for term in east_africa_terms):
            return any(term in title_lower for term in sports_terms)

        return any(term in title_lower for term in sports_terms) and any(
            term in title_lower for term in ["kenya", "kenyan", "nairobi"]
        )