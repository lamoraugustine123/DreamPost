/* DreamPost Admin Companion - Interaction Engine */

class AdminCompanion {
    constructor() {
        this.currentPersona = localStorage.getItem('companion_persona') || 'Robot';
        this.level = parseInt(localStorage.getItem('companion_level') || '1');
        this.xp = parseInt(localStorage.getItem('companion_xp') || '0');
        this.soundMuted = localStorage.getItem('companion_sound_muted') === 'true';
        this.isTyping = false;
        this.typingTimeout = null;
        this.mousePos = { x: 0, y: 0 };
        this.widgetPos = { x: window.innerWidth - 120, y: window.innerHeight - 120 };
        this.targetWidgetPos = { ...this.widgetPos };
        this.lastMouseTime = Date.now();
        this.lastMousePos = { x: 0, y: 0 };
        this.currentState = 'breathe'; // breathe, run, jump, dance, glitch, teleport
        this.isInteracting = false;
        
        // Web Audio Context (initialized on first interaction)
        this.audioCtx = null;
        
        // Initialize DOM Elements
        this.initDOM();
        this.initEvents();
        this.setPersona(this.currentPersona);
        this.updateXPUI();
        
        // Start main update loop (for smooth tracking/physics)
        this.startLoop();
        
        // Initial Greeting
        setTimeout(() => {
            this.speak(this.getGreeting(), 4000);
        }, 1500);
    }
    
