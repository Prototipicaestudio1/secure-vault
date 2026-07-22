// ============================================
// PROTECCION DE SESION - Secure Vault v4.0
// Sesiones blindadas con rotacion de tokens
// ============================================
var SessionGuard = {
    config: {
        SESSION_DURATION: 1800000,     // 30 minutos
        IDLE_TIMEOUT: 600000,          // 10 minutos inactividad
        MAX_CONCURRENT_SESSIONS: 3,
        TOKEN_ROTATION_INTERVAL: 300000 // Rotar cada 5 min
    },

    state: {
        sessionId: null,
        lastActivity: Date.now(),
        tokenRotationTimer: null,
        idleTimer: null,
        sessionTimer: null
    },

    // Iniciar proteccion de sesion
    init: function() {
        this.state.sessionId = this._generateSessionId();
        this.state.lastActivity = Date.now();
        this._startIdleMonitor();
        this._startTokenRotation();
        this._startSessionTimer();
        this._setupActivityListeners();
        console.log('🛡️ SessionGuard activo - Sesion: ' + this.state.sessionId.substring(0, 8));
    },

    // Verificar si la sesion es valida
    isValid: function() {
        var session = sessionStorage.getItem('secure_session');
        var expiry = parseInt(sessionStorage.getItem('session_expiry') || '0');
        var now = Date.now();

        // Sesion expirada
        if (!session || now > expiry) {
            this.terminate('Sesion expirada');
            return false;
        }

        // Inactividad
        if (now - this.state.lastActivity > this.config.IDLE_TIMEOUT) {
            this.terminate('Inactividad prolongada');
            return false;
        }

        return true;
    },

    // Renovar sesion
    refresh: function() {
        this.state.lastActivity = Date.now();
        var newExpiry = Date.now() + this.config.SESSION_DURATION;
        sessionStorage.setItem('session_expiry', newExpiry.toString());
        return true;
    },

    // Verificar actividad
    checkActivity: function() {
        var now = Date.now();
        var idle = now - this.state.lastActivity;
        var remaining = this.config.IDLE_TIMEOUT - idle;

        return {
            idle: Math.floor(idle / 1000),
            remaining: Math.floor(remaining / 1000),
            warning: remaining < 120000, // 2 minutos de advertencia
            critical: remaining < 30000   // 30 segundos critico
        };
    },

    // Terminar sesion
    terminate: function(reason) {
        console.log('🔒 Sesion terminada: ' + reason);
        
        // Limpiar timers
        if (this.state.idleTimer) clearInterval(this.state.idleTimer);
        if (this.state.tokenRotationTimer) clearInterval(this.state.tokenRotationTimer);
        if (this.state.sessionTimer) clearInterval(this.state.sessionTimer);

        // Registrar
        if (typeof AuthManager !== 'undefined') {
            AuthManager.logAccess(false, 'Sesion terminada: ' + reason);
        }

        // Limpiar almacenamiento sensible
        sessionStorage.clear();
        
        // Redirigir
        window.location.href = 'index.html';
    },

    // ============= INTERNO =============

    _generateSessionId: function() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var id = '';
        for (var i = 0; i < 48; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    },

    _startIdleMonitor: function() {
        var self = this;
        this.state.idleTimer = setInterval(function() {
            var activity = self.checkActivity();
            if (activity.critical) {
                console.warn('⚠️ Sesion a punto de expirar por inactividad');
            }
            if (!self.isValid()) {
                self.terminate('Timeout de inactividad');
            }
        }, 10000);
    },

    _startTokenRotation: function() {
        var self = this;
        this.state.tokenRotationTimer = setInterval(function() {
            var newToken = CryptoManager.generateSessionToken();
            sessionStorage.setItem('secure_session', newToken);
            self.state.sessionId = self._generateSessionId();
            console.log('🔄 Token de sesion rotado');
        }, this.config.TOKEN_ROTATION_INTERVAL);
    },

    _startSessionTimer: function() {
        var self = this;
        this.state.sessionTimer = setInterval(function() {
            var expiry = parseInt(sessionStorage.getItem('session_expiry') || '0');
            var remaining = expiry - Date.now();
            if (remaining <= 0) {
                self.terminate('Sesion expirada por tiempo');
            }
            // Actualizar contador en UI
            var timerElement = document.getElementById('time-badge');
            if (timerElement) {
                var mins = Math.floor(remaining / 60000);
                var secs = Math.floor((remaining % 60000) / 1000);
                timerElement.textContent = '⏱ ' + mins + ':' + secs.toString().padStart(2, '0');
                if (remaining < 120000) {
                    timerElement.style.color = '#ffa502';
                }
            }
        }, 1000);
    },

    _setupActivityListeners: function() {
        var self = this;
        var events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart', 'touchmove'];
        events.forEach(function(event) {
            document.addEventListener(event, function() {
                self.refresh();
            });
        });
    }
};

console.log('🔐 SessionGuard cargado - Proteccion de sesion activa');
