/* davidizosimov.com portfolio home, v2
   Used by templates/template-portfolio.php and the generated preview.html.

   Every effect here is decoration: the page is complete without this file, and
   under prefers-reduced-motion everything that moves on its own is skipped. */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var root = document.documentElement;
  var body = document.body;

  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /* --------------------------------------------- shared scroll frame */

  // Scroll-linked effects register a job here; all of them run in one
  // animation frame per scroll or resize, never more.
  var frameJobs = [];
  var framePending = false;
  var runFrame = function () {
    framePending = false;
    for (var i = 0; i < frameJobs.length; i++) frameJobs[i]();
  };
  var requestFrame = function () {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(runFrame);
    }
  };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });

  /* ------------------------------------------------ hero load sequence */

  var hero = document.querySelector('.hero');
  if (hero) {
    var revealHero = function () { hero.classList.add('is-ready'); };

    // Next frame, so the initial transform is painted before we transition off it.
    requestAnimationFrame(function () {
      requestAnimationFrame(revealHero);
    });

    // rAF does not fire while the tab is in the background, and the headline
    // starts translated out of its clipping box. Belt and braces.
    window.setTimeout(revealHero, 400);
  }

  /* ------------------------------------------ hero constellation canvas */

  // Slow-drifting points that link up when they pass near each other: people
  // connecting, behind the fog. One static frame under reduced motion.
  var canvas = document.querySelector('.hero-canvas');
  if (hero && canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, nodes = [], netRaf = null, heroOnScreen = true;

    var seedNodes = function () {
      var count = Math.round(Math.max(28, Math.min(90, (W * H) / 17000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.3 + 0.5,
          blue: Math.random() < 0.12,
          phase: Math.random() * Math.PI * 2
        });
      }
    };

    var sizeCanvas = function () {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var widthChanged = Math.abs(rect.width - W) > 1;
      var oldH = H;

      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Mobile browsers resize the viewport height as the URL bar slides; stretch
      // the existing points rather than reshuffling them.
      if (widthChanged || !nodes.length) {
        seedNodes();
      } else if (oldH > 0) {
        nodes.forEach(function (n) { n.y *= H / oldH; });
      }
    };

    var drawNet = function (t) {
      ctx.clearRect(0, 0, W, H);

      var maxD = Math.max(110, Math.min(180, W * 0.12));
      var maxD2 = maxD * maxD;
      var i, j, a, b, dx, dy, d2;

      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            ctx.strokeStyle = 'rgba(205,218,235,' + ((1 - Math.sqrt(d2) / maxD) * 0.2).toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        var twinkle = 0.6 + 0.4 * Math.sin(t * 0.0012 + a.phase);
        if (a.blue) {
          ctx.fillStyle = 'rgba(31,94,255,' + (0.2 * twinkle).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.r * 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(150,185,255,' + (0.95 * twinkle).toFixed(3) + ')';
        } else {
          ctx.fillStyle = 'rgba(226,235,245,' + (0.6 * twinkle).toFixed(3) + ')';
        }
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    var stepNet = function (t) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
      }
      drawNet(t);
      netRaf = requestAnimationFrame(stepNet);
    };

    var startNet = function () {
      if (netRaf === null && !reduced && heroOnScreen && !document.hidden) {
        netRaf = requestAnimationFrame(stepNet);
      }
    };
    var stopNet = function () {
      if (netRaf !== null) {
        cancelAnimationFrame(netRaf);
        netRaf = null;
      }
    };

    sizeCanvas();
    drawNet(0);

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        sizeCanvas();
        drawNet(performance.now());
      }, 150);
    }, { passive: true });

    if (!reduced) {
      if (hasIO) {
        new IntersectionObserver(function (entries) {
          heroOnScreen = entries[0].isIntersecting;
          if (heroOnScreen) startNet(); else stopNet();
        }).observe(hero);
      }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stopNet(); else startNet();
      });
      startNet();
    }
  }

  /* ---------------------------------------------------- smooth scroll */

  // A light take on the eased wheel scrolling the reference site gets from
  // Lenis: the wheel sets a target and the page glides to it. Mouse and
  // trackpad only; touch, keyboard and scrollbar keep their native feel.
  var smooth = null;

  if (!reduced && finePointer) {
    smooth = (function () {
      var target = window.scrollY;
      var current = target;
      var raf = null;
      var last = 0;
      var glideId = 0;

      var maxScroll = function () { return Math.max(0, root.scrollHeight - window.innerHeight); };

      var tick = function (now) {
        var dt = last ? Math.min(64, now - last) : 16.7;
        last = now;
        current += (target - current) * (1 - Math.pow(0.9, dt / 16.7));
        if (Math.abs(target - current) < 0.5) current = target;
        window.scrollTo(0, current);
        if (current !== target) {
          raf = requestAnimationFrame(tick);
        } else {
          raf = null;
          last = 0;
        }
      };

      var stop = function () {
        if (raf !== null) {
          cancelAnimationFrame(raf);
          raf = null;
          last = 0;
        }
        target = current = window.scrollY;
      };

      var to = function (y) {
        target = clamp(y, 0, maxScroll());
        if (raf !== null) return;
        current = window.scrollY;
        raf = requestAnimationFrame(tick);
        var glide = ++glideId;

        // Some embedded browsers pause animation frames; never leave a click
        // doing nothing. No first tick within 300ms means jump straight there.
        window.setTimeout(function () {
          if (glide === glideId && raf !== null && last === 0) {
            cancelAnimationFrame(raf);
            raf = null;
            current = target;
            window.scrollTo(0, target);
          }
        }, 300);
      };

      window.addEventListener('wheel', function (e) {
        if (e.ctrlKey || e.defaultPrevented) return;                       // pinch zoom
        if (body.classList.contains('no-motion') || root.classList.contains('is-menu-open')) return;
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;                // sideways
        if (e.target.closest && e.target.closest('.menu, .console, .module-more')) return;

        e.preventDefault();
        var d = e.deltaY;
        if (e.deltaMode === 1) d *= 36;
        else if (e.deltaMode === 2) d *= window.innerHeight;
        to((raf === null ? window.scrollY : target) + d);
      }, { passive: false });

      // Anything else that scrolls wins over a glide in progress.
      window.addEventListener('keydown', function (e) {
        if (raf !== null && /^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) stop();
      });
      window.addEventListener('pointerdown', function () { if (raf !== null) stop(); });
      window.addEventListener('scroll', function () {
        if (raf === null) target = current = window.scrollY;
      }, { passive: true });

      root.classList.add('has-smooth-scroll');
      return { to: to, stop: stop };
    })();
  }

  /* ------------------------------------------- in-page navigation */

  // Header, menu, footer and hero links all point at sections on this page.
  // A short hop glides there. A longer one is a "page change": an ink curtain
  // wipes up carrying the destination's label, the page jumps behind it, and
  // the curtain wipes off (about 0.8s). Keyboard focus moves along as a native
  // jump would. Under reduced motion every jump is instant.
  var curtain = document.querySelector('.curtain');
  var curtainNum = curtain && curtain.querySelector('.curtain-num');
  var curtainName = curtain && curtain.querySelector('.curtain-name');
  var curtainBusy = false;

  // Section labels ("S.04", "Experience") in page order, from the header links.
  var sectionInfo = {};
  document.querySelectorAll('.header-nav a[data-section]').forEach(function (a, i) {
    sectionInfo[a.getAttribute('data-section')] = {
      num: 'S.' + (i < 9 ? '0' : '') + (i + 1),
      name: a.textContent.trim()
    };
  });

  var adminBarH = function () {
    return parseFloat(getComputedStyle(body).getPropertyValue('--admin-bar-h')) || 0;
  };
  var jumpTo = function (y) {
    if (smooth) smooth.stop();
    window.scrollTo({ top: y, behavior: 'instant' });
    if (smooth) smooth.stop();   // re-sync its target with the new position
  };
  var focusSection = function (dest) {
    if (!dest.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(dest.tagName)) {
      dest.setAttribute('tabindex', '-1');
    }
    dest.focus({ preventScroll: true });
  };

  var travel = function (dest, id) {
    var y = Math.max(0, dest.getBoundingClientRect().top + window.scrollY - adminBarH());
    var far = Math.abs(y - window.scrollY) > window.innerHeight * 1.2;
    if (window.history && history.pushState) history.pushState(null, '', '#' + id);

    if (reduced) {
      jumpTo(y);
      focusSection(dest);
      return;
    }
    if (!far || !curtain) {
      if (smooth) smooth.to(y); else window.scrollTo({ top: y, behavior: 'smooth' });
      focusSection(dest);
      return;
    }

    var info = sectionInfo[id] || { num: '', name: '' };
    curtainNum.textContent = info.num;
    curtainNum.style.display = info.num ? '' : 'none';
    curtainName.textContent = info.name || 'Home';
    curtainBusy = true;
    curtain.classList.remove('is-revealing');
    void curtain.offsetWidth;
    curtain.classList.add('is-covering');

    window.setTimeout(function () {
      // Recompute: the menu may have closed and fonts may have settled.
      var target = Math.max(0, dest.getBoundingClientRect().top + window.scrollY - adminBarH());
      jumpTo(target);
      focusSection(dest);
      // A timer rather than rAF: frames pause in background tabs, and the
      // curtain must never be left covering the page.
      window.setTimeout(function () {
        curtain.classList.remove('is-covering');
        curtain.classList.add('is-revealing');
        window.setTimeout(function () {
          // Park it below the page again without animating back down.
          curtain.style.transition = 'none';
          curtain.classList.remove('is-revealing');
          void curtain.offsetWidth;
          curtain.style.transition = '';
          curtainBusy = false;
        }, 480);
      }, 30);
    }, 440);
  };

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link')) return;
    var id = link.getAttribute('href').slice(1);
    var dest = id && document.getElementById(id);
    if (!dest) return;
    e.preventDefault();
    if (curtainBusy) return;
    travel(dest, id);
  });

  // Underline the header link for the section in view.
  var headerLinks = document.querySelectorAll('.header-nav a[data-section]');
  if (headerLinks.length && hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        headerLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('data-section') === entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    headerLinks.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute('data-section'));
      if (sec) spy.observe(sec);
    });
  }

  /* ------------------------------------------------------------- menu */

  var menuBtn = document.querySelector('.menu-toggle');
  var menu = document.getElementById('site-menu');

  if (menuBtn && menu) {
    var menuLabel = menuBtn.querySelector('.menu-toggle-label');

    var isMenuOpen = function () { return menu.classList.contains('is-open'); };

    var setMenu = function (open, restoreFocus) {
      if (open && smooth) smooth.stop();
      menuBtn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      root.classList.toggle('is-menu-open', open);
      if (menuLabel) menuLabel.textContent = open ? 'Close' : 'Menu';

      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      } else if (restoreFocus) {
        menuBtn.focus();
      }
    };

    menuBtn.addEventListener('click', function () {
      setMenu(!isMenuOpen(), false);
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false, false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isMenuOpen()) return;

      if (e.key === 'Escape') {
        setMenu(false, true);
        return;
      }

      // Keep Tab inside the open menu: the toggle, then the menu's links.
      if (e.key !== 'Tab') return;
      var items = [menuBtn].concat(Array.prototype.slice.call(menu.querySelectorAll('a')));
      var firstItem = items[0];
      var lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    });
  }

  /* --------------------------------------------------- scroll reveals */

  var revealables = document.querySelectorAll('[data-reveal]');

  if (hasIO && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    revealables.forEach(function (el) { io.observe(el); });
  } else {
    // No observer, or reduced motion: show everything immediately.
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ----------------------------------------------- masked line reveals */

  // Each word goes in its own mask (.sl > .sl-i); words are then numbered by
  // the line they landed on (--l), so every line rises as one, top line first.
  var splitTargets = document.querySelectorAll('[data-split]');

  if (splitTargets.length && hasIO && !reduced) {
    var wrapWords = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
              return;
            }
            var outer = document.createElement('span');
            var inner = document.createElement('span');
            outer.className = 'sl';
            inner.className = 'sl-i';
            inner.textContent = part;
            outer.appendChild(inner);
            frag.appendChild(outer);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrapWords(child);
        }
      });
    };

    var numberLines = function () {
      splitTargets.forEach(function (el) {
        var line = -1;
        var lastTop = null;
        el.querySelectorAll('.sl').forEach(function (word) {
          var top = word.getBoundingClientRect().top;
          if (lastTop === null || top - lastTop > 4) {
            line++;
            lastTop = top;
          }
          word.style.setProperty('--l', line);
        });
      });
    };

    splitTargets.forEach(function (el) {
      wrapWords(el);
      el.classList.add('is-split');
    });
    numberLines();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(numberLines);

    var splitIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        splitIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

    splitTargets.forEach(function (el) { splitIO.observe(el); });
  }

  /* ---------------------------------------------------- count-up facts */

  if (hasIO && !reduced) {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var end = parseInt(el.getAttribute('data-count'), 10);
      if (isNaN(end)) return;
      var start = end >= 1000 ? end - 30 : 0;   // years roll up, small numbers count from 0
      el.textContent = String(start);

      var countIO = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        countIO.disconnect();
        var t0 = null;
        var step = function (now) {
          if (t0 === null) t0 = now;
          var p = Math.min(1, (now - t0) / 1600);
          el.textContent = String(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 4))));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: 0.6 });

      countIO.observe(el);
    });
  }

  /* -------------------------------------------- statement word fill */

  // Each big statement starts faint and fills in word by word as it scrolls
  // up the screen. The text itself is never changed, only wrapped.
  var fills = document.querySelectorAll('[data-fill]');

  if (fills.length && !reduced) {
    var splitFillWords = function (node, out) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(part));
              return;
            }
            var span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            out.push(span);
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          splitFillWords(child, out);
        }
      });
    };

    var fillItems = [];
    fills.forEach(function (el) {
      var words = [];
      splitFillWords(el, words);
      fillItems.push({ el: el, words: words, lit: -1 });
    });
    root.classList.add('js-fill');

    frameJobs.push(function () {
      var vh = window.innerHeight;
      var start = vh * 0.9;   // no words lit while the top is below here
      var end = vh * 0.5;     // every word lit once the bottom is above here

      fillItems.forEach(function (item) {
        var r = item.el.getBoundingClientRect();
        var p = clamp((start - r.top) / ((start - end) + r.height), 0, 1);
        var n = Math.round(p * item.words.length);
        if (n === item.lit) return;
        item.lit = n;
        for (var i = 0; i < item.words.length; i++) {
          item.words[i].classList.toggle('is-lit', i < n);
        }
      });
    });
  }

  /* ------------------------------------------------ scroll-linked motion */

  if (!reduced) {
    // Parallax layers drift against the scroll, measured from their (static)
    // parent so the transform never feeds back into its own input.
    var layers = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]')).map(function (el) {
      return { el: el, parent: el.parentElement, f: parseFloat(el.getAttribute('data-parallax')) || 0, h: 0 };
    });
    var measureLayers = function () {
      layers.forEach(function (l) { l.h = l.el.offsetHeight; });
    };
    measureLayers();
    window.addEventListener('resize', measureLayers, { passive: true });
    window.addEventListener('load', measureLayers);

    frameJobs.push(function () {
      var vh = window.innerHeight;
      layers.forEach(function (l) {
        var r = l.parent.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var p = clamp(((r.top + r.height / 2) - vh / 2) / ((vh + r.height) / 2), -1, 1);
        l.el.style.transform = 'translate3d(0,' + (p * l.f * l.h).toFixed(1) + 'px,0)';
      });
    });

    // Hero: the copy drifts down and fades while the backdrop sinks slower.
    var heroInner = document.querySelector('.hero-inner');
    var heroMedia = document.querySelector('.hero-media');
    var badgeRing = document.querySelector('.scroll-badge-ring');
    if (hero && heroInner && heroMedia) {
      frameJobs.push(function () {
        var y = window.scrollY;
        var vh = window.innerHeight;
        if (y > vh * 1.2) return;
        var p = clamp(y / vh, 0, 1);
        heroInner.style.transform = 'translate3d(0,' + (y * 0.35).toFixed(1) + 'px,0)';
        heroInner.style.opacity = String(clamp(1 - p * 1.25, 0, 1).toFixed(3));
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.2).toFixed(1) + 'px,0) scale(' + (1 + p * 0.06).toFixed(4) + ')';
        if (badgeRing) badgeRing.style.rotate = (y * 0.3).toFixed(1) + 'deg';
      });
    }

    // Figures that grow into place as they scroll in (CSS reads --p).
    var growers = document.querySelectorAll('[data-scale-in]');
    if (growers.length) {
      frameJobs.push(function () {
        var vh = window.innerHeight;
        growers.forEach(function (el) {
          var top = el.getBoundingClientRect().top;   // origin is the top edge, so scale never moves it
          el.style.setProperty('--p', clamp((vh - top) / (vh * 0.75), 0, 1).toFixed(3));
        });
      });
    }
  }

  /* -------------------------------------------------- magnetic buttons */

  if (finePointer && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
      var host = el.closest('a, button') || el;
      var tx = 0;
      var ty = 0;

      host.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        // Measure from where the element sits at rest, not where it has leaned to.
        var cx = r.left + r.width / 2 - tx;
        var cy = r.top + r.height / 2 - ty;
        var limit = r.width * 0.35;
        tx = clamp((e.clientX - cx) * strength, -limit, limit);
        ty = clamp((e.clientY - cy) * strength, -limit, limit);
        el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
      });
      host.addEventListener('pointerleave', function () {
        tx = 0;
        ty = 0;
        el.style.transform = '';
      });
    });
  }

  /* ------------------------------------------ how-i-work open/close */

  document.querySelectorAll('.module-toggle').forEach(function (btn) {
    var mod = btn.closest('.module');
    var label = btn.querySelector('.module-toggle-label');
    if (!mod) return;

    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      mod.classList.toggle('is-open', open);
      if (label) label.textContent = open ? 'Close' : 'Open';
    });
  });

  /* ---------------------------------------------------- work filtering */

  var filterBtns = document.querySelectorAll('.filter');
  var projectGrid = document.querySelector('.projects');
  var projects = document.querySelectorAll('.project[data-cat]');

  if (filterBtns.length && projects.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.dataset.filter;

        if (projectGrid) projectGrid.classList.add('is-filtering');

        filterBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });

        projects.forEach(function (card) {
          var cats = (card.dataset.cat || '').split(' ');
          var match = filter === 'all' || cats.indexOf(filter) !== -1;

          if (match) {
            card.classList.remove('is-gone');
            // Next frame so the display change lands before the opacity transition.
            requestAnimationFrame(function () { card.classList.remove('is-filtered'); });
          } else {
            card.classList.add('is-filtered');
            if (reduced) {
              card.classList.add('is-gone');
            } else {
              window.setTimeout(function () {
                if (card.classList.contains('is-filtered')) card.classList.add('is-gone');
              }, 260);
            }
          }
        });
        requestFrame();
      });
    });
  }

  /* ------------------------------------------------- cover slideshows */

  // A project with several images crossfades between them. It plays whenever
  // it is on screen, hovered or not (clicking a dot jumps there and carries
  // on); the pause button is the one way to stop it (WCAG 2.2.2). Under
  // reduced motion it starts paused.
  var SLIDE_MS = 4500;

  document.querySelectorAll('[data-slides]').forEach(function (box) {
    var slides = box.querySelectorAll('.slide');
    var dots = box.querySelectorAll('.slides-dot');
    var pauseBtn = box.querySelector('.slides-pause');
    if (slides.length < 2) return;

    var index = 0;
    var timer = null;
    var startedAt = 0;
    var remaining = SLIDE_MS;
    var userPaused = reduced;
    var onScreen = !hasIO;

    box.style.setProperty('--slide-ms', SLIDE_MS + 'ms');

    var canPlay = function () { return !userPaused && onScreen && !document.hidden; };

    var halt = function () {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
        remaining = Math.max(0, remaining - (performance.now() - startedAt));
      }
      box.classList.remove('is-playing');
    };

    var show; // declared below; run() and show() call each other
    var run = function () {
      if (timer !== null || !canPlay()) return;
      startedAt = performance.now();
      box.classList.add('is-playing');
      timer = setTimeout(function () {
        timer = null;
        show(index + 1);
      }, remaining);
    };
    var update = function () { if (canPlay()) run(); else halt(); };

    show = function (i) {
      halt();
      index = (i + slides.length) % slides.length;
      remaining = SLIDE_MS;
      for (var n = 0; n < slides.length; n++) {
        slides[n].classList.toggle('is-active', n === index);
        if (!dots[n]) continue;
        dots[n].classList.remove('is-active');
        if (dots[n].tagName === 'BUTTON') dots[n].setAttribute('aria-pressed', String(n === index));
      }
      void box.offsetWidth;   // restart the progress bar's CSS animation
      if (dots[index]) dots[index].classList.add('is-active');
      update();
    };

    dots.forEach(function (dot, n) {
      if (dot.tagName === 'BUTTON') dot.addEventListener('click', function () { show(n); });
    });

    if (pauseBtn) {
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        pauseBtn.setAttribute('aria-pressed', String(userPaused));
        update();
      });
    }

    document.addEventListener('visibilitychange', update);

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        update();
      }, { threshold: 0.35 }).observe(box);
    } else {
      update();
    }
  });

  /* ------------------------------------------------------ footer year */

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------ debug console */

  var con = document.querySelector('.console');
  var conLog = document.querySelector('.console-log');
  var conInput = document.querySelector('.console-input');

  if (con && conLog && conInput) {
    var fpsRaf = null;

    var print = function (html) {
      var p = document.createElement('div');
      p.innerHTML = html;
      conLog.appendChild(p);
      conLog.scrollTop = conLog.scrollHeight;
    };

    var fpsLoop = function () {
      var last = performance.now(), frames = 0, acc = 0;
      var el = document.querySelector('.fps');
      var tick = function (now) {
        frames++;
        acc += now - last;
        last = now;
        if (acc >= 500) {
          if (el) el.textContent = 'FPS ' + Math.round(frames / (acc / 1000));
          frames = 0;
          acc = 0;
        }
        fpsRaf = requestAnimationFrame(tick);
      };
      fpsRaf = requestAnimationFrame(tick);
    };

    var toggleConsole = function (open) {
      con.classList.toggle('is-open', open);
      if (open) { conInput.focus(); } else { conInput.blur(); }
    };

    var COMMANDS = {
      'help': function () {
        print('<b>stat fps</b>          frame counter, bottom right\n' +
              '<b>show wireframe</b>    outline every box on the page\n' +
              '<b>r.motion 0|1</b>      disable or enable animation\n' +
              '<b>clear</b>             clear this log\n' +
              '<b>exit</b>              close the console');
      },
      'stat fps': function () {
        var on = body.classList.toggle('is-fps');
        if (on && fpsRaf === null) fpsLoop();
        if (!on && fpsRaf !== null) { cancelAnimationFrame(fpsRaf); fpsRaf = null; }
        print('fps counter ' + (on ? 'enabled' : 'disabled'));
      },
      'show wireframe': function () {
        print('view mode: ' + (body.classList.toggle('is-wireframe') ? 'wireframe' : 'lit'));
      },
      'clear': function () { conLog.innerHTML = ''; },
      'exit': function () { toggleConsole(false); }
    };

    var run = function (raw) {
      var cmd = raw.trim().toLowerCase();
      if (!cmd) return;
      print('<span style="color:#6E9BFF">&gt;</span> ' + raw.replace(/[<>&]/g, ''));
      if (COMMANDS[cmd]) { COMMANDS[cmd](); return; }
      var m = cmd.match(/^r\.motion\s+([01])$/);
      if (m) {
        var off = m[1] === '0';
        body.classList.toggle('no-motion', off);
        print('animation ' + (off ? 'disabled' : 'enabled'));
        return;
      }
      print('<i>unknown command:</i> ' + cmd + '  (try <b>help</b>)');
    };

    document.addEventListener('keydown', function (e) {
      var t = e.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

      if ((e.key === '~' || e.key === '`' || e.code === 'Backquote') && (!typing || t === conInput)) {
        e.preventDefault();
        toggleConsole(!con.classList.contains('is-open'));
        return;
      }
      if (e.key === 'Escape' && con.classList.contains('is-open')) toggleConsole(false);
    });

    conInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      run(conInput.value);
      conInput.value = '';
    });

    print('Portfolio build ' + new Date().getFullYear() + '. Type <b>help</b> for commands.');
  }

  /* ---------------------------------------------------------- first frame */

  requestFrame();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestFrame);
})();
