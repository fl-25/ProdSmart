// auth.js - MODIFIED
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

class Auth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
    }

    async checkAuth() {
        try {
            const res = await apiRequest('http://localhost:5000/api/auth/session');
            this.isAuthenticated = res.authenticated;
            this.user = res.user || null;
            return this.isAuthenticated;
        } catch (e) {
            this.isAuthenticated = false;
            this.user = null;
            return false;
        }
    }

    async login(email, password) {
        try {
            const res = await apiRequest('http://localhost:5000/api/auth/login', 'POST', { email, password });
            this.isAuthenticated = true;
            this.user = res;
            return true;
        } catch (e) {
            if (e.message === 'USER_NOT_FOUND') return 'USER_NOT_FOUND';
            if (e.message === 'INVALID_PASSWORD') return 'INVALID_PASSWORD';
            return false;
        }
    }

    async signup(email, password, name) {
        try {
            const res = await apiRequest('http://localhost:5000/api/auth/signup', 'POST', { email, password, name });
            this.isAuthenticated = true;
            this.user = res;
            return true;
        } catch (e) {
            if (e.message === 'Email already exists') return 'EMAIL_EXISTS';
            return false;
        }
    }

    async logout() {
        try {
            await apiRequest('http://localhost:5000/api/auth/logout', 'POST');
        } catch (e) {}
        this.isAuthenticated = false;
        this.user = null;
        window.location.replace('login.html');
    }

    getAuthHeader() {
        return this.isAuthenticated ? { 'Authorization': `Bearer ${this.user.token}` } : {};
    }
}

// Create global auth instance
const auth = new Auth();
