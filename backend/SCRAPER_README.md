# EASD Sports News Scraper

This Django management command automatically scrapes the latest Kenya sports news from free sources and creates stories in the database.

## Sources

The scraper pulls from these free news sources:
- **BBC Sport** - Africa football section
- **The Standard** - Kenya sports news
- **Daily Nation** - Nation Media Group sports
- **Goal.com** - Kenya football news
- **ESPN Africa** - African sports coverage

## Usage

### Manual Run
```bash
# Scrape from all sources (default)
python manage.py scrape_kenya_sports

# Scrape from specific source
python manage.py scrape_kenya_sports --source bbc

# Limit number of stories per source
python manage.py scrape_kenya_sports --limit 3

# Dry run (show what would be created)
python manage.py scrape_kenya_sports --dry-run
```

### Automated Run
```bash
# Using the provided script
./scrape_news.sh

# Or directly with Python
python manage.py scrape_kenya_sports --limit 5
```

## Automation

### Cron Job Setup
Add to your system's crontab (`crontab -e`):

```bash
# Scrape every 2 hours
0 */2 * * * cd /path/to/your/project/backend && ./scrape_news.sh
```

### Render Cron (if using Render)
Add to your Render service settings or use a cron service like Cron-Job.org to call your backend's scrape endpoint.

## Features

- **Duplicate Prevention**: Skips stories with similar titles from the last 30 days
- **Kenya Focus**: Only scrapes stories related to Kenya sports using keyword filtering
- **Multiple Sources**: Pulls from 5 different news sources
- **Safe Scraping**: Uses proper User-Agent headers and respects robots.txt
- **Error Handling**: Continues scraping even if one source fails
- **Dry Run Mode**: Test what would be created without actually creating stories

## Dependencies

Make sure these are in your `requirements.txt`:
```
beautifulsoup4==4.12.3
lxml==5.2.2
requests==2.33.1
```

## Categories

Scraped stories are automatically assigned to the "sports" category. Make sure this category exists:

```python
# In Django shell
from apps.categories.models import Category
Category.objects.get_or_create(slug="sports", defaults={"name": "Sports"})
```

## Customization

To add more sources or modify filtering:
1. Add new scraper methods following the pattern of existing ones
2. Update the `sources` dictionary in `handle()`
3. Modify `_is_kenya_related()` to include more keywords

## Legal Note

This scraper is for educational purposes and follows each website's terms of service. Always respect robots.txt and don't overload servers with requests.