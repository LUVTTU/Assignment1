from datetime import timedelta, datetime, time
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages, auth
from django.utils import timezone
from django.db.models import Q
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.contrib.auth.forms import UserChangeForm
from django.views.decorators.http import require_http_methods
from django.urls import reverse_lazy


def is_admin_user(user):
    """Check if the user is an admin."""
    return user.is_authenticated and (user.is_staff or user.is_superuser)

from .forms import (
    UserRegistrationForm, 
    ReservationForm, 
    RoomForm, 
    ProfileForm, 
    UserForm, 
    AdminReservationForm,
    RoomSearchForm
)
from .models import Reservation, Room, Notification, Profile, User


def register(request):
    """View for user registration."""
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Log the user in after registration
            from django.contrib.auth import login
            login(request, user)
            messages.success(request, 'Registration successful! Welcome to our site.')
            return redirect('booking:home')
    else:
        form = UserRegistrationForm()
    
    return render(request, 'booking/auth/register.html', {'form': form})


def home(request):
    """View for the home page."""
    from datetime import timedelta
    from .models import Room, Notification, Reservation
    
    upcoming_reservations = []
    unread_notifications = []
    
    if request.user.is_authenticated:
        # Get upcoming reservations for the logged-in user
        upcoming_reservations = Reservation.objects.filter(
            user=request.user,
            start_time__gte=timezone.now(),
            status='APPROVED'
        ).order_by('start_time')[:3]
        
        # Get unread notifications
        unread_notifications = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).order_by('-created_at')[:5]
    
    # Get available rooms for the next 2 hours
    now = timezone.now()
    available_rooms = Room.objects.filter(
        is_active=True
    ).exclude(
        reservations__start_time__lt=now + timedelta(hours=2),
        reservations__end_time__gt=now,
        reservations__status__in=['PENDING', 'APPROVED']
    )[:5]
    
    context = {
        'upcoming_reservations': upcoming_reservations,
        'available_rooms': available_rooms,
        'unread_notifications': unread_notifications,
    }
    return render(request, 'booking/home.html', context)


class RoomListView(ListView):
    """View for listing all available rooms with filtering options."""
    model = Room
    template_name = 'booking/room_list.html'
    context_object_name = 'rooms'
    paginate_by = 15  # Increased from 10 to show more rooms per page
    
    def get_queryset(self):
        queryset = Room.objects.filter(is_active=True)
        
        # Get search query
        search_query = self.request.GET.get('q', '').strip()
        
        # Get capacity from search query if it's a number
        capacity_from_search = None
        if search_query and search_query.isdigit():
            capacity_from_search = int(search_query)
            # Remove capacity from search query
            search_query = ''
        
        # Apply text-based search if there's a search query
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(room_type__icontains=search_query)
            )
        
        # Apply capacity filter (from search or dedicated field)
        capacity = self.request.GET.get('capacity')
        if capacity and capacity.isdigit():
            queryset = queryset.filter(capacity__gte=int(capacity))
        elif capacity_from_search is not None:
            queryset = queryset.filter(capacity__gte=capacity_from_search)
        
        # Apply other filters
        room_type = self.request.GET.get('room_type')
        has_projector = self.request.GET.get('has_projector') == 'on'
        has_whiteboard = self.request.GET.get('has_whiteboard') == 'on'
        has_video = self.request.GET.get('has_video') == 'on'
        
        if room_type:
            queryset = queryset.filter(room_type=room_type)
        if has_projector:
            queryset = queryset.filter(has_projector=True)
        if has_whiteboard:
            queryset = queryset.filter(has_whiteboard=True)
        if has_video:
            queryset = queryset.filter(has_video_conference=True)
            
        return queryset.order_by('name')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['search_form'] = RoomSearchForm(self.request.GET or None)
        return context


