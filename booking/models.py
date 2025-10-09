from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import datetime, time as datetime_time


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    is_admin = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username}'s Profile"


class Room(models.Model):
    ROOM_TYPES = [
        ('CONFERENCE', 'Conference Room'),
        ('MEETING', 'Meeting Room'),
        ('TRAINING', 'Training Room'),
        ('AUDITORIUM', 'Auditorium'),
    ]

    name = models.CharField(max_length=100)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPES, default='CONFERENCE')
    capacity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    floor = models.CharField(max_length=20)
    has_projector = models.BooleanField(default=False)
    has_whiteboard = models.BooleanField(default=True)
    has_video_conference = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='room_images/', blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_room_type_display()}, {self.capacity} people)"

    def is_available(self, start_time, end_time, exclude_booking_id=None):
        """Check if the room is available for the given time slot."""
        overlapping_bookings = self.reservations.filter(
            start_time__lt=end_time,
            end_time__gt=start_time,
            status__in=['PENDING', 'APPROVED']
        )
        
        if exclude_booking_id:
            overlapping_bookings = overlapping_bookings.exclude(id=exclude_booking_id)
            
        return not overlapping_bookings.exists()


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='reservations')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    attendees = models.ManyToManyField(User, related_name='attending_meetings', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=200, blank=True)
    created_by_admin = models.BooleanField(default=False)

    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['start_time', 'end_time']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.title} - {self.room.name} ({self.get_status_display()})"

    def clean(self):
        from django.core.exceptions import ValidationError
        
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time.")
            
        if not self.room.is_available(self.start_time, self.end_time, exclude_booking_id=self.id):
            raise ValidationError("This room is already booked for the selected time slot.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    @property
    def duration(self):
        return self.end_time - self.start_time

    @property
    def is_active(self):
        now = timezone.now()
        return self.start_time <= now <= self.end_time and self.status == 'APPROVED'

    @property
    def is_upcoming(self):
        return self.start_time > timezone.now() and self.status == 'APPROVED'

    @property
    def is_past(self):
        return self.end_time < timezone.now()


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('BOOKING_CONFIRMATION', 'Booking Confirmation'),
        ('BOOKING_CANCELLATION', 'Booking Cancellation'),
        ('REMINDER', 'Reminder'),
        ('ADMIN_APPROVAL', 'Admin Approval'),
        ('ADMIN_REJECTION', 'Admin Rejection'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_notification_type_display()} - {self.user.username}"

    def mark_as_read(self):
        self.is_read = True
        self.save()


# Signal handlers for notifications
def create_booking_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            user=instance.user,
            reservation=instance,
            message=f"Your booking for {instance.room.name} on {instance.start_time.strftime('%Y-%m-%d %H:%M')} has been created and is pending approval.",
            notification_type='BOOKING_CONFIRMATION'
        )


def update_booking_notification(sender, instance, **kwargs):
    if instance.pk:
        old_instance = Reservation.objects.get(pk=instance.pk)
        if old_instance.status != instance.status:
            if instance.status == 'APPROVED':
                Notification.objects.create(
                    user=instance.user,
                    reservation=instance,
                    message=f"Your booking for {instance.room.name} on {instance.start_time.strftime('%Y-%m-%d %H:%M')} has been approved.",
                    notification_type='ADMIN_APPROVAL'
                )
            elif instance.status == 'REJECTED':
                Notification.objects.create(
                    user=instance.user,
                    reservation=instance,
                    message=f"Your booking for {instance.room.name} on {instance.start_time.strftime('%Y-%m-%d %H:%M')} has been rejected.",
                    notification_type='ADMIN_REJECTION'
                )


# Connect signals
from django.db.models.signals import post_save, pre_save
post_save.connect(create_booking_notification, sender=Reservation)
pre_save.connect(update_booking_notification, sender=Reservation)
