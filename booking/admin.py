from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    Profile, Room, Reservation, Notification, Comment
)


class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'department', 'is_admin')
    list_filter = ('is_admin', 'department')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'phone_number')
    list_editable = ('is_admin',)


class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'room_type', 'capacity', 'floor', 'is_active', 'get_equipment')
    list_filter = ('room_type', 'is_active', 'has_projector', 'has_whiteboard', 'has_video_conference')
    search_fields = ('name', 'description', 'floor')
    list_editable = ('is_active',)
    readonly_fields = ('image_preview',)
    fieldsets = (
        (None, {
            'fields': ('name', 'room_type', 'capacity', 'floor', 'is_active', 'description')
        }),
        ('Equipment', {
            'fields': ('has_projector', 'has_whiteboard', 'has_video_conference')
        }),
        ('Image', {
            'fields': ('image', 'image_preview')
        }),
    )

    def get_equipment(self, obj):
        equipment = []
        if obj.has_projector:
            equipment.append("Projector")
        if obj.has_whiteboard:
            equipment.append("Whiteboard")
        if obj.has_video_conference:
            equipment.append("Video Conference")
        return ", ".join(equipment) if equipment else "None"
    get_equipment.short_description = 'Equipment'

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 200px; max-width: 200px;" />'.format(obj.image.url))
        return "No image uploaded"
    image_preview.short_description = 'Preview'


class ReservationAdmin(admin.ModelAdmin):
    list_display = ('title', 'room', 'user', 'start_time', 'end_time', 'status', 'is_active', 'is_upcoming', 'is_past')
    list_filter = ('status', 'room', 'created_at', 'start_time', 'end_time')
    search_fields = ('title', 'description', 'user__username', 'room__name')
    readonly_fields = ('created_at', 'updated_at', 'duration')
    date_hierarchy = 'start_time'
    list_select_related = ('room', 'user')
    actions = ['approve_reservations', 'reject_reservations', 'cancel_reservations']

    fieldsets = (
        ('Reservation Details', {
            'fields': ('title', 'description', 'room', 'user', 'start_time', 'end_time', 'duration')
        }),
        ('Status', {
            'fields': ('status', 'attendees', 'is_recurring', 'recurrence_rule', 'created_by_admin')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def approve_reservations(self, request, queryset):
        updated = queryset.filter(status='PENDING').update(status='APPROVED')
        self.message_user(request, f"{updated} reservations were successfully approved.")
    approve_reservations.short_description = "Approve selected pending reservations"

    def reject_reservations(self, request, queryset):
        updated = queryset.filter(status='PENDING').update(status='REJECTED')
        self.message_user(request, f"{updated} reservations were rejected.")
    reject_reservations.short_description = "Reject selected pending reservations"

    def cancel_reservations(self, request, queryset):
        updated = queryset.exclude(status='CANCELLED').update(status='CANCELLED')
        self.message_user(request, f"{updated} reservations were cancelled.")
    cancel_reservations.short_description = "Cancel selected reservations"

    def is_active(self, obj):
        return obj.is_active
    is_active.boolean = True
    is_active.short_description = 'Active Now'

    def is_upcoming(self, obj):
        return obj.is_upcoming
    is_upcoming.boolean = True
    is_upcoming.short_description = 'Upcoming'

    def is_past(self, obj):
        return obj.is_past
    is_past.boolean = True
    is_past.short_description = 'Past'


class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'get_message_preview', 'notification_type', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__username', 'message')
    readonly_fields = ('created_at',)
    list_editable = ('is_read',)
    date_hierarchy = 'created_at'

    def get_message_preview(self, obj):
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    get_message_preview.short_description = 'Message'


# Register models with their admin classes
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Room, RoomAdmin)
admin.site.register(Reservation, ReservationAdmin)
admin.site.register(Notification, NotificationAdmin)
admin.site.register(Comment, CommentAdmin)