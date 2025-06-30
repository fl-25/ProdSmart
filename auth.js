// auth.js - MODIFIED
class Auth {
    constructor() {
        this.isAuthenticated = false;
        this.user = null;
        this.token = localStorage.getItem('token');

        // On initialization, check for an active session token
        if (this.token) {
            const currentUserData = localStorage.getItem('currentUser');
            if (currentUserData) {
                this.user = JSON.parse(currentUserData);
                this.isAuthenticated = true;
            }
        }
    }

    // --- NEW: Helper functions to manage the user "database" in localStorage ---
    _getUsers() {
        // Safely get and parse the list of users from localStorage
        const users = localStorage.getItem('prodsmart_users');
        return users ? JSON.parse(users) : [];
    }

    _saveUsers(users) {
        // Save the list of users back to localStorage
        localStorage.setItem('prodsmart_users', JSON.stringify(users));
    }

    // MODIFIED: checkAuth now only checks for an active session
    async checkAuth() {
        if (this.isAuthenticated && this.token) {
            return true;
        }
        return false;
    }

    // MODIFIED: Login now checks against the stored user list
    async login(email, password) {
        const users = this._getUsers();
        const foundUser = users.find(user => user.email === email);

        if (!foundUser) {
            // Case 1: User with this email does not exist
            console.log('Login attempt for non-existent user:', email);
            return 'USER_NOT_FOUND'; 
        }

        if (foundUser.password !== password) {
            // Case 2: User exists, but password is incorrect
            console.log('Incorrect password for user:', email);
            return 'INVALID_PASSWORD';
        }

        // Case 3: Success! Email and password are correct.
        this.token = 'demo-token-' + Date.now();
        this.user = { email: foundUser.email, name: foundUser.name, id: foundUser.id };
        this.isAuthenticated = true;
        
        // Store the active session data
        localStorage.setItem('token', this.token);
        localStorage.setItem('currentUser', JSON.stringify(this.user));
        
        return true;
    }

    // MODIFIED: Signup now adds a user to our list and checks for duplicates
    async signup(email, password, name) {
        const users = this._getUsers();
        
        if (users.some(user => user.email === email)) {
            console.error('Signup failed: Email already in use.');
            return 'EMAIL_EXISTS'; // Return a specific error code
        }
        
        const newUser = {
            id: Date.now().toString(),
            email,
            password, // IMPORTANT: Storing plain text password for demo only!
            name
        };

        users.push(newUser);
        this._saveUsers(users);

        // After signing up, automatically log them in
        return this.login(email, password);
    }
    
    // MODIFIED: Clears session data
    clearLocalAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser'); // Changed from 'userData'
    }

    logout() {
        console.log('Logging out...');
        this.isAuthenticated = false;
        this.user = null;
        this.token = null;
        
        this.clearLocalAuthData();
        
        console.log('Redirecting to login page...');
        window.location.replace('login.html');
    }

    getAuthHeader() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }
}

// Create global auth instance
const auth = new Auth();
