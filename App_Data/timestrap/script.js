class ScheduleManager {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'month';
        this.selectedEvent = null;
        this.draggingEventId = null;
        this.events = [];
        this.calendars = [];
        this.visibleCalendars = new Set(['work', 'personal', 'family']);
        
        this.sampleData = {
            events: [
                {
                    id: "evt_1",
                    title: "Daily Standup",
                    description: "Team sync meeting with project updates",
                    start: "2025-07-20T09:00:00",
                    end: "2025-07-20T09:30:00",
                    calendar: "work", 
                    color: "#4285f4",
                    recurring: "daily",
                    allDay: false
                },
                {
                    id: "evt_2",
                    title: "Client Presentation", 
                    description: "Q3 results presentation to stakeholders",
                    start: "2025-07-21T14:00:00",
                    end: "2025-07-21T16:00:00",
                    calendar: "work",
                    color: "#34a853",
                    recurring: "none",
                    allDay: false
                },
                {
                    id: "evt_3",
                    title: "Doctor Appointment",
                    description: "Annual health checkup",
                    start: "2025-07-22T10:00:00", 
                    end: "2025-07-22T11:30:00",
                    calendar: "personal",
                    color: "#fbbc04",
                    recurring: "none",
                    allDay: false
                },
                {
                    id: "evt_4",
                    title: "Family Vacation",
                    description: "Beach trip with family",
                    start: "2025-07-26T00:00:00",
                    end: "2025-07-28T23:59:59", 
                    calendar: "family",
                    color: "#ea4335",
                    recurring: "none",
                    allDay: true
                },
                {
                    id: "evt_5", 
                    title: "Weekly Planning",
                    description: "Plan tasks and goals for upcoming week",
                    start: "2025-07-25T17:00:00",
                    end: "2025-07-25T18:00:00",
                    calendar: "work", 
                    color: "#9aa0a6",
                    recurring: "weekly",
                    allDay: false
                },
                {
                    id: "evt_6",
                    title: "Gym Session",
                    description: "Strength training workout",
                    start: "2025-07-20T18:00:00",
                    end: "2025-07-20T19:30:00",
                    calendar: "personal",
                    color: "#ff6d01", 
                    recurring: "daily",
                    allDay: false
                }
            ],
            calendars: [
                {
                    id: "work",
                    name: "Work", 
                    color: "#4285f4",
                    visible: true,
                    description: "Work meetings and tasks"
                },
                {
                    id: "personal",
                    name: "Personal",
                    color: "#fbbc04", 
                    visible: true,
                    description: "Personal appointments and activities"
                },
                {
                    id: "family", 
                    name: "Family",
                    color: "#ea4335",
                    visible: true,
                    description: "Family events and activities"
                }
            ]
        };
        
        this.init();
    }

    init() {
        this.loadInitialData();
        this.setupEventListeners();
        this.updateClock();
        this.renderCalendar();
        setInterval(() => this.updateClock(), 1000);
    }

    loadInitialData() {
        this.events = this.sampleData.events.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
        }));
        this.calendars = this.sampleData.calendars;
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(e.target.dataset.view);
            });
        });

        document.querySelectorAll('.calendar-toggle input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.toggleCalendar(e.target.dataset.calendar, e.target.checked);
            });
        });

        document.querySelector('.prev-btn').addEventListener('click', () => this.navigateCalendar(-1));
        document.querySelector('.next-btn').addEventListener('click', () => this.navigateCalendar(1));
        document.querySelector('.today-btn').addEventListener('click', () => this.goToToday());

        const fab = document.querySelector('.fab');
        if (fab) {
            fab.addEventListener('click', (e) => {
                e.preventDefault();
                this.openEventPanel();
            });
        }

        const closePanel = document.querySelector('.close-panel');
        if (closePanel) {
            closePanel.addEventListener('click', () => this.closeEventPanel());
        }

        const overlay = document.querySelector('.overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeEventPanel());
        }

        const eventForm = document.querySelector('.event-form');
        if (eventForm) {
            eventForm.addEventListener('submit', (e) => this.saveEvent(e));
        }

        const deleteBtn = document.querySelector('#delete-event');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteEvent());
        }

        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchEvents(e.target.value));
        }

        const allDayCheck = document.querySelector('#event-all-day');
        if (allDayCheck) {
            allDayCheck.addEventListener('change', (e) => this.toggleAllDay(e.target.checked));
        }

        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => this.handleDrop(e));
    }

    updateClock() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('en-US', options);
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        const dateEl = document.querySelector('.current-date');
        const timeEl = document.querySelector('.current-time');
        if (dateEl) dateEl.textContent = dateStr;
        if (timeEl) timeEl.textContent = timeStr;
    }

    switchView(view) {
        if (!view) return;
        
        this.currentView = view;
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`[data-view="${view}"]`);
        if (activeNav) activeNav.classList.add('active');
        
        document.querySelectorAll('.calendar-view').forEach(viewEl => viewEl.classList.remove('active'));
        const activeView = document.querySelector(`.${view}-view`);
        if (activeView) activeView.classList.add('active');
        
        this.renderCalendar();
    }

    navigateCalendar(direction) {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else if (this.currentView === 'week') {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        } else if (this.currentView === 'day') {
            this.currentDate.setDate(this.currentDate.getDate() + direction);
        }
        this.renderCalendar();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
    }

    renderCalendar() {
        this.updateCalendarTitle();
        
        if (this.currentView === 'month') {
            this.renderMonthView();
        } else if (this.currentView === 'week') {
            this.renderWeekView();
        } else if (this.currentView === 'day') {
            this.renderDayView();
        } else if (this.currentView === 'agenda') {
            this.renderAgendaView();
        }
    }

    updateCalendarTitle() {
        const titleElement = document.querySelector('.calendar-title');
        if (!titleElement) return;
        
        if (this.currentView === 'month') {
            titleElement.textContent = this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (this.currentView === 'week') {
            const weekStart = this.getWeekStart(this.currentDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            titleElement.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else if (this.currentView === 'day') {
            titleElement.textContent = this.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        } else if (this.currentView === 'agenda') {
            titleElement.textContent = 'Agenda';
        }
    }

    renderMonthView() {
        const monthGrid = document.querySelector('.month-grid');
        if (!monthGrid) return;
        
        const existingCells = monthGrid.querySelectorAll('.date-cell');
        existingCells.forEach(cell => cell.remove());

        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        for (let i = 0; i < 42; i++) {
            const cellDate = new Date(startDate);
            cellDate.setDate(cellDate.getDate() + i);
            
            const cell = document.createElement('div');
            cell.className = 'date-cell';
            cell.addEventListener('click', () => this.createQuickEvent(cellDate));
            
            if (cellDate.getMonth() !== this.currentDate.getMonth()) {
                cell.classList.add('other-month');
            }
            
            if (this.isToday(cellDate)) {
                cell.classList.add('today');
            }

            const dateNumber = document.createElement('div');
            dateNumber.className = 'date-number';
            dateNumber.textContent = cellDate.getDate();
            cell.appendChild(dateNumber);

            const dayEvents = this.getEventsForDate(cellDate);
            dayEvents.slice(0, 3).forEach(event => {
                if (this.visibleCalendars.has(event.calendar)) {
                    const eventEl = document.createElement('div');
                    eventEl.className = 'event-preview';
                    eventEl.style.backgroundColor = event.color;
                    eventEl.textContent = event.title;
                    eventEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.editEvent(event);
                    });
                    cell.appendChild(eventEl);
                }
            });

            if (dayEvents.length > 3) {
                const moreEl = document.createElement('div');
                moreEl.className = 'event-preview';
                moreEl.style.backgroundColor = '#999';
                moreEl.textContent = `+${dayEvents.length - 3} more`;
                cell.appendChild(moreEl);
            }

            monthGrid.appendChild(cell);
        }
    }

    renderWeekView() {
        const weekBody = document.querySelector('.week-body');
        if (!weekBody) return;
        
        const timeColumn = weekBody.querySelector('.time-column');
        const dayColumns = weekBody.querySelectorAll('.day-column');

        if (timeColumn) {
            timeColumn.innerHTML = '';
            for (let hour = 0; hour < 24; hour++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = this.formatHour(hour);
                timeColumn.appendChild(timeSlot);
            }
        }

        const weekStart = this.getWeekStart(this.currentDate);
        
        dayColumns.forEach((column, dayIndex) => {
            column.innerHTML = '';
            const columnDate = new Date(weekStart);
            columnDate.setDate(columnDate.getDate() + dayIndex);

            for (let hour = 0; hour < 24; hour++) {
                const hourLine = document.createElement('div');
                hourLine.className = 'hour-line';
                hourLine.addEventListener('dragover', (e) => e.preventDefault());
                hourLine.addEventListener('drop', (e) => this.handleHourDrop(e, columnDate, hour));
                hourLine.addEventListener('click', () => {
                    const clickDate = new Date(columnDate);
                    clickDate.setHours(hour, 0, 0, 0);
                    this.createQuickEvent(clickDate);
                });
                column.appendChild(hourLine);
            }

            const dayEvents = this.getEventsForDate(columnDate);
            dayEvents.forEach(event => {
                if (this.visibleCalendars.has(event.calendar)) {
                    const eventEl = this.createEventElement(event);
                    this.positionWeekEvent(eventEl, event);
                    column.appendChild(eventEl);
                }
            });
        });

        this.updateWeekHeaders(weekStart);
    }

    renderDayView() {
        let timeSlotsContainer = document.querySelector('.time-slots');
        let eventsContainer = document.querySelector('.events-column');
        
        const daySchedule = document.querySelector('.day-schedule');
        if (daySchedule && (!timeSlotsContainer || !eventsContainer)) {
            daySchedule.innerHTML = '';
            
            timeSlotsContainer = document.createElement('div');
            timeSlotsContainer.className = 'time-slots';
            timeSlotsContainer.style.cssText = 'width: 80px; display: flex; flex-direction: column;';
            
            eventsContainer = document.createElement('div');
            eventsContainer.className = 'events-column';
            eventsContainer.style.cssText = 'flex: 1; position: relative; display: flex; flex-direction: column;';
            
            daySchedule.appendChild(timeSlotsContainer);
            daySchedule.appendChild(eventsContainer);
        }
        
        if (!timeSlotsContainer || !eventsContainer) return;

        timeSlotsContainer.innerHTML = '';
        eventsContainer.innerHTML = '';

        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.textContent = this.formatHour(hour);
            timeSlot.addEventListener('dragover', (e) => e.preventDefault());
            timeSlot.addEventListener('drop', (e) => this.handleHourDrop(e, this.currentDate, hour));
            timeSlot.addEventListener('click', () => {
                const clickDate = new Date(this.currentDate);
                clickDate.setHours(hour, 0, 0, 0);
                this.createQuickEvent(clickDate);
            });
            timeSlotsContainer.appendChild(timeSlot);

            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            hourLine.addEventListener('click', () => {
                const clickDate = new Date(this.currentDate);
                clickDate.setHours(hour, 0, 0, 0);
                this.createQuickEvent(clickDate);
            });
            eventsContainer.appendChild(hourLine);
        }

        const dayEvents = this.getEventsForDate(this.currentDate);
        dayEvents.forEach(event => {
            if (this.visibleCalendars.has(event.calendar)) {
                const eventEl = this.createEventElement(event);
                this.positionDayEvent(eventEl, event);
                eventsContainer.appendChild(eventEl);
            }
        });
    }

    renderAgendaView() {
        const agendaList = document.querySelector('.agenda-list');
        if (!agendaList) return;
        
        agendaList.innerHTML = '';

        const now = new Date();
        const futureEvents = this.events
            .filter(event => event.start >= now && this.visibleCalendars.has(event.calendar))
            .sort((a, b) => a.start - b.start)
            .slice(0, 20);

        futureEvents.forEach(event => {
            const agendaItem = document.createElement('div');
            agendaItem.className = 'agenda-item';
            agendaItem.style.borderLeftColor = event.color;
            
            const calendarName = this.calendars.find(c => c.id === event.calendar)?.name || '';
            
            agendaItem.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <h4 style="margin: 0; font-size: 16px;">${event.title}</h4>
                    <span style="font-size: 12px; opacity: 0.7;">${calendarName}</span>
                </div>
                <p style="margin: 0 0 8px 0; opacity: 0.8; font-size: 14px;">${event.description}</p>
                <div style="font-size: 12px; opacity: 0.7;">
                    ${this.formatEventDateTime(event)}
                </div>
            `;
            
            agendaItem.addEventListener('click', () => this.editEvent(event));
            agendaList.appendChild(agendaItem);
        });
    }

    createEventElement(event) {
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item';
        eventEl.style.backgroundColor = event.color;
        eventEl.textContent = event.title;
        eventEl.draggable = true;
        
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editEvent(event);
        });
        eventEl.addEventListener('dragstart', (e) => {
            this.draggingEventId = event.id;
            e.dataTransfer.setData('text/plain', event.id);
        });
        
        return eventEl;
    }

    positionWeekEvent(eventEl, event) {
        const startHour = event.start.getHours() + (event.start.getMinutes() / 60);
        const duration = (event.end - event.start) / (1000 * 60 * 60);
        
        eventEl.style.top = `${startHour * 60}px`;
        eventEl.style.height = `${Math.max(duration * 60 - 2, 20)}px`;
    }

    positionDayEvent(eventEl, event) {
        const startHour = event.start.getHours() + (event.start.getMinutes() / 60);
        const duration = (event.end - event.start) / (1000 * 60 * 60);
        
        eventEl.style.top = `${startHour * 60}px`;
        eventEl.style.height = `${Math.max(duration * 60 - 2, 20)}px`;
        eventEl.style.left = '0';
        eventEl.style.right = '0';
    }

    updateWeekHeaders(weekStart) {
        const dayHeaders = document.querySelectorAll('.day-header');
        dayHeaders.forEach((header, index) => {
            if (index === 0) return;
            const day = new Date(weekStart);
            day.setDate(day.getDate() + (index - 1));
            header.textContent = `${day.toLocaleDateString('en-US', { weekday: 'short' })} ${day.getDate()}`;
            if (this.isToday(day)) {
                header.style.backgroundColor = 'rgba(66, 133, 244, 0.3)';
            } else {
                header.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            }
        });
    }

    getWeekStart(date) {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay());
        start.setHours(0, 0, 0, 0);
        return start;
    }

    getEventsForDate(date) {
        return this.events.filter(event => {
            const eventDate = new Date(event.start);
            return eventDate.toDateString() === date.toDateString();
        });
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    formatHour(hour) {
        if (hour === 0) return '12 AM';
        if (hour < 12) return `${hour} AM`;
        if (hour === 12) return '12 PM';
        return `${hour - 12} PM`;
    }

    formatEventDateTime(event) {
        const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
        if (event.allDay) {
            return event.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        return `${event.start.toLocaleDateString('en-US', options)} - ${event.end.toLocaleDateString('en-US', options)}`;
    }

    toggleCalendar(calendarId, visible) {
        if (visible) {
            this.visibleCalendars.add(calendarId);
        } else {
            this.visibleCalendars.delete(calendarId);
        }
        this.renderCalendar();
    }

    openEventPanel(event = null) {
        this.selectedEvent = event;
        const panel = document.querySelector('.side-panel');
        const overlay = document.querySelector('.overlay');
        
        if (!panel || !overlay) return;
        
        if (event) {
            this.populateEventForm(event);
            const deleteBtn = document.querySelector('#delete-event');
            if (deleteBtn) deleteBtn.style.display = 'block';
        } else {
            this.clearEventForm();
            const deleteBtn = document.querySelector('#delete-event');
            if (deleteBtn) deleteBtn.style.display = 'none';
        }
        
        panel.classList.add('open');
        overlay.classList.add('active');
    }

    closeEventPanel() {
        const panel = document.querySelector('.side-panel');
        const overlay = document.querySelector('.overlay');
        
        if (panel) panel.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        this.selectedEvent = null;
    }

    populateEventForm(event) {
        const titleEl = document.querySelector('#event-title');
        const descEl = document.querySelector('#event-description');
        const startEl = document.querySelector('#event-start');
        const endEl = document.querySelector('#event-end');
        const allDayEl = document.querySelector('#event-all-day');
        const calendarEl = document.querySelector('#event-calendar');
        const recurringEl = document.querySelector('#event-recurring');
        
        if (titleEl) titleEl.value = event.title;
        if (descEl) descEl.value = event.description;
        if (startEl) startEl.value = event.start.toISOString().slice(0, 16);
        if (endEl) endEl.value = event.end.toISOString().slice(0, 16);
        if (allDayEl) allDayEl.checked = event.allDay;
        if (calendarEl) calendarEl.value = event.calendar;
        if (recurringEl) recurringEl.value = event.recurring;
    }

    clearEventForm() {
        const form = document.querySelector('.event-form');
        if (form) form.reset();
        
        const now = new Date();
        const end = new Date(now.getTime() + 60 * 60 * 1000);
        const startEl = document.querySelector('#event-start');
        const endEl = document.querySelector('#event-end');
        
        if (startEl) startEl.value = now.toISOString().slice(0, 16);
        if (endEl) endEl.value = end.toISOString().slice(0, 16);
    }

    createQuickEvent(date) {
        const event = {
            id: 'temp',
            title: '',
            description: '',
            start: new Date(date),
            end: new Date(date.getTime() + 60 * 60 * 1000),
            calendar: 'personal',
            color: '#fbbc04',
            recurring: 'none',
            allDay: false
        };
        this.openEventPanel(event);
    }

    editEvent(event) {
        this.openEventPanel(event);
    }

    saveEvent(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const eventData = {
            id: (this.selectedEvent && this.selectedEvent.id !== 'temp') ? this.selectedEvent.id : this.generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            start: new Date(formData.get('start')),
            end: new Date(formData.get('end')),
            allDay: formData.get('allDay') === 'on',
            calendar: formData.get('calendar'),
            recurring: formData.get('recurring'),
            color: this.calendars.find(c => c.id === formData.get('calendar'))?.color || '#4285f4'
        };

        if (this.selectedEvent && this.selectedEvent.id !== 'temp') {
            const index = this.events.findIndex(e => e.id === this.selectedEvent.id);
            this.events[index] = eventData;
        } else {
            this.events.push(eventData);
        }

        this.renderCalendar();
        this.closeEventPanel();
    }

    deleteEvent() {
        if (this.selectedEvent && this.selectedEvent.id !== 'temp') {
            this.events = this.events.filter(e => e.id !== this.selectedEvent.id);
            this.renderCalendar();
            this.closeEventPanel();
        }
    }

    searchEvents(query) {
        if (!query) {
            this.renderCalendar();
            return;
        }

        this.currentView = 'agenda';
        this.switchView('agenda');
        
        const filteredEvents = this.events.filter(event => 
            event.title.toLowerCase().includes(query.toLowerCase()) ||
            event.description.toLowerCase().includes(query.toLowerCase())
        );
        
        this.renderAgendaViewFiltered(filteredEvents);
    }

    renderAgendaViewFiltered(events) {
        const agendaList = document.querySelector('.agenda-list');
        if (!agendaList) return;
        
        agendaList.innerHTML = '';

        events.forEach(event => {
            if (this.visibleCalendars.has(event.calendar)) {
                const agendaItem = document.createElement('div');
                agendaItem.className = 'agenda-item';
                agendaItem.style.borderLeftColor = event.color;
                
                const calendarName = this.calendars.find(c => c.id === event.calendar)?.name || '';
                
                agendaItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <h4 style="margin: 0; font-size: 16px;">${event.title}</h4>
                        <span style="font-size: 12px; opacity: 0.7;">${calendarName}</span>
                    </div>
                    <p style="margin: 0 0 8px 0; opacity: 0.8; font-size: 14px;">${event.description}</p>
                    <div style="font-size: 12px; opacity: 0.7;">
                        ${this.formatEventDateTime(event)}
                    </div>
                `;
                
                agendaItem.addEventListener('click', () => this.editEvent(event));
                agendaList.appendChild(agendaItem);
            }
        });
    }

    toggleAllDay(isAllDay) {
        const startInput = document.querySelector('#event-start');
        const endInput = document.querySelector('#event-end');
        
        if (startInput && endInput) {
            if (isAllDay) {
                startInput.type = 'date';
                endInput.type = 'date';
            } else {
                startInput.type = 'datetime-local';
                endInput.type = 'datetime-local';
            }
        }
    }

    handleHourDrop(e, date, hour) {
        if (!this.draggingEventId) return;
        
        const event = this.events.find(e => e.id === this.draggingEventId);
        if (!event) return;
        
        const newStart = new Date(date);
        newStart.setHours(hour, 0, 0, 0);
        const newEnd = new Date(newStart.getTime() + (event.end - event.start));
        
        event.start = newStart;
        event.end = newEnd;
        
        this.draggingEventId = null;
        this.renderCalendar();
    }

    handleDrop(e) {
        e.preventDefault();
        this.draggingEventId = null;
    }

    generateId() {
        return 'evt_' + Math.random().toString(36).substr(2, 9);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ScheduleManager();
});