/* =============================================
   AVA — ESCOLA PARQUE — Content Script v2.0
   ============================================= */
(function() {
  'use strict';
  var api = typeof browser !== 'undefined' ? browser : chrome;
  var isActive = true;

  function init() {
    api.storage.local.get(['extensionActive'], function(data) {
      isActive = data.extensionActive !== false;
      if (isActive) activate();
    });
  }

  function activate() {
    document.body.classList.add('ava-redesign-active', 'ava-dark');
    fixWhiteBackground();
    styleNavbar();
    var path = window.location.pathname;
    if (path.indexOf('/login/index.php') !== -1) {
      buildLogin();
    } else if (path === '/my/' || path === '/my/index.php') {
      buildDashboard();
    } else if (path.indexOf('/my/courses') !== -1) {
      buildCoursesPage();
    }
    scheduleFix();
    setupObserver();
  }

  function deactivate() {
    document.body.classList.remove('ava-redesign-active', 'ava-dark');
    var el = document.getElementById('ava-float-btns');
    if (el) el.remove();
    var lc = document.getElementById('ava-login-container');
    if (lc) lc.remove();
    api.storage.local.set({ extensionActive: false });
  }

  api.runtime.onMessage.addListener(function(msg) {
    if (msg.action === 'TOGGLE_ACTIVE') {
      if (msg.value) { isActive = true; activate(); }
      else { isActive = false; deactivate(); }
    }
  });

  /* ---------- Fix White Backgrounds (ALL pages) ---------- */
  function fixWhiteBackground() {
    if (!document.body.classList.contains('ava-redesign-active')) return;
    document.querySelectorAll('.topofscroll, .main-inner, .bg-white, .bg-light, #page, #page-content, #region-main, #region-main-box, #page-wrapper, .main-inner-wrapper, .main-inner-outside-nextmaincontent').forEach(function(el) {
      el.style.cssText = 'background:#080808!important;background-color:#080808!important;';
    });
    document.querySelectorAll('.card, .card-body, .card-header, .card-footer, .block, [data-block], .drawer, .page-footer, .footer-popover').forEach(function(el) {
      el.style.cssText += 'background:#0f0f0f!important;background-color:#0f0f0f!important;';
    });
  }

  var fixScheduled = false;
  function scheduleFix() {
    if (fixScheduled) return;
    fixScheduled = true;
    var isCoursePage = window.location.pathname.indexOf('/my/courses') !== -1;
    [200, 600, 1200, 2500, 4500].forEach(function(ms) {
      setTimeout(function() {
        fixWhiteBackground();
        if (isCoursePage) fixCourseGrid();
      }, ms);
    });
  }

  /* ---------- MutationObserver ---------- */
  function setupObserver() {
    var debounce = null;
    var isCoursePage = window.location.pathname.indexOf('/my/courses') !== -1;
    new MutationObserver(function() {
      clearTimeout(debounce);
      debounce = setTimeout(function() {
        fixWhiteBackground();
        if (isCoursePage) fixCourseGrid();
      }, 500);
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- Navbar ---------- */
  function styleNavbar() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;
    navbar.style.cssText = 'background:#0f0f0f!important;border-bottom:1px solid #1f1f1f!important;';
    var logo = navbar.querySelector('.navbar-brand img');
    if (logo && !navbar.querySelector('.ava-brand-text')) {
      var brand = document.createElement('span');
      brand.className = 'ava-brand-text';
      brand.textContent = 'AVA \u2014 ESCOLA PARQUE';
      logo.parentNode.insertBefore(brand, logo);
      logo.style.display = 'none';
    }
    navbar.querySelectorAll('#usernavigation .btn, #usernavigation a, #usernavigation .popover-region-toggle').forEach(function(el) {
      el.style.setProperty('background', 'transparent', 'important');
      el.style.setProperty('border', 'none', 'important');
    });
    navbar.querySelectorAll('#usernavigation i').forEach(function(el) {
      el.style.setProperty('color', '#9B4DCA', 'important');
    });
  }

  /* ---------- Expand Layout ---------- */
  function expandLayout() {
    ['#page','#page-wrapper','#page-content','#region-main','#region-main-box','.container-fluid','#topofscroll','.main-inner'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding-left', '0', 'important');
        el.style.setProperty('padding-right', '0', 'important');
      });
    });
  }

  /* ---------- Floating Buttons ---------- */
  function injectFloatingButtons() {
    if (document.getElementById('ava-float-btns')) return;
    var container = document.createElement('div');
    container.id = 'ava-float-btns';
    var btn = document.createElement('button');
    btn.className = 'ava-float-btn';
    btn.textContent = '[ ORIGINAL ]';
    btn.addEventListener('click', function() {
      deactivate();
    });
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  /* ---------- Block Title ---------- */
  function setBlockTitle(section, text) {
    if (!section) return;
    var h = section.querySelector('.card-title, h3, h5');
    if (h && !h.dataset.avaStyled) {
      h.textContent = text;
      h.className = 'ava-block-title';
      h.dataset.avaStyled = '1';
    }
  }

  /* ---------- LOGIN ---------- */
  function buildLogin() {
    /* Hide ALL original Moodle login elements */
    var toHide = ['#page-wrapper', '#page', '.login-wrapper', '.login-container', '.loginform', '#region-main', '#page-content', '#page-header', '#page-footer', '#footnote', '.footer-popover'];
    toHide.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.setProperty('display', 'none', 'important');
      });
    });

    if (document.getElementById('ava-login-container')) return;

    var googleBtn = document.querySelector('a.login-identityprovider-btn');
    var googleUrl = googleBtn ? googleBtn.href : '#';

    var container = document.createElement('div');
    container.id = 'ava-login-container';
    container.innerHTML =
      '<h1>AVA \u2014 ESCOLA PARQUE</h1>' +
      '<div class="ava-subtitle">&gt; acesse sua conta institucional</div>' +
      '<a href="' + googleUrl + '" class="ava-google-btn">[ ENTRAR COM GOOGLE ]</a>' +
      '<div class="ava-manual-link" id="ava-manual-toggle">login manual &darr;</div>' +
      '<div class="ava-login-footer">Escola Parque // Moodle</div>';
    document.body.appendChild(container);

    document.getElementById('ava-manual-toggle').addEventListener('click', function() {
      container.remove();
      toHide.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          el.style.removeProperty('display');
        });
      });
    });
  }

  /* ---------- DASHBOARD ---------- */
  function buildDashboard() {
    expandLayout();
    injectFloatingButtons();

    /* Hide unwanted blocks */
    ['#inst552596','#inst492307','#theme_boost-drawers-blocks','.drawer-right-toggle','.learningtools-action-info','.floating-button','#page-footer','#footnote','.footer-popover','#page-header'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) { el.style.display = 'none'; });
    });

    var timeline = document.querySelector('section[data-block="timeline"]');
    var agenda   = document.querySelector('section[data-block="calendar_upcoming"]');
    var calendar = document.querySelector('section[data-block="calendar_month"]');
    var courses  = document.querySelector('section[data-block="course_list"]');

    setBlockTitle(timeline, '// TIMELINE');
    setBlockTitle(agenda,   '// AGENDA');
    setBlockTitle(calendar, '// CALENDARIO');
    if (courses) styleCourses(courses);

    if (!document.getElementById('ava-dashboard-grid')) {
      var mainContent = document.getElementById('block-region-content') || document.querySelector('[role="main"]');
      if (mainContent) {
        var grid = document.createElement('div');
        grid.id = 'ava-dashboard-grid';
        var colL = document.createElement('div');
        colL.id = 'ava-col-left';
        var colR = document.createElement('div');
        colR.id = 'ava-col-right';
        if (timeline) colL.appendChild(timeline);
        if (agenda)   colL.appendChild(agenda);
        if (calendar) colL.appendChild(calendar);
        if (courses)  colR.appendChild(courses);
        grid.appendChild(colL);
        grid.appendChild(colR);
        mainContent.appendChild(grid);
      }
    }
  }

  /* ---------- COURSES BLOCK (dashboard sidebar, 2026 only) ---------- */
  function styleCourses(section) {
    setBlockTitle(section, '// CURSOS 2026');
    var list = section.querySelector('ul.unlist');
    if (!list || list.dataset.avaStyled) return;
    list.dataset.avaStyled = '1';
    list.id = 'ava-course-list';

    var allItems = Array.from(list.querySelectorAll('li'));
    var items2026 = allItems.filter(function(li) { return li.textContent.indexOf('2026') !== -1; });
    var others    = allItems.filter(function(li) { return li.textContent.indexOf('2026') === -1; });

    others.forEach(function(li) { li.style.display = 'none'; });
    items2026.forEach(function(li, i) {
      li.style.cssText = 'display:block!important;';
      var link = li.querySelector('a');
      if (link) {
        var icon = link.querySelector('i');
        if (icon) icon.style.display = 'none';
        var name = link.textContent.trim();
        link.innerHTML = '<span style="color:#7B2FBE;margin-right:6px;">\u2192</span>' + name;
      }
      li.style.animationDelay = (i * 40) + 'ms';
    });

    if (others.length > 0) {
      var showAll = document.createElement('button');
      showAll.className = 'ava-show-all-btn';
      showAll.textContent = '[ VER TODOS ]';
      var expanded = false;
      showAll.addEventListener('click', function() {
        expanded = !expanded;
        others.forEach(function(li) { li.style.display = expanded ? 'block' : 'none'; });
        showAll.textContent = expanded ? '[ APENAS 2026 ]' : '[ VER TODOS ]';
        setBlockTitle(section, expanded ? '// TODOS OS CURSOS' : '// CURSOS 2026');
      });
      list.appendChild(showAll);
    }

    var footer = section.querySelector('.footer');
    if (footer) footer.style.display = 'none';
  }

  /* ---------- MY COURSES PAGE (/my/courses.php) ---------- */
  function buildCoursesPage() {
    expandLayout();
    injectFloatingButtons();
    document.body.classList.add('page-mycourses');

    /* Hide unwanted elements */
    ['#inst552596','#inst492307','#theme_boost-drawers-blocks','.drawer-right-toggle','.drawer-toggler','#page-footer','#footnote','.footer-popover','.learningtools-action-info','.floating-button','.drawer-toggles'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) { el.style.display = 'none'; });
    });

    /* Replace page header title */
    var pageHeader = document.getElementById('page-header');
    if (pageHeader) {
      var h1 = pageHeader.querySelector('h1, h2');
      if (h1) {
        h1.className = 'ava-block-title';
        h1.textContent = '// MEUS CURSOS';
        h1.style.cssText = 'margin:0 0 8px 0;display:block;';
      }
      pageHeader.style.cssText = 'padding:72px 24px 8px!important;display:block!important;';
    }

    /* Fix the course grid immediately and on schedule */
    fixCourseGrid();
  }

  function fixCourseGrid() {
    if (!document.body.classList.contains('ava-redesign-active')) return;

    /* Remove inline height from loading placeholder */
    document.querySelectorAll('[data-region="loading-placeholder-content"] .card-grid').forEach(function(el) {
      el.setAttribute('style', 'display:none!important;');
    });

    /* Target the real course grid — Moodle sets style="height:13rem" and flex-nowrap inline */
    document.querySelectorAll('.card-grid').forEach(function(el) {
      /* Skip loading placeholder grids */
      if (el.closest('[data-region="loading-placeholder-content"]')) return;
      el.setAttribute('style',
        'display:grid!important;' +
        'grid-template-columns:repeat(auto-fill,minmax(160px,1fr))!important;' +
        'gap:16px!important;' +
        'padding:0!important;' +
        'overflow:visible!important;' +
        'height:auto!important;' +
        'max-height:none!important;' +
        'width:100%!important;' +
        'margin:0!important;'
      );
      el.classList.remove('flex-nowrap','overflow-hidden','row','row-cols-1','row-cols-sm-2','row-cols-md-3','mx-0');
    });

    /* Reset each col */
    document.querySelectorAll('.card-grid .col, .card-grid [class*="col-"]').forEach(function(el) {
      if (el.closest('[data-region="loading-placeholder-content"]')) return;
      el.setAttribute('style',
        'width:auto!important;' +
        'min-width:0!important;' +
        'max-width:none!important;' +
        'flex:unset!important;' +
        'padding:0!important;' +
        'height:auto!important;'
      );
      el.classList.remove('col','d-flex','px-1');
    });

    /* Hide course images */
    document.querySelectorAll('.card-img-top,.course-image,.courseimage,.dashboard-card-img').forEach(function(el) {
      el.style.setProperty('display', 'none', 'important');
    });

    /* Fix the course-view container */
    document.querySelectorAll('[data-region="course-view-content"],[data-region="courses-view"],.container-fluid').forEach(function(el) {
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('padding', '24px', 'important');
    });
  }

  /* ---------- Init ---------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
