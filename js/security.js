class SecurityManager {
    static STORAGE_KEY = 'secure_vault_security';
    static SESSION_KEY = 'secure_session';
    static EXPIRY_KEY = 'session_expiry';

    static getAttempts() {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            return data.attempts || 0;
        } catch { return 0; }
    }

    static incrementAttempts() {
        const attempts = this.getAttempts() + 1;
        this.save({ attempts });
        return attempts;
    }

    static resetAttempts() {
        this.save({ attempts: 0, lockout: 0 });
    }

    static getLockout() {
        try {
            const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            return data.lockout || 0;
        } catch { return 0; }
    }

    static lockout() {
        const data = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        data.lockout = Date.now() + 300000;
        this.save(data);
    }

    static grantAccess() {
        const sessionToken = CryptoManager.generateSessionToken();
        const expiry = Date.now() + 3600000;
        sessionStorage.setItem(this.SESSION_KEY, sessionToken);
        sessionStorage.setItem(this.EXPIRY_KEY, expiry.toString());
        this.resetAttempts();
        return sessionToken;
    }

    static hasValidSession() {
        const session = sessionStorage.getItem(this.SESSION_KEY);
        const expiry = parseInt(sessionStorage.getItem(this.EXPIRY_KEY) || '0');
        return session && Date.now() < expiry;
    }

    static save(data) {
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    }
}