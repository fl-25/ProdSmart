document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user on page load
    if (!await auth.checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // ====== DOM ELEMENTS (declare all at the top) ======
    // Sidebar/Profile
    const profileLink = document.querySelector('.profile-link');
    const signoutBtn = document.querySelector('.signout-btn');
    // Calendar
    const calendarDates = document.getElementById('calendar-dates');
    const monthYear = document.getElementById('month-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    // Calendar Modal
    const calendarModalOverlay = document.getElementById('calendar-modal-overlay');
    const calendarModalClose = document.getElementById('calendar-modal-close');
    const calendarModalTitle = document.getElementById('calendar-modal-title');
    const calendarModalDate = document.getElementById('calendar-modal-date');
    const calendarModalList = document.getElementById('calendar-modal-list');
    const calendarModalEmpty = document.getElementById('calendar-modal-empty');
    // Tasks
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const tasksList = document.getElementById('tasks-list');
    const taskCountSpan = document.getElementById('task-count');
    const deleteAllTasksBtn = document.getElementById('delete-all-tasks-btn');
    // Notifications
    const notificationsList = document.getElementById('notifications-list');
    // ====== Hamburger Menu for Mobile ======
    const hamburgerBtn = document.getElementById('hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    let sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (!sidebarOverlay) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        sidebarOverlay.style.display = 'none';
        document.body.appendChild(sidebarOverlay);
    }

    // ====== USER PROFILE ======
    if (auth.user && profileLink) {
        profileLink.textContent = auth.user.name || auth.user.email;
    }
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => auth.logout());
    }

    // ====== Dynamic Calendar ======
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    // Helper: get YYYY-MM-DD in local time
    function toLocalYMD(date) {
        if (!(date instanceof Date)) date = new Date(date);
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getTasksRemindersSchedulesForDate(dateObj) {
        // dateObj: JS Date object (local time)
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const reminders = JSON.parse(localStorage.getItem('reminders') || '[]');
        const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
        const dateStr = toLocalYMD(dateObj); // local YMD
        const dayTasks = tasks.filter(task => {
            if (!task.date) return false;
            return toLocalYMD(task.date) === dateStr;
        });
        const dayReminders = reminders.filter(reminder => {
            let reminderDateStr = '';
            if (reminder.dateTime) {
                reminderDateStr = toLocalYMD(reminder.dateTime);
            } else if (reminder.date && reminder.time) {
                reminderDateStr = reminder.date; // already YYYY-MM-DD
            }
            return reminderDateStr === dateStr;
        });
        const daySchedules = schedules.filter(schedule => {
            if (!schedule.date) return false;
            return schedule.date === dateStr;
        });
        return { dayTasks, dayReminders, daySchedules };
    }

    function renderCalendar(month, year) {
        if (!monthYear || !calendarDates) return;
        monthYear.textContent = `${months[month]} ${year}`;
        calendarDates.innerHTML = '';
        let firstDay = new Date(year, month, 1).getDay();
        firstDay = (firstDay === 0) ? 6 : firstDay - 1; // Monday-first
        let daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            calendarDates.innerHTML += `<div class="calendar-day empty"></div>`;
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dateObj = new Date(year, month, day);
            const { dayTasks, dayReminders, daySchedules } = getTasksRemindersSchedulesForDate(dateObj);
            const hasItems = dayTasks.length > 0 || dayReminders.length > 0 || daySchedules.length > 0;
            calendarDates.innerHTML += `<div class="calendar-day${isToday ? ' today' : ''}${hasItems ? ' has-items' : ''}" data-date="${dateObj.toISOString()}">${day}</div>`;
        }

        // Add click listeners to each day
        Array.from(calendarDates.querySelectorAll('.calendar-day:not(.empty)')).forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                const dateIso = dayEl.getAttribute('data-date');
                openDateModal(dateIso);
            });
        });
    }

    function openDateModal(dateIso) {
        const dateObj = new Date(dateIso);
        const { dayTasks, dayReminders, daySchedules } = getTasksRemindersSchedulesForDate(dateObj);
        calendarModalDate.textContent = dateObj.toLocaleDateString();
        calendarModalList.innerHTML = '';
        let hasAny = false;
        if (dayTasks.length > 0) {
            dayTasks.forEach(task => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="modal-task">Task:</span> ${task.text}`;
                calendarModalList.appendChild(li);
            });
            hasAny = true;
        }
        if (dayReminders.length > 0) {
            dayReminders.forEach(reminder => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="modal-reminder">Reminder:</span> ${reminder.title || reminder.text || '(No title)'}${reminder.dateTime ? ' at ' + new Date(reminder.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (reminder.time ? ' at ' + reminder.time : '')}`;
                calendarModalList.appendChild(li);
            });
            hasAny = true;
        }
        if (daySchedules.length > 0) {
            daySchedules.forEach(schedule => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="modal-schedule">Lesson:</span> ${schedule.lesson}${schedule.time ? ' at ' + schedule.time : ''}`;
                calendarModalList.appendChild(li);
            });
            hasAny = true;
        }
        calendarModalEmpty.style.display = hasAny ? 'none' : '';
        calendarModalList.style.display = hasAny ? '' : 'none';
        if (!hasAny) {
            calendarModalEmpty.style.display = '';
        }
        calendarModalOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        calendarModalOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (calendarModalClose) {
        calendarModalClose.addEventListener('click', closeModal);
    }
    if (calendarModalOverlay) {
        calendarModalOverlay.addEventListener('click', (e) => {
            if (e.target === calendarModalOverlay) closeModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && calendarModalOverlay.style.display !== 'none') closeModal();
    });

    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentMonth, currentYear);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentMonth, currentYear);
    });

    // Call renderCalendar on load and after any change to tasks/reminders
    function syncCalendar() {
        renderCalendar(currentMonth, currentYear);
    }

    // Patch task/reminder changes to sync calendar
    function patchTaskSync() {
        // Patch addTaskBtn
        addTaskBtn.addEventListener('click', () => {
            setTimeout(syncCalendar, 0);
        });
        // Patch delete all
        deleteAllTasksBtn.addEventListener('click', () => {
            setTimeout(syncCalendar, 0);
        });
        // Patch task checkbox and delete
        tasksList.addEventListener('change', (e) => {
            setTimeout(syncCalendar, 0);
        });
        tasksList.addEventListener('click', (e) => {
            setTimeout(syncCalendar, 0);
        });
        // Listen for storage events (other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'tasks' || e.key === 'reminders') syncCalendar();
        });
    }
    patchTaskSync();

    // Listen for reminders changes (if reminders are updated elsewhere)
    window.addEventListener('remindersUpdated', syncCalendar);

    renderCalendar(currentMonth, currentYear);

    // ====== My Tasks ======
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');

    // Add Enter key support for adding a task
    if (newTaskInput && addTaskBtn) {
        newTaskInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTaskBtn.click();
            }
        });
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function updateTaskCount() {
        if (taskCountSpan) {
            taskCountSpan.textContent = tasks.length;
        }
        if (deleteAllTasksBtn) {
            deleteAllTasksBtn.disabled = tasks.length === 0;
        }
    }

    function renderTasks() {
        if (!tasksList) return;
        tasksList.innerHTML = '';
        if (tasks.length === 0) {
            tasksList.innerHTML = '<li style="text-align: center; color: #888; font-style: italic;">No tasks yet!</li>';
        }
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = task.completed ? 'task-completed' : '';
            li.innerHTML = `
                <label class="task-label">
                    <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                    ${task.text}
                    ${task.date ? `<span class="task-date">(${new Date(task.date).toLocaleDateString()})</span>` : ''}
                </label>
                <div class="task-actions">
                    <button class="delete-task-btn" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            tasksList.appendChild(li);
        });
        updateTaskCount();
    }

    addTaskBtn.addEventListener('click', () => {
        const text = newTaskInput.value.trim();
        if (text) {
            tasks.unshift({ text, completed: false, date: new Date().toISOString() });
            saveTasks();
            renderTasks();
            newTaskInput.value = '';
        }
    });

    tasksList.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const index = parseInt(e.target.dataset.index);
            tasks[index].completed = e.target.checked;
            saveTasks();
            renderTasks();
        }
    });

    tasksList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-task-btn') || e.target.closest('.delete-task-btn')) {
            const index = parseInt(e.target.closest('.delete-task-btn').dataset.index);
            tasks.splice(index, 1);
            saveTasks();
            renderTasks();
        }
    });

    deleteAllTasksBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all tasks?')) {
            tasks = [];
            saveTasks();
            renderTasks();
        }
    });

    renderTasks();

    // ====== Notifications System ======
    function saveNotifications(notifications) {
        localStorage.setItem('prodsmart_notifications', JSON.stringify(notifications));
    }

    function loadNotifications() {
        return JSON.parse(localStorage.getItem('prodsmart_notifications') || '[]');
    }

    window.addNotification = function(title, description, source) {
        const notifications = loadNotifications();
        const newNotification = {
            id: Date.now(),
            title: title,
            description: description,
            source: source,
            timestamp: new Date().toISOString()
        };
        notifications.unshift(newNotification);
        saveNotifications(notifications);
        renderNotifications();
    };

    function renderNotifications() {
        if (!notificationsList) return;
        const notifications = loadNotifications();
        notificationsList.innerHTML = '';
        const removeAllBtn = document.getElementById('remove-all-notifications-btn');
        if (notifications.length === 0) {
            notificationsList.innerHTML = `<div class="notifications-empty">No notifications yet.</div>`;
            if (removeAllBtn) removeAllBtn.style.display = 'none';
            return;
        }
        notifications.forEach(notification => {
            const notificationDiv = document.createElement('div');
            notificationDiv.className = 'notification-item';
            notificationDiv.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <div style="flex:1;min-width:0;">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-desc">${notification.description}</div>
                    <div class="notification-time">${new Date(notification.timestamp).toLocaleString()}</div>
                  </div>
                  <button class="notification-delete-btn" title="Delete notification" data-id="${notification.id}">&times;</button>
                </div>
            `;
            notificationsList.appendChild(notificationDiv);
        });
        if (removeAllBtn) removeAllBtn.style.display = 'block';
    }

    // Event delegation for notification delete (X)
    notificationsList.addEventListener('click', function(e) {
        if (e.target.classList.contains('notification-delete-btn')) {
            const id = e.target.getAttribute('data-id');
            let notifications = loadNotifications();
            notifications = notifications.filter(n => String(n.id) !== String(id));
            saveNotifications(notifications);
            renderNotifications();
        }
    });

    // Remove All button logic
    const removeAllBtn = document.getElementById('remove-all-notifications-btn');
    if (removeAllBtn) {
        removeAllBtn.addEventListener('click', function() {
            saveNotifications([]);
            renderNotifications();
        });
    }

    renderNotifications();

    // Listen for notification-added events from other modules
    document.addEventListener('notification-added', (event) => {
        // Optionally log: console.log('New notification received!', event.detail);
        renderNotifications();
    });

    // ====== Hamburger Menu for Mobile ======
    function openSidebar() {
        sidebar.classList.add('sidebar-open');
        sidebarOverlay.style.display = 'block';
    }
    function closeSidebar() {
        sidebar.classList.remove('sidebar-open');
        sidebarOverlay.style.display = 'none';
    }
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function() {
            if (sidebar.classList.contains('sidebar-open')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }
    sidebarOverlay.addEventListener('click', closeSidebar);
    // Optional: close sidebar on resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 900) closeSidebar();
    });

    // ====== Dynamic Progress Charts ======
    let learningHubChartInstance = null;
    let tasksChartInstance = null;
    function renderProgressCharts() {
        // Learning Hub Progress
        const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
        const learningHubDiv = document.getElementById('learning-hub-progress');
        const learningHubCanvas = document.getElementById('learningHubChart');
        if (!schedules.length) {
            if (learningHubDiv) learningHubDiv.innerHTML = '<h4>Learning Hub Progress</h4><div class="progress-empty">No Learning Hub data yet.</div>';
        } else {
            const completed = schedules.filter(s => s.completed).length;
            const total = schedules.length;
            if (learningHubCanvas) {
                if (learningHubChartInstance) learningHubChartInstance.destroy();
                learningHubChartInstance = new Chart(learningHubCanvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Completed', 'Incomplete'],
                        datasets: [{
                            label: 'Lessons',
                            data: [completed, total - completed],
                            backgroundColor: [
                                'rgba(56, 142, 60, 0.7)',
                                'rgba(229, 57, 53, 0.7)'
                            ],
                            borderColor: [
                                'rgba(56, 142, 60, 1)',
                                'rgba(229, 57, 53, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, precision: 0 } }
                    }
                });
            }
        }
        // Tasks Progress
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const tasksDiv = document.getElementById('tasks-progress');
        const tasksCanvas = document.getElementById('tasksChart');
        if (!tasks.length) {
            if (tasksDiv) tasksDiv.innerHTML = '<h4>Tasks Progress</h4><div class="progress-empty">No tasks to track.</div>';
        } else {
            const completed = tasks.filter(t => t.completed).length;
            const total = tasks.length;
            if (tasksCanvas) {
                if (tasksChartInstance) tasksChartInstance.destroy();
                tasksChartInstance = new Chart(tasksCanvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Completed', 'Incomplete'],
                        datasets: [{
                            label: 'Tasks',
                            data: [completed, total - completed],
                            backgroundColor: [
                                'rgba(56, 142, 60, 0.7)',
                                'rgba(229, 57, 53, 0.7)'
                            ],
                            borderColor: [
                                'rgba(56, 142, 60, 1)',
                                'rgba(229, 57, 53, 1)'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, precision: 0 } }
                    }
                });
            }
        }
    }

    // ====== Dynamic Categories Overview ======
    function displayCategory(categoryName) {
        const container = document.getElementById('category-display-list');
        let items = [];
        let html = '';
        if (categoryName === 'tasks') {
            items = JSON.parse(localStorage.getItem('tasks') || '[]');
            if (!items.length) {
                html = '<div class="category-empty">No tasks found.</div>';
            } else {
                html = '<ul class="category-list">' + items.map(task =>
                    `<li><span class="category-icon"><i class="fas fa-tasks"></i></span>${task.text} <span class="${task.completed ? 'category-completed' : 'category-incomplete'}">${task.completed ? 'Completed' : 'Incomplete'}</span></li>`
                ).join('') + '</ul>';
            }
        } else if (categoryName === 'reminders') {
            items = JSON.parse(localStorage.getItem('reminders') || '[]');
            if (!items.length) {
                html = '<div class="category-empty">No reminders found.</div>';
            } else {
                html = '<ul class="category-list">' + items.map(reminder =>
                    `<li><span class="category-icon"><i class="fas fa-bell"></i></span>${reminder.title || reminder.text || '(No title)'} <span class="category-incomplete">Scheduled</span></li>`
                ).join('') + '</ul>';
            }
        } else if (categoryName === 'schedules') {
            items = JSON.parse(localStorage.getItem('schedules') || '[]');
            if (!items.length) {
                html = '<div class="category-empty">No learning schedules found.</div>';
            } else {
                html = '<ul class="category-list">' + items.map(schedule =>
                    `<li><span class="category-icon"><i class="fas fa-book"></i></span>${schedule.lesson} <span class="${schedule.completed ? 'category-completed' : 'category-incomplete'}">${schedule.completed ? 'Completed' : 'Incomplete'}</span></li>`
                ).join('') + '</ul>';
            }
        }
        if (container) container.innerHTML = html;
    }

    // Category filter button logic
    const categoryFilters = document.getElementById('category-filters');
    if (categoryFilters) {
        categoryFilters.addEventListener('click', function(e) {
            if (e.target.classList.contains('filter-btn')) {
                categoryFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                const cat = e.target.getAttribute('data-category');
                displayCategory(cat);
            }
        });
    }

    // Sync charts and categories on data change
    function syncDashboardVisuals() {
        renderProgressCharts();
        displayCategory(document.querySelector('.filter-btn.active')?.getAttribute('data-category') || 'tasks');
    }

    // Call on page load
    renderProgressCharts();
    displayCategory('tasks');

    // Also call after tasks or schedules change
    window.addEventListener('storage', syncDashboardVisuals);
    document.addEventListener('notification-added', syncDashboardVisuals);

    // Replace all localStorage CRUD for tasks, reminders, schedules, and notifications with HTTP fetch calls to Flask backend
    // Add helper for API calls
    async function apiRequest(url, method = 'GET', body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        if (!res.ok) throw new Error((await res.json()).error || 'API error');
        return await res.json();
    }

    // Replace all localStorage.getItem('tasks') and setItem('tasks') with API calls
    async function loadTasks() {
        try {
            tasks = await apiRequest('/api/tasks');
        } catch (e) {
            tasks = [];
            alert('Failed to load tasks: ' + e.message);
        }
    }
    async function saveTask(task) {
        try {
            const newTask = await apiRequest('/api/tasks', 'POST', task);
            tasks.unshift(newTask);
            renderTasks();
        } catch (e) {
            alert('Failed to add task: ' + e.message);
        }
    }
    async function updateTask(taskId, updates) {
        try {
            await apiRequest(`/api/tasks/${taskId}`, 'PUT', updates);
            await loadTasks();
            renderTasks();
        } catch (e) {
            alert('Failed to update task: ' + e.message);
        }
    }
    async function deleteTask(taskId) {
        try {
            await apiRequest(`/api/tasks/${taskId}`, 'DELETE');
            await loadTasks();
            renderTasks();
        } catch (e) {
            alert('Failed to delete task: ' + e.message);
        }
    }
    async function deleteAllTasks() {
        try {
            await apiRequest('/api/tasks', 'DELETE');
            await loadTasks();
            renderTasks();
        } catch (e) {
            alert('Failed to delete all tasks: ' + e.message);
        }
    }

    // Repeat similar for reminders, schedules, notifications
});