class RoomDetailView(DetailView):
    """View for displaying room details and availability."""
    model = Room
    template_name = 'booking/room_detail.html'
    context_object_name = 'room'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        room = self.get_object()
        
        # Get upcoming reservations for this room
        upcoming_reservations = room.reservations.filter(
            end_time__gte=timezone.now(),
            status__in=['PENDING', 'APPROVED']
        ).order_by('start_time')
        
        # Add to context
        context['upcoming_reservations'] = upcoming_reservations
        
        # Add reservation form if user is authenticated
        if self.request.user.is_authenticated:
            context['reservation_form'] = ReservationForm(initial={
                'room': room,
                'start_time': timezone.now() + timedelta(hours=1),
                'end_time': timezone.now() + timedelta(hours=2),
            })
            
        return context


@login_required
def create_reservation(request, room_id=None):
    """View for creating a new reservation."""
    room = None
    if room_id:
        room = get_object_or_404(Room, id=room_id)
    
    if request.method == 'POST':
        form = ReservationForm(request.POST)
        if form.is_valid():
            reservation = form.save(commit=False)
            reservation.user = request.user
            
            # Check if the room is available
            if not reservation.room.is_available(reservation.start_time, reservation.end_time):
                messages.error(request, 'The selected time slot is not available. Please choose a different time.')
            else:
                # For admin users, set status to approved directly
                if request.user.is_staff:
                    reservation.status = 'APPROVED'
                    reservation.created_by_admin = True
                else:
                    reservation.status = 'PENDING'
                
                reservation.save()
                form.save_m2m()  # Save many-to-many data
                
                messages.success(request, 'Your reservation has been submitted successfully!', extra_tags='toast')
                return redirect('booking:home')
    else:
        initial = {}
        if room:
            initial['room'] = room
        form = ReservationForm(initial=initial)
    
    return render(request, 'booking/reservation_form.html', {
        'form': form,
        'title': 'New Reservation'
    })


class ReservationDetailView(LoginRequiredMixin, DetailView):
    """View for displaying reservation details."""
    model = Reservation
    template_name = 'booking/reservation_detail.html'
    context_object_name = 'reservation'
    
    def get_queryset(self):
        # Users can only see their own reservations, or all if admin
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        return queryset


class ReservationUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    """View for updating a reservation."""
    model = Reservation
    form_class = ReservationForm
    template_name = 'booking/reservation_form.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['title'] = 'Update Reservation'
        return context
    
    def test_func(self):
        reservation = self.get_object()
        # Only the user who created the reservation or an admin can update it
        return (self.request.user == reservation.user or 
                self.request.user.is_staff)
    
    def form_valid(self, form):
        reservation = form.save(commit=False)
        
        # If admin is updating, set the status to approved if it was pending
        if self.request.user.is_staff and reservation.status == 'PENDING':
            reservation.status = 'APPROVED'
        
        reservation.save()
        form.save_m2m()  # Save many-to-many data
        
        messages.success(self.request, 'Reservation updated successfully!')
        return super().form_valid(form)


@login_required
@require_http_methods(['POST'])
def cancel_reservation(request, pk):
    """View for cancelling a reservation."""
    reservation = get_object_or_404(Reservation, pk=pk)
    
    # Check if user has permission to cancel
    if request.user != reservation.user and not request.user.is_staff:
        messages.error(request, 'You do not have permission to cancel this reservation.')
        return redirect('home')
    
    # Update status to cancelled
    reservation.status = 'CANCELLED'
    reservation.save()
    
    messages.success(request, 'Reservation has been cancelled successfully.')
    return redirect('my-reservations')


@login_required
def profile(request):
    """View for displaying and updating user profile."""
    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=request.user)
        profile_form = ProfileForm(
            request.POST, 
            request.FILES, 
            instance=request.user.profile
        )
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile was successfully updated!')
            return redirect('profile')
        else:
            messages.error(request, 'Please correct the error below.')
    else:
        user_form = UserForm(instance=request.user)
        profile_form = ProfileForm(instance=request.user.profile)
    
    return render(request, 'booking/profile.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })


@login_required
def profile_update(request):
    """View for updating user profile (alternative to the combined profile view)."""
    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=request.user)
        profile_form = ProfileForm(
            request.POST, 
            request.FILES, 
            instance=request.user.profile
        )
        
        if user_form.is_valid() and profile_form.is_valid():
            user_form.save()
            profile_form.save()
            messages.success(request, 'Your profile was successfully updated!')
            return redirect('profile')
        else:
            messages.error(request, 'Please correct the error below.')
    else:
        user_form = UserForm(instance=request.user)
        profile_form = ProfileForm(instance=request.user.profile)
    
    return render(request, 'booking/profile_update.html', {
        'user_form': user_form,
        'profile_form': profile_form
    })


