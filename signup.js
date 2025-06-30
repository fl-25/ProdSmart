document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorMessage = document.getElementById('error-message');

    // Reset error message
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';

    // --- Client-Side Validation ---
    if (!name || !email || !password || !confirmPassword) {
        errorMessage.textContent = 'Please fill in all fields.';
        errorMessage.style.display = 'block';
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errorMessage.textContent = 'Please enter a valid email address.';
        errorMessage.style.display = 'block';
        return;
    }
    if (password.length < 8) {
        errorMessage.textContent = 'Password must be at least 8 characters long.';
        errorMessage.style.display = 'block';
        return;
    }
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasNumber || !hasSpecialChar) {
        errorMessage.textContent = 'Password must include at least one number and one special character.';
        errorMessage.style.display = 'block';
        return;
    }
    if (password !== confirmPassword) {
        errorMessage.textContent = 'Passwords do not match.';
        errorMessage.style.display = 'block';
        return;
    }

    // --- CORS Test: Optional, for debugging ---
    try {
        const corsTest = await fetch('http://localhost:5000/api/cors-test', {
            method: 'GET',
            credentials: 'include',
        });
        if (corsTest.ok) {
            console.log('CORS test passed:', await corsTest.json());
        } else {
            console.warn('CORS test failed:', corsTest.status);
        }
    } catch (err) {
        console.warn('CORS test error:', err);
    }

    // --- Attempt Signup via fetch ---
    try {
        const res = await fetch('http://localhost:5000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, name })
        });
        let data = {};
        try {
            data = await res.json();
        } catch (jsonErr) {
            // If response is not JSON, handle gracefully
            data = {};
        }
        if (res.ok) {
            window.location.href = 'dashboard.html';
        } else if (data.error === 'Email already exists') {
            errorMessage.textContent = 'This email is already registered. Please login or use a different email.';
            errorMessage.style.display = 'block';
        } else if (data.error) {
            errorMessage.textContent = data.error;
            errorMessage.style.display = 'block';
        } else {
            errorMessage.textContent = 'Failed to create account. Please try again.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Signup error:', error);
        errorMessage.textContent = 'An unexpected error occurred during signup. Please try again.';
        errorMessage.style.display = 'block';
    }
}); 