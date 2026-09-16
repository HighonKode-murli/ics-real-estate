// Sidebar section navigation and active state.
(function ($) {
    "use strict";

    const $links = $("#sidebarMenu .nav-link[href^='#']");

    function targetFor(link) {
        const selector = $(link).attr("href");
        if (!selector || selector === "#") return $();
        return $(selector);
    }

    function updateActiveLink() {
        const scrollPosition = $(document).scrollTop() + 1;
        let activeIndex = 0;

        $links.each(function (index) {
            const $target = targetFor(this);
            if ($target.length && scrollPosition >= $target.offset().top) {
                activeIndex = index;
            }
        });

        $links.addClass("inactive").removeClass("active");
        $links.eq(activeIndex).addClass("active").removeClass("inactive");
    }

    $(document).on("scroll", updateActiveLink);

    $links.on("click", function (event) {
        const $target = targetFor(this);
        if (!$target.length) return;

        event.preventDefault();
        $("html, body").stop(true).animate({
            scrollTop: $target.offset().top
        }, 300);
    });

    $(updateActiveLink);
})(window.jQuery);
