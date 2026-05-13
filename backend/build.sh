#!/usr/bin/env bash

pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py scrape_kenya_sports --limit 5
python manage.py collectstatic --noinput
