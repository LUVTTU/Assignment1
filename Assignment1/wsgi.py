"""
WSGI config for Assignment1 project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise
from pathlib import Path

# Use vercel settings in production
if os.environ.get('VERCEL') == '1':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Assignment1.vercel_settings')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Assignment1.settings')

application = get_wsgi_application()

# Add WhiteNoise for static files
application = WhiteNoise(application, root=Path(__file__).parent.parent / 'staticfiles')
application.add_files(Path(__file__).parent.parent / 'media', prefix='media/')

# Vercel needs a variable named 'app' for serverless functions
app = application