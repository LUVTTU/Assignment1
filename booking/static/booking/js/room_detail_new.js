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

// Function to update the calendar header with dates
function updateCalendarHeader(startDate) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dateElements = document.querySelectorAll('.date-display');
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        if (dateElements[i]) {
            dateElements[i].textContent = formatDate(currentDate);
        }
    }
}

// Function to load availability for a specific week
function loadWeekAvailability(startDate, roomId) {
    console.log(`Loading week availability starting from ${formatDate(startDate)} for room ${roomId}`);
    
    // Update the calendar header
    updateCalendarHeader(startDate);
    
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
        timeCell.textContent = `${slot.start} - ${slot.end}`;
        row.appendChild(timeCell);
        
        // Add day columns
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            const formattedDate = formatDate(currentDate);
            
            const slotId = `slot-${formattedDate}-${slot.start.replace(':', '')}`;
            
            const dayCell = document.createElement('td');
            dayCell.id = slotId;
            dayCell.setAttribute('data-date', formattedDate);
            dayCell.setAttribute('data-time', slot.start);
            dayCell.className = 'availability-slot';
            dayCell.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            row.appendChild(dayCell);
        }
        
        timeSlotsContainer.appendChild(row);
    });
    
    // Load availability for each day
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
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
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
    
    // In a real application, you would fetch this from your API
    // For now, we'll simulate a successful response after a short delay
    setTimeout(() => {
        // Simulate some available and booked slots
        const timeSlots = generateTimeSlots();
        const availabilityData = timeSlots.map(slot => ({
            start_time: slot.start,
            available: Math.random() > 0.5  // 50% chance of being available
        }));
        
        // Update the UI based on the availability data
        availabilityData.forEach(slot => {
            const slotId = `slot-${formattedDate}-${slot.start_time.replace(':', '')}`;
            const slotElement = document.getElementById(slotId);
            
            if (slotElement) {
                // Clear loading state
                slotElement.classList.remove('loading');
                
                // Update based on availability
                if (slot.available) {
                    slotElement.classList.add('available');
                    slotElement.innerHTML = '<i class="fas fa-check"></i>';
                    slotElement.title = 'Available - Click to book';
                    slotElement.style.cursor = 'pointer';
                    
                    // Add click event for booking
                    slotElement.addEventListener('click', function() {
                        console.log(`Booking slot at ${slot.start_time} on ${formattedDate}`);
                        // You can add a modal or redirect to booking page here
                    });
                } else {
                    slotElement.classList.add('booked');
                    slotElement.innerHTML = '<i class="fas fa-times"></i>';
                    slotElement.title = 'Booked - Not available';
                    slotElement.style.cursor = 'not-allowed';
                }
            }
        });
        
        // Mark any remaining loading slots as unavailable
        document.querySelectorAll(`[data-date="${formattedDate}"].loading`).forEach(element => {
            element.classList.remove('loading');
            element.classList.add('unavailable');
            element.innerHTML = '<i class="fas fa-question"></i>';
            element.title = 'Not available';
            element.style.cursor = 'not-allowed';
        });
    }, 1000);
}

// Function to initialize the calendar
function initializeCalendar() {
    console.log('Initializing calendar...');
    
    // Get room ID from the template
    const roomElement = document.getElementById('room-id');
    console.log('Room element:', roomElement);
    
    if (!roomElement) {
        console.error('Error: Could not find room ID element');
        return false;
    }
    
    const roomId = roomElement.getAttribute('data-room-id');
    console.log('Room ID from data attribute:', roomId);
    
    if (!roomId) {
        console.error('Error: Room ID is missing or empty');
        return false;
    }
    
    // Load the current week's availability
    const currentDate = new Date();
    loadWeekAvailability(currentDate, roomId);
    
    // Set up event listeners for navigation
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const currentWeekBtn = document.getElementById('current-week');
    
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            const weekStart = new Date(currentDate);
            weekStart.setDate(weekStart.getDate() - 7);
            loadWeekAvailability(weekStart, roomId);
        });
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
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
    
    return true;
}

// Initialize the calendar when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing calendar...');
    initializeCalendar();
});
