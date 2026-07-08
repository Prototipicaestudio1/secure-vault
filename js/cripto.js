class CryptoManager {
    static async hashString(str, rounds = 1000) {
        const encoder = new TextEncoder();
        let data = encoder.encode(str);
        for (let i = 0; i < rounds; i++) {
            data = await crypto.subtle.digest('SHA-512', data);
        }
        return Array.from(new Uint8Array(data))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    static async timingSafeCompare(a, b) {
        if (a.length !== b.length) {
            await crypto.subtle.digest('SHA-256', new TextEncoder().encode(a));
            return false;
        }
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return result === 0;
    }

    static generateSessionToken() {
        const array = new Uint8Array(64);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    static async generateProductToken(productData) {
        const timestamp = Date.now();
        const random = crypto.getRandomValues(new Uint8Array(32));
        const dataString = JSON.stringify({
            name: productData.name,
            date: productData.date,
            timestamp: timestamp,
            random: Array.from(random).join('')
        });
        const hash = await this.hashString(dataString, 200);
        return 'VAULT-' + hash.substring(0, 16).match(/.{1,4}/g).join('-');
    }

    static async encryptData(data, password) {
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encodedData);
        return { salt: Array.from(salt), iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
    }

    static async decryptData(encryptedData, password) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: new Uint8Array(encryptedData.salt), iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
            key,
            new Uint8Array(encryptedData.data)
        );
        return JSON.parse(decoder.decode(decrypted));
    }
}

async function hashString(str) {
    return await CryptoManager.hashString(str);
}