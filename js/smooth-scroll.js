(function () {
    "use strict";

    const lockReasons = new Set();
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const header = document.getElementById("site-header");
    let pendingScroll = null;
    let refreshFrame = 0;
    let cancelNativeCompletion = null;

    if (document.body.classList.contains("is-loading")) {
        lockReasons.add("loader");
    }

    const primaryTouchDevice = navigator.maxTouchPoints > 0
        && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const lenis = !primaryTouchDevice && typeof window.Lenis === "function"
        ? new window.Lenis({
            autoRaf: false,
            smoothWheel: true,
            syncTouch: false,
            lerp: 0.085,
            wheelMultiplier: 0.9,
            touchMultiplier: 1,
            overscroll: false,
            anchors: false,
            autoResize: true,
            respectReducedMotion: true
        })
        : null;

    const softLandingConfig = {
        wheelSessionMs: 2000,
        holdDownwardInputMs: 900,
        cooldownMs: 1200
    };
    let lastWheelAt = -Infinity;
    let lastWheelDeltaY = 0;
    let softLanding = null;
    let softLandingCooldownUntil = 0;
    let programmaticScrollUntil = 0;
    let navigationToken = 0;

    function prefersReducedMotion() {
        return reducedMotionQuery.matches || Boolean(lenis && lenis.prefersReducedMotion);
    }

    function resolveTarget(value) {
        if (value instanceof Element || typeof value === "number") return value;
        if (typeof value !== "string") return null;
        if (value === "#" || value === "") return null;

        if (value.charAt(0) === "#") {
            try {
                return document.getElementById(decodeURIComponent(value.slice(1)));
            } catch (error) {
                return null;
            }
        }

        return document.querySelector(value);
    }

    function headerOffset(target) {
        if (!(target instanceof Element) || target.id === "section_1") return 0;
        const height = header ? header.getBoundingClientRect().height : 0;
        return -Math.ceil(height + 12);
    }

    function focusTarget(target) {
        if (!(target instanceof HTMLElement)) return;

        const hadTabIndex = target.hasAttribute("tabindex");
        if (!hadTabIndex) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });

        if (!hadTabIndex) {
            target.addEventListener("blur", function cleanupTabIndex() {
                target.removeAttribute("tabindex");
            }, { once: true });
        }
    }

    function updateHash(target, mode) {
        if (!(target instanceof Element) || !target.id || mode === false) return;
        const hash = `#${encodeURIComponent(target.id)}`;
        if (window.location.hash === hash) return;

        if (mode === "replace") window.history.replaceState(null, "", hash);
        else window.history.pushState(null, "", hash);
    }

    function clearSoftLanding(startCooldown) {
        if (softLanding) window.clearTimeout(softLanding.timeoutId);
        softLanding = null;
        if (startCooldown) {
            softLandingCooldownUntil = performance.now() + softLandingConfig.cooldownMs;
        }
    }

    function nativeScroll(target, options, onComplete) {
        const top = typeof target === "number"
            ? target
            : window.scrollY + target.getBoundingClientRect().top + options.offset;
        const immediate = options.immediate || prefersReducedMotion();
        let completionTimer = 0;
        let completed = false;

        if (cancelNativeCompletion) cancelNativeCompletion();

        function cleanup() {
            window.clearTimeout(completionTimer);
            window.removeEventListener("scrollend", finish);
            window.removeEventListener("wheel", cancel);
            window.removeEventListener("touchstart", cancel);
            window.removeEventListener("pointerdown", cancel);
            window.removeEventListener("keydown", cancel);
            if (cancelNativeCompletion === cancel) cancelNativeCompletion = null;
        }

        function finish() {
            if (completed) return;
            completed = true;
            cleanup();
            onComplete();
        }

        function cancel() {
            completed = true;
            cleanup();
        }

        cancelNativeCompletion = cancel;
        window.addEventListener("wheel", cancel, { once: true, passive: true });
        window.addEventListener("touchstart", cancel, { once: true, passive: true });
        window.addEventListener("pointerdown", cancel, { once: true, passive: true });
        window.addEventListener("keydown", cancel, { once: true });

        if (!immediate && "onscrollend" in window) {
            window.addEventListener("scrollend", finish, { once: true });
            completionTimer = window.setTimeout(finish, 2000);
        } else if (!immediate) {
            completionTimer = window.setTimeout(finish, 700);
        }

        window.scrollTo({
            top: Math.max(0, top),
            behavior: immediate ? "auto" : "smooth"
        });

        if (immediate) window.requestAnimationFrame(finish);
    }

    function performScroll(request) {
        const target = resolveTarget(request.target);
        if (target === null) return false;

        if (lockReasons.size && !request.force) {
            pendingScroll = request;
            return true;
        }

        pendingScroll = null;
        const isSoftLanding = request.source === "soft-landing";
        const scrollTarget = target instanceof Element && target.id === "section_1" ? 0 : target;
        const options = {
            offset: typeof request.offset === "number" ? request.offset : headerOffset(target),
            immediate: Boolean(request.immediate) || prefersReducedMotion()
        };
        let requestNavigationToken = navigationToken;

        if (!isSoftLanding) {
            clearSoftLanding(true);
            requestNavigationToken = ++navigationToken;
            programmaticScrollUntil = performance.now() + (options.immediate ? 300 : 4000);
        }

        if (request.focusAtStart) focusTarget(target);

        const complete = function () {
            if (!isSoftLanding && requestNavigationToken === navigationToken) {
                programmaticScrollUntil = 0;
            }
            if (request.focus !== false && !request.focusAtStart) focusTarget(target);
            if (typeof request.onComplete === "function") request.onComplete();
        };

        updateHash(target, request.updateHash);

        if (lenis) {
            lenis.scrollTo(scrollTarget, {
                offset: options.offset,
                immediate: options.immediate,
                lerp: options.immediate
                    ? 1
                    : (typeof request.lerp === "number" ? request.lerp : 0.075),
                force: Boolean(request.force),
                onComplete: complete
            });
        } else {
            nativeScroll(scrollTarget, options, complete);
        }

        return true;
    }

    function requestSoftLanding(target) {
        const now = performance.now();
        if (!lenis || prefersReducedMotion() || lockReasons.size || softLanding) return false;
        if (now < softLandingCooldownUntil || now < programmaticScrollUntil) return false;
        if (now - lastWheelAt > softLandingConfig.wheelSessionMs || lastWheelDeltaY <= 0) return false;

        const landingTarget = resolveTarget(target);
        if (!(landingTarget instanceof Element)) return false;

        const landing = {
            startedAt: now,
            target: landingTarget,
            timeoutId: 0
        };
        softLanding = landing;
        lastWheelAt = -Infinity;

        const started = performScroll({
            target: landingTarget,
            updateHash: false,
            focus: false,
            focusAtStart: false,
            force: false,
            immediate: false,
            lerp: 0.18,
            source: "soft-landing",
            onComplete: function () {
                if (softLanding === landing) clearSoftLanding(true);
            }
        });

        if (!started) {
            clearSoftLanding(true);
            return false;
        }

        landing.timeoutId = window.setTimeout(function () {
            if (softLanding === landing) clearSoftLanding(true);
        }, 2400);

        return true;
    }

    function refresh() {
        window.cancelAnimationFrame(refreshFrame);
        refreshFrame = window.requestAnimationFrame(function () {
            if (lenis) lenis.resize();
            if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        });
    }

    function applyLockState() {
        if (!lenis) {
            if (!lockReasons.size && pendingScroll) {
                const request = pendingScroll;
                pendingScroll = null;
                window.requestAnimationFrame(function () {
                    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
                    performScroll(request);
                });
            }
            return;
        }
        if (lockReasons.size) {
            lenis.stop();
            return;
        }

        lenis.start();
        window.requestAnimationFrame(function () {
            lenis.resize();
            if (window.ScrollTrigger) window.ScrollTrigger.refresh();
            if (pendingScroll) performScroll(pendingScroll);
        });
    }

    const scrollController = {
        lenis: lenis,
        scrollTo: function (target, options) {
            return performScroll(Object.assign({
                target: target,
                updateHash: false,
                focus: false,
                focusAtStart: false,
                force: false,
                immediate: false,
                source: "navigation"
            }, options || {}));
        },
        requestSoftLanding: requestSoftLanding,
        lock: function (reason) {
            clearSoftLanding(true);
            lockReasons.add(reason || "anonymous");
            applyLockState();
        },
        unlock: function (reason) {
            lockReasons.delete(reason || "anonymous");
            applyLockState();
        },
        refresh: refresh,
        isLocked: function () {
            return lockReasons.size > 0;
        },
        prefersReducedMotion: prefersReducedMotion
    };

    window.icsScroll = scrollController;

    if (lenis) {
        lenis.on("virtual-scroll", function (input) {
            const event = input && input.event;
            const deltaY = input && Number.isFinite(input.deltaY) ? input.deltaY : 0;
            if (!event || event.type !== "wheel") return;

            const now = performance.now();
            if (softLanding && deltaY > 0
                && now - softLanding.startedAt < softLandingConfig.holdDownwardInputMs) {
                event.lenisStopPropagation = true;
                if (typeof event.preventDefault === "function") event.preventDefault();
                return;
            }

            if (softLanding) clearSoftLanding(true);
            lastWheelAt = now;
            lastWheelDeltaY = deltaY;
        });

        lenis.on("scroll", function () {
            if (window.ScrollTrigger) window.ScrollTrigger.update();
        });

        if (window.gsap) {
            window.gsap.ticker.add(function (time) {
                lenis.raf(time * 1000);
            });
            window.gsap.ticker.lagSmoothing(0);
        } else {
            const raf = function (time) {
                lenis.raf(time);
                window.requestAnimationFrame(raf);
            };
            window.requestAnimationFrame(raf);
        }

        if (window.ScrollTrigger) {
            window.ScrollTrigger.addEventListener("refresh", function () {
                lenis.resize();
            });
        }

        applyLockState();
    }

    document.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest("a[href^='#']");
        if (!link || link.hasAttribute("download") || link.target === "_blank") return;

        const hash = link.getAttribute("href");
        const target = resolveTarget(hash);
        if (!target) return;

        event.preventDefault();
        scrollController.scrollTo(target, {
            updateHash: true,
            focus: true
        });
    });

    window.addEventListener("load", function () {
        const target = resolveTarget(window.location.hash);
        if (target) {
            scrollController.scrollTo(target, {
                updateHash: false,
                focus: false,
                immediate: true
            });
        } else {
            refresh();
        }
    }, { once: true });
})();
