document.addEventListener('DOMContentLoaded', () => {
    const soundElements = {
        hover: document.getElementById('audio-hover'),
        click: document.getElementById('audio-click'),
        start: document.getElementById('audio-start')
    };
    const startScreen = document.getElementById('start-screen'), mainContainer = document.querySelector('.container'), body = document.body;
    const customCursor = document.getElementById('custom-cursor');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    // Classify by the primary pointer, so touchscreen laptops keep desktop hover behavior.
    const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    // --- Custom Cursor Logic ---
    // Update once per frame instead of doing layout work for every pointer event.
    if (finePointer && customCursor) {
        let cursorX = -30;
        let cursorY = -30;
        let cursorFrame = null;
        document.addEventListener('mousemove', (e) => {
            cursorX = e.clientX - 10;
            cursorY = e.clientY - 10;
            if (cursorFrame) return;
            cursorFrame = requestAnimationFrame(() => {
                customCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
                cursorFrame = null;
            });
        }, { passive: true });
    }

    // --- Sound Logic ---
    const soundBuffers = new Map();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;
    let lastHoverSoundAt = 0;

    if (AudioContextClass) {
        try {
            audioContext = new AudioContextClass({ latencyHint: 'interactive' });
            Object.entries(soundElements).forEach(([name, audio]) => {
                if (!audio) return;
                fetch(audio.getAttribute('src'))
                    .then(response => response.arrayBuffer())
                    .then(data => audioContext.decodeAudioData(data))
                    .then(buffer => soundBuffers.set(name, buffer))
                    .catch(() => {});
            });
            document.addEventListener('pointerdown', () => audioContext.resume().catch(() => {}), { once: true, capture: true });
            document.addEventListener('keydown', () => audioContext.resume().catch(() => {}), { once: true, capture: true });
        } catch (_) {
            audioContext = null;
        }
    }

    function playSound(name) {
        if (name === 'hover') {
            const now = performance.now();
            if (now - lastHoverSoundAt < 70) return;
            lastHoverSoundAt = now;
        }

        const buffer = soundBuffers.get(name);
        if (audioContext && buffer) {
            const start = () => {
                const source = audioContext.createBufferSource();
                const gain = audioContext.createGain();
                gain.gain.value = name === 'hover' ? 0.13 : 0.2;
                source.buffer = buffer;
                source.connect(gain).connect(audioContext.destination);
                source.start();
            };
            if (audioContext.state === 'suspended') audioContext.resume().then(start).catch(() => {});
            else start();
            return;
        }

        const audio = soundElements[name];
        if (!audio) return;
        audio.currentTime = 0;
        audio.volume = name === 'hover' ? 0.16 : 0.24;
        audio.play().catch(() => {});
    }

    // --- Game/Site Start Logic ---
    function startGame() {
        if (!mainContainer.classList.contains('is-hidden')) return;
        
        if (startScreen) {
            playSound('start');
            startScreen.classList.add('is-hidden'); 
        }
        
        mainContainer.classList.remove('is-hidden');
        body.classList.add('is-shaking'); setTimeout(() => body.classList.remove('is-shaking'), 350);
        observeSectionTitles(); 
        observeProjectCards();
        initSlideshows();
        initHoverPreviews();
        initViewportVideos();
    }
    
    if (startScreen) {
        const startLabel = startScreen.querySelector('.press-start u');
        if (touchOnly && startLabel) startLabel.textContent = 'Tap To Start';
        window.addEventListener('keydown', startGame, { once: true });
        startScreen.addEventListener('click', startGame, { once: true });
    } else {
        startGame();
    }

    initParticles();
    initFontSwitcher();

    // --- Typing Animation ---
    function typeText(element, text) {
        const textSpan = element.querySelector('.typing-text');
        if (!textSpan) return;
        textSpan.innerHTML = ''; let i = 0;
        const typingInterval = setInterval(() => {
            if (i < text.length) { textSpan.innerHTML += text.charAt(i); i++; } 
            else { clearInterval(typingInterval); }
        }, 50);
    }

    // --- Intersection Observers ---
    function observeSectionTitles() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = entry.target;
                    const el = wrapper.querySelector('.section-title');
                    const text = el.getAttribute('data-text');
                    wrapper.classList.add('is-visible');
                    el.innerHTML = '<span class="typing-text"></span><span class="caret">_</span>';
                    typeText(el, text);
                    observer.unobserve(wrapper);
                }
            });
        }, { threshold: 0.8 });
        document.querySelectorAll('.section-title-wrapper').forEach(wrapper => observer.observe(wrapper));
    }

    function observeProjectCards() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    entry.target.style.transitionDelay = `${index * 50}ms`;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
        document.querySelectorAll('.project-card').forEach(card => observer.observe(card));
    }
    
    // --- Slideshow Logic ---
    function initSlideshows() {
        const slideshowCards = document.querySelectorAll('.project-card:not(.hover-preview-card)');
        const visibilityObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                card.dataset.slideshowVisible = entry.isIntersecting ? 'true' : 'false';
                if (entry.isIntersecting) card.startSlideshow?.();
                else card.stopSlideshow?.();
            });
        }, { threshold: 0.05, rootMargin: '120px 0px' });

        slideshowCards.forEach(card => {
            const container = card.querySelector('.image-container');
            if (!container) return;
            const images = container.querySelectorAll('img');
            if (images.length <= 1) return;

            let currentIndex = 0;
            let timer = null;
            const interval = parseInt(card.dataset.slideshowInterval, 10) || 4000;

            const advance = () => {
                images[currentIndex].classList.remove('active');
                currentIndex = (currentIndex + 1) % images.length;
                images[currentIndex].classList.add('active');
            };
            card.startSlideshow = () => {
                if (timer || document.hidden) return;
                timer = window.setInterval(advance, interval);
            };
            card.stopSlideshow = () => {
                window.clearInterval(timer);
                timer = null;
            };
            visibilityObserver.observe(card);
        });

        document.addEventListener('visibilitychange', () => {
            slideshowCards.forEach(card => {
                if (document.hidden) card.stopSlideshow?.();
                else if (card.dataset.slideshowVisible === 'true') card.startSlideshow?.();
            });
        });
    }

    // --- Hover-only GIF previews ---
    function initHoverPreviews() {
        document.querySelectorAll('.hover-preview-card').forEach(card => {
            const images = Array.from(card.querySelectorAll('.hover-preview img'));
            const hint = card.querySelector('.preview-hint');
            if (!images.length) return;

            let currentIndex = 0;
            let previewTimer = null;
            let isPreviewing = false;
            const destination = card.querySelector('a[href]:not([href="#"])');
            const idleLabel = touchOnly ? 'TAP TO PREVIEW' : 'HOVER TO PLAY';
            const activeLabel = touchOnly && destination ? 'TAP AGAIN TO OPEN' : 'PLAYING';

            const updateHint = (label, index) => {
                if (hint) hint.textContent = images.length > 1 ? `${label} · ${index + 1}/${images.length}` : label;
            };

            const showPreview = (index, animated, label = idleLabel) => {
                images.forEach((image, imageIndex) => {
                    image.classList.toggle('active', imageIndex === index);
                    const source = animated && imageIndex === index ? image.dataset.animated : image.dataset.static;
                    if (source && image.getAttribute('src') !== source) image.setAttribute('src', source);
                });
                updateHint(label, index);
            };

            const stopPreview = () => {
                window.clearTimeout(previewTimer);
                previewTimer = null;
                isPreviewing = false;
                currentIndex = 0;
                showPreview(currentIndex, false, idleLabel);
            };

            const startPreview = () => {
                if (isPreviewing) return;
                isPreviewing = true;
                window.clearTimeout(previewTimer);
                currentIndex = 0;
                showPreview(currentIndex, true, activeLabel);
                images.slice(1).forEach(image => {
                    if (!image.dataset.animated) return;
                    const preload = new Image();
                    preload.src = image.dataset.animated;
                });
                if (images.length > 1) {
                    const queueNextPreview = () => {
                        const requestedDuration = parseInt(images[currentIndex].dataset.previewDuration, 10) || 4500;
                        const duration = Math.min(requestedDuration, 4500);
                        previewTimer = window.setTimeout(() => {
                            currentIndex = (currentIndex + 1) % images.length;
                            showPreview(currentIndex, true, activeLabel);
                            queueNextPreview();
                        }, duration);
                    };
                    queueNextPreview();
                }
            };

            showPreview(0, false);

            if (touchOnly) {
                card.addEventListener('stop-touch-preview', () => {
                    card.classList.remove('touch-preview-active');
                    stopPreview();
                });
                card.addEventListener('click', event => {
                    if (card.classList.contains('touch-preview-active')) {
                        if (!destination) event.preventDefault();
                        return;
                    }
                    event.preventDefault();
                    document.querySelectorAll('.hover-preview-card.touch-preview-active').forEach(activeCard => {
                        if (activeCard !== card) activeCard.dispatchEvent(new Event('stop-touch-preview'));
                    });
                    card.classList.add('touch-preview-active');
                    startPreview();
                });
            } else {
                card.addEventListener('mouseenter', startPreview);
                card.addEventListener('mouseleave', stopPreview);
            }
        });

        if (touchOnly) {
            document.addEventListener('click', event => {
                if (event.target.closest('.hover-preview-card')) return;
                document.querySelectorAll('.hover-preview-card.touch-preview-active').forEach(card => {
                    card.dispatchEvent(new Event('stop-touch-preview'));
                });
            });
        }
    }

    // Keep long blog pages light by playing embedded demos only near the viewport.
    function initViewportVideos() {
        const videos = document.querySelectorAll('.retro-media-box video');
        if (!videos.length) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting) video.play().catch(() => {});
                else video.pause();
            });
        }, { threshold: 0.1, rootMargin: '160px 0px' });

        videos.forEach(video => observer.observe(video));
    }

    function initParticles() {
        const layer = document.getElementById('particle-canvas');
        if (!layer || !finePointer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const particles = [];
        const maxParticles = 80;
        const gravity = 0.2;
        let animationFrame = null;
        let lastTrailAt = 0;

        function runAnimation() {
            if (animationFrame || !particles.length) return;
            animationFrame = requestAnimationFrame(update);
        }

        function createParticle(x, y, type) {
            if (particles.length >= maxParticles) {
                const oldest = particles.shift();
                oldest?.element.remove();
            }

            const angle = Math.random() * Math.PI * 2;
            const burst = type === 'burst';
            const speed = burst ? Math.random() * 2.3 + 0.9 : Math.random() * 0.45;
            const size = burst ? Math.random() * 4 + 3 : Math.random() * 3 + 2;
            const life = burst ? Math.random() * 42 + 90 : Math.random() * 18 + 38;
            const element = document.createElement('div');
            element.className = 'particle';
            element.style.width = `${size}px`;
            element.style.height = `${size}px`;
            element.style.background = `hsl(${Math.random() * 50 + 90}, 90%, 60%)`;
            layer.appendChild(element);
            particles.push({
                element,
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - (burst ? 2 : 0),
                size,
                life,
                initialLife: life,
                bounces: 2
            });
            runAnimation();
        }

        function update() {
            animationFrame = null;
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                particle.vy += gravity;
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;

                if (particle.y + particle.size >= window.innerHeight && particle.bounces > 0) {
                    particle.y = window.innerHeight - particle.size;
                    particle.vy *= -0.5;
                    particle.vx *= 0.7;
                    particle.bounces--;
                }
                if (particle.life <= 0) {
                    particle.element.remove();
                    particles.splice(i, 1);
                    continue;
                }
                particle.element.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0)`;
                particle.element.style.opacity = particle.life / particle.initialLife;
            }
            if (particles.length && !document.hidden) animationFrame = requestAnimationFrame(update);
        }

        document.addEventListener('mousemove', event => {
            const now = performance.now();
            if (now - lastTrailAt < 38) return;
            lastTrailAt = now;
            if (Math.random() > 0.55) createParticle(event.clientX, event.clientY, 'trail');
        }, { passive: true });
        document.addEventListener('click', event => {
            for (let i = 0; i < 10; i++) createParticle(event.clientX, event.clientY, 'burst');
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) runAnimation();
        });
    }

    function initFontSwitcher() {
        const button = document.getElementById('font-switcher');
        if (!button) return;
        button.addEventListener('click', event => {
            event.preventDefault();
            body.classList.toggle('coding-mode');
        });
    }

    // --- Music player modal ---
    const musicModal = document.getElementById('music-modal');
    const musicPlayer = document.getElementById('music-player');
    const musicTitle = document.getElementById('music-modal-title');
    const musicClose = musicModal && musicModal.querySelector('.music-modal-close');
    let lastMusicTrigger = null;

    function closeMusicPlayer() {
        if (!musicModal || !musicPlayer) return;
        musicPlayer.pause();
        musicPlayer.removeAttribute('src');
        musicPlayer.load();
        musicModal.classList.remove('is-open');
        musicModal.setAttribute('aria-hidden', 'true');
        body.classList.remove('modal-open');
        if (lastMusicTrigger) lastMusicTrigger.focus();
    }

    document.querySelectorAll('.music-card-button').forEach(button => {
        button.addEventListener('click', () => {
            if (!musicModal || !musicPlayer) return;
            lastMusicTrigger = button;
            musicTitle.textContent = button.dataset.track;
            musicPlayer.src = button.dataset.video;
            musicModal.classList.add('is-open');
            musicModal.setAttribute('aria-hidden', 'false');
            body.classList.add('modal-open');
            musicClose.focus();
            musicPlayer.play().catch(() => {});
        });
    });

    if (musicClose) musicClose.addEventListener('click', closeMusicPlayer);
    if (musicModal) {
        musicModal.addEventListener('click', event => {
            if (event.target === musicModal) closeMusicPlayer();
        });
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && musicModal && musicModal.classList.contains('is-open')) closeMusicPlayer();
    });

    // --- UI Interactions ---
    document.querySelectorAll('a, button').forEach(elem => {
        if (finePointer) {
            elem.addEventListener('mouseenter', () => playSound('hover'));
        }
        elem.addEventListener('pointerdown', () => playSound('click'));
    });

    // --- RID EASTER EGG ---
    let keyBuffer = "";
    document.addEventListener('keydown', (e) => {
        keyBuffer += e.key.toLowerCase();
        if (keyBuffer.length > 3) {
            keyBuffer = keyBuffer.slice(-3);
        }

        if (keyBuffer === "rid") {
            triggerEasterEgg();
            keyBuffer = ""; // Reset
        }
    });

    function triggerEasterEgg() {
        if (document.querySelector('.rid-popup')) return;

        const popup = document.createElement('div');
        popup.classList.add('rid-popup');
        popup.innerHTML = "rid is peak af";
        document.body.appendChild(popup);

        playSound('start');

        // Remove after 7 seconds with fade
        setTimeout(() => {
            popup.classList.add('is-fading');
            
            // Wait for the transition (1s) to finish before removing from DOM
            setTimeout(() => {
                if (popup && popup.parentNode) {
                    popup.parentNode.removeChild(popup);
                }
            }, 1000); 

        }, 7000);
    }
});
