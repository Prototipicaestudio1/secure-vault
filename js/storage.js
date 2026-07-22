var SecureStorageManager = {
    cloudinaryConfig: {
        cloudName: 'e6cszezf',
        uploadPreset: 'vault_documents',
        folder: 'secure-vault'
    },

    // Guardar producto - TODO a Cloudinary
    saveProduct: async function(token, productData) {
        // Subir archivos
        if (productData.files && productData.files.length > 0) {
            var uploadedFiles = await this._uploadFiles(productData.files, token);
            productData.files = uploadedFiles;
        }
        
        // Guardar metadatos completos en Cloudinary
        await this._saveMetadata(token, productData);
        
        // Guardar token en lista maestra
        await this._addToTokenList(token, productData.name);
        
        return true;
    },

    // Obtener producto - TODO desde Cloudinary
    getProduct: async function(token) {
        // Siempre buscar en Cloudinary
        var metadata = await this._getMetadata(token);
        if (metadata) return metadata;
        return null;
    },

    // Obtener todos los tokens
    getAllTokens: async function() {
        return await this._getTokenList();
    },

    // Obtener todos los registros
    getAllRecords: async function() {
        var tokens = await this._getTokenList();
        var records = {};
        
        for (var i = 0; i < tokens.length; i++) {
            var meta = await this._getMetadata(tokens[i]);
            if (meta) {
                records[tokens[i]] = meta;
                records[tokens[i]].token = tokens[i];
                records[tokens[i]].timestamp = Date.now();
            }
        }
        return records;
    },

    // ============ CLOUDINARY ============

    _saveMetadata: async function(token, data) {
        var metadata = {
            name: data.name,
            description: data.description || '',
            date: data.date,
            category: data.category || 'general',
            tags: data.tags || [],
            files: (data.files || []).map(function(f) {
                return { name: f.name, type: f.type, size: f.size, url: f.url || f.data };
            }),
            links: data.links || [],
            created: data.metadata ? data.metadata.created : new Date().toISOString(),
            version: '5.0'
        };
        
        var blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        var formData = new FormData();
        formData.append('file', blob, 'metadata.json');
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder + '/' + token);
        formData.append('public_id', 'metadata');
        formData.append('overwrite', 'true');
        
        await fetch(
            'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/raw/upload',
            { method: 'POST', body: formData }
        );
    },

    _getMetadata: async function(token) {
        var url = 'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + 
                  '/raw/upload/v1/' + this.cloudinaryConfig.folder + '/' + token + '/metadata.json';
        try {
            var response = await fetch(url);
            if (response.ok) return await response.json();
        } catch(e) {}
        return null;
    },

    _addToTokenList: async function(token, name) {
        var tokens = await this._getTokenList();
        
        // Evitar duplicados
        var exists = tokens.some(function(t) { return t.token === token; });
        if (!exists) {
            tokens.push({ token: token, name: name, added: new Date().toISOString() });
        }
        
        var blob = new Blob([JSON.stringify(tokens)], { type: 'application/json' });
        var formData = new FormData();
        formData.append('file', blob, 'tokens.json');
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder);
        formData.append('public_id', 'token_list');
        formData.append('overwrite', 'true');
        
        await fetch(
            'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/raw/upload',
            { method: 'POST', body: formData }
        );
    },

    _getTokenList: async function() {
        var url = 'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + 
                  '/raw/upload/v1/' + this.cloudinaryConfig.folder + '/token_list.json';
        try {
            var response = await fetch(url);
            if (response.ok) return await response.json();
        } catch(e) {}
        return [];
    },

    _uploadFiles: async function(files, token) {
        var uploadedFiles = [];
        for (var i = 0; i < files.length; i++) {
            try {
                var url = await this._uploadSingleFile(files[i], token);
                uploadedFiles.push({
                    name: files[i].name, type: files[i].type, size: files[i].size,
                    url: url, uploadedAt: new Date().toISOString()
                });
            } catch(e) {
                console.error('Error subiendo:', files[i].name, e);
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
    }
};
