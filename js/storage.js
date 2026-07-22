var SecureStorageManager = {
    cloudinaryConfig: {
        cloudName: 'e6cszezf',
        uploadPreset: 'vault_documents',
        folder: 'secure-vault'
    },

    saveProduct: async function(token, productData) {
        if (productData.files && productData.files.length > 0) {
            var uploadedFiles = await this._uploadFiles(productData.files, token);
            productData.files = uploadedFiles;
        }
        
        await this._saveMetadata(token, productData);
        await this._addToTokenList(token, productData.name);
        return true;
    },

    getProduct: async function(token) {
        // Intentar metadata.json
        var urls = [
            'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + '/raw/upload/' + this.cloudinaryConfig.folder + '/' + token + '/metadata.json',
            'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + '/raw/upload/v1/' + this.cloudinaryConfig.folder + '/' + token + '/metadata.json'
        ];
        
        for (var i = 0; i < urls.length; i++) {
            try {
                var response = await fetch(urls[i]);
                if (response.ok) {
                    var data = await response.json();
                    console.log('✅ Encontrado en:', urls[i]);
                    return data;
                }
            } catch(e) {}
        }
        
        console.log('❌ No se encontro metadata para token:', token);
        return null;
    },

    getAllTokens: async function() {
        var urls = [
            'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + '/raw/upload/' + this.cloudinaryConfig.folder + '/token_list.json',
            'https://res.cloudinary.com/' + this.cloudinaryConfig.cloudName + '/raw/upload/v1/' + this.cloudinaryConfig.folder + '/token_list.json'
        ];
        
        for (var i = 0; i < urls.length; i++) {
            try {
                var response = await fetch(urls[i]);
                if (response.ok) return await response.json();
            } catch(e) {}
        }
        return [];
    },

    getAllRecords: async function() {
        var tokens = await this.getAllTokens();
        var records = {};
        for (var i = 0; i < tokens.length; i++) {
            var meta = await this.getProduct(tokens[i].token);
            if (meta) {
                records[tokens[i].token] = meta;
            }
        }
        return records;
    },

    _saveMetadata: async function(token, data) {
        var metadata = {
            name: data.name, description: data.description || '', date: data.date,
            category: data.category || 'general', tags: data.tags || [],
            files: (data.files || []).map(function(f) {
                return { name: f.name, type: f.type, size: f.size, url: f.url };
            }),
            links: data.links || [],
            created: data.metadata ? data.metadata.created : new Date().toISOString()
        };
        
        var blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
        var formData = new FormData();
        formData.append('file', blob, 'metadata.json');
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder + '/' + token);
        
        try {
            var response = await fetch(
                'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/raw/upload',
                { method: 'POST', body: formData }
            );
            var result = await response.json();
            console.log('✅ Metadata guardada:', result.secure_url);
            return result;
        } catch(e) {
            console.error('Error guardando metadata:', e);
        }
    },

    _addToTokenList: async function(token, name) {
        var tokens = await this.getAllTokens();
        var exists = tokens.some(function(t) { return t.token === token; });
        if (!exists) {
            tokens.push({ token: token, name: name, added: new Date().toISOString() });
        }
        
        var blob = new Blob([JSON.stringify(tokens)], { type: 'application/json' });
        var formData = new FormData();
        formData.append('file', blob, 'token_list.json');
        formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
        formData.append('folder', this.cloudinaryConfig.folder);
        
        try {
            var response = await fetch(
                'https://api.cloudinary.com/v1_1/' + this.cloudinaryConfig.cloudName + '/raw/upload',
                { method: 'POST', body: formData }
            );
            var result = await response.json();
            console.log('✅ Token list actualizada:', result.secure_url);
            localStorage.setItem('va_token_list_url', result.secure_url);
            return result;
        } catch(e) {
            console.error('Error guardando token list:', e);
        }
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
            } catch(e) {}
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
        console.log('✅ Archivo subido:', result.secure_url);
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
