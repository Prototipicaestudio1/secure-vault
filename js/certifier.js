// ============================================
// CERTIFICACION DIGITAL - Secure Vault v4.0
// Sellos de tiempo y cadena de custodia
// ============================================
var Certifier = {
    // Sellar un documento con timestamp
    seal: async function(token, data) {
        var seal = {
            token: token,
            timestamp: Date.now(),
            date: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hash: await IntegrityGuard.hashData(data),
            certificateId: this._generateCertificateId(),
            nonce: this._generateNonce(),
            version: '4.0'
        };

        // Guardar sello
        var seals = JSON.parse(localStorage.getItem('ct_seals') || '{}');
        seals[token] = seal;
        localStorage.setItem('ct_seals', JSON.stringify(seals));

        // Crear cadena de custodia
        this._addToCustodyChain(token, 'SEALED', seal.certificateId);

        return seal;
    },

    // Verificar sello
    verify: async function(token, data) {
        var seals = JSON.parse(localStorage.getItem('ct_seals') || '{}');
        var seal = seals[token];
        
        if (!seal) {
            return { valid: false, reason: 'Sin sello de certificacion' };
        }

        var currentHash = await IntegrityGuard.hashData(data);
        
        if (currentHash !== seal.hash) {
            return { 
                valid: false, 
                reason: 'Documento alterado despues del sellado',
                sealedDate: seal.date,
                sealedHash: seal.hash,
                currentHash: currentHash
            };
        }

        return {
            valid: true,
            certificateId: seal.certificateId,
            sealedDate: seal.date,
            timezone: seal.timezone,
            hash: seal.hash
        };
    },

    // Cadena de custodia
    getCustodyChain: function(token) {
        var chain = JSON.parse(localStorage.getItem('ct_chain_' + token) || '[]');
        return chain.map(function(entry) {
            return {
                action: entry.action,
                date: new Date(entry.timestamp).toLocaleString(),
                certificate: entry.certificateId || 'N/A',
                details: entry.details || ''
            };
        });
    },

    // Generar reporte de certificacion
    generateReport: async function(token, data) {
        var seal = await this.verify(token, data);
        var chain = this.getCustodyChain(token);
        
        return {
            reportId: 'RPT-' + Date.now().toString(36).toUpperCase(),
            generatedAt: new Date().toISOString(),
            certificate: seal,
            custodyChain: chain,
            documentInfo: {
                token: token,
                name: data.name || 'Desconocido',
                date: data.date || 'Sin fecha',
                files: data.files ? data.files.length : 0
            },
            status: seal.valid ? '✅ VERIFICADO' : '❌ ALTERADO'
        };
    },

    // Exportar certificado
    exportCertificate: async function(token, data) {
        var report = await this.generateReport(token, data);
        var blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'certificate-' + token.substring(0, 8) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        return true;
    },

    // Estadisticas
    getStats: function() {
        var seals = JSON.parse(localStorage.getItem('ct_seals') || '{}');
        var total = Object.keys(seals).length;
        
        return {
            totalCertified: total,
            lastCertification: total > 0 ? 
                Object.values(seals).sort(function(a, b) { return b.timestamp - a.timestamp; })[0].date : 
                'Ninguna',
            activeCertificates: total,
            revokedCertificates: 0
        };
    },

    // ============= INTERNO =============

    _addToCustodyChain: function(token, action, certificateId, details) {
        var chain = JSON.parse(localStorage.getItem('ct_chain_' + token) || '[]');
        chain.push({
            timestamp: Date.now(),
            action: action,
            certificateId: certificateId || null,
            details: details || ''
        });
        if (chain.length > 50) chain = chain.slice(-50);
        localStorage.setItem('ct_chain_' + token, JSON.stringify(chain));
    },

    _generateCertificateId: function() {
        return 'CERT-' + Date.now().toString(36).toUpperCase() + '-' +
               Math.random().toString(36).substring(2, 8).toUpperCase();
    },

    _generateNonce: function() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
};

console.log('📜 Certifier cargado - Sellos digitales listos');
