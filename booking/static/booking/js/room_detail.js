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

// Function to generate time slots with 10-minute intervals
function generateTimeSlots() {
    const slots = [];
    const startHour = 9;  // 9 AM
    const endHour = 17;   // 5 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 10) {
            // Skip if this would go past 5 PM
            if (hour === endHour && minute >= 0) {
                break;
            }
            
            // Format start time
            const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            
            // Calculate end time (10 minutes later)
            let endMinute = minute + 10;
            let endHour = hour;
            
            if (endMinute >= 60) {
                endMinute = 0;
                endHour++;
            }
            
            // Format end time
            const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
            
            // Add to slots if it's before 5 PM
            if (endHour < endHour || (endHour === endHour && endMinute === 0)) {
                slots.push({ 
                    start: startTime, 
                    end: endTime 
                });
            }
    
    console.log('Generated', slots.length, 'time slots with 10-minute intervals');
    return slots;
}

// Function to update the calendar header with dates
function updateCalendarHeader(startDate) {
    console.log('Updating calendar header with start date:', startDate);
    const dateElements = document.querySelectorAll('.date-display');
    
    // Check if we found the date elements
    if (!dateElements || dateElements.length === 0) {
        console.error('Could not find date display elements');
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date for comparison
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Format date as DD/MM
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        
        // Only update if the element exists
        if (dateElements[i]) {
            dateElements[i].textContent = `${day}/${month}`;
            
            // Highlight today's date
            const thElement = dateElements[i].closest('th');
            if (thElement) {
                if (currentDate.toDateString() === today.toDateString()) {
                    thElement.classList.add('table-primary');
                } else {
                    thElement.classList.remove('table-primary');
                }
            }
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
            // Ensure consistent slot ID format with loadDayAvailability
            const slotStartTime = slot.start.split(':').join('');
            const slotId = `${formattedDate}-${slotStartTime}`;
            
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
    
    // Log all elements with the current date for debugging
    const dateElements = document.querySelectorAll(`[data-date="${formattedDate}"]`);
    console.log(`Found ${dateElements.length} time slots for ${formattedDate}:`, Array.from(dateElements).map(el => ({
        id: el.id,
        date: el.dataset.date,
        start: el.dataset.start,
        end: el.dataset.end
    })));
    
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
            throw new Error('Invalid response format: Missing time_slots in response');
        }
        
        console.log('API Response for', formattedDate, ':', data);
        console.log('Number of time slots received:', data.time_slots.length);
        
        // Log how many slots are available
        const availableSlots = data.time_slots.filter(slot => slot.is_available).length;
        console.log(`Found ${availableSlots} available slots out of ${data.time_slots.length} total slots`);
        
        // First, mark all slots as unavailable by default
        document.querySelectorAll(`[data-date="${formattedDate}"]`).forEach(element => {
            element.classList.remove('available', 'booked', 'loading');
            element.classList.add('unavailable');
            const icon = element.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-ban text-muted';
            }
        });
        
        // Process each time slot from the API
        console.log('Processing', data.time_slots.length, 'time slots from API');
        
        data.time_slots.forEach((slot, index) => {
            console.log(`Slot ${index + 1}:`, {
                start: slot.start,
                end: slot.end,
                is_available: slot.is_available,
                element: document.getElementById(`${formattedDate}-${slot.start.replace(':', '')}`)
            });
            // Create slot ID in the same format as in loadWeekAvailability
            const startTime = slot.start.split(':').join('');
            const slotId = `${formattedDate}-${startTime}`;
            const slotElement = document.getElementById(slotId);
            
            // Debug information
            console.log(`Processing slot ${index + 1}/${data.time_slots.length}:`, {
                slotTime: `${slot.start} - ${slot.end}`,
                isAvailable: slot.is_available,
                slotId: slotId,
                elementFound: !!slotElement,
                elementId: slotElement ? slotElement.id : 'not found'
            });
            
            if (slotElement) {
                // Clear all classes first
                slotElement.classList.remove('loading', 'available', 'booked', 'unavailable');
                
                // Set the appropriate class and icon based on availability
                if (slot.is_available === true) {
                    console.log(`✅ Slot ${slotId} is AVAILABLE`);
                    slotElement.classList.add('available');
                    
                    const icon = slotElement.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-calendar-check text-success me-1';
                        icon.title = 'Available - Click to book';
                    }
                    
                    // Make it interactive
                    slotElement.setAttribute('data-bs-toggle', 'tooltip');
                    slotElement.setAttribute('data-bs-placement', 'top');
                    slotElement.setAttribute('title', 'Available - Click to book');
                    slotElement.style.cursor = 'pointer';
                    slotElement.style.transition = 'all 0.2s';
                    
                    // Add hover effects
                    slotElement.onmouseover = function() {
                        this.style.transform = 'scale(1.05)';
                        this.style.boxShadow = '0 0 10px rgba(0,200,0,0.2)';
                    };
                    
                    slotElement.onmouseout = function() {
                        this.style.transform = 'scale(1)';
                        this.style.boxShadow = 'none';
                    };
                } else {
                    console.log(`❌ Slot ${slotId} is BOOKED`);
                    slotElement.classList.add('booked');
                    
                    const icon = slotElement.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-calendar-times text-danger me-1';
                        icon.title = 'Booked';
                    }
                    
                    // Make it non-interactive
                    slotElement.setAttribute('data-bs-toggle', 'tooltip');
                    slotElement.setAttribute('data-bs-placement', 'top');
                    slotElement.setAttribute('title', 'Booked - This time slot is not available');
                    slotElement.style.cursor = 'not-allowed';
                    slotElement.style.opacity = '0.7';
                }
            } else {
                console.warn('Could not find element for slot:', {
                    slotId: slotId,
                    availableElements: Array.from(document.querySelectorAll(`[data-date="${formattedDate}"]`)).map(el => el.id)
                });
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

// Function to initialize the calendar
function initializeCalendar() {
    console.log('Initializing calendar...');
    
    // Get room ID from the template
    const roomElement = document.getElementById('room-id');
    if (!roomElement) {
        console.error('Error: Could not find room ID element');
        return false;
    }
    
    const roomId = roomElement.getAttribute('data-room-id');
    if (!roomId) {
        console.error('Error: Room ID is missing');
        return false;
    }
    
    let currentDate = new Date();
    
    try {
        // Check if required elements exist
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        const currentWeekBtn = document.getElementById('current-week');
        const timeSlotsContainer = document.getElementById('time-slots');
        const dateElements = document.querySelectorAll('.date-display');
        
        if (!prevWeekBtn || !nextWeekBtn || !currentWeekBtn) {
            throw new Error('Navigation buttons not found');
        }
        
        if (!timeSlotsContainer) {
            throw new Error('Time slots container not found');
        }
        
        if (!dateElements || dateElements.length === 0) {
            throw new Error('Date display elements not found');
        }
        
        console.log('All required elements found, starting calendar...');
        
        // Initialize the calendar
        const startOfWeek = getStartOfWeek(currentDate);
        console.log('Start of week:', startOfWeek);
        
        updateCalendarHeader(startOfWeek);
        loadWeekAvailability(startOfWeek, roomId);
        
        return true;
    } catch (error) {
        console.error('Error during calendar initialization:', error);
        return false;
    }
}

// Function to setup event listeners for the calendar
function setupCalendarEventListeners(roomId) {
    // Make roomId available in the event handlers
    const state = {
        currentDate: new Date(),
        roomId: roomId
    };
    
    // Navigation functions
    function goToPreviousWeek() {
        state.currentDate.setDate(state.currentDate.getDate() - 7);
        const newStartOfWeek = getStartOfWeek(state.currentDate);
        updateCalendarHeader(newStartOfWeek);
        loadWeekAvailability(newStartOfWeek, state.roomId);
    }
    
    function goToNextWeek() {
        state.currentDate.setDate(state.currentDate.getDate() + 7);
        const newStartOfWeek = getStartOfWeek(state.currentDate);
        updateCalendarHeader(newStartOfWeek);
        loadWeekAvailability(newStartOfWeek, state.roomId);
    }
    
    function goToCurrentWeek() {
        state.currentDate = new Date();
        const newStartOfWeek = getStartOfWeek(state.currentDate);
        updateCalendarHeader(newStartOfWeek);
        loadWeekAvailability(newStartOfWeek, state.roomId);
    }
    
    // Add event listeners to navigation buttons
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const currentWeekBtn = document.getElementById('current-week');
    const timeSlotsContainer = document.getElementById('time-slots');
    
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', goToPreviousWeek);
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', goToNextWeek);
    if (currentWeekBtn) currentWeekBtn.addEventListener('click', goToCurrentWeek);
    
    // Handle time slot clicks
    if (timeSlotsContainer) {
        timeSlotsContainer.addEventListener('click', function(e) {
            const slot = e.target.closest('.availability-slot.available');
            if (slot) {
                const date = slot.dataset.date;
                const startTime = slot.dataset.start;
                const endTime = slot.dataset.end;
                
                // Redirect to booking page with pre-filled date and time
                window.location.href = `/booking/reservation/create/?room_id=${state.roomId}&date=${date}&start_time=${startTime}&end_time=${endTime}`;
            }
        });
    }
    
    return state;
}

// Initialize the calendar when the DOM is fully loaded
// Initialize tooltips when document is ready
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, checking for calendar elements...');
    // Initialize tooltips
    initializeTooltips();
    
    // Function to handle successful calendar initialization
    function onCalendarInitialized(roomId) {
        // Set up event listeners
        setupCalendarEventListeners(roomId);
        
        // Show the calendar container if it was hidden
        const calendarContainer = document.getElementById('availability-calendar');
        if (calendarContainer) {
            calendarContainer.style.display = 'block';
        }
    }
    
    // Try to initialize the calendar immediately
    const roomElement = document.getElementById('room_id');
    const roomId = roomElement ? roomElement.getAttribute('data-room-id') : null;
    
    console.log('Room element:', roomElement);
    console.log('Room ID:', roomId);
    
    if (roomId) {
        const calendarInitialized = initializeCalendar();
        if (calendarInitialized) {
            onCalendarInitialized(roomId);
        } else {
            console.log('Calendar elements not found, setting up observer...');
            
            const observer = new MutationObserver(function(mutations, obs) {
                // Check if our calendar elements exist now
                const calendarContainer = document.getElementById('availability-calendar');
                const dateElements = document.querySelectorAll('.date-display');
                
                if (calendarContainer && dateElements.length > 0) {
                    console.log('Calendar elements found, initializing...');
                    // Disconnect the observer
                    obs.disconnect();
                    // Initialize the calendar
                    if (initializeCalendar()) {
                        onCalendarInitialized(roomId);
                    }
                }
            });
            
            // Start observing the document with the configured parameters
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
            
            // Also try again after a short delay as a fallback
            setTimeout(function() {
                if (!document.querySelector('.date-display')) {
                    console.warn('Calendar elements still not found after delay');
                } else if (initializeCalendar()) {
                    onCalendarInitialized(roomId);
                }
            }, 500);
        }
    } else {
        console.error('Room ID not found, cannot initialize calendar');
        
        // Show error message to user
        const calendarContainer = document.getElementById('availability-calendar');
        if (calendarContainer) {
            calendarContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error: Could not determine room ID. Please try refreshing the page.
                </div>`;
        }
    }
});}}