@login_required
def my_reservations(request):
    """View for users to see their reservations."""
    reservations = Reservation.objects.filter(user=request.user).order_by('-start_time')
    
    # Filter by status if provided
    status = request.GET.get('status')
    if status:
        reservations = reservations.filter(status=status.upper())
    
    # Pagination
    paginator = Paginator(reservations, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'booking/my_reservations.html', {
        'page_obj': page_obj,
        'status_filter': status
    })


@login_required
@user_passes_test(lambda u: u.is_staff)
def admin_dashboard(request):
    """Admin dashboard for managing reservations and rooms."""
    # Get pending reservations that need approval
    pending_reservations = Reservation.objects.filter(
        status='PENDING'
    ).order_by('start_time')
    
    # Get upcoming reservations
    upcoming_reservations = Reservation.objects.filter(
        start_time__gte=timezone.now(),
        status='APPROVED'
    ).order_by('start_time')[:10]
    
    # Get room utilization stats
    rooms = Room.objects.filter(is_active=True)
    
    return render(request, 'booking/admin/dashboard.html', {
        'pending_reservations': pending_reservations,
        'upcoming_reservations': upcoming_reservations,
        'rooms': rooms,
    })


@login_required
@user_passes_test(lambda u: u.is_staff)
def manage_rooms(request):
    """View for managing rooms (admin only)."""
    rooms = Room.objects.all().order_by('name')
    return render(request, 'booking/admin/manage_rooms.html', {'rooms': rooms})


