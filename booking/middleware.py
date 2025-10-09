from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin

class TimezoneMiddleware(MiddlewareMixin):
    """
    Middleware to handle timezone for the current session.
    If the user is authenticated and has a timezone set in their profile,
    activate it. Otherwise, use the default timezone.
    """
    def process_request(self, request):
        if hasattr(request, 'user') and request.user.is_authenticated:
            try:
                # Check if user has a profile with timezone
                if hasattr(request.user, 'profile') and request.user.profile.timezone:
                    timezone.activate(request.user.profile.timezone)
                    return
            except Exception:
                # If there's any issue with the profile, use default timezone
                pass
        
        # Default to UTC if no timezone is set
        timezone.deactivate()
