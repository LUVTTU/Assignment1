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
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        // Calculate end time (10 minutes later)
        let endMinute = currentMinute + 10;
        let newEndHour = currentHour;
        
        if (endMinute >= 60) {
            endMinute = 0;
            newEndHour++;
        }
        
        const endTime = `${newEndHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        
        // Add to slots if it's before or equal to 5 PM
        if (newEndHour < endHour || (newEndHour === endHour && endMinute === 0)) {
            slots.push({
                start: startTime,
                end: endTime
            });
        }
        
        // Move to next slot
        currentMinute += 10;
        if (currentMinute >= 60) {
            currentMinute = 0;
            currentHour++;
        }
    }
    
    return slots;
}

// Function to format date as 'Day' or 'Day, Month Date' (e.g., 'Mon' or 'Fri, Oct 10')
function formatDisplayDate(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    
    // For mobile/smaller screens, just show the day name
    if (window.innerWidth < 768) {
        return dayName;
    }
    
    // For larger screens, show 'Day, Month Date'
    return `${dayName}, ${month} ${day}`;
}

// Function to update the calendar header with dates
function updateCalendarHeader(startDate) {
    const dateElements = document.querySelectorAll('.date-display');
    
    // Get the start of the week (Monday)
    const startOfWeek = getStartOfWeek(startDate);
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);
        
        if (dateElements[i]) {
            // Update the display with a friendly date format
            dateElements[i].textContent = formatDisplayDate(currentDate);
            
            // Store the full date in a data attribute for reference
            dateElements[i].setAttribute('data-full-date', formatDate(currentDate));
            
            // For debugging - you can remove this later
            console.log(`Day ${i}: ${currentDate.toDateString()}`);
        }
    }
}

// Function to load availability for a specific week
function loadWeekAvailability(startDate, roomId) {
    console.log(`Loading week availability starting from ${formatDate(startDate)} for room ${roomId}`);
    
    // Update the calendar header with the correct week start (Monday)
    const weekStart = getStartOfWeek(startDate);
    updateCalendarHeader(weekStart);
    
    // Generate time slots
    const timeSlots = generateTimeSlots();
    const timeSlotsContainer = document.getElementById('time-slots');
    
    if (!timeSlotsContainer) {
        console.error('Time slots container not found');
        return;
    }
    
    // Clear existing time slots
    timeSlotsContainer.innerHTML = '';
    
    // Create rows for each time slot
    timeSlots.forEach(slot => {
        const row = document.createElement('tr');
        
        // Add time column
        const timeCell = document.createElement('td');
        timeCell.className = 'time-slot';
        timeCell.textContent = `${slot.start} - ${slot.end}`;
        row.appendChild(timeCell);
        
        // Add day columns (Monday to Sunday)
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(weekStart.getDate() + i);
            const formattedDate = formatDate(currentDate);
            
            const slotId = `slot-${formattedDate}-${slot.start.replace(':', '')}`;
            
            const dayCell = document.createElement('td');
            dayCell.id = slotId;
            dayCell.setAttribute('data-date', formattedDate);
            dayCell.setAttribute('data-time', slot.start);
            dayCell.className = 'availability-slot';
            dayCell.innerHTML = '<i class="fas fa-spinner fa-spin text-muted"></i>';
            
            // Add tooltip with full date and time
            dayCell.setAttribute('data-bs-toggle', 'tooltip');
            dayCell.setAttribute('data-bs-placement', 'top');
            dayCell.title = `${formattedDate} ${slot.start} - ${slot.end}`;
            
            // Initialize tooltips
            if (typeof bootstrap !== 'undefined') {
                new bootstrap.Tooltip(dayCell);
            }
            
            row.appendChild(dayCell);
        }
        
        timeSlotsContainer.appendChild(row);
    });
    
    // Load availability for each day in the week
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(weekStart.getDate() + i);
        loadDayAvailability(currentDate, roomId);
    }
}

// Function to load availability for a specific day
function loadDayAvailability(date, roomId) {
    const formattedDate = formatDate(date);
    console.log(`Loading availability for ${formattedDate}...`);
    
    // Show loading state
    document.querySelectorAll(`[data-date="${formattedDate}"]`).forEach(element => {
        element.classList.add('loading');
        element.innerHTML = '<i class="fas fa-spinner fa-spin text-muted"></i>';
        element.className = 'availability-slot loading'; // Reset classes
    });
    
    // Fetch actual availability from the server
    console.log(`Fetching availability for room ${roomId} on ${formattedDate}...`);
    fetch(`/api/rooms/${roomId}/availability/?date=${formattedDate}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(availabilityData => {
            console.group(`Availability data for ${formattedDate}:`);
            console.log('Raw API response:', availabilityData);
            
            // First, mark all slots as unavailable
            const allSlots = document.querySelectorAll(`[data-date="${formattedDate}"]`);
            console.log(`Found ${allSlots.length} slots for ${formattedDate}`);
            
            allSlots.forEach((element, index) => {
                element.className = 'availability-slot unavailable';
                element.innerHTML = '<i class="fas fa-ban text-muted"></i>';
                element.title = 'Not available';
                element.style.cursor = 'not-allowed';
                element.onclick = null;
                
                // Log each slot's ID for debugging
                console.log(`Slot ${index + 1}:`, {
                    id: element.id,
                    time: element.getAttribute('data-time'),
                    element: element
                });
            });
            
            // Process time slots from the API
            if (availabilityData.time_slots && availabilityData.time_slots.length > 0) {
                console.log(`Processing ${availabilityData.time_slots.length} time slots`);
                
                // Helper function to check if a time is within a slot
                function isTimeInSlot(time, start, end) {
                    const [timeH, timeM] = time.split(':').map(Number);
                    const [startH, startM] = start.split(':').map(Number);
                    const [endH, endM] = end.split(':').map(Number);
                    
                    const timeInMinutes = timeH * 60 + timeM;
                    const startInMinutes = startH * 60 + startM;
                    const endInMinutes = endH * 60 + endM;
                    
                    return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
                }
                
                // Get all time slots for this date
                const allSlots = document.querySelectorAll(`[data-date="${formattedDate}"]`);
                
                // Process each API time slot (1-hour blocks)
                availabilityData.time_slots.forEach((slot, index) => {
                    if (!slot || typeof slot !== 'object') {
                        console.warn('Invalid time slot format at index', index, ':', slot);
                        return;
                    }
                    
                    const startTime = slot.start || '';
                    const endTime = slot.end || '';
                    
                    if (!startTime || !endTime) {
                        console.warn('Missing time data in slot:', slot);
                        return;
                    }
                    
                    console.log(`Processing API time slot ${index + 1}:`, { startTime, endTime });
                    
                    // Find all 10-minute slots that fall within this 1-hour block
                    allSlots.forEach(slotElement => {
                        const slotTime = slotElement.getAttribute('data-time');
                        if (isTimeInSlot(slotTime, startTime, endTime)) {
                            const isAvailable = slot.available !== false;
                            
                            if (isAvailable) {
                                slotElement.className = 'availability-slot available';
                                slotElement.innerHTML = '<i class="fas fa-calendar-check text-success"></i>';
                                slotElement.title = `Available (${startTime} - ${endTime})`;
                                slotElement.style.cursor = 'pointer';
                                
                                slotElement.onclick = function() {
                                    window.location.href = `/booking/create/?room=${roomId}&date=${formattedDate}&start_time=${slotTime}`;
                                };
                            } else {
                                slotElement.className = 'availability-slot booked';
                                slotElement.innerHTML = '<i class="fas fa-calendar-times text-danger"></i>';
                                slotElement.title = `Booked (${startTime} - ${endTime})`;
                                slotElement.style.cursor = 'not-allowed';
                            }
                        }
                    }); // End of allSlots.forEach
                }); // End of time_slots.forEach
            } else {
                console.log('No time slots found in the API response');
            }
            
            console.groupEnd();
            
            // Remove loading state from all slots
            document.querySelectorAll(`[data-date="${formattedDate}"].loading`).forEach(element => {
                element.classList.remove('loading');
            });
        })
        .catch(error => {
            console.error('Error loading availability:', error);
            
            // Mark all slots for this date as error
            document.querySelectorAll(`[data-date="${formattedDate}"]`).forEach(element => {
                element.className = 'availability-slot unavailable';
                element.innerHTML = '<i class="fas fa-exclamation-triangle text-warning"></i>';
                element.title = 'Error loading availability';
                element.style.cursor = 'not-allowed';
            });
        });
}

