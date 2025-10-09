from django.conf import settings
from .models import Notification

def notifications(request):
    """
    Context processor that adds unread notifications count to all templates.
    Only adds notifications if the user is authenticated.
    """
    context = {}
    if hasattr(request, 'user') and request.user.is_authenticated:
        context['unread_notifications_count'] = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        # Get the latest 5 unread notifications
        context['recent_notifications'] = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).order_by('-created_at')[:5]
    else:
        context['unread_notifications_count'] = 0
        context['recent_notifications'] = []
    
    return context
