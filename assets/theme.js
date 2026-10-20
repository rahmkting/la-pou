/* La Peau Rosée, landing page interactions. No dependencies. */
(function () {
  "use strict";

  function money(n) {
    return "$" + n.toFixed(2);
  }

  /* ---------- gallery ---------- */
  var showSlide = null; /* set by gallery(), used by the quantity tiers */

  function gallery() {
    var reel = document.querySelector("[data-gal-reel]");
    var dots = document.querySelector("[data-gal-dots]");
    if (!reel) return;

    var slides = Array.prototype.slice.call(reel.children);
    var at = 0;

    slides.forEach(function (s, i) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Image " + (i + 1));
      b.addEventListener("click", function () { go(i); });
      li.appendChild(b);
      dots.appendChild(li);
    });

    function go(i) {
      at = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle("is-on", n === at); });
      Array.prototype.forEach.call(dots.querySelectorAll("button"), function (b, n) {
        b.setAttribute("aria-current", n === at ? "true" : "false");
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-gal]"), function (btn) {
      btn.addEventListener("click", function () {
        go(at + parseInt(btn.getAttribute("data-gal"), 10));
      });
    });

    showSlide = go;
    go(0);
  }

  /* ---------- pricing ---------- */
  function pricing() {
    var tiers = Array.prototype.slice.call(document.querySelectorAll(".tier"));
    var atc = document.querySelector("[data-atc]");
    var mini = document.querySelector("[data-atc-mini]");
    var miniName = document.querySelector(".sticky__name");
    if (!tiers.length || !atc) return;

    function current() {
      var picked = document.querySelector(".tier input:checked");
      return picked || tiers[0].querySelector("input");
    }

    function paint() {
      var input = current();
      /* price text comes straight from Shopify so the page and the cart
         can never quote different numbers */
      var label = "Add to bag \u00b7 " + (input.getAttribute("data-money") || "");

      tiers.forEach(function (t) {
        t.classList.toggle("is-picked", t.contains(input));
      });

      var slide = input.getAttribute("data-slide");
      if (showSlide && slide !== null) showSlide(parseInt(slide, 10));

      atc.textContent = label;
      if (mini) mini.textContent = label;
      if (miniName) {
        var n = input.value;
        miniName.textContent = "Multi Balm \u00b7 " + (n === "1" ? "one stick" : n === "3" ? "three sticks" : "six sticks");
      }
    }

    tiers.forEach(function (t) {
      t.addEventListener("change", paint);
      t.addEventListener("click", function () {
        var input = t.querySelector("input");
        if (input && !input.checked) { input.checked = true; paint(); }
      });
    });

    function addToCart() {
      var input = current();
      var variant = input.getAttribute("data-variant");
      if (!variant) {
        window.alert("This bundle has no product attached yet.\n\nOpen the theme editor, select the Landing page section, and choose a product for each tier.");
        return;
      }
      [atc, mini].forEach(function (b) { if (b) { b.disabled = true; } });
      var done = function () { [atc, mini].forEach(function (b) { if (b) { b.disabled = false; } }); };
      if (window.LPRCart) {
        window.LPRCart.add(variant, 1).then(done, function (e) {
          done();
          window.alert((e && e.description) || "That bundle could not be added. It may be out of stock.");
        });
        return;
      }
      /* no drawer on this page (the cart page itself), so fall back to it */
      var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
      fetch(root + "cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ items: [{ id: Number(variant), quantity: 1 }] })
      })
        .then(function (r) {
          if (!r.ok) { return r.json().then(function (e) { throw e; }); }
          return r.json();
        })
        .then(function () { window.location.href = root + "cart"; })
        .catch(function (e) {
          done();
          window.alert((e && e.description) || "That bundle could not be added. It may be out of stock.");
        });
    }

    atc.addEventListener("click", addToCart);
    if (mini) mini.addEventListener("click", addToCart);

    paint();
  }

  /* ---------- slide out cart ---------- */
  function cart() {
    var drawer = document.querySelector("[data-drawer]");
    if (!drawer) return;

    var panel = drawer.querySelector(".drawer__panel");
    var section = drawer.getAttribute("data-section");
    var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
    var lastFocus = null;
    var busy = false;

    function body() { return drawer.querySelector("[data-drawer-body]"); }

    function open() {
      if (drawer.classList.contains("is-open")) return;
      lastFocus = document.activeElement;
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      document.documentElement.classList.add("is-locked");
      timer();
      window.setTimeout(function () { panel.focus(); }, 30);
    }

    function close() {
      if (!drawer.classList.contains("is-open")) return;
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("is-locked");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function paintCount() {
      var n = body().getAttribute("data-count") || "0";
      Array.prototype.forEach.call(document.querySelectorAll("[data-cart-count]"), function (el) {
        el.textContent = n;
        el.hidden = n === "0";
      });
    }

    /* the server renders the drawer; swap in the fresh copy */
    function swap(html) {
      var fresh = new DOMParser().parseFromString(html, "text/html").querySelector("[data-drawer-body]");
      if (!fresh) return;
      var scroller = drawer.querySelector(".dr-scroll");
      var top = scroller ? scroller.scrollTop : 0;
      body().replaceWith(fresh);
      var next = drawer.querySelector(".dr-scroll");
      if (next) next.scrollTop = top;
      paintCount();
      timer();
    }

    function post(path, payload) {
      payload.sections = section;
      payload.sections_url = window.location.pathname;
      return fetch(root + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw j;
            return j;
          });
        })
        .then(function (j) {
          if (j.sections && j.sections[section]) {
            swap(j.sections[section]);
            return j;
          }
          return refresh().then(function () { return j; });
        });
    }

    function refresh() {
      return fetch(root + "?sections=" + encodeURIComponent(section))
        .then(function (r) { return r.json(); })
        .then(function (j) { if (j[section]) swap(j[section]); });
    }

    function setBusy(on) {
      busy = on;
      drawer.classList.toggle("is-busy", on);
    }

    function add(id, qty) {
      setBusy(true);
      return post("cart/add.js", { items: [{ id: Number(id), quantity: qty || 1 }] })
        .then(function (j) { setBusy(false); open(); return j; }, function (e) { setBusy(false); throw e; });
    }

    function change(key, qty) {
      if (busy) return;
      setBusy(true);
      post("cart/change.js", { id: key, quantity: Math.max(0, qty) })
        .catch(function (e) {
          window.alert((e && e.description) || "That change could not be saved. Please try again.");
        })
        .then(function () { setBusy(false); });
    }

    /* reservation clock: starts the first time the cart is opened with
       something in it, survives page loads in this tab, then hides */
    var tick = null;
    function timer() {
      var box = drawer.querySelector("[data-timer]");
      window.clearInterval(tick);
      if (!box) return;
      var clock = box.querySelector("[data-timer-clock]");
      var key = "lpr-reserved-until";
      var until = 0;
      try { until = parseInt(window.sessionStorage.getItem(key), 10) || 0; } catch (e) {}
      if (!until) {
        until = Date.now() + parseInt(box.getAttribute("data-minutes"), 10) * 60000;
        try { window.sessionStorage.setItem(key, String(until)); } catch (e) {}
      }
      function paint() {
        var left = Math.max(0, Math.round((until - Date.now()) / 1000));
        if (left === 0) { box.hidden = true; window.clearInterval(tick); return; }
        var m = Math.floor(left / 60), sec = left % 60;
        clock.textContent = (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
      }
      paint();
      if (!box.hidden) tick = window.setInterval(paint, 1000);
    }

    document.addEventListener("click", function (e) {
      var t = e.target;
      var opener = t.closest("[data-cart-open]");
      if (opener) { e.preventDefault(); open(); return; }

      if (!drawer.contains(t)) return;

      var closer = t.closest("[data-drawer-close]");
      if (closer) {
        /* the empty state's shop link closes the drawer and still follows the link */
        if (closer.tagName !== "A") e.preventDefault();
        close();
        return;
      }

      var line = t.closest("[data-line]");
      if (line) { change(line.getAttribute("data-line"), parseInt(line.getAttribute("data-qty"), 10)); return; }

      var up = t.closest("[data-upsell]");
      if (up && !busy) {
        up.disabled = true;
        add(up.getAttribute("data-upsell"), 1).catch(function (err) {
          up.disabled = false;
          window.alert((err && err.description) || "That product could not be added.");
        });
      }
    });

    document.addEventListener("keydown", function (e) {
      if (!drawer.classList.contains("is-open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      /* keep keyboard focus inside the open drawer */
      var focusables = Array.prototype.filter.call(
        panel.querySelectorAll("a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex='-1'])"),
        function (el) { return el.offsetParent !== null; }
      );
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* product page forms add through the drawer too */
    Array.prototype.forEach.call(document.querySelectorAll('form[action*="/cart/add"]'), function (form) {
      form.addEventListener("submit", function (e) {
        var id = form.querySelector('[name="id"]');
        if (!id || !id.value) return;
        e.preventDefault();
        var qty = form.querySelector('[name="quantity"]');
        var btn = form.querySelector('[type="submit"]');
        if (btn) btn.disabled = true;
        add(id.value, qty ? parseInt(qty.value, 10) || 1 : 1)
          .catch(function (err) { window.alert((err && err.description) || "That product could not be added."); })
          .then(function () { if (btn) btn.disabled = false; });
      });
    });

    /* the browser may restore this page from its cache after checkout */
    window.addEventListener("pageshow", function (e) { if (e.persisted) refresh(); });

    window.LPRCart = { add: add, open: open, close: close, refresh: refresh };
  }

  /* ---------- sticky bar ---------- */
  function sticky() {
    var bar = document.querySelector("[data-sticky]");
    var panel = document.querySelector(".panel");
    if (!bar || !panel || !("IntersectionObserver" in window)) return;

    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        bar.classList.toggle("is-up", !e.isIntersecting && e.boundingClientRect.top < 0);
      });
    }, { threshold: 0 }).observe(panel);
  }

  /* ---------- Shop button: land on the buy box, and say so ---------- */
  function shopJump() {
    var panel = document.getElementById("pricing");
    if (!panel) return;

    function flash() {
      panel.classList.remove("panel--ping");
      /* force a reflow so the animation restarts on a repeat click */
      void panel.offsetWidth;
      panel.classList.add("panel--ping");
      window.setTimeout(function () { panel.classList.remove("panel--ping"); }, 2400);
    }

    document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href="#pricing"], a[href="/#pricing"]');
      if (!link) return;

      /* scrollIntoView honours scroll-margin-top, so the sticky header
         never covers the panel, and it works when the hash is already set */
      e.preventDefault();
      panel.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
      history.replaceState(null, "", "#pricing");
      flash();
    });

    /* arriving from another page or a pasted link */
    if (window.location.hash === "#pricing") {
      window.setTimeout(function () {
        panel.scrollIntoView({ behavior: "auto", block: "start" });
        flash();
      }, 120);
    }
  }

  /* ---------- faq: one answer open at a time ---------- */
  function faq() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".faq .qa"));
    items.forEach(function (item) {
      item.addEventListener("toggle", function () {
        if (!item.open) return;
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  /* ---------- actives diagram: draw the leader lines ---------- */
  function wires() {
    var svg = document.getElementById("wires");
    var diagram = document.getElementById("diagram");
    var stage = document.getElementById("stage");
    if (!svg || !diagram || !stage) return;

    var NS = "http://www.w3.org/2000/svg";
    var calls = Array.prototype.slice.call(document.querySelectorAll(".call"));

    function draw() {
      svg.innerHTML = "";
      if (window.innerWidth <= 880) return;

      var base = diagram.getBoundingClientRect();
      var img = stage.querySelector("img").getBoundingClientRect();

      calls.forEach(function (call) {
        var dot = stage.querySelector('[data-id="' + call.getAttribute("data-dot") + '"]');
        if (!dot) return;

        var isLeft = call.closest(".side").classList.contains("left");
        var r = call.getBoundingClientRect();

        /* start at the inner edge of the card, mid height */
        var x1 = (isLeft ? r.right : r.left) - base.left;
        var y1 = r.top + r.height / 2 - base.top;

        /* end on the stick, at the percentage set in the markup */
        var cs = getComputedStyle(dot);
        var x2 = img.left - base.left + img.width * parseFloat(cs.getPropertyValue("--x")) / 100;
        var y2 = img.top - base.top + img.height * parseFloat(cs.getPropertyValue("--y")) / 100;

        var stub = isLeft ? 18 : -18;

        var g = document.createElementNS(NS, "g");
        g.setAttribute("data-for", call.getAttribute("data-dot"));

        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", "M " + x1 + " " + y1 + " H " + (x1 + stub) + " L " + x2 + " " + y2);
        g.appendChild(path);

        var ring = document.createElementNS(NS, "circle");
        ring.setAttribute("class", "ring");
        ring.setAttribute("cx", x1 + stub); ring.setAttribute("cy", y1); ring.setAttribute("r", 2.6);
        g.appendChild(ring);

        var end = document.createElementNS(NS, "circle");
        end.setAttribute("cx", x2); end.setAttribute("cy", y2); end.setAttribute("r", 3.4);
        g.appendChild(end);

        svg.appendChild(g);
      });
    }

    /* light up the wire belonging to the card under the cursor */
    calls.forEach(function (call) {
      var id = call.getAttribute("data-dot");
      var flip = function (on) {
        var g = svg.querySelector('g[data-for="' + id + '"]');
        if (g) g.classList.toggle("on", on);
      };
      call.addEventListener("mouseenter", function () { flip(true); });
      call.addEventListener("mouseleave", function () { flip(false); });
      call.addEventListener("focusin", function () { flip(true); });
      call.addEventListener("focusout", function () { flip(false); });
    });

    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(draw, 90); });
    window.addEventListener("load", draw);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    draw();
  }

  /* ---------- reveal on scroll ---------- */
  function reveal() {
    if (!("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(
      ".story__grid > *, .qcard, .wcard, .row, .vs, .promise__in > *, .tcard, .closer__grid > *"
    );
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add("rise");
      io.observe(el);
    });

    /* Failsafe. If anything is still hidden after a few seconds, show it.
       Content must never depend on an observer firing. */
    window.setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll(".rise:not(.is-in)"), function (el) {
        el.classList.add("is-in");
      });
    }, 6000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    cart();
    gallery();
    pricing();
    sticky();
    shopJump();
    faq();
    wires();
    reveal();
  });
})();
