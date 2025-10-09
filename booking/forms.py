from django import forms
from django.utils import timezone
from datetime import datetime, time, timedelta
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from .models import Room, Reservation, Profile

User = get_user_model()


class UserRegistrationForm(UserCreationForm):
    """Form for user registration."""
    email = forms.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise forms.ValidationError('This email is already in use.')
        return email


class RoomSearchForm(forms.Form):
    """Form for searching and filtering rooms."""
    CAPACITY_CHOICES = [
        (1, '1+'),
        (2, '2+'),
        (5, '5+'),
        (10, '10+'),
        (20, '20+'),
    ]
    
    room_type = forms.ChoiceField(
        choices=Room.ROOM_TYPES,
        required=False,
        label='Room Type'
    )
    capacity = forms.ChoiceField(
        choices=CAPACITY_CHOICES,
        required=False,
        label='Minimum Capacity'
    )
    has_projector = forms.BooleanField(
        required=False,
        label='Has Projector'
    )
    has_whiteboard = forms.BooleanField(
        required=False,
        label='Has Whiteboard',
        initial=True
    )
    has_video = forms.BooleanField(
        required=False,
        label='Has Video Conference'
    )
    date = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={'type': 'date'}),
        label='Available On',
        help_text='Check availability for a specific date'
    )
    start_time = forms.TimeField(
        required=False,
        widget=forms.TimeInput(attrs={'type': 'time'}),
        label='From'
    )
    end_time = forms.TimeField(
        required=False,
        widget=forms.TimeInput(attrs={'type': 'time'}),
        label='To'
    )
    
    def clean(self):
        cleaned_data = super().clean()
        date = cleaned_data.get('date')
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')
        
        # If any time field is provided, all time-related fields are required
        if any([date, start_time, end_time]):
            if not all([date, start_time, end_time]):
                raise ValidationError(
                    'Please provide all date and time fields for availability check.'
                )
            
            # Validate time range
            if start_time and end_time and start_time >= end_time:
                raise ValidationError('End time must be after start time.')
        
        return cleaned_data


