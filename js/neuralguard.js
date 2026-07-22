// ============================================
// RED NEURAL DE DEFENSA - Secure Vault v4.0
// Deteccion por comportamiento y aprendizaje
// ============================================
var NeuralGuard = {
    // Modelo de comportamiento del usuario
    profile: {
        typingSpeed: [],        // ms entre teclas
        mousePattern: [],       // patrones de movimiento
        activeHours: [],        // horas de uso habitual
        avgSessionLength: 0,    // duracion media de sesion
        commonActions: [],      // acciones frecuentes
        anomalyScore: 0         // puntuacion de anomalia actual
    },

    // Base de conocimiento de amenazas
    threatDB: {
        knownPatterns: [],
        falsePositives: [],
        learningRate: 0.01
    },

    state: {
        isLearning: true,
        samplesCollected: parseInt(localStorage.getItem('nn_samples') || '0'),
        profileLoaded: false,
        lastAnomaly: null
    },

    // Inicializar red neuronal
    init: function() {
        this._loadProfile();
        this._startLearning();
        this._monitorBehavior();
        console.log('🧠 NeuralGuard activo - Aprendiendo patrones...');
    },

    // Aprender comportamiento del usuario
    learn: function(action, data) {
        if (!this.state.isLearning) return;

        switch(action) {
            case 'keystroke':
                this.profile.typingSpeed.push(data.speed);
                if (this.profile.typingSpeed.length > 100) {
                    this.profile.typingSpeed.shift();
                }
                break;
            case 'mousemove':
                this.profile.mousePattern.push({
                    x: data.x,
                    y: data.y,
                    time: Date.now()
                });
                if (this.profile.mousePattern.length > 50) {
                    this.profile.mousePattern.shift();
                }
                break;
            case 'action':
                this.profile.commonActions.push({
                    action: data.action,
                    time: new Date().getHours()
                });
                if (this.profile.commonActions.length > 50) {
                    this.profile.commonActions.shift();
                }
                break;
        }

        this.state.samplesCollected++;
        if (this.state.samplesCollected % 10 === 0) {
            localStorage.setItem('nn_samples', this.state.samplesCollected);
            this._saveProfile();
        }
    },

    // Detectar anomalias en tiempo real
    detectAnomaly: function(action, data) {
        var score = 0;
        var reasons = [];

        // 1. Velocidad de escritura anormal
        if (action === 'keystroke' && this.profile.typingSpeed.length > 10) {
            var avgSpeed = this._average(this.profile.typingSpeed);
            var deviation = Math.abs(data.speed - avgSpeed) / avgSpeed;
            if (deviation > 0.5) {
                score += 0.3;
                reasons.push('Velocidad de escritura anormal: ' + (deviation * 100).toFixed(0) + '%');
            }
        }

        // 2. Patron de mouse erratico
        if (action === 'mousemove' && this.profile.mousePattern.length > 20) {
            var recentPatterns = this.profile.mousePattern.slice(-10);
            var avgX = this._average(recentPatterns.map(function(p) { return p.x; }));
            var deviationX = Math.abs(data.x - avgX);
            if (deviationX > 200) {
                score += 0.2;
                reasons.push('Movimiento de mouse erratico');
            }
        }

        // 3. Hora inusual
        var currentHour = new Date().getHours();
        if (this.profile.activeHours.length > 0) {
            var isUsualHour = this.profile.activeHours.some(function(h) {
                return Math.abs(h - currentHour) <= 2;
            });
            if (!isUsualHour && this.state.samplesCollected > 20) {
                score += 0.25;
                reasons.push('Hora de acceso inusual: ' + currentHour + ':00');
            }
        }

        // 4. Secuencia de acciones sospechosa
        if (data.actionSequence) {
            var suspiciousSequences = [
                ['login_fail', 'login_fail', 'login_fail'],
                ['rapid_click', 'rapid_click', 'rapid_click'],
                ['token_search', 'token_search', 'token_search', 'token_search']
            ];
            
            suspiciousSequences.forEach(function(seq) {
                if (data.actionSequence.join(',').includes(seq.join(','))) {
                    score += 0.4;
                    reasons.push('Secuencia de acciones sospechosa');
                }
            });
        }

        // Actualizar puntuacion
        this.profile.anomalyScore = Math.min(1, score);
        
        if (score > 0.6) {
            this.state.lastAnomaly = {
                time: new Date().toISOString(),
                score: score,
                reasons: reasons
            };
            
            // Escalar amenaza al Defender
            if (typeof Defender !== 'undefined') {
                Defender.escalateThreat('NeuralGuard', score > 0.8 ? 'high' : 'medium');
            }
            
            console.warn('🧠 Anomalia detectada:', reasons.join(', '), 'Score:', score.toFixed(2));
        }

        return {
            anomaly: score > 0.5,
            score: score,
            reasons: reasons,
            profileLoaded: this.state.profileLoaded
        };
    },

    // Panel de estado neuronal
    getStatus: function() {
        return {
            samples: this.state.samplesCollected,
            profileReady: this.state.samplesCollected > 30,
            anomalyScore: this.profile.anomalyScore,
            status: this.state.samplesCollected < 10 ? '🟡 Aprendiendo...' :
                    this.profile.anomalyScore > 0.5 ? '🔴 Anomalia detectada' : '🟢 Normal',
            lastAnomaly: this.state.lastAnomaly
        };
    },

    // Forzar reaprendizaje
    resetProfile: function() {
        this.profile = {
            typingSpeed: [],
            mousePattern: [],
            activeHours: [],
            avgSessionLength: 0,
            commonActions: [],
            anomalyScore: 0
        };
        this.state.samplesCollected = 0;
        localStorage.removeItem('nn_profile');
        localStorage.removeItem('nn_samples');
        console.log('🧠 Perfil neuronal reseteado');
    },

    // ============= INTERNO =============

    _startLearning: function() {
        var self = this;

        // Aprender velocidad de escritura
        var lastKeyTime = Date.now();
        document.addEventListener('keydown', function(e) {
            var now = Date.now();
            var speed = now - lastKeyTime;
            lastKeyTime = now;
            
            if (speed < 1000 && speed > 10) {
                self.learn('keystroke', { speed: speed });
                self.detectAnomaly('keystroke', { speed: speed });
            }
        });

        // Aprender patrones de mouse
        document.addEventListener('mousemove', function(e) {
            if (Math.random() < 0.1) { // Muestrear 10%
                self.learn('mousemove', { x: e.clientX, y: e.clientY });
                self.detectAnomaly('mousemove', { x: e.clientX, y: e.clientY });
            }
        });

        // Registrar horas de actividad
        var currentHour = new Date().getHours();
        if (this.profile.activeHours.indexOf(currentHour) === -1) {
            this.profile.activeHours.push(currentHour);
        }

        // Marcar perfil como cargado
        if (this.state.samplesCollected > 30) {
            this.state.profileLoaded = true;
        }
    },

    _monitorBehavior: function() {
        var self = this;
        var actionHistory = [];

        // Monitorear acciones
        var originalShowView = window.showView;
        if (originalShowView) {
            window.showView = function(view) {
                self.learn('action', { action: 'view_' + view });
                actionHistory.push('view_' + view);
                if (actionHistory.length > 10) actionHistory.shift();
                
                self.detectAnomaly('mousemove', { 
                    actionSequence: actionHistory 
                });
                
                originalShowView(view);
            };
        }
    },

    _saveProfile: function() {
        try {
            localStorage.setItem('nn_profile', JSON.stringify({
                activeHours: this.profile.activeHours,
                avgTypingSpeed: this._average(this.profile.typingSpeed),
                samples: this.state.samplesCollected
            }));
        } catch(e) {}
    },

    _loadProfile: function() {
        try {
            var saved = JSON.parse(localStorage.getItem('nn_profile'));
            if (saved) {
                this.profile.activeHours = saved.activeHours || [];
                this.state.samplesCollected = saved.samples || 0;
                this.state.profileLoaded = this.state.samplesCollected > 30;
            }
        } catch(e) {}
    },

    _average: function(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    NeuralGuard.init();
});

console.log('🧠 NeuralGuard cargado - IA de defensa activa');
