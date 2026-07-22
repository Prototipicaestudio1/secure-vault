// ============================================
// GESTOR DE ALMACENAMIENTO SEGURO v4.0
// Con verificacion de integridad
// ============================================
var SecureStorageManager = {
    STORAGE_KEY: 'secure_vault_products',
    ENCRYPTION_KEY: 'VAULT_MASTER_KEY_2024_SECURE',
    
    cloudinaryConfig: {
        cloudName: 'e6cszezf',
        uploadPreset: 'vault_documents',
        folder: 'secure-vault'
    },
    
    // Guardar producto con firma de integridad
    saveProduct: async function(token, productData) {
        try {
            // Subir archivos a Cloudinary
            if (productData.files && productData.files.length > 0) {
                var uploadedFiles = await this._uploadFiles(productData.files, token);
                productData.files = uploadedFiles;
            }
            
            // Encriptar datos
            var encrypted = await CryptoManager.encryptData(productData, this.ENCRYPTION_KEY);
            
            // Guardar en localStorage
            var vault = this._getVault();
            vault[token] = {
                encrypted: encrypted,
                timestamp: Date.now(),
                version: '4.0'
            };
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault));
            
            // Firmar con IntegrityGuard
            if (typeof IntegrityGuard !== 'undefined') {
                await IntegrityGuard.signProduct(token, productData);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            throw error;
        }
    },
    
    // Obtener producto y verificar integridad
    getProduct: async function(token) {
        try {
            var vault = this._getVault();
            var entry = vault[token];
            if (!entry) return null;
            
            var decrypted = await CryptoManager.decryptData(entry.encrypted, this.ENCRYPTION_KEY);
            
            // Verificar integridad
            if (typeof IntegrityGuard !== 'undefined') {
                var verify = await IntegrityGuard.verifyProduct(token, decrypted);
                if (!verify.valid) {
                    console.warn('⚠️ Alerta de integridad:', verify.reason);
                }
            }
            
            return decrypted;
        } catch (error) {
            console.error('Error retrieving product:', error);
            return null;
        }
    },
    
    // Obtener todos los tokens
    getAllTokens: function() {
        var vault = this._getVault();
        return Object.keys(vault);
    },
    
    // Eliminar producto
    deleteProduct: function(token) {
        var vault = this._getVault();
        delete vault[token];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault));
        
        var signatures = JSON.parse(localStorage.getItem('va_checksums') || '{}');
        delete signatures[token];
        localStorage.setItem('va_checksums', JSON.stringify(signatures));
    },
    
    // Subir archivos
    _uploadFiles: async function(files, token) {
        var uploadedFiles = [];
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            try {
                var url = await this._uploadSingleFile(file, token);
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
    },
    
    _uploadSingleFile: async function(file, token) {
        var blob = this._base64ToBlob(file.data);
        var safeName = this._sanitizeFileName(file.name);
        var formData = new FormData();
        formData.append('file', blob, safeName);
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder + '/' + token);
        
        var response = await fetch(
            'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/auto/upload',
            { method: 'POST', body: formData }
        );
        
        if (!response.ok) throw new Error('Upload failed: ' + response.status);
        var result = await response.json();
        return result.secure_url;
    },
    
    _base64ToBlob: function(base64) {
        var parts = base64.split(';base64,');
        var contentType = parts[0].split(':')[1] || 'application/octet-stream';
        var raw = window.atob(parts[1]);
        var uInt8Array = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) uInt8Array[i] = raw.charCodeAt(i);
        return new Blob([uInt8Array], { type: contentType });
    },
    
    _sanitizeFileName: function(fileName) {
        return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\s+/g, '_').toLowerCase().substring(0, 100);
    },
    
    _getVault: function() {
        try {
            var data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch(e) { return {}; }
    }
};

console.log('💾 StorageManager v4.0 cargado - Integridad activa');
