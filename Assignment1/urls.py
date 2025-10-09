"""
URL configuration for Assignment1 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    # Admin site
    path('admin/', admin.site.urls),
    
    # Booking app
    path('', include('booking.urls')),
    
    # API endpoints
    path('api/', include('booking.api.urls')),
    
    # Favicon redirect (add favicon.ico to your static files)
    path('favicon.ico', RedirectView.as_view(url='/static/favicon.ico', permanent=True)),
    
    # Authentication URLs - includes login, logout, password reset, etc.
    path('accounts/', include('django.contrib.auth.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Add any additional URL patterns here if needed

# Custom error handlers
handler400 = 'booking.views.handler400'
handler403 = 'booking.views.handler403'
handler404 = 'booking.views.handler404'
handler500 = 'booking.views.handler500'
