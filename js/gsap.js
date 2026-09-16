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
                { autoAlpha: 0, y: 32 },
                { autoAlpha: 1, y: 0, duration: 1.1, delay: 0.18, stagger: 0.09, ease: "power3.out" }
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
            y: isMobile ? 48 : 120,
            autoAlpha: 0,
            duration: 1.25,
            ease: "power4.out",
            scrollTrigger: {
                trigger: ".about-intro",
                start: "top 82%",
                toggleActions: "play none none reverse"
            }
        });

        gsap.from(".about-copy, .about-link", {
            y: isMobile ? 28 : 55,
            autoAlpha: 0,
            duration: 1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: {
                trigger: ".about-intro",
                start: "top 68%",
                toggleActions: "play none none reverse"
            }
        });

        gsap.from("#services-title h2", {
            y: isMobile ? 48 : 120,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: "#services-title",
                start: "top 82%",
                end: "top 42%",
                scrub: 1
            }
        });

        gsap.from(".properties-intro", {
            y: isMobile ? 28 : 55,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: "#services-title",
                start: "top 62%",
                end: "top 35%",
                scrub: 1
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
                    scrub: 1
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
                        scrub: true
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
                scrub: 1
            }
        });

        gsap.from(".booking-form-body", {
            y: isMobile ? 34 : 70,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: ".booking-form-body",
                start: "top 90%",
                end: "top 58%",
                scrub: 1
            }
        });

        gsap.from(".contact-statement", {
            y: isMobile ? 48 : 130,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: ".contact-statement",
                start: "top 90%",
                end: "top 48%",
                scrub: 1
            }
        });

        gsap.from(".contact-details", {
            y: isMobile ? 30 : 70,
            autoAlpha: 0,
            scrollTrigger: {
                trigger: ".contact-details",
                start: "top 92%",
                end: "top 65%",
                scrub: 1
            }
        });
    }

    // Register ordinary page animations before optional canvas work so a sequence
    // asset failure can never disable the rest of the site.
    initSiteAnimations();

    function framePath(folder, index) {
        return `${folder}/image-${String(index + 1).padStart(6, "0")}.jpg`;
    }

    function createImageSequence(options) {
        const canvas = document.getElementById(options.canvasId);
        const stage = document.querySelector(options.trigger);
        if (!canvas || !stage) return null;

        const context = canvas.getContext("2d");
        if (!context) return null;

        const images = new Array(options.frameCount);
        const requests = new Array(options.frameCount);
        const state = { frame: 0 };
        let lastRenderedFrame = -1;
        let cssWidth = 1;
        let cssHeight = 1;
        let preloadCursor = 0;
        let preloadTimer = null;
        let active = false;
        let resizeTimer = null;
        let lastViewportWidth = window.innerWidth;

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

        function drawCover(image) {
            const scale = Math.max(cssWidth / image.naturalWidth, cssHeight / image.naturalHeight);
            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;
            context.clearRect(0, 0, cssWidth, cssHeight);
            context.drawImage(image, (cssWidth - width) / 2, (cssHeight - height) / 2, width, height);
        }

        function nearestLoaded(target) {
            if (images[target]) return target;
            for (let offset = 1; offset < options.frameCount; offset += 1) {
                if (target - offset >= 0 && images[target - offset]) return target - offset;
                if (target + offset < options.frameCount && images[target + offset]) return target + offset;
            }
            return -1;
        }

        function render(force) {
            const target = Math.max(0, Math.min(options.frameCount - 1, Math.round(state.frame)));
            const drawable = nearestLoaded(target);
            if (drawable < 0 || (!force && drawable === lastRenderedFrame)) return;
            drawCover(images[drawable]);
            lastRenderedFrame = drawable;
        }

        function requestFrame(index) {
            if (index < 0 || index >= options.frameCount) return Promise.resolve(false);
            if (requests[index]) return requests[index];

            requests[index] = new Promise(function (resolve) {
                const image = new Image();
                image.decoding = "async";
                image.onload = function () {
                    images[index] = image;
                    if (index === 0) stage.classList.add("is-canvas-ready");
                    if (Math.abs(index - Math.round(state.frame)) <= 2 || lastRenderedFrame < 0) render(true);
                    resolve(true);
                };
                image.onerror = function () {
                    requests[index] = null;
                    resolve(false);
                };
                image.src = framePath(options.folder, index);
            });

            return requests[index];
        }

        function requestAround(frame) {
            const center = Math.round(frame);
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

        function activate() {
            if (active) return;
            active = true;
            requestAround(state.frame);
            requestFrame(options.frameCount - 1);
            preloadBatch();
        }

        function prime(count, onProgress) {
            const total = Math.min(count, options.frameCount);
            let completed = 0;
            const jobs = [];
            for (let index = 0; index < total; index += 1) {
                jobs.push(requestFrame(index).then(function () {
                    completed += 1;
                    if (onProgress) onProgress(completed / total);
                }));
            }
            return Promise.all(jobs);
        }

        window.addEventListener("resize", function () {
            const nextWidth = window.innerWidth;
            if (Math.abs(nextWidth - lastViewportWidth) < 2) return;
            lastViewportWidth = nextWidth;
            syncMobileViewportHeight(false);
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(function () {
                resize();
                ScrollTrigger.refresh();
            }, 160);
        }, { passive: true });

        resize();
        requestFrame(0);

        return {
            stage: stage,
            state: state,
            frameCount: options.frameCount,
            render: render,
            requestAround: requestAround,
            requestFrame: requestFrame,
            activate: activate,
            prime: prime,
            destroy: function () {
                window.clearTimeout(preloadTimer);
            }
        };
    }

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

    function buildSequenceTimeline(sequence, options) {
        if (!sequence) return null;
        const chapters = gsap.utils.toArray(options.chapterSelector);
        const endGlide = typeof options.endGlide === "number" ? Math.max(0, options.endGlide) : 0.15;
        const settleStart = 0.94;
        const settleFrame = Math.round((sequence.frameCount - 1) * settleStart);
        const totalDuration = 1 + endGlide;
        const scrollDistanceScale = totalDuration;

        gsap.set(chapters, { autoAlpha: 0 });
        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: options.trigger,
                start: "top top",
                end: function () {
                    if (window.innerWidth >= 992) {
                        return `+=${Math.round(options.desktopDistance * scrollDistanceScale)}`;
                    }
                    const responsiveDistance = Math.round(Math.max(2400, window.innerHeight * 3.6));
                    const mobilePlaybackDistance = Math.min(options.mobileDistance, responsiveDistance);
                    return `+=${Math.round(mobilePlaybackDistance * scrollDistanceScale)}`;
                },
                scrub: 0.55,
                pin: true,
                pinSpacing: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                refreshPriority: options.trigger === "#section_1" ? 20 : 10,
                onEnter: sequence.activate,
                onEnterBack: sequence.activate
            }
        });

        function renderSequenceFrame() {
            sequence.requestAround(sequence.state.frame);
            sequence.render(false);
        }

        timeline
            .to(sequence.state, {
                frame: settleFrame,
                duration: settleStart,
                ease: "none",
                onUpdate: renderSequenceFrame
            }, 0)
            .to(sequence.state, {
                frame: sequence.frameCount - 1,
                duration: totalDuration - settleStart,
                ease: "power2.out",
                onUpdate: renderSequenceFrame
            }, settleStart);

        const progressBar = sequence.stage.querySelector(".sequence-progress span");
        if (progressBar) timeline.to(progressBar, { scaleX: 1, duration: totalDuration, ease: "none" }, 0);

        options.chapterWindows.forEach(function (range, index) {
            if (chapters[index]) animateChapter(timeline, chapters[index], range[0], range[1], options.chapterTransition);
        });

        if (options.heroIntroMotion) {
            const stage = sequence.stage;
            timeline
                .to(stage.querySelectorAll(".hero-categories span"), {
                    y: isMobile ? -180 : -300,
                    duration: 0.14,
                    ease: "power2.in"
                }, 0.025)
                .to(stage.querySelector(".hero-intro p"), {
                    y: isMobile ? -180 : -300,
                    duration: 0.14,
                    ease: "power2.in"
                }, 0.025)
                .to(stage.querySelector("#hero-h1-1"), {
                    x: function () {
                        return isMobile ? -window.innerWidth * 1.15 : -Math.max(800, window.innerWidth * 0.85);
                    },
                    duration: 0.15,
                    ease: "power2.in"
                }, 0.035)
                .to(stage.querySelector("#hero-h1-2"), {
                    x: function () {
                        return isMobile ? window.innerWidth * 1.15 : Math.max(800, window.innerWidth * 0.85);
                    },
                    duration: 0.15,
                    ease: "power2.in"
                }, 0.035)
                .to(stage.querySelector(".sequence-scroll-cue"), {
                    autoAlpha: 0,
                    y: -45,
                    duration: 0.08,
                    ease: "power2.in"
                }, 0.025);
        } else if (options.introSelector) {
            timeline.to(options.introSelector, {
                y: -36,
                duration: 0.06,
                stagger: 0.008,
                ease: "power2.in"
            }, 0.1);
        }

        return timeline;
    }

    try {
        const dubaiSequence = createImageSequence({
            canvasId: "dubai-sequence-canvas",
            trigger: "#section_1",
            folder: "dubai_zoom_image_frames",
            frameCount: 596
        });

        const propertySequence = createImageSequence({
            canvasId: "property-sequence-canvas",
            trigger: "#property-journey",
            folder: "real_estate_video_img_frames",
            frameCount: 596
        });

        buildSequenceTimeline(dubaiSequence, {
            trigger: "#section_1",
            chapterSelector: "[data-dubai-chapter]",
            introSelector: ".hero-intro-layer",
            heroIntroMotion: true,
            chapterWindows: [[0.20, 0.34], [0.43, 0.59], [0.69, 0.88]],
            desktopDistance: 5200,
            mobileDistance: 3800,
            posterFrame: 300
        });

        buildSequenceTimeline(propertySequence, {
            trigger: "#property-journey",
            chapterSelector: "[data-property-chapter]",
            // Caption 03 follows the townhouse reveal (~image 363); caption 04 follows the city reveal (~image 508).
            chapterWindows: [[0.03, 0.18], [0.27, 0.43], [0.608, 0.792], [0.852, 0.94]],
            chapterTransition: {
                enterDuration: 0.07,
                leaveDuration: 0.06,
                enterEase: "power2.out",
                leaveEase: "power2.inOut"
            },
            desktopDistance: 5600,
            mobileDistance: 4000,
            posterFrame: 200
        });

        if (propertySequence) {
            ScrollTrigger.create({
                trigger: "#property-journey",
                start: "top 180%",
                once: true,
                onEnter: propertySequence.activate
            });
        }

        if (dubaiSequence) {
            const primePromise = dubaiSequence.prime(90, function (progress) {
                setLoaderProgress(progress * 0.96);
            });

            primePromise.then(function () {
                dubaiSequence.activate();
                window.clearTimeout(loaderFailSafe);
                finishLoader();
            });
        } else {
            window.clearTimeout(loaderFailSafe);
            finishLoader();
        }
    } catch (error) {
        console.error("ICS image sequence initialization failed:", error);
        window.clearTimeout(loaderFailSafe);
        finishLoader();
    }

    window.addEventListener("load", function () {
        ScrollTrigger.refresh();
    }, { once: true });
})();
