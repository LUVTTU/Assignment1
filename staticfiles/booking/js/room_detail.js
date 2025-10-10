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
    const endHour = 17;   // 5 PM (inclusive)
    
    let currentHour = startHour;
    let currentMinute = 0;
    
    while (currentHour < endHour || (currentHour === endHour && currentMinute === 0)) {
        // Format start time
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Calculate end time (10 minutes later)
        let endMinute = currentMinute + 10;
        let newEndHour = currentHour;
        
        if (endMinute >= 60) {
            endMinute = 0;
            newEndHour++;
        }
        
        // Format end time
        const endTime = `${newEndHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Add to slots if it's before or equal to 5 PM
        if (newEndHour < endHour || (newEndHour === endHour && endMinute === 0)) {
            slots.push({ 
                start: startTime,
                end: endTime 
            });
        }
        
        // Move to next time slot
        currentMinute += 10;
        if (currentMinute >= 60) {
            currentMinute = 0;
            currentHour++;
        }
    }
    
    console.log('Generated', slots.length, 'time slots with 10-minute intervals');
    return slots;
}

// Function to update the calendar header with dates
function updateCalendarHeader(startDate) {
    console.log('Updating calendar header with start date:', startDate);
    const dateElements = document.querySelectorAll('.date-display');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Check if we found the date elements
    if (!dateElements || dateElements.length === 0) {
        console.error('Could not find date display elements');
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date for comparison
    
    // Start from Monday (1) to Sunday (0)
    for (let i = 1; i <= 7; i++) {
        const currentDate = new Date(startDate);
        // Adjust to show Monday as first day of the week
        const dayOffset = i === 7 ? 0 : i; // Sunday (0) becomes the 7th day
        currentDate.setDate(startDate.getDate() + (dayOffset - 1));
        
        // Get day name and date
        const dayName = dayNames[currentDate.getDay()];
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        
        // Only update if the element exists
        const elementIndex = i - 1; // Adjust index for 0-based array
        if (dateElements[elementIndex]) {
            // Update the day name and date
            const dayElement = dateElements[elementIndex].closest('th');
            if (dayElement) {
                // Clear existing content and update with day name and date
                dayElement.innerHTML = `${dayName}<br><span class="date-display">${day}/${month}</span>`;
                
                // Highlight today's date
                if (currentDate.toDateString() === today.toDateString()) {
                    dayElement.classList.add('table-primary');
                } else {
                    dayElement.classList.remove('table-primary');
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
    
    // Log generated time slots for debugging
    console.log('Generated time slots:', timeSlots);
    
    // Log the room ID being used
    console.log('Using room ID:', roomId);
    
    // Generate time slots rows
    timeSlots.forEach((slot, index) => {
        calendarHtml += `<tr>`;
        // Time column (show time range)
        calendarHtml += `<td class="align-middle text-center"><small>${slot.start} - ${slot.end}</small></td>`;
        
        // Day columns (Monday to Sunday)
        for (let dayIndex = 1; dayIndex <= 7; dayIndex++) {
            const currentDate = new Date(startDate);
            // Adjust to show Monday as first day of the week
            const dayOffset = dayIndex === 7 ? 0 : dayIndex; // Sunday (0) becomes the 7th day
            currentDate.setDate(startDate.getDate() + (dayOffset - 1));
            
            const dayOfWeek = currentDate.getDay();
            const formattedDate = formatDate(currentDate);
            
            // Format time to ensure consistent HH:MM format
            const formatTime = (timeStr) => {
                const [hours, minutes] = timeStr.split(':');
                return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
            };
            
            const formattedStartTime = formatTime(slot.start);
            const formattedEndTime = formatTime(slot.end);
            
            // Create slot ID in the format: YYYY-MM-DD-HHMM
            // Ensure we're using the same format as the backend
            const slotId = `${formattedDate}-${formattedStartTime.replace(':', '')}`;
            
            // Debug log for each slot
            console.log('Creating slot:', {
                dayIndex,
                dayOfWeek,
                formattedDate,
                slotStart: formattedStartTime,
                slotEnd: formattedEndTime,
                slotId
            });
            
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
    // Format date in YYYY-MM-DD format for API and data attributes
    const formattedDate = formatDate(date);
    const dayOfWeek = date.getDay();
    
    console.log(`Loading availability for ${formattedDate} (${date.toDateString()})`);
    
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(`Skipping weekend day: ${date.toDateString()}`);
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
    const slotElements = document.querySelectorAll(`[data-date="${formattedDate}"]`);
    console.log(`Found ${slotElements.length} slot elements for ${formattedDate}`);
    
    slotElements.forEach(element => {
        element.classList.remove('available', 'booked', 'unavailable');
        element.classList.add('loading');
        const icon = element.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-spinner fa-spin';
        }
    });
    
    if (slotElements.length === 0) {
        console.warn(`No slot elements found for date: ${formattedDate}`);
    }
    
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
    console.log('Processing', data.time_slots.length, 'time slots from API for date:', formattedDate);
    
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
    data.time_slots.forEach((slot, index) => {
        // Format the time to ensure consistent HH:MM format
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const [hours, minutes] = timeStr.toString().split(':');
            return `${parseInt(hours, 10).toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        };
        
        const formattedStartTime = formatTime(slot.start);
        const slotTime = formattedStartTime.replace(':', '');
        const slotId = `${formattedDate}-${slotTime}`;
        const slotElement = document.getElementById(slotId);
        
        if (!slotElement) {
            console.warn(`Could not find element for slot: ${slotId}`);
            return;
        }
        
        // Debug information
        console.log(`Processing slot ${index + 1}/${data.time_slots.length}:`, {
            slotId,
            backendData: {
                start: slot.start,
                end: slot.end,
                is_available: slot.is_available
            },
            formattedTimes: {
                start: formattedStartTime,
                end: formatTime(slot.end)
            },
            elementFound: !!slotElement,
            elementId: slotElement ? slotElement.id : 'not found',
            elementData: slotElement ? {
                date: slotElement.dataset.date,
                start: slotElement.dataset.start,
                end: slotElement.dataset.end
            } : null
        });
        
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
})

