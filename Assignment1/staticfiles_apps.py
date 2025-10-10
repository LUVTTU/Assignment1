from django.apps import AppConfig

class StaticFilesConfig(AppConfig):
    name = 'django.contrib.staticfiles'
    ignore_patterns = ['CVS', '.*', '*~']
