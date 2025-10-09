// Debug: Check if script is loaded
console.log('Room detail script loaded');

// Function to format date as YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

// Function to get the start of the week (Monday)
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Function to generate time slots
function generateTimeSlots() {
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
        slots.push({
            start: `${hour.toString().padStart(2, '0')}:00`,
            end: `${(hour + 1).toString().padStart(2, '0')}:00`
        });
    }
    return slots;
}

// Function to update the calendar header with dates
function updateCalendarHeader(startDate) {
    const dateElements = document.querySelectorAll('.date-display');
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Format date as DD/MM
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        dateElements[i].textContent = `${day}/${month}`;
        
        // Highlight today's date
        if (currentDate.toDateString() === today.toDateString()) {
            dateElements[i].closest('th').classList.add('table-primary');
        } else {
            dateElements[i].closest('th').classList.remove('table-primary');
        }
    }
}

// Function to load availability for a specific week
function loadWeekAvailability(startDate, roomId) {
    console.log('Loading week availability for:', startDate);
    const timeSlots = generateTimeSlots();
    let calendarHtml = '';
    
    // Log the room ID being used
    console.log('Using room ID:', roomId);
    
    // Generate time slots rows
    timeSlots.forEach((slot, index) => {
        calendarHtml += `<tr>`;
        // Time column
        calendarHtml += `<td class="align-middle text-center"><small>${slot.start} - ${slot.end}</small></td>`;
        
        // Day columns
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const dayOfWeek = currentDate.getDay();
            const formattedDate = formatDate(currentDate);
            const slotId = `${formattedDate}-${slot.start.replace(':', '')}`;
            
            // Skip weekends (0 = Sunday, 6 = Saturday)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                calendarHtml += `
                <td class="text-center p-0">
                    <div id="${slotId}" class="availability-slot unavailable" 
                         data-date="${formattedDate}" 
                         data-start="${slot.start}" 
                         data-end="${slot.end}">
                        <i class="fas fa-times text-muted"></i>
                    </div>
                </td>`;
            } else {
                calendarHtml += `
                <td class="text-center p-0">
                    <div id="${slotId}" class="availability-slot loading" 
                         data-date="${formattedDate}" 
                         data-start="${slot.start}" 
                         data-end="${slot.end}">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </td>`;
            }
        }
        
        calendarHtml += `</tr>`;
    });
    
    // Update the calendar
    document.getElementById('time-slots').innerHTML = calendarHtml;
    
    // Load availability for each day of the week
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        loadDayAvailability(currentDate, roomId);
    }
}

// Function to load availability for a specific day
function loadDayAvailability(date, roomId) {
    const formattedDate = formatDate(date);
    const dayOfWeek = date.getDay();
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Mark all time slots as unavailable for weekends
        document.querySelectorAll(`[data-date="${formattedDate}"]`).forEach(element => {
            element.classList.remove('available', 'booked');
            element.classList.add('unavailable');
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-times text-muted';
            }
        });
        return;
    }
    
    // Show loading state
    document.querySelectorAll(`[data-date="${formattedDate}"]`).forEach(element => {
        element.classList.remove('available', 'booked', 'unavailable');
        element.classList.add('loading');
        const icon = element.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-spinner fa-spin';
        }
    });
    
    // Make AJAX call to get availability for the day
    const url = `/api/rooms/${roomId}/availability/?date=${formattedDate}`;
    console.log('Making request to:', url);
    
    fetch(url, {
        headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'  // Include cookies for authentication
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (!data || !data.time_slots) {
            throw new Error('Invalid response format');
        }
        
        data.time_slots.forEach(slot => {
            const slotId = `${formattedDate}-${slot.start.replace(':', '')}`;
            const slotElement = document.getElementById(slotId);
            
            if (slotElement) {
                // Clear all classes first
                slotElement.classList.remove('loading', 'available', 'booked', 'unavailable');
                
                if (slot.is_available) {
                    slotElement.classList.add('available');
                    const icon = slotElement.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check text-success';
                    }
                } else {
                    slotElement.classList.add('booked');
                    const icon = slotElement.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-times text-danger';
                    }
                }
            }
        });
    })
    .catch(error => {
        console.error('Error loading availability:', error);
        document.querySelectorAll(`[data-date="${formattedDate}"]`).forEach(element => {
            element.classList.remove('loading', 'available', 'booked');
            element.classList.add('unavailable');
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-exclamation-circle text-warning';
            }
        });
    });
}

// Initialize the calendar when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing calendar...');
    
    // Get room ID from the template
    const roomElement = document.getElementById('room-id');
    if (!roomElement) {
        console.error('Error: Could not find room ID element');
        return;
    }
    
    const roomId = roomElement.getAttribute('data-room-id');
    if (!roomId) {
        console.error('Error: Room ID is missing');
        return;
    }
    
    let currentDate = new Date();
    
    try {
        // Initialize the calendar
        console.log('Initializing calendar...');
        const startOfWeek = getStartOfWeek(currentDate);
        console.log('Start of week:', startOfWeek);
        
        // Check if required elements exist
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        const currentWeekBtn = document.getElementById('current-week');
        const timeSlotsContainer = document.getElementById('time-slots');
        
        if (!prevWeekBtn || !nextWeekBtn || !currentWeekBtn) {
            throw new Error('Navigation buttons not found');
        }
        
        if (!timeSlotsContainer) {
            throw new Error('Time slots container not found');
        }
        
        console.log('All required elements found, starting calendar...');
        
        // Initialize the calendar
        updateCalendarHeader(startOfWeek);
        loadWeekAvailability(startOfWeek, roomId);
        
        // Event listeners for navigation
        prevWeekBtn.addEventListener('click', function() {
            currentDate.setDate(currentDate.getDate() - 7);
            const newStartOfWeek = getStartOfWeek(currentDate);
            updateCalendarHeader(newStartOfWeek);
            loadWeekAvailability(newStartOfWeek, roomId);
        });
        
        nextWeekBtn.addEventListener('click', function() {
            currentDate.setDate(currentDate.getDate() + 7);
            const newStartOfWeek = getStartOfWeek(currentDate);
            updateCalendarHeader(newStartOfWeek);
            loadWeekAvailability(newStartOfWeek, roomId);
        });
        
        currentWeekBtn.addEventListener('click', function() {
            currentDate = new Date();
            const newStartOfWeek = getStartOfWeek(currentDate);
            updateCalendarHeader(newStartOfWeek);
            loadWeekAvailability(newStartOfWeek, roomId);
        });
        
        // Handle time slot clicks
        document.getElementById('time-slots').addEventListener('click', function(e) {
            const slot = e.target.closest('.availability-slot.available');
            if (slot) {
                const date = slot.dataset.date;
                const startTime = slot.dataset.start;
                const endTime = slot.dataset.end;
                
                // Redirect to booking page with pre-filled date and time
                window.location.href = `/booking/reservation/create/?room_id=${roomId}&date=${date}&start_time=${startTime}&end_time=${endTime}`;
            }
        });
        
    } catch (error) {
        console.error('Error initializing calendar:', error);
        // Show error message to user
        const calendarContainer = document.getElementById('availability-calendar');
        if (calendarContainer) {
            calendarContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error loading calendar: ${error.message}
                </div>`;
        }
    }
});
