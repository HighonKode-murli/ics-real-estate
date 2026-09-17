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

    // Without this the bar holds at zero for the whole hero download and the site
    // reads as hung. Buffered ranges give a truthful figure for almost no cost.
    function reportLoaderBuffering(video) {
        if (!video) return;

        function update() {
            if (loaderFinished || !video.buffered || video.buffered.length === 0) return;
            const duration = video.duration;
            if (!Number.isFinite(duration) || duration <= 0) return;

            const buffered = video.buffered.end(video.buffered.length - 1);
            setLoaderProgress(0.08 + 0.85 * Math.min(1, buffered / duration));
        }

        video.addEventListener("progress", update);
        video.addEventListener("loadedmetadata", function () {
            setLoaderProgress(0.08);
        }, { once: true });
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
    const loaderFailSafe = window.setTimeout(finishLoader, 8000);

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

    // Register ordinary page animations before scroll-video setup so a media
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

    function createVideoSequence(options) {
        const video = document.getElementById(options.videoId);
        const stage = document.querySelector(options.trigger);
        if (!video || !stage) return null;

        const state = { progress: 0 };
        let isReady = false;
        let lastTargetTime = -1;
        let loadStarted = video.preload !== "none";
        let readinessWatchdog = 0;
        let resolveReadiness;

        const ready = new Promise(function (resolve) {
            resolveReadiness = resolve;
        });

        // Direct currentTime assignment on every scrub update. Attempts to
        // throttle this against video.seeking deadlock the scrub, so the seek
        // load is kept down by shipping a smaller rendition instead (see the
        // <source> list in index.html) rather than by dropping updates here.
        function render(force) {
            if (!isReady || !Number.isFinite(video.duration) || video.duration <= 0) return;

            const progress = Math.max(0, Math.min(1, state.progress));
            const targetTime = progress === 1
                ? Math.max(0, video.duration - (1 / 240))
                : progress * video.duration;

            if (!force && Math.abs(targetTime - lastTargetTime) < (1 / 240)) return;
            lastTargetTime = targetTime;
            video.currentTime = targetTime;
        }

        function requestLoad() {
            if (loadStarted) return;
            loadStarted = true;
            if (video.preload === "none") video.preload = "auto";
            video.load();
            startReadinessWatchdog();
        }

        function markReady() {
            if (isReady) return;
            isReady = true;
            window.clearTimeout(readinessWatchdog);
            stage.classList.remove("is-video-error");
            stage.classList.add("is-video-ready");
            video.pause();
            render(true);
            resolveReadiness(true);
        }

        function markUnavailable() {
            if (isReady) return;
            // Show the stage backdrop instead of leaving a spinner running
            // forever. This is not final: a slow video that arrives later still
            // calls markReady and takes over.
            stage.classList.add("is-video-error");
            resolveReadiness(false);
        }

        function startReadinessWatchdog() {
            window.clearTimeout(readinessWatchdog);
            readinessWatchdog = window.setTimeout(markUnavailable, 15000);
        }

        video.muted = true;
        video.defaultMuted = true;
        video.pause();

        // Not { once: true }: if the watchdog gave up first, a late success must
        // still be able to promote the stage to ready.
        video.addEventListener("loadeddata", markReady);
        // With <source> children the failure event is dispatched at the child,
        // not at the video, so this listener has to capture. A single source
        // failing is normal (the browser tries the next one); only an exhausted
        // candidate list, NETWORK_NO_SOURCE, is terminal.
        video.addEventListener("error", function () {
            if (video.networkState === 3) markUnavailable();
        }, true);

        if (video.readyState >= 2 && Number.isFinite(video.duration)) {
            markReady();
        } else if (loadStarted) {
            if (video.networkState === 0) video.load();
            startReadinessWatchdog();
        }

        return {
            stage: stage,
            state: state,
            ready: ready,
            render: render,
            video: video,
            requestLoad: requestLoad,
            activate: function () {
                requestLoad();
                video.pause();
                render(true);
            }
        };
    }

    function buildSequenceTimeline(sequence, options) {
        if (!sequence) return null;
        const chapters = gsap.utils.toArray(options.chapterSelector);
        const endGlide = typeof options.endGlide === "number" ? Math.max(0, options.endGlide) : 0.15;
        const settleStart = 0.94;
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
                onEnterBack: sequence.activate,
                onLeave: function (self) {
                    if (self.direction <= 0 || !options.exitTarget) return;
                    if (window.icsScroll && typeof window.icsScroll.requestSoftLanding === "function") {
                        window.icsScroll.requestSoftLanding(options.exitTarget);
                    }
                }
            }
        });

        function renderSequenceVideo() {
            sequence.render(false);
        }

        timeline
            .to(sequence.state, {
                progress: settleStart,
                duration: settleStart,
                ease: "none",
                onUpdate: renderSequenceVideo
            }, 0)
            .to(sequence.state, {
                progress: 1,
                duration: totalDuration - settleStart,
                ease: "power2.out",
                onUpdate: renderSequenceVideo
            }, settleStart);

        const progressBar = sequence.stage.querySelector(".sequence-progress span");
        if (progressBar) {
            const progressAxis = progressBar.parentElement.dataset.progressAxis === "y" ? "scaleY" : "scaleX";
            const progressAnimation = { duration: totalDuration, ease: "none" };
            progressAnimation[progressAxis] = 1;
            timeline.to(progressBar, progressAnimation, 0);
        }

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
        }

        return timeline;
    }

    try {
        const dubaiSequence = createVideoSequence({
            videoId: "dubai-sequence-video",
            trigger: "#section_1"
        });

        const propertySequence = createVideoSequence({
            videoId: "property-sequence-video",
            trigger: "#property-journey"
        });

        buildSequenceTimeline(dubaiSequence, {
            trigger: "#section_1",
            exitTarget: "#section_2",
            chapterSelector: "[data-dubai-chapter]",
            heroIntroMotion: true,
            chapterWindows: [[0.20, 0.34], [0.43, 0.59], [0.69, 0.88]],
            desktopDistance: 5200,
            mobileDistance: 3800
        });

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

        if (propertySequence) {
            // Backstop: if the hero never resolves, the second clip must still
            // start loading before the visitor arrives at it.
            ScrollTrigger.create({
                trigger: "#property-journey",
                start: "top 300%",
                once: true,
                onEnter: propertySequence.requestLoad
            });
        }

        if (dubaiSequence) {
            reportLoaderBuffering(dubaiSequence.video);

            // The two clips download in sequence rather than in parallel. Loading
            // both at once was the reason the hero took so long to appear; making
            // the second one wait for the visitor instead left it unbuffered on
            // arrival, so it starts the moment the hero is playable. The hero is
            // pinned for thousands of pixels of scroll, which is ample time.
            dubaiSequence.ready.then(function () {
                if (propertySequence) propertySequence.requestLoad();
            });

            // The reveal is capped in time as well as gated on the video. A
            // visitor on a slow link should meet the site and watch the hero fade
            // in, not sit behind a loader waiting for tens of megabytes.
            const revealDeadline = new Promise(function (resolve) {
                window.setTimeout(resolve, 4500);
            });

            Promise.race([dubaiSequence.ready, revealDeadline]).then(function () {
                setLoaderProgress(0.96);
                dubaiSequence.activate();
                if (propertySequence) propertySequence.requestLoad();
                window.clearTimeout(loaderFailSafe);
                finishLoader();
            });
        } else {
            if (propertySequence) propertySequence.requestLoad();
            window.clearTimeout(loaderFailSafe);
            finishLoader();
        }

        // Lets us confirm scrub state from the console on a real device without
        // adding logging to the hot path: window.icsSequences.status()
        window.icsSequences = {
            dubai: dubaiSequence,
            property: propertySequence,
            status: function () {
                return [["dubai", dubaiSequence], ["property", propertySequence]].map(function (entry) {
                    const sequence = entry[1];
                    if (!sequence) return { name: entry[0], created: false };
                    const video = sequence.video;
                    return {
                        name: entry[0],
                        src: video.currentSrc || "(none)",
                        readyState: video.readyState,
                        networkState: video.networkState,
                        duration: video.duration,
                        currentTime: video.currentTime,
                        progress: sequence.state.progress,
                        classes: sequence.stage.className
                    };
                });
            }
        };
    } catch (error) {
        console.error("ICS video sequence initialization failed:", error);
        window.clearTimeout(loaderFailSafe);
        finishLoader();
    }

    window.addEventListener("load", function () {
        ScrollTrigger.refresh();
    }, { once: true });
})();
