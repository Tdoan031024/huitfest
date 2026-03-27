(function () {
        var run = function () {
          if (
            typeof window.LadiPageScript == "undefined" ||
            typeof window.ladi == "undefined" ||
            window.ladi == undefined
          ) {
            setTimeout(run, 100);
            return;
          }
          window.LadiPageApp = window.LadiPageApp || new window.LadiPageAppV2();
          window.LadiPageScript.runtime.ladipage_id =
            "69b3b7e574c8d200121529ed";
          window.LadiPageScript.runtime.publish_platform = "LADIPAGEDNS";
          window.LadiPageScript.runtime.version = "1774002336751";
          window.LadiPageScript.runtime.cdn_url =
            "https://w.ladicdn.com/v5/source/";
          window.LadiPageScript.runtime.DOMAIN_SET_COOKIE = ["huituquiz.com"];
          window.LadiPageScript.runtime.DOMAIN_FREE = [
            "preview.ldpdemo.com",
            "ldp.page",
          ];
          window.LadiPageScript.runtime.bodyFontSize = 12;
          window.LadiPageScript.runtime.store_id = "";
          window.LadiPageScript.runtime.store_ladiuid =
            "6981a16b85cfac001298f229";
          window.LadiPageScript.runtime.time_zone = 7;
          window.LadiPageScript.runtime.currency = "VND";
          window.LadiPageScript.runtime.convert_replace_str = true;
          window.LadiPageScript.runtime.desktop_width = 1200;
          window.LadiPageScript.runtime.mobile_width = 420;
          window.LadiPageScript.runtime.tracking_button_click = true;
          window.LadiPageScript.runtime.publish_time = 1774080078353;
          window.LadiPageScript.runtime.lang = "vi";
          window.LadiPageScript.run(true);
          window.LadiPageScript.runEventScroll();
        };
        run();
      })();