@login_required
@user_passes_test(lambda u: u.is_staff)
def manage_reservations(request):
    """View for managing all reservations (admin only)."""
    reservations = Reservation.objects.all().order_by('-start_time')
    
    # Apply filters
    status = request.GET.get('status')
    if status:
        reservations = reservations.filter(status=status.upper())
    
    room_id = request.GET.get('room')
    if room_id:
        reservations = reservations.filter(room_id=room_id)
    
    user_id = request.GET.get('user')
    if user_id:
        reservations = reservations.filter(user_id=user_id)
    
    # Date range filter
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        reservations = reservations.filter(start_time__date__gte=start_date)
    
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        reservations = reservations.filter(end_time__date__lte=end_date)
    
    # Pagination
    paginator = Paginator(reservations, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get all rooms for filter dropdown
    rooms = Room.objects.all()
    
    return render(request, 'booking/admin/manage_reservations.html', {
        'page_obj': page_obj,
        'rooms': rooms,
        'status_filter': status,
        'selected_room': room_id,
        'selected_user': user_id,
        'start_date': start_date.strftime('%Y-%m-%d') if start_date else '',
        'end_date': end_date.strftime('%Y-%m-%d') if end_date else ''
    })


@login_required
@require_http_methods(['POST'])
def mark_notification_read(request, notification_id):
    """Mark a notification as read via AJAX."""
    notification = get_object_or_404(Notification, id=notification_id, user=request.user)
    notification.mark_as_read()
    return JsonResponse({'status': 'success'})


@login_required
def get_room_availability(request, room_id):
    """Get available time slots for a room on a specific date (AJAX)."""
    date_str = request.GET.get('date')
    if not date_str:
        return JsonResponse({'error': 'Date parameter is required'}, status=400)
    
    try:
        # Parse the date and make it timezone-aware
        naive_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        tz = timezone.get_current_timezone()
        start_of_day = timezone.make_aware(datetime.combine(naive_date, time(0, 0)), tz)
    except ValueError:
        return JsonResponse({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)
    
    room = get_object_or_404(Room, id=room_id)
    
    # Define the working hours (9 AM to 5 PM)
    workday_start = timezone.make_aware(datetime.combine(naive_date, time(9, 0)), tz)
    workday_end = timezone.make_aware(datetime.combine(naive_date, time(17, 0)), tz)
    
    # Get all reservations for this room on the given date
    reservations = room.reservations.filter(
        start_time__date=naive_date,
        status__in=['PENDING', 'APPROVED']
    ).order_by('start_time')
    
    # Generate time slots (9 AM to 5 PM, 1-hour slots)
    time_slots = []
    current_time = workday_start
    
    while current_time < workday_end:
        slot_end = current_time + timedelta(hours=1)
        
        # Check if this time slot is available
        is_available = True
        for res in reservations:
            # Make sure we're comparing timezone-aware datetimes
            res_start = timezone.localtime(res.start_time)
            res_end = timezone.localtime(res.end_time)
            
            if not (res_end <= current_time or res_start >= slot_end):
                is_available = False
                break
        
        time_slots.append({
            'start': current_time.astimezone(tz).strftime('%H:%M'),
            'end': slot_end.astimezone(tz).strftime('%H:%M'),
            'available': is_available
        })
        
        current_time = slot_end
    
    return JsonResponse({
        'date': date_str,
        'room_id': room_id,
        'time_slots': time_slots
    })
    
    def test_func(self):
        return is_admin_user(self.request.user)
    
    def form_valid(self, form):
        messages.success(self.request, 'Room created successfully!')
        return super().form_valid(form)


class RoomCreateView(LoginRequiredMixin, UserPassesTestMixin, CreateView):
    """View for creating a new room (admin only)."""
    model = Room
    form_class = RoomForm
    template_name = 'booking/admin/room_form.html'
    success_url = reverse_lazy('manage-rooms')
    
    def test_func(self):
        return is_admin_user(self.request.user)
    
    def form_valid(self, form):
        messages.success(self.request, 'Room created successfully!')
        return super().form_valid(form)


class RoomUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    """View for updating an existing room (admin only)."""
    model = Room
    form_class = RoomForm
    template_name = 'booking/admin/room_form.html'
    success_url = reverse_lazy('manage-rooms')
    
    def test_func(self):
        return is_admin_user(self.request.user)
    
    def form_valid(self, form):
        messages.success(self.request, 'Room updated successfully!')
        return super().form_valid(form)


@login_required
@user_passes_test(lambda u: u.is_staff)
@require_http_methods(['POST'])
def delete_room(request, pk):
    """Delete a room (admin only)."""
    room = get_object_or_404(Room, pk=pk)
    
    # Check if there are any future reservations for this room
    has_future_reservations = room.reservations.filter(
        end_time__gte=timezone.now(),
        status__in=['PENDING', 'APPROVED']
    ).exists()
    
    if has_future_reservations:
        messages.error(
            request, 
            'Cannot delete this room because it has upcoming reservations. '
            'Please cancel or reschedule the reservations first.'
        )
    else:
        room.delete()
        messages.success(request, 'Room deleted successfully!')
    
    return redirect('manage-rooms')


@login_required
@user_passes_test(lambda u: u.is_staff)
@require_http_methods(['POST'])
def update_reservation_status(request, pk, status):
    """Update reservation status (admin only)."""
    reservation = get_object_or_404(Reservation, pk=pk)
    
    if status.upper() not in ['APPROVED', 'REJECTED', 'CANCELLED']:
        messages.error(request, 'Invalid status.')
        return redirect('manage-reservations')
    
    reservation.status = status.upper()
    reservation.save()
    
    messages.success(request, f'Reservation has been {status.lower()}')
    return redirect('manage-reservations')


def handler400(request, exception, template_name='400.html'):
    """Handle 400 Bad Request errors."""
    response = render(request, template_name, status=400)
    return response


def handler403(request, exception, template_name='403.html'):
    """Handle 403 Forbidden errors."""
    response = render(request, template_name, status=403)
    return response


def handler404(request, exception, template_name='404.html'):
    """Handle 404 Not Found errors."""
    response = render(request, template_name, status=404)
    return response


def handler500(request, template_name='500.html'):
    """Handle 500 Server Error errors."""
    response = render(request, template_name, status=500)
    return response
