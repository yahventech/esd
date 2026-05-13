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
from urllib.parse import urljoin, urlparse

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
            choices=["bbc", "standard", "nation", "goal", "espn", "all"],
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
        sports_category = Category.objects.filter(slug="sports").first()
        if sports_category is None:
            self.stdout.write(
                self.style.WARNING("Sports category not found; stories will be created without a category.")
            )

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

    def scrape_bbc_sport(self, limit=10):
        """Scrape BBC Sport Kenya news."""
        url = "https://www.bbc.com/sport/football/africa"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }

        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, "html.parser")

        stories = []
        articles = soup.find_all("article", limit=limit * 2)  # Get more to filter

        for article in articles[:limit]:
            title_elem = article.find("h2") or article.find("h3")
            if not title_elem:
                continue

            title = title_elem.get_text().strip()
            if not self._is_kenya_related(title):
                continue

            link_elem = article.find("a")
            url = urljoin("https://www.bbc.com", link_elem["href"]) if link_elem else ""

            # Get summary if available
            summary_elem = article.find("p")
            summary = summary_elem.get_text().strip() if summary_elem else ""

            stories.append({
                "title": title,
                "summary": summary,
                "url": url,
                "source": "BBC Sport",
                "published_at": datetime.now(),
            })

        return stories

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
        url = "https://www.goal.com/en-ke"
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
            url = urljoin("https://www.goal.com", link_elem["href"]) if link_elem else ""

            summary_elem = article.find("p")
            summary = summary_elem.get_text().strip() if summary_elem else ""

            stories.append({
                "title": title,
                "summary": summary,
                "url": url,
                "source": "Goal.com",
                "published_at": datetime.now(),
            })

        return stories

    def scrape_espn(self, limit=10):
        """Scrape ESPN Africa Kenya sports news."""
        url = "https://www.espn.com/soccer/"
        headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
        }

        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, "html.parser")

        stories = []
        articles = soup.find_all("article", limit=limit * 3)  # More articles to filter

        for article in articles:
            title_elem = article.find("h2") or article.find("h3") or article.find("a")
            if not title_elem:
                continue

            title = title_elem.get_text().strip()
            if not self._is_kenya_related(title):
                continue

            link_elem = article.find("a")
            url = urljoin("https://www.espn.com", link_elem["href"]) if link_elem else ""

            summary_elem = article.find("p")
            summary = summary_elem.get_text().strip() if summary_elem else ""

            stories.append({
                "title": title,
                "summary": summary,
                "url": url,
                "source": "ESPN",
                "published_at": datetime.now(),
            })

            if len(stories) >= limit:
                break

        return stories

    def _is_kenya_related(self, title):
        """Check if a title is related to Kenya sports."""
        kenya_keywords = [
            "kenya", "kenyan", "nairobi", "gor mahia", "afc leopards",
            "kpl", "premier league", "fkf", "harambee stars", "simba",
            "yang", "rudisha", "kiprop", "kemboi", "makau", "wanjiru",
            "east africa", "uganda", "tanzania", "ethiopia", "somalia",
            "rwanda", "burundi", "south sudan"
        ]

        title_lower = title.lower()
        return any(keyword in title_lower for keyword in kenya_keywords)