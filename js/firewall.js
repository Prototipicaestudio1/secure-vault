// ============================================
// FIREWALL COMPORTAMENTAL - Secure Vault v4.0
// Honeypots, deteccion de ataques y respuesta
// ============================================
var Firewall = {
    // Configuracion
    config: {
        MAX_REQUESTS_PER_MINUTE: 30,
        SUSPICIOUS_PATTERNS: ['script', 'select', 'union', 'drop', 'exec', '<>', '../', 'OR 1=1'],
        HONEYPOT_ENABLED: true,
        AUTO_BLOCK: true
    },
    
    // Estado
    state: {
        requestCount: 0,
        lastReset: Date.now(),
        blockedIPs: JSON.parse(localStorage.getItem('fw_blocked') || '[]'),
        alerts: [],
        honeypotsTriggered: 0
    },
    
    // Inicializar firewall
    init: function() {
        this._resetCounter();
        this._setupHoneypots();
        this._monitorDOM();
        console.log('🛡️ Firewall activo - ' + this.state.blockedIPs.length + ' IPs bloqueadas');
    },
    
    // Verificar cada request
    checkRequest: function(input) {
        this.state.requestCount++;
        
        // Rate limiting
        if (this.state.requestCount > this.config.MAX_REQUESTS_PER_MINUTE) {
            this._triggerAlert('Rate limit excedido', 'critical');
            if (this.config.AUTO_BLOCK) this._blockCurrentSession();
            return false;
        }
        
        // Detectar patrones SQL injection
        if (this._detectSQLi(input)) {
            this._triggerAlert('Intento de SQL Injection detectado', 'critical');
            this._deployHoneypot();
            return false;
        }
        
        // Detectar XSS
        if (this._detectXSS(input)) {
            this._triggerAlert('Intento de XSS detectado', 'critical');
            this._deployHoneypot();
            return false;
        }
        
        // Detectar path traversal
        if (this._detectPathTraversal(input)) {
            this._triggerAlert('Path traversal detectado', 'high');
            return false;
        }
        
        return true;
    },
    
    // Verificar token
    validateToken: function(token) {
        // Formato esperado: VAULT-XXXX-XXXX-XXXX
        var pattern = /^VAULT-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/;
        if (!pattern.test(token)) {
            this._triggerAlert('Token con formato sospechoso: ' + token.substring(0, 20), 'medium');
            return false;
        }
        return true;
    },
    
    // Verificar archivo
    validateFile: function(file) {
        // Tamaño maximo
        if (file.size > 26214400) {
            this._triggerAlert('Archivo demasiado grande: ' + file.name, 'medium');
            return false;
        }
        
        // Extensiones peligrosas
        var dangerous = ['.exe', '.bat', '.sh', '.php', '.js', '.vbs', '.ps1'];
        var name = file.name.toLowerCase();
        for (var i = 0; i < dangerous.length; i++) {
            if (name.endsWith(dangerous[i])) {
                this._triggerAlert('Extension peligrosa bloqueada: ' + file.name, 'high');
                return false;
            }
        }
        
        // MIME type sospechoso
        if (file.type === 'application/x-msdownload' || file.type === 'application/x-sh') {
            this._triggerAlert('Tipo de archivo ejecutable bloqueado', 'high');
            return false;
        }
        
        return true;
    },
    
    // Obtener alertas
    getAlerts: function() {
        return this.state.alerts.slice(-20);
    },
    
    // Estadisticas
    getStats: function() {
        return {
            requests: this.state.requestCount,
            blocked: this.state.blockedIPs.length,
            honeypots: this.state.honeypotsTriggered,
            alerts: this.state.alerts.length,
            status: this.state.blockedIPs.length > 0 ? '🟡 Amenazas detectadas' : '🟢 Seguro'
        };
    },
    
    // Limpiar alertas
    clearAlerts: function() {
        this.state.alerts = [];
    },
    
    // ============= INTERNO =============
    
    _resetCounter: function() {
        var self = this;
        setInterval(function() {
            if (Date.now() - self.state.lastReset > 60000) {
                self.state.requestCount = 0;
                self.state.lastReset = Date.now();
            }
        }, 10000);
    },
    
    _setupHoneypots: function() {
        if (!this.config.HONEYPOT_ENABLED) return;
        
        // Honeypot invisible en el DOM
        var honeypot = document.createElement('div');
        honeypot.id = 'admin-panel';
        honeypot.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        honeypot.innerHTML = '<form id="fake-login"><input type="text" name="user"><input type="password" name="pass"></form>';
        document.body.appendChild(honeypot);
        
        // Monitorear interaccion con el honeypot
        var self = this;
        document.getElementById('fake-login').addEventListener('submit', function(e) {
            e.preventDefault();
            self.state.honeypotsTriggered++;
            self._triggerAlert('🍯 Honeypot activado - Bot o atacante detectado', 'critical');
            self._blockCurrentSession();
        });
    },
    
    _monitorDOM: function() {
        var self = this;
        // Detectar modificaciones sospechosas del DOM
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                            var src = node.src || node.textContent || '';
                            if (!src.includes('js/') && !src.includes('cdn')) {
                                self._triggerAlert('Script externo inyectado detectado', 'critical');
                            }
                        }
                    });
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },
    
    _detectSQLi: function(input) {
        if (typeof input !== 'string') return false;
        var lower = input.toLowerCase();
        var patterns = ['select ', 'union ', 'drop ', 'insert ', 'delete ', 'update ', 'or 1=1', "' or "];
        return patterns.some(function(p) { return lower.includes(p); });
    },
    
    _detectXSS: function(input) {
        if (typeof input !== 'string') return false;
        var patterns = ['<script', 'javascript:', 'onerror=', 'onload=', '<img', '<svg', 'alert('];
        return patterns.some(function(p) { return input.toLowerCase().includes(p); });
    },
    
    _detectPathTraversal: function(input) {
        if (typeof input !== 'string') return false;
        return input.includes('../') || input.includes('..\\');
    },
    
    _triggerAlert: function(message, level) {
        this.state.alerts.unshift({
            timestamp: new Date().toISOString(),
            message: message,
            level: level
        });
        
        // Guardar en logs
        if (typeof AuthManager !== 'undefined') {
            AuthManager.logAccess(false, 'FIREWALL: ' + message);
        }
        
        console.warn('🚨 FIREWALL [' + level + ']: ' + message);
    },
    
    _blockCurrentSession: function() {
        var fp = typeof AuthManager !== 'undefined' ? 
            AuthManager.getDeviceFingerprint() : 'unknown';
        
        if (this.state.blockedIPs.indexOf(fp) === -1) {
            this.state.blockedIPs.push(fp);
            localStorage.setItem('fw_blocked', JSON.stringify(this.state.blockedIPs));
        }
        
        // Cerrar sesion
        sessionStorage.clear();
        localStorage.setItem('va_lockout', Date.now() + 3600000);
        localStorage.setItem('va_attempts', '99');
    },
    
    _deployHoneypot: function() {
        // Crear datos falsos para confundir al atacante
        var fakeData = {
            tokens: ['VAULT-FAKE-XXXX-XXXX', 'VAULT-DUMMY-YYYY-ZZZZ'],
            usuarios: ['admin', 'root'],
            mensaje: 'Acceso denegado. IP registrada.'
        };
        localStorage.setItem('_fake_data', JSON.stringify(fakeData));
    }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    Firewall.init();
});

console.log('🔥 Firewall cargado - Proteccion comportamental activa');
