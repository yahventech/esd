#!/usr/bin/env bash

# EASD Sports News Scraper
# Run this script to scrape latest Kenya sports news and create stories

echo "Starting sports news scraper..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Run the scraper
python manage.py scrape_kenya_sports --limit 5

echo "Sports news scraping complete!"