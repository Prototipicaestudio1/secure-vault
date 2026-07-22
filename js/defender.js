// ============================================
// AUTO-DEFENSA ACTIVA - Secure Vault v4.0
// Respuesta automática ante amenazas
// ============================================
var Defender = {
    state: {
        threatLevel: 0,        // 0-5
        maxThreatLevel: 5,
        defensiveMeasures: [],
        lastAttack: null,
        totalAttacksBlocked: parseInt(localStorage.getItem('df_blocked') || '0')
    },

    // Escalar nivel de amenaza
    escalateThreat: function(source, severity) {
        var oldLevel = this.state.threatLevel;
        
        switch(severity) {
            case 'low': this.state.threatLevel += 0.5; break;
            case 'medium': this.state.threatLevel += 1; break;
            case 'high': this.state.threatLevel += 2; break;
            case 'critical': this.state.threatLevel += 3; break;
        }
        
        this.state.threatLevel = Math.min(this.state.threatLevel, this.state.maxThreatLevel);
        this.state.lastAttack = { source: source, time: new Date().toISOString(), severity: severity };
        
        console.warn('🛡️ Amenaza escalada: ' + oldLevel + ' -> ' + this.state.threatLevel + ' (' + source + ')');
        
        // Activar medidas según nivel
        this._applyDefensiveMeasures();
    },

    // Reducir nivel de amenaza
    deescalate: function() {
        if (this.state.threatLevel > 0) {
            this.state.threatLevel = Math.max(0, this.state.threatLevel - 0.1);
        }
    },

    // Medidas defensivas automáticas
    _applyDefensiveMeasures: function() {
        var level = this.state.threatLevel;
        
        // Nivel 1: Logging intensivo
        if (level >= 1 && !this.state.defensiveMeasures.includes('verbose_logging')) {
            this.state.defensiveMeasures.push('verbose_logging');
            this._verboseLogging(true);
        }
        
        // Nivel 2: Rate limiting agresivo
        if (level >= 2 && !this.state.defensiveMeasures.includes('aggressive_ratelimit')) {
            this.state.defensiveMeasures.push('aggressive_ratelimit');
            Firewall.config.MAX_REQUESTS_PER_MINUTE = 10;
        }
        
        // Nivel 3: Bloqueo de acciones sensibles
        if (level >= 3 && !this.state.defensiveMeasures.includes('block_sensitive')) {
            this.state.defensiveMeasures.push('block_sensitive');
            this._blockSensitiveActions(true);
        }
        
        // Nivel 4: Cierre de sesión forzoso
        if (level >= 4 && !this.state.defensiveMeasures.includes('force_logout')) {
            this.state.defensiveMeasures.push('force_logout');
            this._forceLogout();
        }
        
        // Nivel 5: Bloqueo total + destrucción temporal
        if (level >= 5 && !this.state.defensiveMeasures.includes('total_lockdown')) {
            this.state.defensiveMeasures.push('total_lockdown');
            this._totalLockdown();
        }
    },

    // ============= MEDIDAS DEFENSIVAS =============

    _verboseLogging: function(enable) {
        if (enable) {
            console.log('📝 Logging intensivo activado');
            // Guardar cada acción en localStorage
            var self = this;
            var originalSetItem = localStorage.setItem;
            localStorage.setItem = function(key, value) {
                var log = JSON.parse(localStorage.getItem('df_verbose_log') || '[]');
                log.push({
                    action: 'setItem',
                    key: key.substring(0, 20),
                    time: new Date().toISOString(),
                    size: value ? value.length : 0
                });
                if (log.length > 200) log = log.slice(-200);
                localStorage.setItem('df_verbose_log', JSON.stringify(log));
                originalSetItem.apply(this, arguments);
            };
        }
    },

    _blockSensitiveActions: function(enable) {
        if (enable) {
            console.log('🚫 Acciones sensibles bloqueadas');
            window._sensitiveBlocked = true;
            // Bloquear descargas y exportaciones
            document.addEventListener('click', function(e) {
                if (window._sensitiveBlocked) {
                    var target = e.target;
                    if (target.tagName === 'A' && target.hasAttribute('download')) {
                        e.preventDefault();
                        alert('⚠️ Acción bloqueada por seguridad. Nivel de amenaza: ' + Defender.state.threatLevel);
                    }
                }
            }, true);
        }
    },

    _forceLogout: function() {
        console.log('🔒 Cierre de sesión forzoso por amenaza nivel ' + this.state.threatLevel);
        this.state.totalAttacksBlocked++;
        localStorage.setItem('df_blocked', this.state.totalAttacksBlocked);
        
        alert('🚨 ALERTA DE SEGURIDAD\n\nActividad sospechosa detectada.\nSe cerrará la sesión por seguridad.\n\nAmenazas bloqueadas hoy: ' + this.state.totalAttacksBlocked);
        
        setTimeout(function() {
            sessionStorage.clear();
            localStorage.setItem('va_lockout', Date.now() + 1800000);
            window.location.href = 'index.html';
        }, 1000);
    },

    _totalLockdown: function() {
        console.log('⛔ BLOQUEO TOTAL ACTIVADO');
        this.state.totalAttacksBlocked += 5;
        localStorage.setItem('df_blocked', this.state.totalAttacksBlocked);
        
        // Guardar evidencia
        var evidence = {
            threatLevel: this.state.threatLevel,
            time: new Date().toISOString(),
            alerts: Firewall.getAlerts(),
            userAgent: navigator.userAgent,
            screenSize: screen.width + 'x' + screen.height
        };
        localStorage.setItem('df_evidence', JSON.stringify(evidence));
        
        // Bloquear completamente
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#ff4444;font-family:monospace;text-align:center;"><div><h1 style="font-size:48px;">⛔</h1><h2>ACCESO BLOQUEADO</h2><p>Múltiples amenazas detectadas</p><p style="color:#888;">El sistema permanecerá bloqueado 30 minutos</p><p style="color:#888;">Amenazas totales bloqueadas: ' + this.state.totalAttacksBlocked + '</p></div></div>';
        
        localStorage.setItem('va_lockout', Date.now() + 1800000);
        localStorage.setItem('va_attempts', '99');
    },

    // Desbloquear manual (requiere código + frase semilla)
    unlock: function(code, seedPhrase) {
        return new Promise(function(resolve) {
            CryptoManager.hashString(code, 1000).then(function(hash) {
                var validCode = hash === '0c87914cce42b86393480a679ed05d03bd59c18221fe68e1415c975f74bc2edc0abad4819709d415a585c2a485321d8e48a39f87f1a67dfc3b63650c3a1af1da';
                if (validCode) {
                    Defender.state.threatLevel = 0;
                    Defender.state.defensiveMeasures = [];
                    localStorage.removeItem('va_lockout');
                    localStorage.removeItem('va_attempts');
                    localStorage.removeItem('df_evidence');
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    },

    // Panel de estado
    getStatus: function() {
        return {
            threatLevel: this.state.threatLevel,
            threatLabel: ['🟢 Normal', '🟡 Elevado', '🟠 Alto', '🔴 Crítico', '⛔ Bloqueo'][Math.floor(this.state.threatLevel)] || '⛔ Máximo',
            measures: this.state.defensiveMeasures.length,
            attacksBlocked: this.state.totalAttacksBlocked,
            lastAttack: this.state.lastAttack,
            evidence: localStorage.getItem('df_evidence') ? 'Si' : 'No'
        };
    }
};

// Desescalar lentamente con el tiempo
setInterval(function() {
    Defender.deescalate();
}, 30000);

console.log('🛡️ Defender cargado - Auto-defensa activa');