// Function to set up week navigation
function setupWeekNavigation(roomId) {
    // This function is a placeholder for any week navigation setup
    // The actual navigation is handled in initializeCalendar
    console.log('Setting up week navigation for room:', roomId);
}

// Function to initialize the calendar
function initializeCalendar() {
    console.log('Initializing calendar...');
    
    // Get the room ID from the data attribute
    const roomElement = document.getElementById('room-id');
    if (!roomElement) {
        console.error('Room element not found');
        return;
    }
    
    const roomId = roomElement.getAttribute('data-room-id');
    if (!roomId) {
        console.error('Room ID not found');
        return;
    }
    
    console.log('Room ID from data attribute:', roomId);
    
    // Set up the week navigation
    setupWeekNavigation(roomId);
    
    // Get the navigation buttons
    const prevWeekBtn = document.getElementById('prevWeek');
    const nextWeekBtn = document.getElementById('nextWeek');
    const currentWeekBtn = document.getElementById('currentWeek');
    
    // Set up event listeners for navigation
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            const currentDate = new Date(document.querySelector('.week-navigation h2').getAttribute('data-date') || new Date());
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - 7);
            loadWeekAvailability(weekStart, roomId);
        });
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            const currentDate = new Date(document.querySelector('.week-navigation h2').getAttribute('data-date') || new Date());
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() + 7);
            loadWeekAvailability(weekStart, roomId);
        });
    }
    
    if (currentWeekBtn) {
        currentWeekBtn.addEventListener('click', function() {
            loadWeekAvailability(new Date(), roomId);
        });
    }
    
    // Initial load of the current week
    loadWeekAvailability(new Date(), roomId);
    
    return true;
}

// Initialize the calendar when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing calendar...');
    initializeCalendar();
});
