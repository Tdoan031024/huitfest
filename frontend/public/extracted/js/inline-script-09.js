/* <![CDATA[ */
      (function () {
        // ===== UTM helper =====
        function getUtmParams() {
          var params = new URLSearchParams(window.location.search);
          var keys = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "utm_bts",
          ];
          var utm = {};
          keys.forEach(function (k) {
            if (params.get(k)) utm[k] = params.get(k);
          });
          return utm;
        }

        var form = document.getElementById("demoForm");
        if (!form) return;
        var btn = form.querySelector('button[type="submit"]');

        form.addEventListener("submit", function (e) {
          e.preventDefault();

          // Honeypot
          var hpEl = document.getElementById("website");
          if (hpEl && hpEl.value) {
            return;
          }

          // Collect
          var data = {
            role: document.getElementById("role")?.value?.trim(),
            name: document.getElementById("name")?.value?.trim(),
            phone: document.getElementById("phone")?.value?.trim(),
            email: document.getElementById("email")?.value?.trim(),
            province: document.getElementById("province")?.value?.trim(),
            school: document.getElementById("school")?.value?.trim(),
            lop: document.getElementById("lop")?.value?.trim(),
            major: document.getElementById("major")?.value?.trim(),
            campus: document.getElementById("campus")?.value?.trim(),
            hoctrainghiem: document
              .getElementById("hoctrainghiem")
              ?.value?.trim(),
            event_name: (
              document.querySelector('input[name="event_name"]')?.value || ""
            ).trim(),
            event_time: document.getElementById("event_time")?.value?.trim(),
            utm: getUtmParams(),
            ref: window.location.href,
          };

          // Validate
          var phoneOk = /^(0|\+84)\d{9,10}$/.test(
            (data.phone || "").replace(/\s+/g, ""),
          );
          var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "");
          if (!phoneOk) {
            Swal.fire("⚠️ Thông báo", "Số điện thoại không hợp lệ.", "warning");
            return;
          }
          if (!emailOk) {
            Swal.fire("⚠️ Thông báo", "Email không hợp lệ.", "warning");
            return;
          }

          // Disable button + show loading
          if (btn) {
            btn.disabled = true;
            btn.dataset.originalText = btn.textContent;
            btn.textContent = "Đang gửi...";
          }
          Swal.fire({
            title: "Đang gửi đăng ký...",
            html: "Vui lòng đợi trong giây lát",
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          // Send
          fetch("https://daihoc.huit.edu.vn/wp-json/demo/v1/lead", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-WP-Nonce": "490b0b2a6b",
            },
            body: JSON.stringify(data),
          })
            .then(async function (r) {
              let json = null;
              try {
                json = await r.json();
              } catch (e) {}

              // Success -> redirect immediately (keep loading until navigate)
              if (r.ok && json && json.ok) {
                var url = new URL(
                  "https://daihoc.huit.edu.vn/dang-ky-thanh-cong-openday/",
                );
                if (json.code) url.searchParams.set("code", json.code);
                window.location.href = url.toString();
                return;
              }

              // Error -> close loading then show message
              Swal.close();

              // Duplicate registered
              var isDuplicate =
                json && json.code === "da_dang_ky" && json.data?.status === 400;
              if (isDuplicate) {
                Swal.fire({
                  title: "⚠️ Đã đăng ký trước đó",
                  text:
                    json.message ||
                    "Số điện thoại này đã đăng ký cho sự kiện này tại campus này. Vui lòng kiểm tra email!",
                  icon: "info",
                  confirmButtonText: "Đã hiểu",
                  confirmButtonColor: "#00c2ff",
                });
                return;
              }

              var msg =
                (json && (json.message || json.data?.message)) ||
                "Gửi thất bại. Vui lòng thử lại.";
              Swal.fire("❌ Lỗi", msg, "error");
            })
            .catch(function (err) {
              console.error(err);
              Swal.close();
              Swal.fire(
                "❌ Lỗi mạng",
                "Không thể gửi dữ liệu. Vui lòng thử lại.",
                "error",
              );
            })
            .finally(function () {
              if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset.originalText || "Gửi đăng ký";
              }
            });
        });
      })();
      //# sourceURL=demo-lead-inline-js-after
      /* ]]> */
