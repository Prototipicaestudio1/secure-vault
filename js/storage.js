var SecureStorageManager = {
    STORAGE_KEY: 'secure_vault_products',
    cloudinaryConfig: {
        cloudName: 'e6cszezf',
        uploadPreset: 'vault_documents',
        folder: 'secure-vault'
    },

    saveProduct: async function(token, productData) {
        if (productData.files && productData.files.length > 0) {
            for (var i = 0; i < productData.files.length; i++) {
                if (productData.files[i].data) {
                    try {
                        var url = await this._uploadFile(productData.files[i], token);
                        productData.files[i].url = url;
                    } catch(e) {}
                }
            }
        }
        
        var vault = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        vault[token] = productData;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vault));
        
        // Auto-descargar backup
        this._autoBackup();
        
        return true;
    },

    getProduct: async function(token) {
        var vault = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        return vault[token] || null;
    },

    getAllTokens: function() {
        var vault = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
        return Object.keys(vault);
    },

    getAllRecords: function() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    },

    // Exportar todos los tokens a archivo
    exportVault: function() {
        var vault = localStorage.getItem(this.STORAGE_KEY) || '{}';
        var blob = new Blob([vault], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'secure-vault-backup-' + new Date().toISOString().slice(0,10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    },

    // Importar tokens desde archivo
    importVault: function(file) {
        var self = this;
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    var existing = JSON.parse(localStorage.getItem(self.STORAGE_KEY) || '{}');
                    var merged = Object.assign({}, existing, data);
                    localStorage.setItem(self.STORAGE_KEY, JSON.stringify(merged));
                    resolve(Object.keys(data).length);
                } catch(err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    _uploadFile: async function(file, token) {
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
        var result = await response.json();
        return result.secure_url;
    },

    _autoBackup: function() {
        try {
            var vault = localStorage.getItem(this.STORAGE_KEY);
            localStorage.setItem('va_last_backup', JSON.stringify({
                time: new Date().toISOString(),
                tokens: Object.keys(JSON.parse(vault || '{}')).length
            }));
        } catch(e) {}
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
