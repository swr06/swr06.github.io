document.addEventListener('DOMContentLoaded', () => {
    const audioHover = document.getElementById('audio-hover'), audioClick = document.getElementById('audio-click'), audioStart = document.getElementById('audio-start');
    const startScreen = document.getElementById('start-screen'), mainContainer = document.querySelector('.container'), body = document.body;

    function playSound(audio) { if (audio && audio.readyState >= 2) { audio.currentTime = 0; audio.play().catch(e => {}); } }

    function startGame() {
        if (!mainContainer.classList.contains('is-hidden')) return;
        playSound(audioStart);
        startScreen.classList.add('is-hidden'); mainContainer.classList.remove('is-hidden');
        body.classList.add('is-shaking'); setTimeout(() => body.classList.remove('is-shaking'), 400);
        observeSectionTitles(); observeProjectCards();
        initSlideshows();
    }
    
    window.addEventListener('keydown', startGame, { once: true });
    startScreen.addEventListener('click', startGame, { once: true });

    function typeText(element, text) {
        const textSpan = element.querySelector('.typing-text');
        textSpan.innerHTML = ''; let i = 0;
        const typingInterval = setInterval(() => {
            if (i < text.length) { textSpan.innerHTML += text.charAt(i); i++; } 
            else { clearInterval(typingInterval); }
        }, 50);
    }

    function observeSectionTitles() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const wrapper = entry.target;
                    const el = wrapper.querySelector('.section-title');
                    const text = el.getAttribute('data-text');
                    wrapper.classList.add('is-visible'); // Trigger underline animation
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
    
    // NEW: Function to handle all project slideshows
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

    document.querySelectorAll('a, button, .project-card, .social-btn').forEach(elem => {
        elem.addEventListener('mouseenter', () => playSound(audioHover));
        elem.addEventListener('click', () => playSound(audioClick));
    });
});