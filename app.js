document.addEventListener('DOMContentLoaded', () => {
    const audioHover = document.getElementById('audio-hover'), audioClick = document.getElementById('audio-click'), audioStart = document.getElementById('audio-start');
    const startScreen = document.getElementById('start-screen'), mainContainer = document.querySelector('.container'), body = document.body;
    const customCursor = document.getElementById('custom-cursor');

    // --- Custom Cursor Logic ---
    // Only active on non-touch devices
    if (window.matchMedia("(pointer: fine)").matches) {
        document.addEventListener('mousemove', (e) => {
            if (customCursor) {
                // Subtract half width/height to center the crosshair
                customCursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
            }
        });
    }

    // --- Sound Logic ---
    function playSound(audio) { 
        if (audio && audio.readyState >= 2) { 
            audio.currentTime = 0; 
            audio.volume = 0.3; 
            audio.play().catch(e => {}); 
        } 
    }

    // --- Game/Site Start Logic ---
    function startGame() {
        if (!mainContainer.classList.contains('is-hidden')) return;
        
        if (startScreen) {
            playSound(audioStart);
            startScreen.classList.add('is-hidden'); 
        }
        
        mainContainer.classList.remove('is-hidden');
        body.classList.add('is-shaking'); setTimeout(() => body.classList.remove('is-shaking'), 500);
        observeSectionTitles(); 
        observeProjectCards();
        initSlideshows();
    }
    
    if (startScreen) {
        window.addEventListener('keydown', startGame, { once: true });
        startScreen.addEventListener('click', startGame, { once: true });
        startScreen.addEventListener('touchstart', startGame, { once: true });
    } else {
        startGame();
    }

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
        const slideshowCards = document.querySelectorAll('.project-card');
        slideshowCards.forEach(card => {
            const container = card.querySelector('.image-container');
            if (!container) return;
            const images = container.querySelectorAll('img');
            if (images.length <= 1) return;

            let currentIndex = 0;
            const interval = parseInt(card.dataset.slideshowInterval, 10) || 4000;

            setInterval(() => {
                images[currentIndex].classList.remove('active');
                currentIndex = (currentIndex + 1) % images.length;
                images[currentIndex].classList.add('active');
            }, interval);
        });
    }

    // --- UI Interactions ---
    document.querySelectorAll('a, button, .project-card, .social-btn, .back-btn').forEach(elem => {
        elem.addEventListener('mouseenter', () => playSound(audioHover));
        elem.addEventListener('click', () => playSound(audioClick));
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

        playSound(audioStart);

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