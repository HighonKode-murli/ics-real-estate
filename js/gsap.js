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

        const usesManagedSeeking = navigator.maxTouchPoints > 0
            && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
        const minimumSeekInterval = 1000 / 15;
        const minimumSeekDelta = 1 / 30;
        const state = { progress: 0 };
        let isReady = false;
        let readyResolved = false;
        let isPrepared = false;
        let isUnlocked = false;
        let unlockPromise = null;
        let desiredTime = 0;
        let lastTargetTime = -1;
        let lastSeekStartedAt = -Infinity;
        let seekInFlight = false;
        let seekQueued = false;
        let seekTimer = 0;
        let seekWatchdog = 0;
        let readinessTimer = 0;
        let resolveReadiness;

        const ready = new Promise(function (resolve) {
            resolveReadiness = resolve;
        });

        function resolveReady(success) {
            if (readyResolved) return;
            readyResolved = true;
            resolveReadiness(success);
        }

        function targetTimeForProgress() {
            const progress = Math.max(0, Math.min(1, state.progress));
            return progress === 1
                ? Math.max(0, video.duration - (1 / 240))
                : progress * video.duration;
        }

        function issueManagedSeek(force) {
            window.clearTimeout(seekTimer);
            seekTimer = 0;
            if (!isReady || !Number.isFinite(video.duration) || video.duration <= 0) return;

            const delta = Math.abs(desiredTime - video.currentTime);
            if (delta < minimumSeekDelta) {
                seekQueued = false;
                return;
            }

            if (seekInFlight || video.seeking) {
                seekQueued = true;
                return;
            }

            const wait = minimumSeekInterval - (performance.now() - lastSeekStartedAt);
            if (!force && wait > 0) {
                seekQueued = true;
                seekTimer = window.setTimeout(function () {
                    issueManagedSeek(false);
                }, wait);
                return;
            }

            seekQueued = false;
            seekInFlight = true;
            lastSeekStartedAt = performance.now();
            window.clearTimeout(seekWatchdog);
            seekWatchdog = window.setTimeout(function () {
                seekInFlight = false;
                if (isReady && Math.abs(desiredTime - video.currentTime) >= minimumSeekDelta) {
                    issueManagedSeek(false);
                }
            }, 500);

            try {
                video.currentTime = desiredTime;
            } catch (error) {
                window.clearTimeout(seekWatchdog);
                seekInFlight = false;
            }
        }

        function render(force) {
            if (!isReady || !Number.isFinite(video.duration) || video.duration <= 0) return;
            desiredTime = targetTimeForProgress();

            if (usesManagedSeeking) {
                issueManagedSeek(Boolean(force));
                return;
            }

            if (!force && Math.abs(desiredTime - lastTargetTime) < (1 / 240)) return;
            lastTargetTime = desiredTime;
            video.currentTime = desiredTime;
        }

        function markReady() {
            if (isReady || !Number.isFinite(video.duration) || video.duration <= 0 || video.readyState < 2) return;
            isReady = true;
            window.clearTimeout(readinessTimer);
            stage.classList.remove("is-video-error");
            stage.classList.add("is-video-ready");
            if (!unlockPromise) video.pause();
            resolveReady(true);
            render(true);
        }

        function markError() {
            window.clearTimeout(seekTimer);
            window.clearTimeout(seekWatchdog);
            seekInFlight = false;
            seekQueued = false;
            if (isReady) return;
            stage.classList.add("is-video-error");
            resolveReady(false);
        }

        function checkReady() {
            if (video.readyState >= 2) markReady();
        }

        function primeFirstFrame() {
            if (!isPrepared || !Number.isFinite(video.duration) || video.duration <= 0 || video.currentTime > 0) return;
            try {
                video.currentTime = Math.min(0.001, video.duration / 2);
            } catch (error) {
                // Safari may reject this until its media pipeline is unlocked by a gesture.
            }
        }

        function removeUnlockListeners() {
            document.removeEventListener("touchstart", unlockFromGesture, true);
            document.removeEventListener("pointerdown", unlockFromGesture, true);
        }

        function unlock(fromGesture) {
            if (!usesManagedSeeking || !isPrepared || isUnlocked || (unlockPromise && !fromGesture)) return unlockPromise;
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.setAttribute("playsinline", "");
            video.setAttribute("webkit-playsinline", "");

            let playAttempt;
            try {
                playAttempt = video.play();
            } catch (error) {
                return null;
            }

            if (!playAttempt || typeof playAttempt.then !== "function") {
                isUnlocked = true;
                video.pause();
                removeUnlockListeners();
                checkReady();
                return null;
            }

            unlockPromise = playAttempt.then(function () {
                isUnlocked = true;
                unlockPromise = null;
                video.pause();
                removeUnlockListeners();
                checkReady();
                render(true);
            }).catch(function () {
                unlockPromise = null;
            });

            return unlockPromise;
        }

        function unlockFromGesture() {
            unlock(true);
        }

        function prepare() {
            if (isPrepared) return;
            isPrepared = true;
            video.preload = "auto";
            readinessTimer = window.setTimeout(markError, 8000);

            if (video.readyState < 2) video.load();
            if (usesManagedSeeking) unlock();
            primeFirstFrame();
            checkReady();
        }

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.addEventListener("loadedmetadata", function () {
            primeFirstFrame();
            checkReady();
        });
        video.addEventListener("loadeddata", markReady);
        video.addEventListener("canplay", markReady);
        video.addEventListener("timeupdate", checkReady);
        video.addEventListener("seeked", function () {
            window.clearTimeout(seekWatchdog);
            seekInFlight = false;
            checkReady();
            if (usesManagedSeeking && isReady
                && (seekQueued || Math.abs(desiredTime - video.currentTime) >= minimumSeekDelta)) {
                issueManagedSeek(false);
            }
        });
        video.addEventListener("error", markError);

        if (usesManagedSeeking) {
            document.addEventListener("touchstart", unlockFromGesture, { passive: true, capture: true });
            document.addEventListener("pointerdown", unlockFromGesture, { passive: true, capture: true });
        }

        if (!options.deferPreload) prepare();

        return {
            stage: stage,
            state: state,
            ready: ready,
            render: render,
            prepare: prepare,
            activate: function () {
                prepare();
                unlock();
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
            trigger: "#property-journey",
            deferPreload: true
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
            ScrollTrigger.create({
                trigger: "#property-journey",
                start: "top 180%",
                once: true,
                onEnter: propertySequence.prepare
            });
        }

        if (dubaiSequence) {
            dubaiSequence.ready.then(function () {
                setLoaderProgress(0.96);
                dubaiSequence.activate();
                window.clearTimeout(loaderFailSafe);
                finishLoader();
            });
        } else {
            window.clearTimeout(loaderFailSafe);
            finishLoader();
        }
    } catch (error) {
        console.error("ICS video sequence initialization failed:", error);
        window.clearTimeout(loaderFailSafe);
        finishLoader();
    }

    window.addEventListener("load", function () {
        ScrollTrigger.refresh();
    }, { once: true });
})();
