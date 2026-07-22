// ============================================
// AUTENTICACION REFORZADA - Secure Vault v4.0
// ============================================
var AuthManager = {
    // Configuracion
    TWO_FACTOR_ENABLED: true,
    DEVICE_TRUST_DAYS: 30,
    
    // Generar secreto TOTP
    generateTOTPSecret: function() {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        var secret = '';
        for (var i = 0; i < 32; i++) {
            secret += chars[Math.floor(Math.random() * chars.length)];
        }
        return secret;
    },
    
    // Generar codigo TOTP
    generateTOTP: function(secret) {
        var now = Math.floor(Date.now() / 30000);
        var msg = this._intToBytes(now);
        var key = this._base32ToBytes(secret);
        var hash = this._hmacSHA1(key, msg);
        var offset = hash[hash.length - 1] & 0x0F;
        var code = ((hash[offset] & 0x7F) << 24) |
                   ((hash[offset + 1] & 0xFF) << 16) |
                   ((hash[offset + 2] & 0xFF) << 8) |
                   (hash[offset + 3] & 0xFF);
        code = code % 1000000;
        return code.toString().padStart(6, '0');
    },
    
    // Verificar codigo TOTP
    verifyTOTP: function(secret, code) {
        return this.generateTOTP(secret) === code;
    },
    
    // Huella del dispositivo
    getDeviceFingerprint: function() {
        var fp = '';
        fp += navigator.hardwareConcurrency || '';
        fp += navigator.deviceMemory || '';
        fp += screen.width + 'x' + screen.height;
        fp += navigator.language;
        fp += new Date().getTimezoneOffset();
        return this._simpleHash(fp);
    },
    
    // Confiar dispositivo
    trustDevice: function() {
        var fp = this.getDeviceFingerprint();
        var expiry = Date.now() + (this.DEVICE_TRUST_DAYS * 86400000);
        var trusted = JSON.parse(localStorage.getItem('va_trusted_devices') || '{}');
        trusted[fp] = expiry;
        localStorage.setItem('va_trusted_devices', JSON.stringify(trusted));
    },
    
    // Verificar dispositivo confiable
    isDeviceTrusted: function() {
        var fp = this.getDeviceFingerprint();
        var trusted = JSON.parse(localStorage.getItem('va_trusted_devices') || '{}');
        return trusted[fp] && Date.now() < trusted[fp];
    },
    
    // Registrar acceso
    logAccess: function(success, details) {
        var logs = JSON.parse(localStorage.getItem('va_access_logs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            success: success,
            ip: 'protegido',
            device: this.getDeviceFingerprint().substring(0, 8),
            details: details || ''
        });
        // Mantener solo ultimos 100 registros
        if (logs.length > 100) logs = logs.slice(-100);
        localStorage.setItem('va_access_logs', JSON.stringify(logs));
        return logs;
    },
    
    // Obtener logs de acceso
    getAccessLogs: function() {
        return JSON.parse(localStorage.getItem('va_access_logs') || '[]');
    },
    
    // Detectar acceso sospechoso
    detectSuspicious: function() {
        var logs = this.getAccessLogs();
        var recentFails = logs.slice(-10).filter(function(l) { return !l.success; });
        return recentFails.length >= 3;
    },
    
    // Hash simple para huella
    _simpleHash: function(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    },
    
    // Utilidades TOTP internas
    _intToBytes: function(num) {
        var bytes = [];
        for (var i = 7; i >= 0; i--) {
            bytes.push((num >> (i * 8)) & 0xFF);
        }
        return bytes;
    },
    
    _base32ToBytes: function(base32) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        var bits = '';
        var bytes = [];
        base32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
        for (var i = 0; i < base32.length; i++) {
            bits += chars.indexOf(base32[i]).toString(2).padStart(5, '0');
        }
        for (var i = 0; i + 8 <= bits.length; i += 8) {
            bytes.push(parseInt(bits.substring(i, i + 8), 2));
        }
        return bytes;
    },
    
    _hmacSHA1: function(key, msg) {
        if (key.length > 64) key = this._sha1(key);
        if (key.length < 64) {
            var tmp = [];
            for (var i = 0; i < key.length; i++) tmp.push(key[i]);
            while (tmp.length < 64) tmp.push(0);
            key = tmp;
        }
        var ipad = [], opad = [];
        for (var i = 0; i < 64; i++) {
            ipad.push(key[i] ^ 0x36);
            opad.push(key[i] ^ 0x5C);
        }
        var inner = this._sha1(ipad.concat(msg));
        return this._sha1(opad.concat(inner));
    },
    
    _sha1: function(data) {
        function rotateLeft(n, s) { return (n << s) | (n >>> (32 - s)); }
        var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
        var msg = [];
        for (var i = 0; i < data.length; i++) msg.push(data[i]);
        msg.push(0x80);
        while ((msg.length + 8) % 64 !== 0) msg.push(0);
        var len = data.length * 8;
        for (var i = 0; i < 4; i++) msg.push((len >>> (24 - i * 8)) & 0xFF);
        for (var i = 0; i < msg.length; i += 64) {
            var w = [];
            for (var t = 0; t < 16; t++) w[t] = (msg[i + t * 4] << 24) | (msg[i + t * 4 + 1] << 16) | (msg[i + t * 4 + 2] << 8) | msg[i + t * 4 + 3];
            for (var t = 16; t < 80; t++) w[t] = rotateLeft(w[t-3] ^ w[t-8] ^ w[t-14] ^ w[t-16], 1);
            var a = h0, b = h1, c = h2, d = h3, e = h4;
            for (var t = 0; t < 80; t++) {
                var f, k;
                if (t < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
                else if (t < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
                else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
                else { f = b ^ c ^ d; k = 0xCA62C1D6; }
                var temp = (rotateLeft(a, 5) + f + e + k + w[t]) & 0xFFFFFFFF;
                e = d; d = c; c = rotateLeft(b, 30); b = a; a = temp;
            }
            h0 = (h0 + a) & 0xFFFFFFFF; h1 = (h1 + b) & 0xFFFFFFFF;
            h2 = (h2 + c) & 0xFFFFFFFF; h3 = (h3 + d) & 0xFFFFFFFF;
            h4 = (h4 + e) & 0xFFFFFFFF;
        }
        var result = [];
        [h0, h1, h2, h3, h4].forEach(function(h) {
            for (var i = 0; i < 4; i++) result.push((h >>> (24 - i * 8)) & 0xFF);
        });
        return result;
    }
};

console.log('🔒 AuthManager cargado - 2FA y verificacion de dispositivo listos');
