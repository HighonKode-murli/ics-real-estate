document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger);

    const scroller = document.querySelector("#main-scroll");

    const locoScroll = new LocomotiveScroll({
        el: scroller,
        smooth: true,
        multiplier: 1, // scroll speed
        class: 'is-reveal'
    });

    locoScroll.on("scroll", ScrollTrigger.update);

    ScrollTrigger.scrollerProxy(scroller, {
        scrollTop(value) {
            return arguments.length ? locoScroll.scrollTo(value, 0, 0) : locoScroll.scroll.instance.scroll.y;
        },
        getBoundingClientRect() {
            return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
        },
        pinType: scroller.style.transform ? "transform" : "fixed"
    });

    // Handle Sidebar active links
    const sectionIds = [1, 2, 3, 4, 5];
    const navLinks = document.querySelectorAll('#sidebarMenu .nav-link');

    // Setup click navigation for nav menu
    navLinks.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = `#section_${sectionIds[index]}`;
            locoScroll.scrollTo(targetId);
        });
    });

    // Setup click navigation for smoothscroll class buttons
    const smoothLinks = document.querySelectorAll('.smoothscroll');
    smoothLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            locoScroll.scrollTo(targetId);
        });
    });

    // Update active nav links on scroll using GSAP ScrollTrigger
    sectionIds.forEach((id, index) => {
        ScrollTrigger.create({
            scroller: scroller,
            trigger: `#section_${id}`,
            start: "top center",
            end: "bottom center",
            onToggle: self => {
                if (self.isActive) {
                    navLinks.forEach(l => l.classList.remove('active'));
                    navLinks[index].classList.add('active');
                }
            }
        });
    });

    // Setup sequence canvas
    function setupSequence(canvasId, triggerId, folder, totalFrames, scrollEnd) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // The container wrapper is .col-md-8
        const parent = document.querySelector(".col-md-8");

        function resizeCanvas() {
            canvas.width = parent.clientWidth;
            canvas.height = window.innerHeight;
            render();
        }
        window.addEventListener("resize", resizeCanvas);

        const currentFrame = index => `${folder}/image-${(index + 1).toString().padStart(6, '0')}.jpg`;
        const images = new Array(totalFrames).fill(null);

        function preloadImage(index) {
            if (!images[index]) {
                const img = new Image();
                img.src = currentFrame(index);
                images[index] = img;
            }
            return images[index];
        }

        const seq = { frame: 0 };
        let lastDrawnFrame = -1;

        function render() {
            const f = Math.round(seq.frame);
            if (f === lastDrawnFrame) return;

            // Prefetch upcoming frames to ensure smooth local playback
            for (let i = f; i < Math.min(f + 6, totalFrames); i++) {
                preloadImage(i);
            }

            const img = preloadImage(f);

            function draw(imgObj) {
                if (f !== Math.round(seq.frame)) return;
                lastDrawnFrame = f;
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Cover behavior
                const scale = Math.max(canvas.width / imgObj.width, canvas.height / imgObj.height);
                const x = (canvas.width / 2) - (imgObj.width / 2) * scale;
                const y = (canvas.height / 2) - (imgObj.height / 2) * scale;
                ctx.drawImage(imgObj, x, y, imgObj.width * scale, imgObj.height * scale);
            }

            if (img.complete && img.naturalWidth) {
                draw(img);
            } else {
                img.onload = () => draw(img);
            }
        }

        const firstImg = preloadImage(0);
        firstImg.onload = () => {
            resizeCanvas();
        };

        gsap.to(seq, {
            frame: totalFrames - 1,
            snap: "frame",
            ease: "none",
            scrollTrigger: {
                scroller: scroller,
                trigger: triggerId,
                start: "top top",
                end: `+=${scrollEnd}`,
                scrub: 0.5,
                pin: true,
                onUpdate: render
            }
        });
    }

    // Sequence 1 has 2040 frames
    setupSequence("seq1-canvas", "#section_1", "sequence 1", 2040, 8000);
    // Sequence 2 has 2940 frames
    setupSequence("seq2-canvas", "#section_2", "sequence 2", 2940, 10000);

    ScrollTrigger.addEventListener("refresh", () => locoScroll.update());
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 500);
});
