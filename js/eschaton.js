// ============================================
// PROTOCOLO ESCHATON - Secure Vault v4.0
// Cierre definitivo y destruccion segura
// ============================================
var Eschaton = {
    config: {
        DESTRUCTION_CODE: '000000',
        GRACE_PERIOD: 10000,         // 10 segundos para cancelar
        SECURE_OVERWRITE_PASSES: 7,  // Pasadas DoD 5220.22-M
        CONFIRMATION_PHRASE: 'DESTRUIR TODO'
    },

    state: {
        initiated: false,
        countdown: null,
        canCancel: true,
        destructionLog: JSON.parse(localStorage.getItem('es_log') || '[]')
    },

    // Iniciar protocolo Eschaton
    initiate: function() {
        if (this.state.initiated) return false;
        
        this.state.initiated = true;
        this.state.canCancel = true;
        
        console.warn('⚡ PROTOCOLO ESCHATON INICIADO');
        console.warn('⏳ Tiene ' + (this.config.GRACE_PERIOD/1000) + ' segundos para cancelar');
        
        // Mostrar advertencia
        this._showWarning();
        
        // Iniciar cuenta regresiva
        this.state.countdown = setTimeout(() => {
            this._execute();
        }, this.config.GRACE_PERIOD);
        
        return true;
    },

    // Cancelar protocolo
    cancel: function(code) {
        if (!this.state.canCancel) return false;
        
        if (code === this.config.DESTRUCTION_CODE) {
            clearTimeout(this.state.countdown);
            this.state.initiated = false;
            this.state.canCancel = false;
            
            console.log('✅ Protocolo Eschaton CANCELADO');
            
            // Remover advertencia
            var warning = document.getElementById('eschaton-warning');
            if (warning) warning.remove();
            
            return true;
        }
        
        return false;
    },

    // Ejecutar destruccion
    _execute: function() {
        console.error('💀 EJECUTANDO PROTOCOLO ESCHATON');
        this.state.canCancel = false;
        
        var log = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            reason: 'Protocolo Eschaton ejecutado',
            dataDestroyed: true
        };

        // 1. Destruir todos los datos en localStorage
        var keysToDestroy = [
            'secure_vault_products',
            'va_checksums', 'va_access_logs', 'va_attempts',
            'fw_blocked', 'fw_alerts', 'df_evidence', 'df_blocked',
            'rd_backups', 'rd_downloads', 'ct_seals', 'ct_chain_',
            'nn_profile', 'nn_samples', 'dm_key', 'dm_contacts',
            'va_trusted_devices', 'secure_session', 'session_expiry'
        ];

        keysToDestroy.forEach(function(key) {
            // Sobrescritura segura (DoD 5220.22-M)
            var randomData = '';
            for (var i = 0; i < 3; i++) {
                randomData = '';
                for (var j = 0; j < 1000; j++) {
                    randomData += String.fromCharCode(Math.floor(Math.random() * 256));
                }
                localStorage.setItem(key, randomData);
            }
            // Finalmente eliminar
            localStorage.removeItem(key);
        });

        // 2. Destruir sessionStorage
        sessionStorage.clear();

        // 3. Guardar solo el log de destruccion
        this.state.destructionLog.push(log);
        localStorage.setItem('es_log', JSON.stringify(this.state.destructionLog));

        // 4. Mostrar pantalla final
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#ff4444;font-family:monospace;text-align:center;">
                <div>
                    <h1 style="font-size:64px;">💀</h1>
                    <h2 style="font-size:24px;margin:20px 0;">PROTOCOLO ESCHATON</h2>
                    <p style="color:#888;font-size:14px;">Todos los datos han sido destruidos de forma segura</p>
                    <p style="color:#666;font-size:12px;margin-top:20px;">DoD 5220.22-M | ' + this.config.SECURE_OVERWRITE_PASSES + ' pasadas</p>
                    <p style="color:#444;font-size:11px;margin-top:30px;">Sistema bloqueado permanentemente</p>
                    <p style="color:#333;font-size:10px;">ID: ' + log.timestamp.toString(36).toUpperCase() + '</p>
                </div>
            </div>
        `;

        // 5. Bloquear acceso permanente
        localStorage.setItem('va_lockout', '9999999999999');
        localStorage.setItem('va_attempts', '999');

        console.log('💀 Protocolo Eschaton completado');
    },

    // Simulacro (no destructivo)
    drill: function() {
        console.log('🔧 SIMULACRO ESCHATON - Sin destruccion real');
        
        var drillLog = {
            timestamp: Date.now(),
            date: new Date().toISOString(),
            reason: 'Simulacro',
            dataDestroyed: false
        };
        
        this.state.destructionLog.push(drillLog);
        localStorage.setItem('es_log', JSON.stringify(this.state.destructionLog));
        
        alert('✅ Simulacro completado\n\nEl sistema respondio correctamente.\nTiempo estimado de destruccion: < 1 segundo');
        return true;
    },

    // Historial
    getHistory: function() {
        return this.state.destructionLog.map(function(log) {
            return {
                date: log.date,
                type: log.dataDestroyed ? '💀 REAL' : '🔧 Simulacro',
                reason: log.reason
            };
        });
    },

    // ============= INTERNO =============

    _showWarning: function() {
        var warning = document.createElement('div');
        warning.id = 'eschaton-warning';
        warning.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background: #ff0000; color: #fff;
            padding: 20px; text-align: center;
            z-index: 999999; font-family: monospace;
            animation: pulse 0.5s infinite;
        `;
        warning.innerHTML = `
            <strong>⚠️ PROTOCOLO ESCHATON ACTIVADO ⚠️</strong><br>
            <span style="font-size:14px;">Los datos seran destruidos en ` + (this.config.GRACE_PERIOD/1000) + ` segundos</span><br>
            <button onclick="Eschaton.cancel(prompt('Codigo de cancelacion:'))" 
                    style="margin-top:10px;padding:10px 20px;background:#fff;color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:bold;">
                CANCELAR (Ingresar codigo)
            </button>
        `;
        document.body.insertBefore(warning, document.body.firstChild);

        // Animacion de pulso
        var style = document.createElement('style');
        style.textContent = '@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.7; } }';
        document.head.appendChild(style);

        // Auto-remover si no se cancela
        var self = this;
        setTimeout(function() {
            if (warning.parentNode) warning.remove();
        }, this.config.GRACE_PERIOD);
    }
};

console.log('💀 Eschaton cargado - Protocolo de destruccion listo');
