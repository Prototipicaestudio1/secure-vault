// ============================================
// ENCRIPTADOR TOTAL - Secure Vault v4.0
// Cifrado en reposo, tránsito y uso
// ============================================
var TotalEncryptor = {
    // Encriptar todo el localStorage
    encryptAllStorage: async function(password) {
        var result = { success: [], failed: [] };
        var keys = Object.keys(localStorage);
        
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (key.startsWith('va_') || key.startsWith('secure_') || key.startsWith('fw_') || key.startsWith('df_')) {
                try {
                    var value = localStorage.getItem(key);
                    var encrypted = await ZeroKnowledge.encrypt(value, password);
                    localStorage.setItem(key + '_encrypted', JSON.stringify(encrypted));
                    result.success.push(key);
                } catch(e) {
                    result.failed.push(key);
                }
            }
        }
        return result;
    },

    // Desencriptar almacenamiento
    decryptAllStorage: async function(password) {
        var result = { success: [], failed: [] };
        var keys = Object.keys(localStorage);
        
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (key.endsWith('_encrypted')) {
                try {
                    var encrypted = JSON.parse(localStorage.getItem(key));
                    var decrypted = await ZeroKnowledge.decrypt(encrypted, password);
                    var originalKey = key.replace('_encrypted', '');
                    localStorage.setItem(originalKey, decrypted);
                    localStorage.removeItem(key);
                    result.success.push(originalKey);
                } catch(e) {
                    result.failed.push(key);
                }
            }
        }
        return result;
    },

    // Encriptar un solo valor en memoria
    encryptValue: async function(value, password) {
        return await ZeroKnowledge.encrypt(value, password);
    },

    // Desencriptar valor
    decryptValue: async function(encrypted, password) {
        return await ZeroKnowledge.decrypt(encrypted, password);
    },

    // Generar clave de emergencia
    generateEmergencyKey: function() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        var key = '';
        for (var i = 0; i < 32; i++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
        return key;
    },

    // Auto-encriptar al cerrar sesión
    autoEncryptOnLogout: async function() {
        var sessionKey = sessionStorage.getItem('secure_session');
        if (sessionKey) {
            await this.encryptAllStorage(sessionKey);
            return true;
        }
        return false;
    },

    // Verificar si el almacenamiento está encriptado
    isEncrypted: function() {
        var keys = Object.keys(localStorage);
        var encryptedCount = keys.filter(function(k) { return k.endsWith('_encrypted'); }).length;
        return encryptedCount > 0;
    },

    // Estadísticas de encriptación
    getStats: function() {
        var keys = Object.keys(localStorage);
        var encrypted = keys.filter(function(k) { return k.endsWith('_encrypted'); }).length;
        return {
            totalKeys: keys.length,
            encryptedKeys: encrypted,
            encryptionRate: keys.length > 0 ? Math.round((encrypted / keys.length) * 100) : 0,
            isEncrypted: this.isEncrypted()
        };
    }
};

console.log('🔐 TotalEncryptor cargado - Encriptacion total lista');
