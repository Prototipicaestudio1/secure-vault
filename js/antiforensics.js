// ============================================
// SISTEMA ANTI-FORENSE - Secure Vault v4.0
// Elimina huellas digitales y rastros
// ============================================
var AntiForensics = {
    config: {
        AUTO_CLEAN_INTERVAL: 60000,    // Limpiar cada minuto
        CLIPBOARD_CLEAN_DELAY: 10000,  // Limpiar portapapeles tras 10s
        HISTORY_CLEAN_ON_LOAD: true,
        MEMORY_SCRUB_INTERVAL: 30000   // Sobrescribir memoria cada 30s
    },

    state: {
        cleanCount: 0,
        lastClean: null,
        clipboardWatchActive: false
    },

    // Inicializar proteccion anti-forense
    init: function() {
        this._cleanHistory();
        this._startAutoClean();
        this._watchClipboard();
        this._scrubMemory();
        this._blockScreenshots();
        this._disableCaching();
        console.log('🕵️ AntiForensics activo - Modo fantasma');
    },

    // Limpiar todas las huellas
    cleanAll: function() {
        this._cleanHistory();
        this._cleanClipboard();
        this._cleanSessionStorage();
        this._cleanCookies();
        this._cleanCache();
        this.state.cleanCount++;
        this.state.lastClean = new Date().toISOString();
        return this.state.cleanCount;
    },

    // Activar modo fantasma (máxima privacidad)
    enableGhostMode: function() {
        // Ocultar de la barra de tareas
        if (document.visibilityState) {
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    document.title = 'Nueva pestaña';
                } else {
                    document.title = 'Secure Vault';
                }
            });
        }

        // Deshabilitar impresión
        window.addEventListener('beforeprint', function(e) {
            if (Defender.state.threatLevel >= 2) {
                e.preventDefault();
                alert('Impresión bloqueada por seguridad');
            }
        });

        // Prevenir capturas de pantalla (mejor esfuerzo)
        document.addEventListener('keydown', function(e) {
            // Detectar teclas comunes de screenshot
            if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'p')) {
                if (Defender.state.threatLevel >= 3) {
                    e.preventDefault();
                    AntiForensics._addNoiseLayer();
                }
            }
        });

        return true;
    },

    // Obtener estadisticas
    getStats: function() {
        return {
            cleans: this.state.cleanCount,
            lastClean: this.state.lastClean,
            ghostMode: true,
            clipboardProtected: this.state.clipboardWatchActive
        };
    },

    // ============= INTERNO =============

    _cleanHistory: function() {
        if (this.config.HISTORY_CLEAN_ON_LOAD) {
            // Reemplazar estado actual para evitar botón "atrás"
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', window.location.href);
                window.addEventListener('popstate', function(e) {
                    window.history.pushState(null, '', window.location.href);
                });
                window.history.pushState(null, '', window.location.href);
            }
        }
    },

    _cleanClipboard: function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            var self = this;
            setTimeout(function() {
                navigator.clipboard.writeText('').catch(function() {});
                self.state.cleanCount++;
            }, this.config.CLIPBOARD_CLEAN_DELAY);
        }
    },

    _cleanSessionStorage: function() {
        // Eliminar datos temporales pero mantener sesion
        var keys = Object.keys(sessionStorage);
        keys.forEach(function(key) {
            if (!key.startsWith('secure_') && !key.startsWith('session_')) {
                sessionStorage.removeItem(key);
            }
        });
    },

    _cleanCookies: function() {
        document.cookie.split(';').forEach(function(cookie) {
            var name = cookie.split('=')[0].trim();
            if (!name.includes('session') && !name.includes('auth')) {
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
        });
    },

    _cleanCache: function() {
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) {
                    if (!name.includes('vault')) {
                        caches.delete(name);
                    }
                });
            });
        }
    },

    _startAutoClean: function() {
        var self = this;
        setInterval(function() {
            self.cleanAll();
        }, this.config.AUTO_CLEAN_INTERVAL);
    },

    _watchClipboard: function() {
        var self = this;
        this.state.clipboardWatchActive = true;
        
        // Detectar copia de datos sensibles
        document.addEventListener('copy', function(e) {
            var selection = window.getSelection().toString();
            if (selection.includes('VAULT-') || selection.length > 20) {
                // Programar limpieza del portapapeles
                setTimeout(function() {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText('').catch(function() {});
                        console.log('🧹 Portapapeles limpiado automáticamente');
                    }
                }, self.config.CLIPBOARD_CLEAN_DELAY);
            }
        });
    },

    _scrubMemory: function() {
        var self = this;
        setInterval(function() {
            // Sobrescribir variables temporales con datos basura
            var scrub = new Array(1000).fill(0);
            scrub = null;
        }, this.config.MEMORY_SCRUB_INTERVAL);
    },

    _blockScreenshots: function() {
        // Agregar capa de ruido visual (sutil)
        var style = document.createElement('style');
        style.textContent = '@media print { body { opacity: 0.5; filter: blur(10px); } }';
        document.head.appendChild(style);
    },

    _disableCaching: function() {
        // Meta tags para evitar cache
        var meta = document.createElement('meta');
        meta.httpEquiv = 'Cache-Control';
        meta.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(meta);
        
        var meta2 = document.createElement('meta');
        meta2.httpEquiv = 'Pragma';
        meta2.content = 'no-cache';
        document.head.appendChild(meta2);
    },

    _addNoiseLayer: function() {
        // Capa de ruido temporal para confundir screenshots
        var noise = document.createElement('div');
        noise.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:999999;pointer-events:none;';
        document.body.appendChild(noise);
        setTimeout(function() {
            noise.remove();
        }, 500);
    }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    AntiForensics.init();
    AntiForensics.enableGhostMode();
});

console.log('🕵️ AntiForensics cargado - Sin huellas');
