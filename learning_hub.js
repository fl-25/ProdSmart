// This script contains the logic for the Learning Hub section.

function initializeLearningHub() {
  console.log('Initializing Learning Hub specific scripts...');

  const deleteAllBtnId = 'delete-all-schedules-btn';
  const scheduleList = document.getElementById('schedule-list');
  const addLessonBtn = document.getElementById('add-lesson-btn');
  const deleteAllContainerId = 'delete-all-container';

  // Container for delete all button
  let deleteAllContainer = document.getElementById(deleteAllContainerId);
  if (!deleteAllContainer) {
    deleteAllContainer = document.createElement('div');
    deleteAllContainer.id = deleteAllContainerId;
    if (scheduleList && scheduleList.parentNode) {
      scheduleList.parentNode.appendChild(deleteAllContainer);
    }
  }

  // Load schedules from localStorage or initialize empty array
  let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');

  // Save schedules to localStorage
  function saveSchedules() {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }

  // Render schedules list
  function renderSchedules() {
    if (!scheduleList) return;
    scheduleList.innerHTML = '';

    if (schedules.length === 0) {
      scheduleList.innerHTML = '<li>No schedules yet.</li>';
      deleteAllContainer.innerHTML = '';
      return;
    }

    schedules.forEach((schedule, index) => {
      // Ensure each schedule has a unique id for event handling
      if (!schedule.id) schedule.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const isNotified = schedule.notified === true;
      const li = document.createElement('li');
      li.className = 'schedule-item';
      li.innerHTML = `
        <label style="display:flex;align-items:center;gap:8px;">
          <input type="checkbox" class="complete-checkbox" data-id="${schedule.id}" ${schedule.completed ? 'checked' : ''}>
          <span class="schedule-text">${schedule.lesson} - ${schedule.date} ${schedule.time}</span>
        </label>
        <div class="schedule-actions">
            <button class="notify-btn${isNotified ? ' activated' : ''}" data-id="${schedule.id}" ${isNotified ? 'disabled' : ''}>${isNotified ? 'Activated' : 'Notify Me'}</button>
            <button class="delete-btn" data-index="${index}">Delete</button>
        </div>
      `;
      scheduleList.appendChild(li);
    });

    // Add Delete All button if not present
    if (!document.getElementById(deleteAllBtnId)) {
      const deleteAllBtn = document.createElement('button');
      deleteAllBtn.id = deleteAllBtnId;
      deleteAllBtn.textContent = 'Delete All Schedules';
      // Basic styling for the button; can be moved to CSS
      deleteAllBtn.style.cssText = `
        margin-top: 20px;
        padding: 10px;
        font-weight: 600;
        border-radius: 8px;
        background-color: #c62828;
        color: white;
        border: none;
        cursor: pointer;
        width: 100%;
        transition: background-color 0.2s;
      `;
      deleteAllBtn.onmouseover = () => deleteAllBtn.style.backgroundColor = '#b71c1c';
      deleteAllBtn.onmouseout = () => deleteAllBtn.style.backgroundColor = '#c62828';

      deleteAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all schedules?')) {
          schedules = [];
          saveSchedules();
          renderSchedules();
        }
      });

      deleteAllContainer.appendChild(deleteAllBtn);
    }
  }

  // Schedule notification function WITHOUT a blocking alert
  function scheduleNotification(dateTime, message) {
    const now = new Date();
    const delay = dateTime.getTime() - now.getTime();
    if (delay < 0) return; // safeguard

    setTimeout(() => {
        // Show browser notification, which works even if the browser is in the background
        new Notification('Learning Schedule Reminder', {
            body: message,
            icon: ''
        });
    }, delay);
  }

  // Event delegation for delete, notify, and complete checkboxes
  if (scheduleList) {
    scheduleList.addEventListener('click', (e) => {
      const target = e.target;
      const index = target.dataset.index;

      if (target.classList.contains('delete-btn')) {
        schedules.splice(index, 1);
        saveSchedules();
        renderSchedules();
      }

      if (target.classList.contains('notify-btn')) {
        const id = target.getAttribute('data-id');
        const schedule = schedules.find(s => s.id === id);
        if (!schedule) return;
        const scheduledDateTime = new Date(`${schedule.date}T${schedule.time}`);
        if (scheduledDateTime <= new Date()) {
          alert('Error: Cannot set a notification for a time that has already passed.');
          return;
        }
        const handleGranted = () => {
          scheduleNotification(scheduledDateTime, schedule.lesson);
          schedule.notified = true;
          saveSchedules();
          renderSchedules();
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
    // Checkbox change event
    scheduleList.addEventListener('change', (e) => {
      if (e.target.classList.contains('complete-checkbox')) {
        const id = e.target.getAttribute('data-id');
        const schedule = schedules.find(s => s.id === id);
        if (!schedule) return;
        schedule.completed = e.target.checked;
        saveSchedules();
        renderSchedules();
      }
    });
  }
  

  // Add schedule function
  function addSchedule() {
    const lessonInput = document.getElementById('lesson-name');
    const dateInput = document.getElementById('lesson-date');
    const timeInput = document.getElementById('lesson-time');

    if (!lessonInput || !dateInput || !timeInput) {
      console.error('Input elements not found.');
      return;
    }

    const lesson = lessonInput.value.trim();
    const date = dateInput.value.trim();
    const time = timeInput.value.trim();

    if (lesson === '' || date === '' || time === '') {
      alert('Please enter lesson name, date, and time!');
      return;
    }

    schedules.push({ lesson, date, time, notified: false, completed: false, id: Date.now() + '_' + Math.random().toString(36).substr(2, 9) });
    saveSchedules();
    renderSchedules();
    // Add notification to dashboard via event
    const newNotification = {
      id: Date.now(),
      title: 'Lesson Scheduled',
      description: `${lesson} scheduled for ${new Date(date + 'T' + time).toLocaleString()}`,
      source: 'learning_hub',
      timestamp: new Date().toISOString()
    };
    let notifications = JSON.parse(localStorage.getItem('prodsmart_notifications') || '[]');
    notifications.unshift(newNotification);
    localStorage.setItem('prodsmart_notifications', JSON.stringify(notifications));
    document.dispatchEvent(new CustomEvent('notification-added', { detail: newNotification }));

    lessonInput.value = '';
    dateInput.value = '';
    timeInput.value = '';
  }

  if (addLessonBtn) {
    addLessonBtn.addEventListener('click', addSchedule);
  }

  // Initial render
  renderSchedules();

  // Real-time digital clock
  const clockElement = document.getElementById('digital-clock');
  if (clockElement) {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const hourStr = hours.toString().padStart(2, '0');
      clockElement.textContent = `${hourStr}:${minutes}:${seconds} ${ampm}`;
    };
    if (window.digitalClockInterval) {
      clearInterval(window.digitalClockInterval);
    }
    window.digitalClockInterval = setInterval(updateClock, 1000);
    updateClock();
  }

  // Profile sync from auth.js
  if (typeof auth !== 'undefined' && auth.user) {
    const profileLink = document.querySelector('.profile-link');
    if (profileLink) {
        profileLink.textContent = auth.user.name || auth.user.email;
    }
    const signoutBtn = document.querySelector('.signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => auth.logout());
    }
  }

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
}

// Ensure the script runs after the DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLearningHub);
} else {
    initializeLearningHub();
}

// Replace all localStorage CRUD for schedules and notifications with HTTP fetch calls to Flask backend
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

// Replace all localStorage.getItem('schedules') and setItem('schedules') with API calls
async function loadSchedules() {
    try {
        schedules = await apiRequest('/api/schedules');
    } catch (e) {
        schedules = [];
        alert('Failed to load schedules: ' + e.message);
    }
}

async function saveSchedule(schedule) {
    try {
        const newSchedule = await apiRequest('/api/schedules', 'POST', schedule);
        schedules.push(newSchedule);
        renderSchedules();
    } catch (e) {
        alert('Failed to add schedule: ' + e.message);
    }
}

async function updateSchedule(scheduleId, updates) {
    try {
        await apiRequest(`/api/schedules/${scheduleId}`, 'PUT', updates);
        await loadSchedules();
        renderSchedules();
    } catch (e) {
        alert('Failed to update schedule: ' + e.message);
    }
}

async function deleteSchedule(scheduleId) {
    try {
        await apiRequest(`/api/schedules/${scheduleId}`, 'DELETE');
        await loadSchedules();
        renderSchedules();
    } catch (e) {
        alert('Failed to delete schedule: ' + e.message);
    }
}

async function deleteAllSchedules() {
    try {
        await apiRequest('/api/schedules', 'DELETE');
        await loadSchedules();
        renderSchedules();
    } catch (e) {
        alert('Failed to delete all schedules: ' + e.message);
    }
}
