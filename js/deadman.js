// ============================================
// INTERRUPTOR DE HOMBRE MUERTO - Secure Vault v4.0
// Auto-destrucción si no hay respuesta en X tiempo
// ============================================
var DeadManSwitch = {
    config: {
        CHECK_INTERVAL: 3600000,    // 1 hora
        GRACE_PERIOD: 300000,       // 5 minutos de gracia
        EMERGENCY_CODE: '999999',   // Codigo de emergencia
        MAX_MISSED_CHECKS: 3
    },

    state: {
        lastCheckin: Date.now(),
        missedChecks: 0,
        armed: false,
        emergencyContacts: JSON.parse(localStorage.getItem('dm_contacts') || '[]'),
        destructionKey: localStorage.getItem('dm_key') || null
    },

    // Armar el interruptor
    arm: function(emergencyCode) {
        this.state.armed = true;
        if (emergencyCode) {
            this.config.EMERGENCY_CODE = emergencyCode;
        }
        this.state.lastCheckin = Date.now();
        this.state.destructionKey = this._generateDestructionKey();
        localStorage.setItem('dm_key', this.state.destructionKey);
        
        this._startMonitoring();
        console.log('💀 DeadMan Switch ARMADO - Check-in cada ' + (this.config.CHECK_INTERVAL/3600000) + 'h');
        return true;
    },

    // Desarmar
    disarm: function(code) {
        if (code === this.config.EMERGENCY_CODE) {
            this.state.armed = false;
            this.state.missedChecks = 0;
            localStorage.removeItem('dm_key');
            console.log('✅ DeadMan Switch DESARMADO');
            return true;
        }
        return false;
    },

    // Check-in manual
    checkin: function() {
        this.state.lastCheckin = Date.now();
        this.state.missedChecks = 0;
        console.log('✅ Check-in registrado - ' + new Date().toLocaleString());
        return true;
    },

    // Verificar estado
    getStatus: function() {
        var now = Date.now();
        var sinceLastCheck = now - this.state.lastCheckin;
        var hoursSinceCheck = Math.floor(sinceLastCheck / 3600000);
        
        return {
            armed: this.state.armed,
            lastCheckin: new Date(this.state.lastCheckin).toLocaleString(),
            hoursSinceCheck: hoursSinceCheck,
            missedChecks: this.state.missedChecks,
            status: this.state.armed ? 
                (this.state.missedChecks > 0 ? '⚠️ ATRASADO' : '🟢 Armado') : 
                '⚪ Desarmado'
        };
    },

    // Agregar contacto de emergencia
    addEmergencyContact: function(name, method) {
        this.state.emergencyContacts.push({
            name: name,
            method: method,
            added: new Date().toISOString()
        });
        localStorage.setItem('dm_contacts', JSON.stringify(this.state.emergencyContacts));
    },

    // ============= INTERNO =============

    _startMonitoring: function() {
        var self = this;
        
        setInterval(function() {
            if (!self.state.armed) return;
            
            var now = Date.now();
            var sinceLastCheck = now - self.state.lastCheckin;
            
            if (sinceLastCheck > self.config.CHECK_INTERVAL) {
                self.state.missedChecks++;
                console.warn('⚠️ Check-in perdido #' + self.state.missedChecks);
                
                if (self.state.missedChecks >= self.config.MAX_MISSED_CHECKS) {
                    self._triggerDestruction();
                }
            }
        }, 60000); // Revisar cada minuto
    },

    _triggerDestruction: function() {
        console.error('💀 DEADMAN SWITCH ACTIVADO - Iniciando protocolo de destrucción');
        
        // Notificar contactos de emergencia
        this._notifyEmergencyContacts();
        
        // Encriptar todo con clave de destrucción
        TotalEncryptor.encryptAllStorage(this.state.destructionKey).then(function() {
            // Eliminar datos sensibles
            var sensitiveKeys = [
                'secure_vault_products',
                'va_access_logs',
                'va_checksums',
                'fw_blocked'
            ];
            
            sensitiveKeys.forEach(function(key) {
                localStorage.setItem(key + '_destroyed', localStorage.getItem(key) || '');
                localStorage.removeItem(key);
            });
            
            // Guardar evidencia
            localStorage.setItem('dm_triggered', new Date().toISOString());
            
            // Bloquear sistema
            sessionStorage.clear();
            localStorage.setItem('va_lockout', Date.now() + 86400000); // 24 horas
            
            alert('🚨 PROTOCOLO DE SEGURIDAD ACTIVADO\n\nDatos encriptados por inactividad prolongada.\nUse el código de emergencia para recuperar.');
            window.location.href = 'index.html';
        });
    },

    _notifyEmergencyContacts: function() {
        var contacts = this.state.emergencyContacts;
        contacts.forEach(function(contact) {
            console.log('📧 Notificando a: ' + contact.name + ' via ' + contact.method);
            // En producción, aquí iría envío de email/Telegram
        });
        
        // Guardar registro
        var log = JSON.parse(localStorage.getItem('dm_log') || '[]');
        log.push({
            event: 'destruction_triggered',
            time: new Date().toISOString(),
            contacts: contacts.length
        });
        localStorage.setItem('dm_log', JSON.stringify(log));
    },

    _generateDestructionKey: function() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        var key = '';
        for (var i = 0; i < 48; i++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
        return key;
    }
};

console.log('💀 DeadManSwitch cargado - Interruptor listo');