    // Initialize Web Audio Context
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }
    
    // Web Audio Synthesizer
    playSound(type) {
        if (this.soundMuted) return;
        try {
            this.initAudio();
            const ctx = this.audioCtx;
            const now = ctx.currentTime;
            
            switch (type) {
                case 'beep': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now); // A5
                    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.12);
                    break;
                }
                case 'clink': {
                    const osc1 = ctx.createOscillator();
                    const osc2 = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc1.type = 'triangle';
                    osc1.frequency.setValueAtTime(1200, now);
                    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.15);
                    
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(2500, now);
                    osc2.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                    
                    gain.gain.setValueAtTime(0.05, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                    
                    osc1.connect(gain);
                    osc2.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc1.start(now);
                    osc2.start(now);
                    osc1.stop(now + 0.18);
                    osc2.stop(now + 0.18);
                    break;
                }
                case 'scribble': {
                    // Generate white noise bursts for pencil scribble
                    const bufferSize = ctx.sampleRate * 0.15;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    
                    const noise = ctx.createBufferSource();
                    noise.buffer = buffer;
                    
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'bandpass';
                    filter.frequency.value = 1000;
                    filter.Q.value = 3.0;
                    
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.04, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                    
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    
                    noise.start(now);
                    noise.stop(now + 0.15);
                    break;
                }
                case 'boing': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.quadraticRampToValueAtTime(660, now + 0.3);
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.35);
                    break;
                }
                case 'whoosh': {
                    const bufferSize = ctx.sampleRate * 0.4;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        data[i] = Math.random() * 2 - 1;
                    }
                    
                    const noise = ctx.createBufferSource();
                    noise.buffer = buffer;
                    
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'peaking';
                    filter.frequency.setValueAtTime(150, now);
                    filter.frequency.exponentialRampToValueAtTime(2500, now + 0.38);
                    filter.Q.value = 4.0;
                    
                    const gain = ctx.createGain();
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    
                    noise.start(now);
                    noise.stop(now + 0.4);
                    break;
                }
                case 'glitch': {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(100, now);
                    osc.frequency.setValueAtTime(500, now + 0.05);
                    osc.frequency.setValueAtTime(80, now + 0.1);
                    osc.frequency.setValueAtTime(1000, now + 0.15);
                    
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.setValueAtTime(0.02, now + 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.22);
                    break;
                }
                case 'success': {
                    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                    notes.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                        gain.gain.setValueAtTime(0.06, now + idx * 0.1);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now + idx * 0.1);
                        osc.stop(now + idx * 0.1 + 0.25);
                    });
                    break;
                }
            }
        } catch (e) {
            console.warn('Sound synthesis error:', e);
        }
    }
    
    // Create DOM Elements for Companion Widget and Chat Panel
    initDOM() {
        // Blueprint background overlay grid
        this.blueprintOverlay = document.createElement('div');
        this.blueprintOverlay.className = 'blueprint-grid-overlay';
        document.body.appendChild(this.blueprintOverlay);
        
        // Floating widget container
        this.widget = document.createElement('div');
        this.widget.id = 'admin-companion-widget';
        this.widget.style.left = `${this.widgetPos.x}px`;
        this.widget.style.top = `${this.widgetPos.y}px`;
        
        this.avatar = document.createElement('div');
        this.avatar.className = 'companion-avatar state-breathe';
        this.widget.appendChild(this.avatar);
        
        // Sound toggle badge
        this.soundToggle = document.createElement('div');
        this.soundToggle.className = 'companion-sound-toggle';
        this.soundToggle.innerHTML = this.soundMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
        this.widget.appendChild(this.soundToggle);
        
        // Mini XP Bar
        this.xpMini = document.createElement('div');
        this.xpMini.className = 'companion-xp-mini';
        this.xpMiniFill = document.createElement('div');
        this.xpMiniFill.className = 'companion-xp-mini-fill';
        this.xpMini.appendChild(this.xpMiniFill);
        this.widget.appendChild(this.xpMini);
        
        // Speech Bubble
        this.bubble = document.createElement('div');
        this.bubble.className = 'companion-bubble';
        this.widget.appendChild(this.bubble);
        
        document.body.appendChild(this.widget);
        
        // Chat panel sidebar
        this.chatPanel = document.createElement('div');
        this.chatPanel.className = 'companion-chat-panel';
        this.chatPanel.innerHTML = `
            <div class="companion-chat-header">
                <h3><i class="fas fa-robot"></i> Dream Companion <span class="badge badge-info" id="companion-level-label">Lv. ${this.level}</span></h3>
                <button class="companion-close-chat" id="companionCloseChatBtn"><i class="fas fa-times"></i></button>
            </div>
            <div class="persona-selector-row">
                <button class="persona-pill" data-persona="Robot"><i class="fas fa-cog"></i> Robot</button>
                <button class="persona-pill" data-persona="Scientist"><i class="fas fa-microscope"></i> Scientist</button>
                <button class="persona-pill" data-persona="Engineer"><i class="fas fa-wrench"></i> Engineer</button>
            </div>
            <div class="companion-chat-messages" id="companionChatMsgs">
                <div class="chat-msg companion">
                    Hi! I'm your DreamPost companion. Switch my persona above or chat with me here! Try typing 'repair UI' or 'status'.
                </div>
            </div>
            <div class="companion-chat-footer">
                <div class="companion-xp-card">
                    <div class="companion-xp-header">
                        <span>XP PROGRESS</span>
                        <span id="companion-xp-label">${this.xp}/100</span>
                    </div>
                    <div class="companion-xp-bar">
                        <div class="companion-xp-fill" id="companionXpFill"></div>
                    </div>
                </div>
                <form class="companion-input-form" id="companionInputForm" autocomplete="off">
                    <input type="text" class="companion-chat-input" id="companionChatInput" placeholder="Ask me something..." required />
                    <button type="submit" class="companion-send-btn"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        `;
        document.body.appendChild(this.chatPanel);
    }
    
    // Hook UI and keyboard/mouse actions
    initEvents() {
        // Toggle sound
        this.soundToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.soundMuted = !this.soundMuted;
            localStorage.setItem('companion_sound_muted', this.soundMuted);
            this.soundToggle.innerHTML = this.soundMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
            this.playSound('beep');
        });
        
        // Widget click -> open chat panel or trigger reaction
        this.widget.addEventListener('click', (e) => {
            this.initAudio();
            if (e.target.closest('.companion-sound-toggle')) return;
            
            this.triggerState('jump');
            this.gainXP(5);
            
            // Toggle chat panel
            this.chatPanel.classList.toggle('open');
            this.playSound('boing');
        });
        
        // Close chat button
        document.getElementById('companionCloseChatBtn').addEventListener('click', () => {
            this.chatPanel.classList.remove('open');
            this.playSound('beep');
        });
        
        // Persona Pills click
        this.chatPanel.querySelectorAll('.persona-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const targetPersona = pill.getAttribute('data-persona');
                this.setPersona(targetPersona);
                this.playSound(targetPersona === 'Robot' ? 'beep' : targetPersona === 'Scientist' ? 'scribble' : 'clink');
                this.triggerState('teleport');
                this.speak(`COMMUTING PERSONA: Embodying ${targetPersona}!`, 3000);
            });
        });
        
        // Form Submit
        document.getElementById('companionInputForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('companionChatInput');
            const message = input.value.trim();
            if (!message) return;
            
            this.sendUserMessage(message);
            input.value = '';
        });
        
        // Monitor system-wide typing state to trigger "listening" animation
        document.body.addEventListener('input', (e) => {
            if (e.target.closest('#companionChatInput')) return;
            this.isTyping = true;
            this.triggerState('breathe');
            
            // Set faster pulse breathing for avatar when typing
            this.avatar.style.animationDuration = '1.2s';
            
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.isTyping = false;
                this.avatar.style.animationDuration = '3s';
            }, 1500);
        });
        
        // Track mouse coordinates
        document.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            // Calculate cursor velocity
            const now = Date.now();
            const dt = now - this.lastMouseTime;
            if (dt > 20) {
                const dx = e.clientX - this.lastMousePos.x;
                const dy = e.clientY - this.lastMousePos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const velocity = dist / dt; // pixels per ms
                
                // If cursor moves extremely fast, companion runs!
                if (velocity > 1.8 && this.currentState !== 'run' && !this.isInteracting) {
                    this.triggerState('run');
                    // Reset to normal breathe after 1 second
                    clearTimeout(this.runStateTimeout);
                    this.runStateTimeout = setTimeout(() => {
                        if (this.currentState === 'run') this.triggerState('breathe');
                    }, 1000);
                }
                
                // Mouse tracking coordinate for eyes
                this.updateEyeDirection(e.clientX, e.clientY);
                
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.lastMouseTime = now;
            }
        });
        
        // Listen to navigation section switches or table clicks to wave companion
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.nav-item, .btn, .tab-btn');
            if (button && !e.target.closest('#admin-companion-widget') && !e.target.closest('.companion-chat-panel')) {
                // Bounce widget to acknowledge action
                if (!this.isInteracting) {
                    this.triggerState('jump');
                    this.spawnParticles(this.widgetPos.x + 45, this.widgetPos.y + 45, this.getAccentColor(), 'spark', 5);
                }
            }
        });
        
        // Keep screen bounds in check on resize
        window.addEventListener('resize', () => {
            this.widgetPos.x = Math.min(this.widgetPos.x, window.innerWidth - 120);
            this.widgetPos.y = Math.min(this.widgetPos.y, window.innerHeight - 120);
            this.targetWidgetPos = { ...this.widgetPos };
        });
    }
    
    // Set Persona and load custom SVG markup
    setPersona(persona) {
        this.currentPersona = persona;
        localStorage.setItem('companion_persona', persona);
        
        // Update pills selection
        this.chatPanel.querySelectorAll('.persona-pill').forEach(pill => {
            if (pill.getAttribute('data-persona') === persona) {
                pill.classList.add('active');
            } else {
                pill.classList.remove('active');
            }
        });
        
        // Render corresponding SVG
        this.avatar.innerHTML = this.getPersonaSVG(persona);
    }
    
    // Get corresponding HTML SVG code with neon colors, cute eyes, and accessories
    getPersonaSVG(persona) {
        if (persona === 'Robot') {
            return `
                <svg class="companion-svg" viewBox="0 0 100 100">
                    <defs>
                        <radialGradient id="robotGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#1e293b"/>
                            <stop offset="100%" stop-color="#0f172a"/>
                        </radialGradient>
                        <filter id="robotGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                            <blur stdDeviation="2"/>
                        </filter>
                    </defs>
                    <!-- Floating Ear Antennae -->
                    <rect x="15" y="40" width="10" height="20" rx="3" fill="#64748b" />
                    <rect x="75" y="40" width="10" height="20" rx="3" fill="#64748b" />
                    <!-- Head Outer Shield -->
                    <rect x="22" y="25" width="56" height="52" rx="16" fill="url(#robotGrad)" stroke="var(--robot-primary)" stroke-width="3.5" />
                    <!-- Neon Head Glass Shield -->
                    <rect x="28" y="32" width="44" height="38" rx="10" fill="#090d16" stroke="#4facfe" stroke-width="1.5" />
                    <!-- Eye Base Plate -->
                    <g id="companion-eyes">
                        <!-- Neon Glowing Eyes -->
                        <ellipse cx="40" cy="50" rx="6" ry="6" fill="#00e5ff" filter="url(#robotGlowFilter)" class="eye-left" />
                        <ellipse cx="40" cy="50" rx="2" ry="2" fill="white" class="pupil-left" />
                        
                        <ellipse cx="60" cy="50" rx="6" ry="6" fill="#00e5ff" filter="url(#robotGlowFilter)" class="eye-right" />
                        <ellipse cx="60" cy="50" rx="2" ry="2" fill="white" class="pupil-right" />
                    </g>
                    <!-- Digital Mouth Line -->
                    <path d="M 42 62 Q 50 66 58 62" fill="none" stroke="#00f2fe" stroke-width="2.5" stroke-linecap="round" id="companion-mouth" />
                    <!-- Light Top Antenna -->
                    <line x1="50" y1="25" x2="50" y2="12" stroke="#64748b" stroke-width="3" />
                    <circle cx="50" cy="10" r="5" fill="#00f2fe" filter="url(#robotGlowFilter)" />
                </svg>
            `;
        } else if (persona === 'Scientist') {
            return `
                <svg class="companion-svg" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="scGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#3b0764"/>
                            <stop offset="100%" stop-color="#1e1b4b"/>
                        </linearGradient>
                        <filter id="scientistGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <blur stdDeviation="3"/>
                        </filter>
                    </defs>
                    <!-- Liquid Beaker Outer Body -->
                    <path d="M 50 15 L 30 75 A 20 20 0 0 0 70 75 Z" fill="url(#scGrad)" stroke="var(--scientist-primary)" stroke-width="3" />
                    <!-- Bubbling Liquid level -->
                    <path d="M 36 56 Q 50 50 64 56 L 68 75 A 18 18 0 0 1 32 75 Z" fill="#22c55e" opacity="0.8" />
                    <circle cx="45" cy="62" r="3" fill="#ffffff" opacity="0.6" />
                    <circle cx="54" cy="68" r="2" fill="#ffffff" opacity="0.6" />
                    
                    <!-- Cute Scientist Goggles -->
                    <g id="companion-eyes">
                        <circle cx="40" cy="45" r="9" fill="none" stroke="#fbbf24" stroke-width="2.5" />
                        <circle cx="40" cy="45" r="4" fill="#a855f7" class="eye-left" />
                        <circle cx="40" cy="45" r="1.5" fill="white" class="pupil-left" />
                        
                        <circle cx="60" cy="45" r="9" fill="none" stroke="#fbbf24" stroke-width="2.5" />
                        <circle cx="60" cy="45" r="4" fill="#a855f7" class="eye-right" />
                        <circle cx="60" cy="45" r="1.5" fill="white" class="pupil-right" />
                        
                        <line x1="49" y1="45" x2="51" y2="45" stroke="#fbbf24" stroke-width="2.5" />
                    </g>
                    <!-- Pensive Smile -->
                    <path d="M 45 54 Q 50 57 55 54" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" id="companion-mouth" />
                </svg>
            `;
        } else if (persona === 'Engineer') {
            return `
                <svg class="companion-svg" viewBox="0 0 100 100">
                    <defs>
                        <radialGradient id="engGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stop-color="#451a03"/>
                            <stop offset="100%" stop-color="#180801"/>
                        </radialGradient>
                    </defs>
                    <!-- Hard Hat Helmet -->
                    <path d="M 22 36 A 28 28 0 0 1 78 36 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1.5" />
                    <rect x="18" y="34" width="64" height="6" rx="3" fill="#eab308" />
                    <rect x="47" y="16" width="6" height="18" fill="#ca8a04" />
                    
                    <!-- Heavy Construction Visor Goggles -->
                    <rect x="26" y="42" width="48" height="18" rx="5" fill="#f97316" stroke="#ea580c" stroke-width="2" opacity="0.9" />
                    <g id="companion-eyes">
                        <ellipse cx="38" cy="51" rx="4" ry="4" fill="black" class="eye-left" />
                        <circle cx="39" cy="50" r="1.2" fill="white" class="pupil-left" />
                        
                        <ellipse cx="62" cy="51" rx="4" ry="4" fill="black" class="eye-right" />
                        <circle cx="63" cy="50" r="1.2" fill="white" class="pupil-right" />
                    </g>
                    
                    <!-- Rugged Wrench/Hammer Icon on helmet -->
                    <path d="M 45 28 L 55 28 L 50 22 Z" fill="#1e293b" />
                    
                    <!-- Confident Smile -->
                    <path d="M 44 68 Q 50 73 56 68" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" id="companion-mouth" />
                    
                    <!-- Neck/Base Plates -->
                    <rect x="36" y="72" width="28" height="12" rx="4" fill="#334155" />
                </svg>
            `;
        }
    }
    
    // Shift pupils to track mouse
    updateEyeDirection(mx, my) {
        const eyes = this.avatar.querySelector('#companion-eyes');
        if (!eyes) return;
        
        const rect = this.widget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        
        const angle = Math.atan2(my - cy, mx - cx);
        const distance = Math.min(2.5, Math.sqrt((mx-cx)*(mx-cx) + (my-cy)*(my-cy)) / 60);
        
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        
        const leftPupil = eyes.querySelector('.pupil-left');
        const rightPupil = eyes.querySelector('.pupil-right');
        
        if (leftPupil && rightPupil) {
            // Apply translations to the pupils
            leftPupil.style.transform = `translate(${dx}px, ${dy}px)`;
            rightPupil.style.transform = `translate(${dx}px, ${dy}px)`;
        }
    }
    
    // Change animation state (handles cleanup, layout shifts, sound triggers)
    triggerState(state) {
        if (this.currentState === 'teleport' && state !== 'breathe') return;
        
        // Remove existing animation state classes
        this.avatar.className = 'companion-avatar';
        
        this.currentState = state;
        
        if (state === 'teleport') {
            this.isInteracting = true;
            this.avatar.classList.add('state-teleport-out');
            this.playSound('whoosh');
            this.spawnParticles(this.widgetPos.x + 45, this.widgetPos.y + 45, this.getAccentColor(), 'teleport', 15);
            
            setTimeout(() => {
                // Relocate widget randomly inside safe view bounds
                const padding = 150;
                const rx = padding + Math.random() * (window.innerWidth - padding * 2);
                const ry = padding + Math.random() * (window.innerHeight - padding * 2);
                
                this.widgetPos = { x: rx, y: ry };
                this.targetWidgetPos = { ...this.widgetPos };
                this.widget.style.left = `${rx}px`;
                this.widget.style.top = `${ry}px`;
                
                this.avatar.className = 'companion-avatar state-teleport-in';
                this.playSound('whoosh');
                this.spawnParticles(rx + 45, ry + 45, this.getAccentColor(), 'teleport', 15);
                
                setTimeout(() => {
                    this.avatar.className = 'companion-avatar state-breathe';
                    this.currentState = 'breathe';
                    this.isInteracting = false;
                }, 400);
            }, 400);
        } else {
            this.avatar.classList.add(`state-${state}`);
            if (state === 'glitch') {
                this.playSound('glitch');
            }
        }
    }
    
    // Make dialogue bubble speak with typewriter effect
    speak(text, duration = 4000) {
        clearTimeout(this.bubbleTimeout);
        this.bubble.innerHTML = '';
        this.bubble.classList.add('show');
        
        // Typewriter Effect
        let idx = 0;
        const speed = 25; // 25ms per char
        const type = () => {
            if (idx < text.length) {
                this.bubble.innerHTML += text.charAt(idx);
                idx++;
                setTimeout(type, speed);
            }
        };
        type();
        
        this.bubbleTimeout = setTimeout(() => {
            this.bubble.classList.remove('show');
        }, duration);
    }
    
    // Send user prompt to server, manage typing indicator, append chat bubbles
    async sendUserMessage(msg) {
        this.appendMessage(msg, 'user');
        this.gainXP(15);
        
        // Show typing indicator
        const indicator = document.createElement('div');
        indicator.className = 'chat-msg companion typing-indicator';
        indicator.id = 'companion-typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        const container = document.getElementById('companionChatMsgs');
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
        
        // Attentive state
        this.triggerState('breathe');
        this.avatar.style.animationDuration = '0.8s'; // faster breathing
        
        // Get Admin Stats
        const currentStats = {
            totalUsers: parseInt(document.getElementById('totalUsers')?.textContent || '5'),
            activeUsers: parseInt(document.getElementById('activeUsers')?.textContent || '2'),
            totalPosts: parseInt(document.getElementById('totalPosts')?.textContent || '10'),
            newSignups: parseInt(document.getElementById('newSignups')?.textContent || '1')
        };
        
        // Special diagnostic hook: if user requests UI repair
        const userText = msg.toLowerCase();
        if (userText.includes('repair') || userText.includes('fix ui') || userText.includes('fix dashboard') || userText.includes('repair dashboard')) {
            setTimeout(() => {
                indicator.remove();
                this.avatar.style.animationDuration = '3s';
                this.runUIDiagnosticsAndRepair();
            }, 1000);
            return;
        }

        try {
            const adminSession = localStorage.getItem('dreampost_admin_session');
            const token = adminSession ? 'Bearer admin-token-123' : '';
            
            const response = await fetch('/api/admin/companion/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    message: msg,
                    persona: this.currentPersona,
                    stats: currentStats
                })
            });
            
            indicator.remove();
            this.avatar.style.animationDuration = '3s';
            
            if (response.ok) {
                const data = await response.json();
                this.appendMessage(data.responseText, 'companion');
                this.speak(data.responseText, 5000);
                
                // Trigger action
                if (data.action && data.action !== 'none') {
                    this.triggerState(data.action);
                    this.spawnParticles(this.widgetPos.x + 45, this.widgetPos.y + 45, this.getAccentColor(), 'spark', 8);
                }
            } else {
                this.appendMessage("I ran into an issue communicating with my brain network. Insufficient admin tokens or request limit exceeded.", 'companion');
                this.triggerState('glitch');
            }
        } catch (e) {
            indicator.remove();
            this.avatar.style.animationDuration = '3s';
            console.error('Companion fetch error:', e);
            this.appendMessage("Request timed out. Network connection is offline, but I am still processing details locally.", 'companion');
            this.triggerState('glitch');
        }
    }
    
    // UI Diagnostic sequence: companion teleports, draws grid overlays, spins wrench
    runUIDiagnosticsAndRepair() {
        this.isInteracting = true;
        this.playSound('whoosh');
        this.triggerState('teleport');
        
        setTimeout(() => {
            // Teleport to screen center
            const cx = window.innerWidth / 2 - 45;
            const cy = window.innerHeight / 2 - 45;
            this.widgetPos = { x: cx, y: cy };
            this.targetWidgetPos = { ...this.widgetPos };
            this.widget.style.left = `${cx}px`;
            this.widget.style.top = `${cy}px`;
            
            // Switch to Engineer for diagnostics
            const prevPersona = this.currentPersona;
            this.setPersona('Engineer');
            this.triggerState('dance');
            this.speak("ENGAGING ENGINE DIAGNOSTICS! HOLD TIGHT!", 4000);
            
            // Show blueprint grid
            this.blueprintOverlay.classList.add('show');
            
            // Particle bursts and clinks
            let intervalCount = 0;
            const repInterval = setInterval(() => {
                this.playSound('clink');
                this.spawnParticles(cx + 45, cy + 45, '#fbbf24', 'repair', 12);
                
                // Randomly highlight dashboard elements for diagnostic look
                const elList = document.querySelectorAll('.stat-card, .card, canvas');
                if (elList.length > 0) {
                    const el = elList[Math.floor(Math.random() * elList.length)];
                    el.style.transform = 'scale(1.02)';
                    el.style.borderColor = 'var(--admin-primary)';
                    el.style.boxShadow = '0 0 15px var(--admin-primary-light)';
                    setTimeout(() => {
                        el.style.transform = '';
                        el.style.borderColor = '';
                        el.style.boxShadow = '';
                    }, 400);
                }
                
                intervalCount++;
                if (intervalCount >= 6) {
                    clearInterval(repInterval);
                    
                    // Success!
                    this.playSound('success');
                    this.blueprintOverlay.classList.remove('show');
                    this.triggerState('jump');
                    
                    const reportText = "DIAGNOSTIC & REPAIR COMPLETE. Purged log caches, optimized charts canvas rendering metrics, and synchronized client records.";
                    this.appendMessage(reportText, 'companion');
                    this.speak(reportText, 5000);
                    
                    // Trigger some charts updates for mock effect
                    if (window.loadOverviewData) window.loadOverviewData();
                    
                    // Level Up XP reward
                    this.gainXP(30);
                    
                    // Reset persona after brief pause
                    setTimeout(() => {
                        this.setPersona(prevPersona);
                        this.triggerState('teleport');
                    }, 4000);
                }
            }, 600);
            
        }, 500);
    }
    
    // Add text bubble inside the chat panel
    appendMessage(text, sender) {
        const container = document.getElementById('companionChatMsgs');
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender} persona-${this.currentPersona}`;
        msgDiv.textContent = text;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    // XP gain & trigger level up events
    gainXP(amount) {
        this.xp += amount;
        if (this.xp >= 100) {
            this.xp -= 100;
            this.level++;
            localStorage.setItem('companion_level', this.level);
            this.triggerLevelUp();
        }
        localStorage.setItem('companion_xp', this.xp);
        this.updateXPUI();
    }
    
    // XP UI sync
    updateXPUI() {
        const label = document.getElementById('companion-xp-label');
        const fill = document.getElementById('companionXpFill');
        const levelLabel = document.getElementById('companion-level-label');
        
        if (label) label.textContent = `${this.xp}/100`;
        if (fill) fill.style.width = `${this.xp}%`;
        if (levelLabel) levelLabel.textContent = `Lv. ${this.level}`;
        
        this.xpMiniFill.style.width = `${this.xp}%`;
        this.xpMiniFill.style.background = this.getAccentColor();
    }
    
    // Level Up Pop-up animation and melody
    triggerLevelUp() {
        this.playSound('success');
        
        const badge = document.createElement('div');
        badge.className = 'level-badge-pop';
        badge.textContent = `LEVEL UP! Lv.${this.level}`;
        this.widget.appendChild(badge);
        
        this.speak(`LEVEL UP! I'm now Level ${this.level}! Thank you, Admin!`, 4000);
        this.triggerState('dance');
        this.spawnParticles(this.widgetPos.x + 45, this.widgetPos.y + 45, '#fbbf24', 'teleport', 25);
        
        setTimeout(() => badge.remove(), 2000);
    }
    
    // Accent Colors
    getAccentColor() {
        return this.currentPersona === 'Robot' ? '#00f2fe' : this.currentPersona === 'Scientist' ? '#a855f7' : '#f97316';
    }
    
    // Spawn custom SVG particle nodes
    spawnParticles(x, y, color, type, count = 10) {
        for (let i = 0; i < count; i++) {
            const part = document.createElement('div');
            part.className = 'companion-particle';
            
            // Random styling
            const size = type === 'repair' ? 6 + Math.random() * 8 : 4 + Math.random() * 5;
            part.style.width = `${size}px`;
            part.style.height = `${size}px`;
            part.style.background = color;
            part.style.left = `${x}px`;
            part.style.top = `${y}px`;
            
            if (type === 'teleport') {
                part.style.boxShadow = `0 0 10px ${color}`;
            }
            
            // Angle and force coordinates
            const angle = Math.random() * Math.PI * 2;
            const velocity = 30 + Math.random() * 80;
            const dx = Math.cos(angle) * velocity;
            const dy = Math.sin(angle) * velocity;
            
            part.style.setProperty('--dx', `${dx}px`);
            part.style.setProperty('--dy', `${dy}px`);
            
            document.body.appendChild(part);
            
            // Remove after flight ends
            setTimeout(() => part.remove(), 1000);
        }
    }
    
    // Physics tracking and follow coordinates
    startLoop() {
        let lastTime = performance.now();
        
        const loop = (now) => {
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            
            // Mouse Tracking Position calculation (smooth lerp follow)
            if (!this.isInteracting) {
                if (this.isTyping) {
                    // Reposition near center right area
                    this.targetWidgetPos.x = window.innerWidth - 130;
                    this.targetWidgetPos.y = window.innerHeight - 150;
                } else {
                    // Trucking logic: follow cursor gently if stable
                    const dx = this.mousePos.x - (this.widgetPos.x + 45);
                    const dy = this.mousePos.y - (this.widgetPos.y + 45);
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist > 180 && dist < 500) {
                        // Truck slowly towards mouse but keep buffer
                        this.targetWidgetPos.x = this.mousePos.x - 90;
                        this.targetWidgetPos.y = this.mousePos.y - 90;
                    } else if (dist < 100) {
                        // Move away slightly (escape boundary)
                        const angle = Math.atan2(dy, dx);
                        this.targetWidgetPos.x = this.widgetPos.x - Math.cos(angle) * 80;
                        this.targetWidgetPos.y = this.widgetPos.y - Math.sin(angle) * 80;
                    }
                }
                
                // Screen boundaries constraints
                this.targetWidgetPos.x = Math.max(20, Math.min(this.targetWidgetPos.x, window.innerWidth - 120));
                this.targetWidgetPos.y = Math.max(20, Math.min(this.targetWidgetPos.y, window.innerHeight - 120));
                
                // Lerp transition
                const lerpSpeed = this.currentState === 'run' ? 0.08 : 0.04;
                this.widgetPos.x += (this.targetWidgetPos.x - this.widgetPos.x) * lerpSpeed;
                this.widgetPos.y += (this.targetWidgetPos.y - this.widgetPos.y) * lerpSpeed;
                
                this.widget.style.left = `${this.widgetPos.x}px`;
                this.widget.style.top = `${this.widgetPos.y}px`;
            }
            
            // Random idle movement (Breathe swaying + tiny offset)
            if (this.currentState === 'breathe' && Math.random() < 0.005) {
                // Occasional tiny jump or look
                this.triggerState('dance');
                setTimeout(() => {
                    if (this.currentState === 'dance') this.triggerState('breathe');
                }, 1500);
            }
            
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }
    
    // Generic context greeting patterns
    getGreeting() {
        const greets = {
            Robot: "SYSTEM ONLINE. COMMAND LINK ESTABLISHED. WHAT SHALL WE COMPASS, ADMIN?",
            Scientist: "Diagnostics operational. I have initialized the telemetry logs. Ask me about system parameters.",
            Engineer: "Hey! Just finished oiling the data pipeline gears. Need anything checked under the hood?"
        };
        return greets[this.currentPersona];
    }
}

// Instantiate Companion on Page Load
document.addEventListener('DOMContentLoaded', () => {
    // Only load if admin is authenticated (or wait for session)
    const checkSessionInterval = setInterval(() => {
        const adminSession = localStorage.getItem('dreampost_admin_session');
        if (adminSession) {
            clearInterval(checkSessionInterval);
            console.log('Admin session active. Initializing Admin Companion...');
            window.adminCompanion = new AdminCompanion();
        }
    }, 1000);
});