// Function to initialize the calendar
function initializeCalendar() {
    console.log('Initializing calendar...');
    
    // Get room ID from the template
    const roomElement = document.getElementById('room-id');
    console.log('Room element:', roomElement);
    
    if (!roomElement) {
        console.error('Error: Could not find room ID element');
        // Check if we can find any elements with data-room-id
        const elements = document.querySelectorAll('[data-room-id]');
        console.log('Elements with data-room-id:', elements);
        return false;
    }
    
    const roomId = roomElement.getAttribute('data-room-id');
    console.log('Room ID from data attribute:', roomId);
    
    if (!roomId) {
        console.error('Error: Room ID is missing or empty');
        console.log('Room element:', roomElement);
        console.log('Room element attributes:');
        for (let i = 0; i < roomElement.attributes.length; i++) {
            console.log(roomElement.attributes[i].name + ': ' + roomElement.attributes[i].value);
        }
        return false;
    }
    
    console.log('Found room ID:', roomId);
    let currentDate = new Date();
    
    try {
        // Check if required elements exist
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');
        const currentWeekBtn = document.getElementById('current-week');
        const timeSlotsContainer = document.getElementById('time-slots');
        const dateElements = document.querySelectorAll('.date-display');
        
        console.log('Calendar elements found:', {
            prevWeekBtn: !!prevWeekBtn,
            nextWeekBtn: !!nextWeekBtn,
            currentWeekBtn: !!currentWeekBtn,
            timeSlotsContainer: !!timeSlotsContainer,
            dateElements: dateElements.length
        });
        
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
    const roomElement = document.getElementById('room-id');
    const roomId = roomElement ? roomElement.getAttribute('data-room-id') : null;
    
    console.log('Room element:', roomElement);
    console.log('Room ID:', roomId);
    
    // Debug: Check if the room ID is valid
    if (!roomId) {
        console.error('Could not find room ID. Make sure there is an element with id="room-id" and data-room-id attribute.');
    }
    
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
});

// Initialize calendar when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing calendar...');
    initializeCalendar();
});}
