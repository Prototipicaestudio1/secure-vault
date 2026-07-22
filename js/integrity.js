// ============================================
// SISTEMA DE INTEGRIDAD - Secure Vault v4.0
// Detecta manipulacion de datos y archivos
// ============================================
var IntegrityGuard = {
    CHECKSUM_KEY: 'va_checksums',
    
    // Calcular hash de integridad para cualquier dato
    hashData: async function(data) {
        var str = typeof data === 'string' ? data : JSON.stringify(data);
        var encoder = new TextEncoder();
        var encoded = encoder.encode(str);
        var hash = await crypto.subtle.digest('SHA-256', encoded);
        return Array.from(new Uint8Array(hash))
            .map(function(b) { return b.toString(16).padStart(2, '0'); })
            .join('');
    },
    
    // Firmar un producto al guardarlo
    signProduct: async function(token, productData) {
        var checksum = await this.hashData(productData);
        var signatures = this._getSignatures();
        signatures[token] = {
            checksum: checksum,
            timestamp: Date.now(),
            files: productData.files ? productData.files.length : 0
        };
        localStorage.setItem(this.CHECKSUM_KEY, JSON.stringify(signatures));
        return checksum;
    },
    
    // Verificar que un producto no fue alterado
    verifyProduct: async function(token, productData) {
        var signatures = this._getSignatures();
        var sig = signatures[token];
        if (!sig) return { valid: false, reason: 'Sin firma de integridad' };
        
        var currentChecksum = await this.hashData(productData);
        if (currentChecksum !== sig.checksum) {
            return { valid: false, reason: '¡Datos alterados! Checksum no coincide' };
        }
        
        return { valid: true, checksum: sig.checksum, signed: sig.timestamp };
    },
    
    // Verificar archivos individuales
    verifyFile: async function(fileData) {
        if (!fileData) return { valid: false, reason: 'Sin datos' };
        var checksum = await this.hashData(fileData);
        return { valid: true, checksum: checksum };
    },
    
    // Escanear toda la boveda en busca de alteraciones
    scanVault: async function() {
        var results = [];
        var vault = JSON.parse(localStorage.getItem('secure_vault_products') || '{}');
        var signatures = this._getSignatures();
        
        for (var token in vault) {
            var entry = vault[token];
            var status = { token: token, valid: true, issues: [] };
            
            // Verificar firma
            if (signatures[token]) {
                var currentChecksum = await this.hashData(entry);
                if (currentChecksum !== signatures[token].checksum) {
                    status.valid = false;
                    status.issues.push('Checksum alterado');
                }
            } else {
                status.issues.push('Sin firma (producto antiguo)');
            }
            
            // Verificar timestamp
            if (entry.timestamp && entry.timestamp > Date.now() + 86400000) {
                status.valid = false;
                status.issues.push('Timestamp futuro sospechoso');
            }
            
            results.push(status);
        }
        
        return results;
    },
    
    // Crear backup de integridad
    createBackup: function() {
        var backup = {
            vault: localStorage.getItem('secure_vault_products'),
            signatures: localStorage.getItem(this.CHECKSUM_KEY),
            created: new Date().toISOString(),
            version: '4.0'
        };
        var blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'vault-backup-' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        return true;
    },
    
    // Restaurar desde backup
    restoreBackup: function(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var backup = JSON.parse(e.target.result);
                    if (backup.vault && backup.signatures) {
                        localStorage.setItem('secure_vault_products', backup.vault);
                        localStorage.setItem(IntegrityGuard.CHECKSUM_KEY, backup.signatures);
                        resolve({ success: true, date: backup.created });
                    } else {
                        reject(new Error('Backup invalido'));
                    }
                } catch(err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },
    
    // Obtener estadisticas de integridad
    getStats: function() {
        var signatures = this._getSignatures();
        var vault = JSON.parse(localStorage.getItem('secure_vault_products') || '{}');
        return {
            totalProducts: Object.keys(vault).length,
            signedProducts: Object.keys(signatures).length,
            unsignedProducts: Object.keys(vault).length - Object.keys(signatures).length,
            lastBackup: localStorage.getItem('va_last_backup') || 'Nunca'
        };
    },
    
    // Interno
    _getSignatures: function() {
        try {
            return JSON.parse(localStorage.getItem(this.CHECKSUM_KEY) || '{}');
        } catch(e) {
            return {};
        }
    }
};

console.log('🛡️ IntegrityGuard cargado - Verificacion de integridad activa');
