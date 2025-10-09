from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import datetime, time, timedelta
from django.shortcuts import get_object_or_404

from ..models import Room, Reservation, Notification
from ..serializers import (
    RoomSerializer, ReservationSerializer, 
    NotificationSerializer, UserSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()


class RoomViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows rooms to be viewed.
    """
    queryset = Room.objects.filter(is_active=True)
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by room type
        room_type = self.request.query_params.get('type', None)
        if room_type:
            queryset = queryset.filter(room_type=room_type)
            
        # Filter by capacity
        min_capacity = self.request.query_params.get('min_capacity', None)
        if min_capacity:
            queryset = queryset.filter(capacity__gte=min_capacity)
            
        # Filter by equipment
        has_projector = self.request.query_params.get('has_projector', None)
        if has_projector == 'true':
            queryset = queryset.filter(has_projector=True)
            
        has_whiteboard = self.request.query_params.get('has_whiteboard', None)
        if has_whiteboard == 'true':
            queryset = queryset.filter(has_whiteboard=True)
            
        has_video = self.request.query_params.get('has_video_conference', None)
        if has_video == 'true':
            queryset = queryset.filter(has_video_conference=True)
            
        return queryset
    
    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        """
        Get available time slots for a specific room on a given date.
        """
        room = self.get_object()
        date_str = request.query_params.get('date', None)
        
        if not date_str:
            return Response(
                {'error': 'Date parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all reservations for this room on the given date
        reservations = room.reservations.filter(
            start_time__date=date,
            status__in=['PENDING', 'APPROVED']
        ).order_by('start_time')
        
        # Generate time slots (9 AM to 5 PM, 1-hour slots)
        time_slots = []
        start_time = datetime.combine(date, time(9, 0))
        end_time = datetime.combine(date, time(17, 0))
        
        current_time = start_time
        while current_time < end_time:
            slot_end = current_time + timedelta(hours=1)
            
            # Check if this time slot is available
            is_available = True
            for res in reservations:
                if not (res.end_time <= current_time or res.start_time >= slot_end):
                    is_available = False
                    break
            
            time_slots.append({
                'start': current_time.strftime('%H:%M'),
                'end': slot_end.strftime('%H:%M'),
                'is_available': is_available,
                'datetime_start': current_time.isoformat(),
                'datetime_end': slot_end.isoformat()
            })
            
            current_time = slot_end
        
        return Response({
            'room': RoomSerializer(room).data,
            'date': date_str,
            'time_slots': time_slots
        })


class ReservationViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows reservations to be viewed or edited.
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Regular users can only see their own reservations
        # Admins can see all reservations
        if self.request.user.is_staff or getattr(self.request.user.profile, 'is_admin', False):
            return Reservation.objects.all().order_by('-start_time')
        return Reservation.objects.filter(user=self.request.user).order_by('-start_time')
    
    def perform_create(self, serializer):
        # Set the user to the current user when creating a reservation
        reservation = serializer.save(user=self.request.user)
        
        # If the user is an admin, auto-approve the reservation
        if self.request.user.is_staff or getattr(self.request.user.profile, 'is_admin', False):
            reservation.status = 'APPROVED'
            reservation.created_by_admin = True
            reservation.save()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending reservation (admin only)."""
        if not (request.user.is_staff or getattr(request.user.profile, 'is_admin', False)):
            return Response(
                {'error': 'You do not have permission to perform this action'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        reservation = self.get_object()
        if reservation.status != 'PENDING':
            return Response(
                {'error': 'Only pending reservations can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        reservation.status = 'APPROVED'
        reservation.save()
        
        return Response({'status': 'reservation approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending reservation (admin only)."""
        if not (request.user.is_staff or getattr(request.user.profile, 'is_admin', False)):
            return Response(
                {'error': 'You do not have permission to perform this action'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        reservation = self.get_object()
        if reservation.status != 'PENDING':
            return Response(
                {'error': 'Only pending reservations can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        reservation.status = 'REJECTED'
        reservation.save()
        
        return Response({'status': 'reservation rejected'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a reservation."""
        reservation = self.get_object()
        
        # Check if the user has permission to cancel this reservation
        if (request.user != reservation.user and 
            not request.user.is_staff and 
            not getattr(request.user.profile, 'is_admin', False)):
            return Response(
                {'error': 'You do not have permission to cancel this reservation'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        if reservation.status in ['CANCELLED', 'COMPLETED']:
            return Response(
                {'error': f'Cannot cancel a {reservation.get_status_display().lower()} reservation'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        reservation.status = 'CANCELLED'
        reservation.save()
        
        return Response({'status': 'reservation cancelled'})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows notifications to be viewed.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own notifications
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications."""
        unread_notifications = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(unread_notifications)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': f'marked {updated} notifications as read'})


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint that allows users to be viewed.
    """
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Regular users can only see their own profile
        # Admins can see all users
        if self.request.user.is_staff or getattr(self.request.user.profile, 'is_admin', False):
            return User.objects.filter(is_active=True)
        return User.objects.filter(id=self.request.user.id)


class CurrentUserView(APIView):
    """
    API endpoint to get the current authenticated user's details.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
