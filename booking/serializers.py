from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import get_user_model
from booking.models import Room, Reservation, Notification, Profile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model."""
    full_name = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'full_name', 'is_staff', 'is_admin'
        ]
        read_only_fields = ['id', 'is_staff', 'is_admin']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    
    def get_is_admin(self, obj):
        return hasattr(obj, 'profile') and obj.profile.is_admin


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for the Profile model."""
    user = UserSerializer()
    
    class Meta:
        model = Profile
        fields = ['id', 'user', 'phone_number', 'department', 'is_admin']
        read_only_fields = ['id', 'user', 'is_admin']


class RoomSerializer(serializers.ModelSerializer):
    """Serializer for the Room model."""
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = Room
        fields = [
            'id', 'name', 'room_type', 'capacity', 'floor',
            'has_projector', 'has_whiteboard', 'has_video_conference',
            'is_active', 'description', 'image', 'status'
        ]
        read_only_fields = ['id', 'status']
    
    def get_status(self, obj):
        """Get the current status of the room (available, in use, etc.)."""
        now = timezone.now()
        
        # Check if the room is currently in use
        current_reservation = obj.reservations.filter(
            start_time__lte=now,
            end_time__gte=now,
            status='APPROVED'
        ).first()
        
        if current_reservation:
            return {
                'status': 'in_use',
                'until': current_reservation.end_time,
                'reservation_id': current_reservation.id,
                'reserved_by': current_reservation.user.get_full_name() or current_reservation.user.username
            }
        
        # Check if there's an upcoming reservation soon (within the next 15 minutes)
        upcoming_reservation = obj.reservations.filter(
            start_time__gt=now,
            start_time__lte=now + timezone.timedelta(minutes=15),
            status='APPROVED'
        ).order_by('start_time').first()
        
        if upcoming_reservation:
            return {
                'status': 'reserved_soon',
                'starts_at': upcoming_reservation.start_time,
                'reservation_id': upcoming_reservation.id,
                'reserved_by': upcoming_reservation.user.get_full_name() or upcoming_reservation.user.username
            }
        
        # Default to available
        return {'status': 'available'}


class ReservationSerializer(serializers.ModelSerializer):
    """Serializer for the Reservation model."""
    user = UserSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.filter(is_active=True),
        source='room',
        write_only=True
    )
    attendees = UserSerializer(many=True, read_only=True)
    attendee_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(is_active=True),
        source='attendees',
        write_only=True,
        required=False
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration = serializers.DurationField(read_only=True)
    
    class Meta:
        model = Reservation
        fields = [
            'id', 'title', 'description', 'room', 'room_id', 'user', 
            'start_time', 'end_time', 'duration', 'status', 'status_display',
            'attendees', 'attendee_ids', 'created_at', 'updated_at',
            'is_recurring', 'recurrence_rule', 'created_by_admin'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'status', 'created_by_admin']
    
    def validate(self, data):
        """Validate the reservation data."""
        # Check if start time is in the future
        if 'start_time' in data and data['start_time'] < timezone.now():
            raise serializers.ValidationError("Start time must be in the future.")
        
        # Check if end time is after start time
        if 'start_time' in data and 'end_time' in data and data['end_time'] <= data['start_time']:
            raise serializers.ValidationError("End time must be after start time.")
        
        # Check if the room is available for the selected time slot
        if 'room' in data and 'start_time' in data and 'end_time' in data:
            room = data['room']
            start_time = data['start_time']
            end_time = data['end_time']
            
            # For updates, exclude the current reservation from the availability check
            exclude_pk = self.instance.id if self.instance else None
            
            if not room.is_available(start_time, end_time, exclude_booking_id=exclude_pk):
                raise serializers.ValidationError(
                    "The selected time slot is not available. Please choose a different time or room."
                )
        
        return data
    
    def create(self, validated_data):
        """Create a new reservation."""
        # Remove write-only fields before creating the reservation
        validated_data.pop('attendee_ids', None)
        
        # Set the user to the current user
        validated_data['user'] = self.context['request'].user
        
        # If the user is an admin, set status to approved
        if hasattr(validated_data['user'], 'profile') and validated_data['user'].profile.is_admin:
            validated_data['status'] = 'APPROVED'
            validated_data['created_by_admin'] = True
        
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for the Notification model."""
    reservation = ReservationSerializer(read_only=True)
    notification_type_display = serializers.CharField(
        source='get_notification_type_display', 
        read_only=True
    )
    
    class Meta:
        model = Notification
        fields = [
            'id', 'message', 'notification_type', 'notification_type_display',
            'is_read', 'created_at', 'reservation'
        ]
        read_only_fields = ['id', 'created_at', 'user', 'reservation']


class AvailabilitySerializer(serializers.Serializer):
    """Serializer for room availability checks."""
    room_id = serializers.PrimaryKeyRelatedField(queryset=Room.objects.filter(is_active=True))
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()
    
    def validate(self, data):
        """Validate the availability check data."""
        if data['end_time'] <= data['start_time']:
            raise serializers.ValidationError("End time must be after start time.")
        
        # Check if the room is available for the selected time slot
        room = data['room_id']
        if not room.is_available(data['start_time'], data['end_time']):
            raise serializers.ValidationError("The selected time slot is not available.")
        
        return data