class ReservationForm(forms.ModelForm):
    """Form for creating and updating reservations."""
    class Meta:
        model = Reservation
        fields = [
            'title', 'room', 'description', 'start_time', 
            'end_time', 'attendees'
        ]
        widgets = {
            'start_time': forms.DateTimeInput(
                attrs={'type': 'datetime-local'},
                format='%Y-%m-%dT%H:%M'
            ),
            'end_time': forms.DateTimeInput(
                attrs={'type': 'datetime-local'},
                format='%Y-%m-%dT%H:%M'
            ),
            'description': forms.Textarea(attrs={'rows': 3}),
            'attendees': forms.SelectMultiple(attrs={
                'class': 'select2-multi',
                'style': 'width: 100%'
            })
        }
    
    def __init__(self, *args, **kwargs):
        from django.db import connection
        try:
            # Ensure we have a valid database connection
            connection.ensure_connection()
            
            super().__init__(*args, **kwargs)
            
            # Set the time inputs to use the correct format
            self.fields['start_time'].input_formats = ['%Y-%m-%dT%H:%M']
            self.fields['end_time'].input_formats = ['%Y-%m-%dT%H:%M']
            
            # Set minimum date/time to current time
            now = timezone.now()
            min_date = now.strftime('%Y-%m-%d')
            min_time = now.strftime('%H:%M')
            
            self.fields['start_time'].widget.attrs.update({
                'min': f"{min_date}T{min_time}",
                'class': 'form-control datetimepicker'
            })
            self.fields['end_time'].widget.attrs.update({
                'min': f"{min_date}T{min_time}",
                'class': 'form-control datetimepicker'
            })
            
            # Optimize querysets
            self.fields['room'].queryset = Room.objects.filter(is_active=True).only('id', 'name', 'room_type', 'capacity')
            self.fields['attendees'].queryset = User.objects.filter(is_active=True).only('id', 'username', 'first_name', 'last_name')
            
            # Set initial values for new reservations
            if not self.instance.pk:
                self.initial['start_time'] = now + timedelta(hours=1)
                
        except Exception as e:
            # Log the error and re-raise
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error initializing ReservationForm: {str(e)}")
            # Re-raise the exception to be handled by the view
            raise
            self.initial['end_time'] = now + timedelta(hours=2)
    
    def clean(self):
        cleaned_data = super().clean()
        start_time = cleaned_data.get('start_time')
        end_time = cleaned_data.get('end_time')
        room = cleaned_data.get('room')
        
        # Check if start time is in the future
        if start_time and start_time < timezone.now():
            self.add_error('start_time', 'Start time must be in the future.')
        
        # Check if end time is after start time
        if start_time and end_time and end_time <= start_time:
            self.add_error('end_time', 'End time must be after start time.')
        
        # Check if the room is available for the selected time slot
        if all([room, start_time, end_time]):
            # For updates, exclude the current reservation from availability check
            exclude_pk = self.instance.pk if self.instance else None
            
            if not room.is_available(start_time, end_time, exclude_booking_id=exclude_pk):
                self.add_error(
                    None, 
                    'The selected time slot is not available. Please choose a different time or room.'
                )
        
        # Check if the meeting duration is reasonable (max 8 hours)
        if start_time and end_time:
            duration = end_time - start_time
            if duration > timedelta(hours=8):
                self.add_error(
                    None,
                    'The maximum booking duration is 8 hours. Please adjust your time slot.'
                )
            
            # Check if the meeting is within business hours (8 AM - 8 PM)
            start_dt = start_time.astimezone(timezone.get_current_timezone())
            end_dt = end_time.astimezone(timezone.get_current_timezone())
            
            business_hours_start = start_dt.replace(hour=8, minute=0, second=0, microsecond=0)
            business_hours_end = start_dt.replace(hour=20, minute=0, second=0, microsecond=0)
            
            if start_dt.time() < time(8, 0) or end_dt.time() > time(20, 0):
                self.add_error(
                    None,
                    'Meetings can only be scheduled between 8:00 AM and 8:00 PM.'
                )
        
        return cleaned_data


class RoomForm(forms.ModelForm):
    """Form for creating and updating rooms (admin only)."""
    class Meta:
        model = Room
        fields = [
            'name', 'room_type', 'capacity', 'floor', 'is_active',
            'has_projector', 'has_whiteboard', 'has_video_conference',
            'description', 'image'
        ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
            'image': forms.FileInput(attrs={'class': 'form-control-file'})
        }
    
    def clean_capacity(self):
        capacity = self.cleaned_data.get('capacity')
        if capacity <= 0:
            raise ValidationError('Capacity must be a positive number.')
        return capacity


class ProfileForm(forms.ModelForm):
    """Form for user profile updates."""
    class Meta:
        model = Profile
        fields = ['phone_number', 'department']
        widgets = {
            'phone_number': forms.TextInput(attrs={'placeholder': 'e.g., +1 (555) 123-4567'}),
            'department': forms.TextInput(attrs={'placeholder': 'e.g., Engineering, Marketing'})
        }


class UserForm(forms.ModelForm):
    """Form for user account updates."""
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].required = True


class AdminReservationForm(ReservationForm):
    """Extended reservation form for admin users with additional fields."""
    class Meta(ReservationForm.Meta):
        fields = ReservationForm.Meta.fields + ['status', 'created_by_admin']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['user'] = forms.ModelChoiceField(
            queryset=User.objects.filter(is_active=True),
            required=True,
            label='Reserved By'
        )
        
        # Set the user field to the current user for new reservations
        if not self.instance.pk and 'user' not in self.data:
            self.initial['user'] = self.initial.get('user', self.initial_user)
    
    def save(self, commit=True):
        reservation = super().save(commit=False)
        
        # Set the user from the form data
        if 'user' in self.cleaned_data:
            reservation.user = self.cleaned_data['user']
        
        if commit:
            reservation.save()
            self.save_m2m()
        
        return reservation
