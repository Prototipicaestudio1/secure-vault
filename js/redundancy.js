// ============================================
// REDUNDANCIA BLINDADA - Secure Vault v4.0
// Backups multicapa con verificacion
// ============================================
var Redundancy = {
    config: {
        AUTO_BACKUP_INTERVAL: 900000,   // 15 minutos
        MAX_BACKUPS: 5,
        BACKUP_LOCATIONS: ['local', 'cloudinary', 'download'],
        VERIFY_BACKUP: true
    },

    state: {
        backups: JSON.parse(localStorage.getItem('rd_backups') || '[]'),
        lastBackup: localStorage.getItem('rd_last_backup') || null,
        totalBackups: parseInt(localStorage.getItem('rd_total') || '0'),
        failedBackups: parseInt(localStorage.getItem('rd_failed') || '0')
    },

    // Inicializar sistema de redundancia
    init: function() {
        this._startAutoBackup();
        this._verifyExistingBackups();
        console.log('🔄 Redundancy activo - Backup cada ' + (this.config.AUTO_BACKUP_INTERVAL/60000) + 'min');
    },

    // Crear backup completo
    createBackup: async function() {
        var backup = {
            id: this._generateBackupId(),
            timestamp: Date.now(),
            date: new Date().toISOString(),
            data: {
                vault: localStorage.getItem('secure_vault_products'),
                checksums: localStorage.getItem('va_checksums'),
                signatures: localStorage.getItem('va_checksums'),
                config: {
                    cloudinary: SecureStorageManager.cloudinaryConfig.cloudName,
                    version: '4.0'
                }
            },
            hash: null,
            size: 0
        };

        // Calcular hash de integridad
        backup.hash = await IntegrityGuard.hashData(backup.data);
        backup.size = new Blob([JSON.stringify(backup.data)]).size;

        // Guardar en localStorage
        var backups = this.state.backups;
        backups.unshift({
            id: backup.id,
            timestamp: backup.timestamp,
            hash: backup.hash,
            size: backup.size
        });
        
        if (backups.length > this.config.MAX_BACKUPS) {
            backups = backups.slice(0, this.config.MAX_BACKUPS);
        }
        
        localStorage.setItem('rd_backups', JSON.stringify(backups));
        localStorage.setItem('rd_backup_' + backup.id, JSON.stringify(backup));
        localStorage.setItem('rd_last_backup', backup.date);
        localStorage.setItem('rd_total', this.state.totalBackups + 1);

        this.state.backups = backups;
        this.state.lastBackup = backup.date;
        this.state.totalBackups++;

        // Subir a Cloudinary como respaldo
        this._uploadToCloudinary(backup);

        // Ofrecer descarga
        this._offerDownload(backup);

        console.log('✅ Backup creado: ' + backup.id);
        return backup;
    },

    // Restaurar desde backup
    restoreBackup: async function(backupId) {
        var backupData = localStorage.getItem('rd_backup_' + backupId);
        if (!backupData) return { success: false, reason: 'Backup no encontrado' };

        try {
            var backup = JSON.parse(backupData);
            
            // Verificar integridad antes de restaurar
            if (this.config.VERIFY_BACKUP) {
                var currentHash = await IntegrityGuard.hashData(backup.data);
                if (currentHash !== backup.hash) {
                    this.state.failedBackups++;
                    localStorage.setItem('rd_failed', this.state.failedBackups);
                    return { success: false, reason: '¡Backup corrupto! Hash no coincide' };
                }
            }

            // Restaurar datos
            if (backup.data.vault) {
                localStorage.setItem('secure_vault_products', backup.data.vault);
            }
            if (backup.data.checksums) {
                localStorage.setItem('va_checksums', backup.data.checksums);
            }
            if (backup.data.signatures) {
                localStorage.setItem('va_checksums', backup.data.signatures);
            }

            return { 
                success: true, 
                date: backup.date,
                id: backup.id,
                size: backup.size
            };
        } catch (error) {
            return { success: false, reason: error.message };
        }
    },

    // Listar backups disponibles
    listBackups: function() {
        return this.state.backups.map(function(b) {
            return {
                id: b.id,
                date: new Date(b.timestamp).toLocaleString(),
                size: b.size ? (b.size / 1024).toFixed(2) + ' KB' : 'Desconocido',
                hash: b.hash ? b.hash.substring(0, 16) + '...' : 'Sin verificar'
            };
        });
    },

    // Verificar todos los backups
    verifyAllBackups: async function() {
        var results = [];
        for (var i = 0; i < this.state.backups.length; i++) {
            var b = this.state.backups[i];
            var backupData = localStorage.getItem('rd_backup_' + b.id);
            if (backupData) {
                var backup = JSON.parse(backupData);
                var currentHash = await IntegrityGuard.hashData(backup.data);
                results.push({
                    id: b.id,
                    valid: currentHash === backup.hash,
                    date: new Date(b.timestamp).toLocaleString()
                });
            }
        }
        return results;
    },

    // Estadisticas
    getStats: function() {
        return {
            totalBackups: this.state.totalBackups,
            failedBackups: this.state.failedBackups,
            lastBackup: this.state.lastBackup || 'Nunca',
            storedBackups: this.state.backups.length,
            maxBackups: this.config.MAX_BACKUPS,
            nextBackup: this.state.lastBackup ? 
                new Date(new Date(this.state.lastBackup).getTime() + this.config.AUTO_BACKUP_INTERVAL).toLocaleTimeString() : 
                'Ahora'
        };
    },

    // ============= INTERNO =============

    _startAutoBackup: function() {
        var self = this;
        setInterval(function() {
            self.createBackup();
        }, this.config.AUTO_BACKUP_INTERVAL);
    },

    _verifyExistingBackups: function() {
        var self = this;
        this.verifyAllBackups().then(function(results) {
            var invalid = results.filter(function(r) { return !r.valid; });
            if (invalid.length > 0) {
                console.warn('⚠️ ' + invalid.length + ' backups corruptos detectados');
                self.state.failedBackups += invalid.length;
                localStorage.setItem('rd_failed', self.state.failedBackups);
            }
        });
    },

    _uploadToCloudinary: async function(backup) {
        try {
            var blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
            var formData = new FormData();
            formData.append('file', blob, 'backup-' + backup.id + '.json');
            formData.append('upload_preset', SecureStorageManager.cloudinaryConfig.uploadPreset);
            formData.append('folder', 'secure-vault/backups');

            var response = await fetch(
                'https://api.cloudinary.com/v1_1/' + SecureStorageManager.cloudinaryConfig.cloudName + '/auto/upload',
                { method: 'POST', body: formData }
            );

            if (response.ok) {
                var result = await response.json();
                console.log('☁️ Backup subido a Cloudinary: ' + result.secure_url);
                return result.secure_url;
            }
        } catch (e) {
            console.warn('No se pudo subir backup a Cloudinary:', e.message);
        }
        return null;
    },

    _offerDownload: function(backup) {
        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        
        // Guardar URL para posible descarga manual
        var downloads = JSON.parse(localStorage.getItem('rd_downloads') || '[]');
        downloads.push({
            id: backup.id,
            date: backup.date,
            url: url
        });
        if (downloads.length > 5) downloads = downloads.slice(-5);
        localStorage.setItem('rd_downloads', JSON.stringify(downloads));
    },

    _generateBackupId: function() {
        return 'BK-' + Date.now().toString(36).toUpperCase() + '-' + 
               Math.random().toString(36).substring(2, 6).toUpperCase();
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    Redundancy.init();
});

console.log('🔄 Redundancy cargado - Backups automaticos activos');
