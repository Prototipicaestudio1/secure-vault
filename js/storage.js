class SecureStorageManager {
    static STORAGE_KEY = 'secure_vault_products';
    static ENCRYPTION_KEY = 'VAULT_MASTER_KEY_2024_SECURE';

    static cloudinaryConfig = {
        cloudName: 'e6cszezf',
        uploadPreset: 'vault_documents',
        folder: 'secure-vault'
    };

    static async saveProduct(token, productData) {
        try {
            if (productData.files && productData.files.length > 0) {
                const uploadedFiles = await this.uploadFiles(productData.files, token);
                productData.files = uploadedFiles;
            }
            const encrypted = await CryptoManager.encryptData(productData, this.ENCRYPTION_KEY);
            const vault = this.getVault();
            vault[token] = { encrypted: encrypted, timestamp: Date.now(), version: '3.0' };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault));
            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            throw error;
        }
    }

    static async getProduct(token) {
        try {
            const vault = this.getVault();
            const entry = vault[token];
            if (!entry) return null;
            return await CryptoManager.decryptData(entry.encrypted, this.ENCRYPTION_KEY);
        } catch (error) {
            console.error('Error retrieving product:', error);
            return null;
        }
    }

    static async uploadFiles(files, token) {
        const uploadedFiles = [];
        for (const file of files) {
            try {
                const url = await this.uploadSingleFile(file, token);
                uploadedFiles.push({
                    name: file.name, type: file.type, size: file.size,
                    url: url, data: file.data,
                    uploadedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error uploading file:', file.name, error);
                uploadedFiles.push(file);
            }
        }
        return uploadedFiles;
    }

    static async uploadSingleFile(file, token) {
        const blob = this.base64ToBlob(file.data);
        const safeName = this.sanitizeFileName(file.name);
        const formData = new FormData();
        formData.append('file', blob, safeName);
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder + '/' + token);
        const response = await fetch(
            'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/auto/upload',
            { method: 'POST', body: formData }
        );
        if (!response.ok) throw new Error('Upload failed: ' + response.status);
        const result = await response.json();
        return result.secure_url;
    }

    static base64ToBlob(base64) {
        const parts = base64.split(';base64,');
        const contentType = parts[0].split(':')[1] || 'application/octet-stream';
        const raw = window.atob(parts[1]);
        const uInt8Array = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
        return new Blob([uInt8Array], { type: contentType });
    }

    static sanitizeFileName(fileName) {
        return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_').toLowerCase().substring(0, 100);
    }

    static getVault() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch { return {}; }
    }
}