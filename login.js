document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none'; // Hide error on new attempt

    // Client-side validation
    if (!email || !password) {
        errorMessage.textContent = 'Please enter both email and password.';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const res = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        let data = {};
        try {
            data = await res.json();
        } catch (jsonErr) {
            data = {};
        }
        if (res.ok) {
            window.location.href = 'dashboard.html';
        } else if (data.error === 'USER_NOT_FOUND') {
            alert('This account does not exist. Please sign up.');
            window.location.href = 'signup.html';
        } else if (data.error === 'INVALID_PASSWORD') {
            errorMessage.textContent = 'Invalid email or password';
            errorMessage.style.display = 'block';
        } else if (data.error) {
            errorMessage.textContent = data.error;
            errorMessage.style.display = 'block';
        } else {
            errorMessage.textContent = 'Failed to log in. Please try again.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Login page error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    }
}); 