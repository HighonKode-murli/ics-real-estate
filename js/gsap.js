(function () {
    "use strict";

    const loader = document.getElementById("site-loader");
    const loaderProgress = document.getElementById("site-loader-progress");
    const loaderStartedAt = performance.now();
    const minimumLoaderDuration = 2200;
    const completionHoldDuration = 320;
    let loaderFinished = false;
    let loaderFinishScheduled = false;

    function setLoaderProgress(value) {
        const progress = Math.max(0, Math.min(1, value));
        if (loaderProgress) loaderProgress.style.transform = `scaleX(${progress})`;
    }

    function revealSite() {
        if (loaderFinished) return;
        loaderFinished = true;
        document.body.classList.remove("is-loading");
        if (window.icsScroll) {
            window.icsScroll.unlock("loader");
            window.icsScroll.refresh();
        }
        if (loader) loader.classList.add("is-complete");

        window.setTimeout(function () {
            if (loader) loader.setAttribute("hidden", "");
        }, 1150);

        if (window.ScrollTrigger) {
            window.setTimeout(function () {
                ScrollTrigger.refresh();
            }, 80);
        }

        if (window.gsap) {
            gsap.fromTo(".hero-intro-layer",
                { autoAlpha: 0, y: 40 },
                { autoAlpha: 1, y: 0, duration: 1.4, delay: 0.3, stagger: 0.09, ease: "power3.out" }
            );
        }
    }

    function finishLoader() {
        if (loaderFinished || loaderFinishScheduled) return;
        loaderFinishScheduled = true;
        setLoaderProgress(1);

        const elapsed = performance.now() - loaderStartedAt;
        const timeUntilMinimum = Math.max(0, minimumLoaderDuration - elapsed);
        const revealDelay = Math.max(completionHoldDuration, timeUntilMinimum);
        window.setTimeout(revealSite, revealDelay);
    }

    // The loader must never trap the visitor, even when an asset or CDN is unavailable.
    const loaderFailSafe = window.setTimeout(finishLoader, 12000);

    if (typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
        console.error("ICS animations: GSAP or ScrollTrigger did not load.");
        window.addEventListener("load", finishLoader, { once: true });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const isMobile = window.matchMedia("(max-width: 991px)").matches;
    let viewportSyncTimer = null;

    function syncMobileViewportHeight(refreshTriggers) {
        if (window.innerWidth > 767) {
            document.documentElement.style.removeProperty("--mobile-viewport-height");
            return;
        }

        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        document.documentElement.style.setProperty("--mobile-viewport-height", `${Math.round(viewportHeight)}px`);
        if (refreshTriggers) ScrollTrigger.refresh();
    }

    syncMobileViewportHeight(false);

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", function () {
            window.clearTimeout(viewportSyncTimer);
            viewportSyncTimer = window.setTimeout(function () {
                syncMobileViewportHeight(true);
            }, 180);
        }, { passive: true });
    }

    function initSiteAnimations() {
        gsap.utils.toArray(".editorial-index").forEach(function (indexRow) {
            gsap.from(indexRow, {
                scaleX: 0,
                transformOrigin: "left center",
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: indexRow,
                    start: "top 88%",
                    toggleActions: "play none none reverse"
                }
            });
        });

        gsap.from(".about-intro h2", {
            y: isMobile ? 48 : 100,
            autoAlpha: 0,
            ease: "power4.out",
            scrollTrigger: {
                trigger: ".about-intro",
                start: "top 90%",
                toggleActions: "play none none reverse",
                scrub : 2
            }
        });

        gsap.from(".about-copy, .about-link", {
            y: isMobile ? 28 : 55,
            autoAlpha: 0,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".about-intro",
                start: "top 45%",
                toggleActions: "play none none reverse",
                scrub : 2
            }
        });

        gsap.from("#services-title h2", {
            y: isMobile ? 48 : 120,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: "#services-title",
                start: "top 82%",
                end: "top 42%",
                scrub: 2
            }
        });

        gsap.from(".properties-intro", {
            y: isMobile ? 28 : 55,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: "#services-title",
                start: "top 62%",
                end: "top 35%",
                scrub: 2
            }
        });

        gsap.utils.toArray("#services > .row > [id^='service-']").forEach(function (card, index) {
            const image = card.querySelector(".services-image");
            gsap.from(card, {
                y: isMobile ? 46 : 130,
                autoAlpha: 0,
                clipPath: index % 2 === 0
                    ? `inset(0 ${isMobile ? 4 : 12}% 0 0)`
                    : `inset(0 0 0 ${isMobile ? 4 : 12}%)`,
                scrollTrigger: {
                    trigger: card,
                    start: "top 92%",
                    end: "top 48%",
                    scrub: 2
                }
            });
            if (image && !isMobile) {
                gsap.fromTo(image, { scale: 1.12, yPercent: -4 }, {
                    scale: 1.02,
                    yPercent: 4,
                    ease: "none",
                    scrollTrigger: {
                        trigger: card,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 2
                    }
                });
            }
        });

        gsap.from(".booking-heading > *", {
            y: isMobile ? 40 : 85,
            autoAlpha: 0,
            stagger: 0.08,
            scrollTrigger: {
                trigger: "#booking-div",
                start: "top 78%",
                end: "top 32%",
                scrub: 2
            }
        });

        gsap.from(".booking-form-body", {
            y: isMobile ? 34 : 70,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: ".booking-form-body",
                start: "top 90%",
                end: "top 58%",
                scrub: 2
            }
        });

        gsap.from(".contact-statement", {
            y: isMobile ? 48 : 130,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: ".contact-statement",
                start: "top 90%",
                end: "top 48%",
                scrub: 2
            }
        });

        gsap.from(".contact-details", {
            y: isMobile ? 30 : 70,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: ".contact-details",
                start: "top 92%",
                end: "top 65%",
                scrub: 2
            }
        });
    }

    // Register ordinary page animations before static sequence setup so a media
    // failure can never disable the rest of the site.
    initSiteAnimations();

    function animateChapter(timeline, element, enter, leave, transition) {
        const chapterOffset = isMobile ? 24 : 42;
        const chapterBlur = isMobile ? 4 : 9;
        const enterDuration = transition && transition.enterDuration ? transition.enterDuration : 0.05;
        const leaveDuration = transition && transition.leaveDuration ? transition.leaveDuration : 0.04;
        const enterEase = transition && transition.enterEase ? transition.enterEase : "power2.out";
        const leaveEase = transition && transition.leaveEase ? transition.leaveEase : "power2.in";
        timeline.fromTo(element,
            { autoAlpha: 0, y: chapterOffset, filter: `blur(${chapterBlur}px)` },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: enterDuration, ease: enterEase },
            enter
        );
        timeline.to(element,
            { autoAlpha: 0, y: isMobile ? -16 : -28, filter: `blur(${isMobile ? 3 : 7}px)`, duration: leaveDuration, ease: leaveEase },
            leave
        );
    }

    function createStaticSequence(options) {
        const stage = document.querySelector(options.trigger);
        if (!stage) return null;

        const sourceImages = Array.from(stage.querySelectorAll(".sequence-image"));
        if (!sourceImages.length) return null;

        const sequence = {
            stage: stage,
            state: { progress: 0 },
            images: sourceImages,
            ready: null
        };

        function waitForImage(image) {
            if (image.complete) return Promise.resolve(image.naturalWidth > 0);

            return new Promise(function (resolve) {
                let settled = false;
                const timeout = window.setTimeout(function () {
                    finish(false);
                }, 6000);

                function finish(success) {
                    if (settled) return;
                    settled = true;
                    window.clearTimeout(timeout);
                    image.removeEventListener("load", handleLoad);
                    image.removeEventListener("error", handleError);
                    resolve(success);
                }

                function handleLoad() { finish(true); }
                function handleError() { finish(false); }

                image.addEventListener("load", handleLoad, { once: true });
                image.addEventListener("error", handleError, { once: true });
            });
        }

        sequence.ready = Promise.all(sourceImages.map(waitForImage)).then(function (results) {
            sourceImages.forEach(function (image) {
                gsap.set(image, { autoAlpha: 0 });
            });

            const firstAvailable = sourceImages[results.findIndex(Boolean)] || null;
            let lastAvailable = firstAvailable;
            sequence.images = results.map(function (success, index) {
                if (success) lastAvailable = sourceImages[index];
                return lastAvailable;
            });

            if (firstAvailable) gsap.set(firstAvailable, { autoAlpha: 1 });

            const success = results.every(Boolean);
            stage.classList.add(success ? "is-image-ready" : "is-image-error");
            return success;
        });

        return sequence;
    }

    function createImageFrameSequence(options) {
        const stage = document.querySelector(options.trigger);
        const canvas = document.getElementById(options.canvasId);
        if (!stage || !canvas) return null;

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return null;

        const loadedFrames = new Array(options.frameCount);
        const frameRequests = new Array(options.frameCount);
        let currentProgress = 0;
        let lastRenderedFrame = -1;
        let preloadCursor = 1;
        let preloadTimer = null;
        let active = false;
        let cssWidth = 1;
        let cssHeight = 1;
        let resizeTimer = null;
        let readinessSettled = false;
        let resolveReadiness;

        const ready = new Promise(function (resolve) {
            resolveReadiness = resolve;
        });

        function frameSource(index) {
            const filename = `image-${String(index + 1).padStart(6, "0")}.webp`;
            return `/${options.folder}/${filename}`;
        }

        function targetFrame() {
            return Math.max(0, Math.min(
                options.frameCount - 1,
                Math.round(currentProgress * (options.frameCount - 1))
            ));
        }

        function nearestLoadedFrame(frame) {
            if (loadedFrames[frame]) return frame;
            for (let offset = 1; offset < options.frameCount; offset += 1) {
                if (frame - offset >= 0 && loadedFrames[frame - offset]) return frame - offset;
                if (frame + offset < options.frameCount && loadedFrames[frame + offset]) return frame + offset;
            }
            return -1;
        }

        function drawCover(image) {
            const scale = Math.max(cssWidth / image.naturalWidth, cssHeight / image.naturalHeight);
            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;
            context.clearRect(0, 0, cssWidth, cssHeight);
            context.drawImage(image, (cssWidth - width) / 2, (cssHeight - height) / 2, width, height);
        }

        function render(force) {
            const drawableFrame = nearestLoadedFrame(targetFrame());
            if (drawableFrame < 0 || (!force && drawableFrame === lastRenderedFrame)) return;
            drawCover(loadedFrames[drawableFrame]);
            lastRenderedFrame = drawableFrame;
        }

        function resize() {
            const bounds = stage.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            cssWidth = Math.max(1, Math.round(bounds.width));
            cssHeight = Math.max(1, Math.round(bounds.height));
            canvas.width = Math.round(cssWidth * dpr);
            canvas.height = Math.round(cssHeight * dpr);
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            lastRenderedFrame = -1;
            render(true);
        }

        function markReady(success) {
            if (readinessSettled) return;
            readinessSettled = true;
            stage.classList.add(success ? "is-image-ready" : "is-image-error");
            resolveReadiness(success);
        }

        function requestFrame(index) {
            if (index < 0 || index >= options.frameCount) return Promise.resolve(false);
            if (loadedFrames[index]) return Promise.resolve(true);
            if (frameRequests[index]) return frameRequests[index];

            frameRequests[index] = new Promise(function (resolve) {
                const image = new Image();
                image.decoding = "async";
                image.onload = function () {
                    loadedFrames[index] = image;
                    if (index === 0) markReady(true);
                    if (Math.abs(index - targetFrame()) <= 2 || lastRenderedFrame < 0) render(false);
                    resolve(true);
                };
                image.onerror = function () {
                    frameRequests[index] = null;
                    if (index === 0) markReady(false);
                    resolve(false);
                };
                image.src = frameSource(index);
            });

            return frameRequests[index];
        }

        function requestAroundProgress() {
            const center = targetFrame();
            requestFrame(center);
            for (let offset = 1; offset <= 16; offset += 1) {
                requestFrame(center + offset);
                requestFrame(center - offset);
            }
        }

        function preloadBatch() {
            if (!active) return;
            let count = 0;
            while (preloadCursor < options.frameCount && count < 8) {
                requestFrame(preloadCursor);
                preloadCursor += 1;
                count += 1;
            }
            if (preloadCursor < options.frameCount) {
                preloadTimer = window.setTimeout(preloadBatch, 70);
            }
        }

        const state = {};
        Object.defineProperty(state, "progress", {
            enumerable: true,
            get: function () {
                return currentProgress;
            },
            set: function (value) {
                currentProgress = Math.max(0, Math.min(1, value));
                requestAroundProgress();
                render(false);
            }
        });

        window.addEventListener("resize", function () {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                resize();
            }, 160);
        }, { passive: true });

        resize();
        requestFrame(0);

        return {
            stage: stage,
            state: state,
            ready: ready,
            activate: function () {
                if (active) return;
                active = true;
                requestAroundProgress();
                requestFrame(options.frameCount - 1);
                preloadBatch();
            },
            destroy: function () {
                window.clearTimeout(preloadTimer);
                window.clearTimeout(resizeTimer);
            }
        };
    }

    function buildSequenceTimeline(sequence, options) {
        if (!sequence) return null;
        const chapters = gsap.utils.toArray(options.chapterSelector);
        const hasChapters = chapters.length > 0;
        const endGlide = typeof options.endGlide === "number" ? Math.max(0, options.endGlide) : 0.15;
        const settleStart = 0.94;
        const totalDuration = 1 + endGlide;
        const scrollDistanceScale = totalDuration;

        gsap.set(chapters, { autoAlpha: 0 });

        const scrollTriggerConfig = {
            trigger: options.trigger,
            start: "top top",
            end: function () {
                if (!hasChapters) return `+=${Math.round(Math.max(1, window.innerHeight * 0.85))}`;
                if (window.innerWidth >= 992) {
                    return `+=${Math.round(options.desktopDistance * scrollDistanceScale)}`;
                }
                const responsiveDistance = Math.round(Math.max(2400, window.innerHeight * 3.6));
                const mobilePlaybackDistance = Math.min(options.mobileDistance, responsiveDistance);
                return `+=${Math.round(mobilePlaybackDistance * scrollDistanceScale)}`;
            },
            pin: true,
            pinSpacing: true,
            scrub: 2,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshPriority: options.trigger === "#section_1" ? 20 : 10,
            onLeave: function (self) {
                if (self.direction <= 0 || !options.exitTarget) return;
                if (window.icsScroll && typeof window.icsScroll.requestSoftLanding === "function") {
                    window.icsScroll.requestSoftLanding(options.exitTarget);
                }
            }
        };

        
        const timeline = gsap.timeline({
            scrollTrigger: scrollTriggerConfig
        });

        if (hasChapters) {
            timeline
                .to(sequence.state, {
                    progress: settleStart,
                    duration: settleStart,
                    ease: "none"
                }, 0)
                .to(sequence.state, {
                    progress: 1,
                    duration: totalDuration - settleStart,
                    ease: "power2.out"
                }, settleStart);
        }

        const progressBar = sequence.stage.querySelector(".sequence-progress span");
        if (progressBar && hasChapters) {
            const progressAxis = progressBar.parentElement.dataset.progressAxis === "y" ? "scaleY" : "scaleX";
            const progressAnimation = { duration: totalDuration, ease: "none" };
            progressAnimation[progressAxis] = 1;
            timeline.to(progressBar, progressAnimation, 0);
        }

        options.chapterWindows.forEach(function (range, index) {
            if (chapters[index]) animateChapter(timeline, chapters[index], range[0], range[1], options.chapterTransition);
        });

        if (options.syncImagesToChapters && sequence.images.length > 1) {
            const imageTransitionDuration = options.imageTransitionDuration || 0.06;
            options.chapterWindows.forEach(function (range, index) {
                if (index === 0 || !sequence.images[index]
                    || sequence.images[index] === sequence.images[index - 1]) return;
                timeline.to(sequence.images[index - 1], {
                    autoAlpha: 0,
                    duration: imageTransitionDuration,
                    ease: "power1.inOut"
                }, range[0]);
                timeline.to(sequence.images[index], {
                    autoAlpha: 1,
                    duration: imageTransitionDuration,
                    ease: "power1.inOut"
                }, range[0]);
            });
        }

        if (options.heroIntroMotion) {
            const stage = sequence.stage;
            
                timeline
                    .to(stage.querySelectorAll(".hero-categories span"), {
                        y: -300,
                        duration: 2,
                        ease: "power2.in",
                        scrollTrigger:{
                            trigger : "#hero-div",
                            scrub : 2,
                            start : "top top"
                        }
                    }, 0.025)
                    .to(stage.querySelector(".hero-intro p"), {
                        y: -300,
                        duration: 2,
                        ease: "power2.in",
                        scrollTrigger:{
                            trigger : "#hero-div",
                            scrub : 2,
                            start : "top top"
                        }
                    }, 0.025)
                    .to(stage.querySelector("#hero-h1-1"), {
                        x: function () {
                            return -Math.max(800, window.innerWidth * 0.85);
                        },
                        duration: 2,
                        ease: "power2.in",
                        scrollTrigger:{
                            trigger : "#hero-div",
                            scrub : 2,
                            start : "top top"
                        }
                    }, 0.035)
                    .to(stage.querySelector("#hero-h1-2"), {
                        x: function () {
                            return Math.max(800, window.innerWidth * 0.85);
                        },
                        duration: 2,
                        ease: "power2.in",
                        scrollTrigger:{
                            trigger : "#hero-div",
                            scrub : 2,
                            start : "top top"
                        }
                    }, 0.035)
                    .to(stage.querySelector(".sequence-scroll-cue"), {
                        autoAlpha: 0,
                        y: -45,
                        duration: 2,
                        ease: "power2.in",
                        scrollTrigger:{
                            trigger : "#hero-div",
                            scrub : 2,
                            start : "top top",
                        }
                    }, 0.025);

        }

        return timeline;
    }

    /* ---------------------------------------------------------------
       Mobile hero helper — lightweight, non-scrub approach.
       Replaces the heavy pinned-scrub timeline on touch devices to
       eliminate jitter and the "stuck text on scroll-back" bug.
       Desktop behaviour is completely untouched.
       --------------------------------------------------------------- */
    function initMobileHero(sequence) {
        var stage = sequence.stage;
        if (!stage) return;

        /* The hero-intro-layer elements were already revealed by revealSite().
           We just need a simple, reliable show/hide on scroll.              */

        var heroLayers  = stage.querySelectorAll(".hero-categories, .hero-intro, .hero-content, .sequence-scroll-cue");
        var progressBar = stage.querySelector(".sequence-progress--vertical span");

        /* Use a single non-scrub ScrollTrigger that toggles a GSAP tween.
           toggleActions: "play none none reverse" guarantees the reverse
           always fires when scrolling back, which fixes the stuck-text bug. */
        gsap.to(heroLayers, {
            autoAlpha: 0,
            y: -30,
            duration: 0.75,
            ease: "power1.inOut",
            stagger: 0.05,
            scrollTrigger: {
                trigger: "#section_1",
                start: "top -15%",       /* content starts fading once 15% of hero has scrolled off */
                end: "top -45%",
                scrub: false,             /* NO scrub — instant, reliable toggle */
                toggleActions: "play none none reverse"
            }
        });

        /* Fade the scroll-cue earlier so it gets out of the way quickly */
        gsap.to(stage.querySelector(".sequence-scroll-cue"), {
            autoAlpha: 0,
            y: -12,
            duration: 0.55,
            ease: "power1.inOut",
            scrollTrigger: {
                trigger: "#section_1",
                start: "top -5%",
                toggleActions: "play none none reverse"
            }
        });

        /* Fade the vertical progress bar if present */
        if (progressBar) {
            gsap.to(progressBar, {
                scaleY: 1,
                duration: 0.6,
                ease: "none",
                scrollTrigger: {
                    trigger: "#section_1",
                    start: "top top",
                    end: "bottom top",
                    scrub: true           /* progress bar scrub is fine — it's a thin line, no layout cost */
                }
            });
        }
    }

    try {
        const isMobileHero = window.innerWidth <= 991;

        const dubaiSequence = createStaticSequence({
            trigger: "#section_1"
        });

        const propertySequence = createImageFrameSequence({
            trigger: "#property-journey",
            canvasId: "property-sequence-canvas",
            folder: "seq 2 (webp)",
            frameCount: 596
        });

        if (dubaiSequence) {
            dubaiSequence.ready.then(function () {
                if (isMobileHero) {
                    /* MOBILE — lightweight, jitter-free hero */
                    initMobileHero(dubaiSequence);
                } else {
                    /* DESKTOP — original pinned scrub timeline, untouched */
                    buildSequenceTimeline(dubaiSequence, {
                        trigger: "#section_1",
                        exitTarget: "#section_2",
                        chapterSelector: "[data-dubai-chapter]",
                        heroIntroMotion: true,
                        chapterWindows: [[0.20, 0.34], [0.43, 0.59], [0.69, 0.88]],
                        desktopDistance: 5200,
                        mobileDistance: 3800
                    });
                }
                setLoaderProgress(0.96);
                window.clearTimeout(loaderFailSafe);
                finishLoader();
            }).catch(function (error) {
                console.error("ICS hero image initialization failed:", error);
                window.clearTimeout(loaderFailSafe);
                finishLoader();
            });
        } else {
            window.clearTimeout(loaderFailSafe);
            finishLoader();
        }

        if (propertySequence) {
            propertySequence.ready.then(function () {
                buildSequenceTimeline(propertySequence, {
                    trigger: "#property-journey",
                    exitTarget: "#section_3",
                    chapterSelector: "[data-property-chapter]",
                    // Captions 03 and 04 align with the townhouse and city reveals.
                    chapterWindows: [[0.03, 0.18], [0.27, 0.43], [0.608, 0.792], [0.852, 0.94]],
                    chapterTransition: {
                        enterDuration: 0.07,
                        leaveDuration: 0.06,
                        enterEase: "power2.out",
                        leaveEase: "power2.inOut"
                    },
                    desktopDistance: 5600,
                    mobileDistance: 4000
                });
                ScrollTrigger.create({
                    trigger: "#property-journey",
                    start: "top 180%",
                    once: true,
                    onEnter: propertySequence.activate
                });
                ScrollTrigger.refresh();
            }).catch(function (error) {
                console.error("ICS property image initialization failed:", error);
            });
        }
    } catch (error) {
        console.error("ICS static sequence initialization failed:", error);
        window.clearTimeout(loaderFailSafe);
        finishLoader();
    }

    window.addEventListener("load", function () {
        ScrollTrigger.refresh();
    }, { once: true });
})();
