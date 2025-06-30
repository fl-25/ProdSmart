// theme-toggle.js
(function() {
    // Helper: set theme instantly before render
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }
    // On load: apply theme before render
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    }
    // Wait for DOM
    document.addEventListener('DOMContentLoaded', function() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        // Set toggle state
        toggle.checked = document.body.classList.contains('dark-theme');
        // Listen for changes
        toggle.addEventListener('change', function() {
            const newTheme = toggle.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            // Sync across tabs
            window.dispatchEvent(new Event('storage'));
        });
        // Listen for theme changes from other tabs
        window.addEventListener('storage', function(e) {
            if (e.key === 'theme') {
                const theme = localStorage.getItem('theme');
                applyTheme(theme);
                if (toggle.checked !== (theme === 'dark')) {
                    toggle.checked = (theme === 'dark');
                }
            }
        });
    });
})(); 