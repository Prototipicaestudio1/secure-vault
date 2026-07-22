// ============================================
// ZERO-KNOWLEDGE ENCRYPTION - Secure Vault v4.0
// Cifrado donde ni el servidor puede ver tus datos
// ============================================
var ZeroKnowledge = {
    // Configuracion
    config: {
        PBKDF2_ITERATIONS: 500000,
        KEY_LENGTH: 256,
        SALT_LENGTH: 32,
        IV_LENGTH: 16
    },

    // Derivar clave maestra desde codigo + salt
    deriveMasterKey: async function(password, salt) {
        var encoder = new TextEncoder();
        var keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt || encoder.encode('secure-vault-salt'),
                iterations: this.config.PBKDF2_ITERATIONS,
                hash: 'SHA-512'
            },
            keyMaterial,
            { name: 'AES-GCM', length: this.config.KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        );
    },

    // Cifrar con clave derivada (Zero-Knowledge)
    encrypt: async function(data, password) {
        try {
            var encoder = new TextEncoder();
            var salt = crypto.getRandomValues(new Uint8Array(this.config.SALT_LENGTH));
            var key = await this.deriveMasterKey(password, salt);
            var iv = crypto.getRandomValues(new Uint8Array(this.config.IV_LENGTH));
            var encodedData = encoder.encode(JSON.stringify(data));

            var encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encodedData
            );

            return {
                salt: Array.from(salt),
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(encrypted)),
                algorithm: 'AES-256-GCM',
                iterations: this.config.PBKDF2_ITERATIONS
            };
        } catch (error) {
            console.error('Zero-Knowledge encrypt error:', error);
            throw error;
        }
    },

    // Descifrar (solo con la clave correcta)
    decrypt: async function(encryptedData, password) {
        try {
            var encoder = new TextEncoder();
            var decoder = new TextDecoder();
            var salt = new Uint8Array(encryptedData.salt);
            var iv = new Uint8Array(encryptedData.iv);
            var data = new Uint8Array(encryptedData.data);

            var key = await this.deriveMasterKey(password, salt);

            var decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );

            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Zero-Knowledge decrypt error - Clave incorrecta o datos corruptos');
            return null;
        }
    },

    // Generar frase semilla de recuperacion (12 palabras)
    generateSeedPhrase: function() {
        var words = [
            'abismo', 'bateria', 'cable', 'diamante', 'espejo', 'faro',
            'golondrina', 'harina', 'isla', 'jirafa', 'koala', 'limon',
            'madera', 'naranja', 'oso', 'perla', 'quimica', 'robot',
            'silla', 'tigre', 'uva', 'viento', 'wifi', 'xilofono',
            'yate', 'zapato', 'agua', 'bosque', 'cielo', 'dragon',
            'estrella', 'flor', 'gato', 'hormiga', 'iman', 'juego',
            'lago', 'montaña', 'nieve', 'oro', 'piedra', 'rio',
            'sol', 'tierra', 'universo', 'volcan', 'luna', 'fuego'
        ];
        var seed = [];
        for (var i = 0; i < 12; i++) {
            var index = Math.floor(Math.random() * words.length);
            seed.push(words[index]);
        }
        return seed.join(' ');
    },

    // Verificar frase semilla
    verifySeedPhrase: function(phrase, storedHash) {
        return CryptoManager.hashString(phrase, 100).then(function(hash) {
            return hash === storedHash;
        });
    }
};

console.log('🔐 ZeroKnowledge cargado - Cifrado Zero-Knowledge activo');
