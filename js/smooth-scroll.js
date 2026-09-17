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

    const lenis = typeof window.Lenis === "function"
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
        const scrollTarget = target instanceof Element && target.id === "section_1" ? 0 : target;
        const options = {
            offset: typeof request.offset === "number" ? request.offset : headerOffset(target),
            immediate: Boolean(request.immediate) || prefersReducedMotion()
        };

        if (request.focusAtStart) focusTarget(target);

        const complete = function () {
            if (request.focus !== false && !request.focusAtStart) focusTarget(target);
            if (typeof request.onComplete === "function") request.onComplete();
        };

        updateHash(target, request.updateHash);

        if (lenis) {
            lenis.scrollTo(scrollTarget, {
                offset: options.offset,
                immediate: options.immediate,
                lerp: options.immediate ? 1 : 0.075,
                force: Boolean(request.force),
                onComplete: complete
            });
        } else {
            nativeScroll(scrollTarget, options, complete);
        }

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
                immediate: false
            }, options || {}));
        },
        lock: function (reason) {
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
