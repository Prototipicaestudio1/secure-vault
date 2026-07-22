var SecureStorageManager = {
    STORAGE_KEY: 'secure_vault_products',
    ENCRYPTION_KEY: 'VAULT_MASTER_KEY_2024_SECURE',

    cloudinaryConfig: {
        cloudName: 'e6cszezf',
        uploadPreset: 'vault_documents',
        folder: 'secure-vault'
    },

    saveProduct: async function(token, productData) {
        try {
            if (productData.files && productData.files.length > 0) {
                var uploadedFiles = await this._uploadFiles(productData.files, token);
                productData.files = uploadedFiles;
            }
            
            // Guardar indice en Cloudinary
            await this._saveIndex(token, productData);
            
            // Guardar local
            var encrypted = await CryptoManager.encryptData(productData, this.ENCRYPTION_KEY);
            var vault = this._getVault();
            vault[token] = { encrypted: encrypted, timestamp: Date.now(), version: '4.0' };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault));
            
            return true;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    },

    getProduct: async function(token) {
        // 1. Buscar en localStorage
        var vault = this._getVault();
        var entry = vault[token];
        if (entry && entry.encrypted) {
            try {
                var decrypted = await CryptoManager.decryptData(entry.encrypted, this.ENCRYPTION_KEY);
                if (decrypted && decrypted.name) return decrypted;
            } catch(e) {}
        }
        
        // 2. Buscar indice en Cloudinary
        try {
            var indexData = await this._getIndex(token);
            if (indexData) {
                // Restaurar localmente
                var encrypted = await CryptoManager.encryptData(indexData, this.ENCRYPTION_KEY);
                vault[token] = { encrypted: encrypted, timestamp: Date.now(), version: '4.0', recovered: true };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault));
                return indexData;
            }
        } catch(e) {
            console.log('No se pudo recuperar de Cloudinary');
        }
        
        return null;
    },

    getAllTokens: function() {
        return Object.keys(this._getVault());
    },

    // Guardar indice en Cloudinary
    _saveIndex: async function(token, data) {
        var index = {
            name: data.name,
            description: data.description,
            date: data.date,
            category: data.category,
            tags: data.tags,
            files: data.files.map(function(f) {
                return { name: f.name, type: f.type, size: f.size, url: f.url };
            }),
            links: data.links,
            metadata: data.metadata
        };
        
        var json = JSON.stringify(index);
        var blob = new Blob([json], { type: 'application/json' });
        var formData = new FormData();
        formData.append('file', blob, 'index.json');
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder + '/' + token);
        formData.append('public_id', 'index');
        formData.append('overwrite', 'true');
        
        var response = await fetch(
            'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/auto/upload',
            { method: 'POST', body: formData }
        );
        return response.ok;
    },

    // Recuperar indice de Cloudinary
    _getIndex: async function(token) {
        var indexUrl = 'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + 
                       '/raw/upload/v1/' + this.cloudinaryConfig.folder + '/' + token + '/index.json';
        
        try {
            var response = await fetch(indexUrl);
            if (response.ok) {
                var data = await response.json();
                return data;
            }
        } catch(e) {}
        return null;
    },

    _uploadFiles: async function(files, token) {
        var uploadedFiles = [];
        for (var i = 0; i < files.length; i++) {
            try {
                var url = await this._uploadSingleFile(files[i], token);
                uploadedFiles.push({
                    name: files[i].name, type: files[i].type, size: files[i].size,
                    url: url, data: files[i].data, uploadedAt: new Date().toISOString()
                });
            } catch(e) {
                uploadedFiles.push(files[i]);
            }
        }
        return uploadedFiles;
    },

    _uploadSingleFile: async function(file, token) {
        var blob = this._base64ToBlob(file.data);
        var safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase().substring(0, 100);
        var formData = new FormData();
        formData.append('file', blob, safeName);
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder + '/' + token);
        
        var response = await fetch(
            'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/auto/upload',
            { method: 'POST', body: formData }
        );
        if (!response.ok) throw new Error('Upload failed');
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

    _getVault: function() {
        try {
            var data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch(e) { return {}; }
    }
};
