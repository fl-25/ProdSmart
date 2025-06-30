document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user on page load
    if (!await auth.checkAuth()) {
        window.location.href = 'login.html';
        return;
    }

    // Update profile and sign out button from auth.js
    const profileLink = document.querySelector('.profile-link');
    if (auth.user && profileLink) {
        profileLink.textContent = auth.user.name || auth.user.email;
    }
    const signoutBtn = document.querySelector('.signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => auth.logout());
    }

    // Get DOM elements
    const reminderForm = document.getElementById('reminder-form');
    const titleInput = document.getElementById('reminder-title');
    const dateInput = document.getElementById('reminder-date');
    const timeInput = document.getElementById('reminder-time');
    const remindersList = document.getElementById('reminders-list');
    const deleteAllContainer = document.getElementById('delete-all-container');
    const deleteAllBtnId = 'delete-all-reminders-btn';

    // Load reminders from localStorage or initialize an empty array
    let reminders = JSON.parse(localStorage.getItem('reminders') || '[]');

    // Function to save reminders to localStorage
    function saveReminders() {
        localStorage.setItem('reminders', JSON.stringify(reminders));
    }

    // Function to schedule a notification non-blockingly
    function scheduleNotification(dateTime, message) {
        const now = new Date();
        const delay = dateTime.getTime() - now.getTime();
        if (delay < 0) return; // safeguard
        setTimeout(() => {
            new Notification('ProdSmart Reminder', {
                body: message,
                icon: '' // Optional: add an icon path here
            });
        }, delay);
    }

    // Function to render the list of reminders
    function renderReminders() {
        if (!remindersList) return;
        remindersList.innerHTML = ''; // Clear the current list

        if (reminders.length === 0) {
            if(deleteAllContainer) deleteAllContainer.innerHTML = '';
            remindersList.innerHTML = '<li>No reminders yet.</li>';
            return;
        }

        // Create and display each reminder item
        reminders.forEach((reminder, index) => {
            const li = document.createElement('li');
            li.className = 'reminder-item';
            // FIXED: Changed 'reminder.Notified' to 'reminder.notified' for case-sensitivity
            const isNotified = reminder.notified === true;
            li.innerHTML = `
                <div class="reminder-details">
                    <span class="reminder-title">${reminder.title}</span>
                    <span class="reminder-time">${reminder.date} at ${reminder.time}</span>
                </div>
                <div class="reminder-actions">
                    <button class="notify-btn" data-index="${index}" ${isNotified ? 'disabled' : ''}>
                        ${isNotified ? 'Activated' : 'Notify'}
                    </button>
                    <button class="delete-btn" data-index="${index}">Delete</button>
                </div>
            `;
            remindersList.appendChild(li);
        });

        // Add the "Delete All" button if it doesn't exist
        if (deleteAllContainer && !document.getElementById(deleteAllBtnId)) {
            const deleteAllBtn = document.createElement('button');
            deleteAllBtn.id = deleteAllBtnId;
            deleteAllBtn.textContent = 'Delete All Reminders';
            deleteAllContainer.appendChild(deleteAllBtn);
            deleteAllBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to delete all reminders?')) {
                    reminders = [];
                    saveReminders();
                    renderReminders();
                }
            });
        }
    }

    // Event listener for the form submission to add a new reminder
    if (reminderForm) {
        reminderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = titleInput.value.trim();
            const date = dateInput.value;
            const time = timeInput.value;
            if (!title || !date || !time) {
                alert('Please fill out all fields for the reminder.');
                return;
            }
            // Add notified: false to new reminders
            reminders.push({ title, date, time, notified: false });
            saveReminders();
            renderReminders();
            // Add notification to dashboard via event
            const newNotification = {
                id: Date.now(),
                title: 'Reminder Set',
                description: `${title} scheduled for ${new Date(date + 'T' + time).toLocaleString()}`,
                source: 'reminder',
                timestamp: new Date().toISOString()
            };
            let notifications = JSON.parse(localStorage.getItem('prodsmart_notifications') || '[]');
            notifications.unshift(newNotification);
            localStorage.setItem('prodsmart_notifications', JSON.stringify(notifications));
            document.dispatchEvent(new CustomEvent('notification-added', { detail: newNotification }));
            reminderForm.reset();
        });
    }

    // Delegated event listener for actions on the reminders list
    if (remindersList) {
        remindersList.addEventListener('click', (e) => {
            const target = e.target;
            const index = parseInt(target.dataset.index, 10);

            if (target.classList.contains('delete-btn')) {
                reminders.splice(index, 1);
                saveReminders();
                renderReminders();
            }

            if (target.classList.contains('notify-btn')) {
                const reminder = reminders[index];
                const scheduledDateTime = new Date(`${reminder.date}T${reminder.time}`);
                if (scheduledDateTime <= new Date()) {
                    alert('Error: Cannot set a notification for a time that has already passed.');
                    return;
                }

                const handleGranted = () => {
                    scheduleNotification(scheduledDateTime, reminder.title);
                    // Mark as notified in the data
                    reminders[index].notified = true;
                    saveReminders();
                    // Update the button state immediately
                    target.textContent = 'Activated';
                    target.disabled = true;
                    // REMOVED: The blocking alert('Notification activated...') is gone now.
                };

                if (Notification.permission === 'granted') {
                    handleGranted();
                } else if (Notification.permission === 'default') {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            handleGranted();
                        } else {
                            alert('Notification permission was denied.');
                        }
                    });
                } else {
                    alert('Notification permission has been denied. Please enable it in your browser settings.');
                }
            }
        });
    }

    // Initial render of reminders when the page loads
    renderReminders();

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

    // Replace all localStorage CRUD for reminders and notifications with HTTP fetch calls to Flask backend
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

    // Replace all localStorage.getItem('reminders') and setItem('reminders') with API calls
    async function loadReminders() {
        try {
            reminders = await apiRequest('/api/reminders');
        } catch (e) {
            reminders = [];
            alert('Failed to load reminders: ' + e.message);
        }
    }
    async function saveReminder(reminder) {
        try {
            const newReminder = await apiRequest('/api/reminders', 'POST', reminder);
            reminders.push(newReminder);
            renderReminders();
        } catch (e) {
            alert('Failed to add reminder: ' + e.message);
        }
    }
    async function updateReminder(reminderId, updates) {
        try {
            await apiRequest(`/api/reminders/${reminderId}`, 'PUT', updates);
            await loadReminders();
            renderReminders();
        } catch (e) {
            alert('Failed to update reminder: ' + e.message);
        }
    }
    async function deleteReminder(reminderId) {
        try {
            await apiRequest(`/api/reminders/${reminderId}`, 'DELETE');
            await loadReminders();
            renderReminders();
        } catch (e) {
            alert('Failed to delete reminder: ' + e.message);
        }
    }
    async function deleteAllReminders() {
        try {
            await apiRequest('/api/reminders', 'DELETE');
            await loadReminders();
            renderReminders();
        } catch (e) {
            alert('Failed to delete all reminders: ' + e.message);
        }
    }

    // Repeat similar for notifications
});
