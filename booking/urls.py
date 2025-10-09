from django.urls import path
from django.contrib.auth import views as auth_views
from django.views.generic import RedirectView
from . import views

app_name = 'booking'

urlpatterns = [
    # Public pages
    path('', views.home, name='home'),
    path('rooms/', views.RoomListView.as_view(), name='room-list'),
    path('rooms/<int:pk>/', views.RoomDetailView.as_view(), name='room-detail'),
    
    # Authentication
    path('login/', auth_views.LoginView.as_view(template_name='booking/auth/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(next_page='booking:home'), name='logout'),
    path('register/', views.register, name='register'),
    path('password-reset/', 
         auth_views.PasswordResetView.as_view(
             template_name='booking/auth/password_reset.html',
             email_template_name='booking/auth/password_reset_email.html',
             subject_template_name='booking/auth/password_reset_subject.txt',
             success_url='/password-reset/done/'
         ), 
         name='password_reset'),
    path('password-reset/done/', 
         auth_views.PasswordResetDoneView.as_view(template_name='booking/auth/password_reset_done.html'), 
         name='password_reset_done'),
    path('password-reset-confirm/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(
             template_name='booking/auth/password_reset_confirm.html',
             success_url='/password-reset/complete/'
         ), 
         name='password_reset_confirm'),
    path('password-reset/complete/', 
         auth_views.PasswordResetCompleteView.as_view(template_name='booking/auth/password_reset_complete.html'), 
         name='password_reset_complete'),
    
    # User profile
    path('profile/', views.profile, name='profile'),
    path('profile/update/', views.profile_update, name='profile-update'),
    
    # Reservations
    path('reservations/new/', views.create_reservation, name='reservation-create'),
    path('reservations/new/<int:room_id>/', views.create_reservation, name='reservation-create-room'),
    path('reservations/<int:pk>/', views.ReservationDetailView.as_view(), name='reservation-detail'),
    path('reservations/<int:pk>/update/', views.ReservationUpdateView.as_view(), name='reservation-update'),
    path('reservations/<int:pk>/cancel/', views.cancel_reservation, name='reservation-cancel'),
    path('my-reservations/', views.my_reservations, name='my-reservations'),
    
    # AJAX endpoints
    path('api/notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark-notification-read'),
    path('api/rooms/<int:room_id>/availability/', views.get_room_availability, name='room-availability'),
    
    # Admin views
    path('admin/dashboard/', views.admin_dashboard, name='admin-dashboard'),
    path('admin/rooms/', views.manage_rooms, name='manage-rooms'),
    path('admin/rooms/add/', views.RoomCreateView.as_view(), name='room-add'),
    path('admin/rooms/<int:pk>/edit/', views.RoomUpdateView.as_view(), name='room-edit'),
    path('admin/rooms/<int:pk>/delete/', views.delete_room, name='room-delete'),
    path('admin/reservations/', views.manage_reservations, name='manage-reservations'),
    path('admin/reservations/<int:pk>/<str:status>/', views.update_reservation_status, name='update-reservation-status'),
]
