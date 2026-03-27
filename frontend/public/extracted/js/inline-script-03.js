window.lazyload_run = function (dom, is_first, check_dom_rect) {
        if (
          check_dom_rect &&
          (document.body.clientWidth <= 0 || document.body.clientheight <= 0)
        ) {
          return setTimeout(function () {
            window.lazyload_run(dom, is_first, check_dom_rect);
          }, 1);
        }
        var style_lazyload = document.getElementById("style_lazyload");
        var list_element_lazyload = dom.querySelectorAll(
          "body.lazyload .ladi-overlay, body.lazyload .ladi-box, body.lazyload .ladi-button-background, body.lazyload .ladi-collection-item, body.lazyload .ladi-countdown-background, body.lazyload .ladi-form-item-background, body.lazyload .ladi-form-label-container .ladi-form-label-item.image, body.lazyload .ladi-frame-background, body.lazyload .ladi-gallery-view-item, body.lazyload .ladi-gallery-control-item, body.lazyload .ladi-headline, body.lazyload .ladi-image-background, body.lazyload .ladi-image-compare, body.lazyload .ladi-list-paragraph ul li, body.lazyload .ladi-section-background, body.lazyload .ladi-survey-option-background, body.lazyload .ladi-survey-option-image, body.lazyload .ladi-tabs-background, body.lazyload .ladi-video-background, body.lazyload .ladi-banner, body.lazyload .ladi-spin-lucky-screen, body.lazyload .ladi-spin-lucky-start",
        );
        var docEventScroll = window;
        for (var i = 0; i < list_element_lazyload.length; i++) {
          var rect = list_element_lazyload[i].getBoundingClientRect();
          if (
            rect.x == "undefined" ||
            rect.x == undefined ||
            rect.y == "undefined" ||
            rect.y == undefined
          ) {
            rect.x = rect.left;
            rect.y = rect.top;
          }
          var offset_top = rect.y + window.scrollY;
          if (
            offset_top >= window.scrollY + window.innerHeight ||
            window.scrollY >= offset_top + list_element_lazyload[i].offsetHeight
          ) {
            list_element_lazyload[i].classList.add("ladi-lazyload");
          }
        }
        if (
          typeof style_lazyload != "undefined" &&
          style_lazyload != undefined
        ) {
          style_lazyload.parentElement.removeChild(style_lazyload);
        }
        document.body.classList.remove("lazyload");
        var currentScrollY = window.scrollY;
        var stopLazyload = function (event) {
          if (event.type == "scroll" && window.scrollY == currentScrollY) {
            currentScrollY = -1;
            return;
          }
          docEventScroll.removeEventListener("scroll", stopLazyload);
          list_element_lazyload =
            document.getElementsByClassName("ladi-lazyload");
          while (list_element_lazyload.length > 0) {
            list_element_lazyload[0].classList.remove("ladi-lazyload");
          }
        };
        if (is_first) {
          var scrollEventPassive = null;
          try {
            var opts = Object.defineProperty({}, "passive", {
              get: function () {
                scrollEventPassive = { passive: true };
              },
            });
            window.addEventListener("testPassive", null, opts);
            window.removeEventListener("testPassive", null, opts);
          } catch (e) {}
          docEventScroll.addEventListener(
            "scroll",
            stopLazyload,
            scrollEventPassive,
          );
        }
        return dom;
      };
      window.lazyload_run(document, true, true);
