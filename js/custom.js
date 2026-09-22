(function () {
    "use strict";

    const header = document.getElementById("site-header");
    const toggle = document.getElementById("menu-toggle");
    const panel = document.getElementById("menu-panel");
    const main = document.querySelector(".site-main");
    const preferredDate = document.getElementById("bb-date");
    const bookingForm = document.getElementById("bb-booking-form");
    const bookingFormStatus = document.getElementById("bb-form-status");
    const menuLinks = panel ? Array.from(panel.querySelectorAll(".menu-link")) : [];
    let menuOpen = false;
    let pendingMenuTarget = null;

    if (preferredDate) {
        preferredDate.min = new Date().toISOString().split("T")[0];
    }

    if (bookingForm && bookingFormStatus) {
        bookingForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const submitButton = bookingForm.querySelector("button[type='submit']");
            if (submitButton) submitButton.disabled = true;
            bookingFormStatus.textContent = "Sending your enquiry...";
            bookingFormStatus.className = "booking-form-status is-sending";

            try {
                const response = await fetch(bookingForm.action, {
                    method: "POST",
                    body: new FormData(bookingForm),
                    headers: { Accept: "application/json" }
                });

                if (!response.ok) throw new Error("The enquiry could not be sent.");

                bookingForm.reset();
                bookingFormStatus.textContent = "Thank you. Your enquiry has been sent.";
                bookingFormStatus.className = "booking-form-status is-success";
            } catch (error) {
                bookingFormStatus.textContent = "Something went wrong. Please try again or email info@icsrealestate.ae.";
                bookingFormStatus.className = "booking-form-status is-error";
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }
    let headerHidden = false;
    let lastHeaderScroll = window.scrollY;

    function setHeaderHidden(hidden, immediate) {
        if (!header || headerHidden === hidden) return;
        headerHidden = hidden;

        if (window.gsap) {
            gsap.to(header, {
                yPercent: hidden ? -125 : 0,
                autoAlpha: hidden ? 0 : 1,
                duration: immediate ? 0 : (hidden ? 0.38 : 0.52),
                ease: hidden ? "power2.in" : "power3.out",
                overwrite: "auto"
            });
        } else {
            header.style.transform = hidden ? "translateY(-125%)" : "translateY(0)";
            header.style.opacity = hidden ? "0" : "1";
            header.style.visibility = hidden ? "hidden" : "visible";
        }
    }

    function setMenuState(open) {
        menuOpen = open;
        if (open) setHeaderHidden(false);
        document.body.classList.toggle("menu-is-open", open);
        if (window.icsScroll) {
            if (open) window.icsScroll.lock("menu");
            else window.icsScroll.unlock("menu");
        }
        if (main) {
            if (open) main.setAttribute("inert", "");
            else main.removeAttribute("inert");
        }
        if (toggle) {
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
            const label = toggle.querySelector(".menu-toggle__label");
            if (label) label.textContent = open ? "Close" : "Menu";
        }
        if (panel) panel.setAttribute("aria-hidden", String(!open));
    }

    if (toggle && panel && window.gsap) {
        const menuTimeline = gsap.timeline({
            paused: true,
            defaults: { ease: "power4.inOut" },
            onStart: function () {
                panel.style.visibility = "visible";
            },
            onComplete: function () {
                if (menuLinks[0]) menuLinks[0].focus({ preventScroll: true });
            },
            onReverseComplete: function () {
                panel.style.visibility = "hidden";
                setMenuState(false);

                if (pendingMenuTarget && window.icsScroll) {
                    const target = pendingMenuTarget;
                    pendingMenuTarget = null;
                    window.icsScroll.scrollTo(target, {
                        updateHash: true,
                        focus: true,
                        focusAtStart: true
                    });
                } else {
                    pendingMenuTarget = null;
                    toggle.focus({ preventScroll: true });
                }
            }
        });

        menuTimeline
            .fromTo(panel, 
                { 
                    clipPath: "inset(0 0 100% 0)",
                    y: "-100%",
                    autoAlpha: 0
                },
                { 
                    clipPath: "inset(0% 0% 0% 0%)", 
                    y: "0%",
                    autoAlpha: 1,
                    duration: 0.6,
                    ease: "power3.out"
                }, 
                0
            )
            .fromTo(".menu-panel__meta span",
                { y: 18, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.04, ease: "power3.out" },
                0.35
            )
            .fromTo(".menu-link__label",
                { yPercent: 115 },
                { yPercent: 0, duration: 0.7, stagger: 0.055, ease: "power4.out" },
                0.26
            )
            .fromTo(".menu-link__index",
                { autoAlpha: 0, x: -12 },
                { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" },
                0.48
            )
            .fromTo(".menu-panel__footer a",
                { y: 14, autoAlpha: 0 },
                { y: 0, autoAlpha: 1, duration: 0.4, stagger: 0.06, ease: "power2.out" },
                0.52
            );

        toggle.addEventListener("click", function () {
            if (menuOpen) {
                pendingMenuTarget = null;
                menuTimeline.reverse();
            } else {
                setMenuState(true);
                menuTimeline.play(0);
            }
        });

        menuLinks.forEach(function (link) {
            link.addEventListener("click", function (event) {
                const target = document.querySelector(link.getAttribute("href"));
                if (!target) return;
                event.preventDefault();
                pendingMenuTarget = target;
                menuTimeline.reverse();
            });
        });

        document.addEventListener("keydown", function (event) {
            if (!menuOpen) return;
            if (event.key === "Escape") {
                pendingMenuTarget = null;
                menuTimeline.reverse();
                return;
            }
            if (event.key !== "Tab") return;

            const focusable = [toggle].concat(menuLinks, Array.from(panel.querySelectorAll(".menu-panel__footer a")));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    } else if (toggle && panel) {
        toggle.addEventListener("click", function () {
            setMenuState(!menuOpen);
            panel.style.visibility = menuOpen ? "visible" : "hidden";
        });
        menuLinks.forEach(function (link) {
            link.addEventListener("click", function (event) {
                const target = document.querySelector(link.getAttribute("href"));
                setMenuState(false);
                panel.style.visibility = "hidden";

                if (target && window.icsScroll) {
                    event.preventDefault();
                    window.icsScroll.scrollTo(target, {
                        updateHash: true,
                        focus: true,
                        focusAtStart: true
                    });
                }
            });
        });
    }

    if (header) {
        header.addEventListener("focusin", function () { setHeaderHidden(false); });
    }

    document.querySelectorAll('.social-icon-link[href="#"]').forEach(function (link) {
        link.addEventListener("click", function (event) { event.preventDefault(); });
    });

    const developerViewport = document.querySelector(".developer-strip__viewport");
    const developerTrack = document.querySelector(".developer-strip__track");

    if (developerViewport && developerTrack) {
        developerViewport.addEventListener("mouseenter", function () {
            developerTrack.style.animationPlayState = "paused";
        });

        developerViewport.addEventListener("mouseleave", function () {
            delete developerTrack.dataset.manualScroll;
            developerTrack.style.transform = "";
            developerTrack.style.animation = "";
            developerTrack.style.animationPlayState = "running";
        });

        developerViewport.addEventListener("focusin", function () {
            developerTrack.style.animationPlayState = "paused";
        });

        developerViewport.addEventListener("focusout", function () {
            developerTrack.style.animationPlayState = "running";
        });

    }

    if (window.ScrollTrigger) {
        ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: function (self) {
                const currentScroll = self.scroll();
                const delta = currentScroll - lastHeaderScroll;

                if (header) header.classList.toggle("is-scrolled", currentScroll > 80);

                if (menuOpen || currentScroll <= 24) {
                    setHeaderHidden(false);
                } else if (Math.abs(delta) > 2) {
                    setHeaderHidden(delta > 0);
                }

                lastHeaderScroll = currentScroll;
            }
        });

        menuLinks.forEach(function (link) {
            const section = document.querySelector(link.getAttribute("href"));
            if (!section) return;
            ScrollTrigger.create({
                trigger: section,
                start: "top 55%",
                end: "bottom 45%",
                onToggle: function (self) {
                    if (!self.isActive) return;
                    menuLinks.forEach(function (item) { item.classList.remove("active"); });
                    link.classList.add("active");
                }
            });
        });
    }
})();
