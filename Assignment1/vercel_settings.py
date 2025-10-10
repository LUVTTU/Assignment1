from .settings import *
import os

DEBUG = os.getenv('DJANGO_DEBUG', 'False') == 'True'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'insecure-default-key')
ALLOWED_HOSTS = ['.vercel.app', 'localhost', '127.0.0.1']
