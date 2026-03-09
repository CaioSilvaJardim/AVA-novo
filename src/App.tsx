import { useEffect, useRef } from 'react';

declare const JSZip: any;

const MANIFEST_CHROME = `{
  "manifest_version": 3,
  "name": "AVA \u2014 Escola Parque",
  "version": "2.0.0",
  "description": "Redesign minimalista do AVA Escola Parque",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["*://ava.escolaparque.g12.br/*"],
  "content_scripts": [{
    "matches": ["*://ava.escolaparque.g12.br/*"],
    "js": ["content.js"],
    "css": ["style.css"],
    "run_at": "document_end"
  }],
  "action": {
    "default_popup": "popup.html",
    "default_title": "AVA \u2014 Escola Parque"
  }
}`;

const MANIFEST_FIREFOX = `{
  "manifest_version": 2,
  "name": "AVA \u2014 Escola Parque",
  "version": "2.0.0",
  "description": "Redesign minimalista do AVA Escola Parque",
  "browser_specific_settings": {
    "gecko": {
      "id": "ava-redesign@escolaparque",
      "strict_min_version": "91.0"
    }
  },
  "permissions": ["activeTab", "storage", "*://ava.escolaparque.g12.br/*"],
  "content_scripts": [{
    "matches": ["*://ava.escolaparque.g12.br/*"],
    "js": ["content.js"],
    "css": ["style.css"],
    "run_at": "document_end"
  }],
  "browser_action": {
    "default_popup": "popup.html",
    "default_title": "AVA \u2014 Escola Parque"
  }
}`;

const CONTENT_JS = `/* =============================================
   AVA \u2014 ESCOLA PARQUE \u2014 Content Script v2.0
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
    injectFloatingButtons();
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
    document.body.classList.remove('ava-redesign-active', 'ava-dark', 'page-mycourses');
    var container = document.getElementById('ava-float-btns');
    if (container) container.remove();
    var grid = document.getElementById('ava-dashboard-grid');
    if (grid) grid.remove();
    var loginContainer = document.getElementById('ava-login-container');
    if (loginContainer) loginContainer.remove();
    var brandText = document.querySelector('.ava-brand-text');
    if (brandText) brandText.remove();
    document.querySelectorAll('[data-ava-styled]').forEach(function(el) {
      delete el.dataset.avaStyled;
    });
    document.querySelectorAll('*[style*="ava"]').forEach(function(el) {
      el.removeAttribute('style');
    });
    document.querySelectorAll('.card-grid').forEach(function(el) {
      el.removeAttribute('style');
      el.classList.add('flex-nowrap', 'overflow-hidden', 'row', 'row-cols-1', 'row-cols-sm-2', 'row-cols-md-3', 'mx-0');
    });
    document.querySelectorAll('.calendarmonth, .maincalendar, .card-body[data-block="calendar_month"]').forEach(function(el) {
      el.removeAttribute('style');
    });
    document.querySelectorAll('[data-region="course-view-content"], [data-region="courses-view"]').forEach(function(el) {
      el.removeAttribute('style');
    });
    api.storage.local.set({ extensionActive: false });
    location.reload();
  }

  api.runtime.onMessage.addListener(function(msg) {
    if (msg.action === 'TOGGLE_ACTIVE') {
      if (msg.value) { isActive = true; activate(); }
      else { isActive = false; deactivate(); }
    }
  });

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

  function expandLayout() {
    ['#page', '#page-wrapper', '#page-content', '#region-main', '#region-main-box', '.container-fluid'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding-left', '0', 'important');
        el.style.setProperty('padding-right', '0', 'important');
      });
    });
    ['#topofscroll', '.main-inner'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding-left', '0', 'important');
        el.style.setProperty('padding-right', '0', 'important');
        el.style.setProperty('padding-top', '0', 'important');
      });
    });
  }

  function injectFloatingButtons() {
    if (document.getElementById('ava-float-btns')) return;
    var container = document.createElement('div');
    container.id = 'ava-float-btns';
    var origBtn = document.createElement('button');
    origBtn.className = 'ava-float-btn';
    origBtn.textContent = '[ ORIGINAL ]';
    origBtn.addEventListener('click', function() {
      deactivate();
      container.remove();
    });
    container.appendChild(origBtn);
    document.body.appendChild(container);
  }

  function setBlockTitle(section, text) {
    if (!section) return;
    var h = section.querySelector('.card-title, h3, h5');
    if (h && !h.dataset.avaStyled) {
      h.textContent = text;
      h.className = 'ava-block-title';
      h.dataset.avaStyled = '1';
    }
  }

  function buildLogin() {
    var toHide = ['#page-wrapper','#page','.login-wrapper','.login-container','.loginform','#region-main','#page-content','#page-header','#page-footer','#footnote','.footer-popover'];
    toHide.forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) {
        el.style.setProperty('display','none','important');
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
      '<div class="ava-manual-link" id="ava-manual-toggle">login manual \u2193</div>' +
      '<div class="ava-login-footer">Escola Parque // Moodle</div>';
    document.body.appendChild(container);
    document.getElementById('ava-manual-toggle').addEventListener('click', function() {
      container.remove();
      toHide.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) { el.style.removeProperty('display'); });
      });
    });
  }

  function buildDashboard() {
    expandLayout();
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
        var grid = document.createElement('div'); grid.id = 'ava-dashboard-grid';
        var colL = document.createElement('div'); colL.id = 'ava-col-left';
        var colR = document.createElement('div'); colR.id = 'ava-col-right';
        if (timeline) colL.appendChild(timeline);
        if (agenda)   colL.appendChild(agenda);
        if (calendar) colL.appendChild(calendar);
        if (courses)  colR.appendChild(courses);
        grid.appendChild(colL); grid.appendChild(colR);
        mainContent.appendChild(grid);
      }
    }
  }

  function styleCourses(section) {
    setBlockTitle(section, '// CURSOS 2026');
    var list = section.querySelector('ul.unlist');
    if (!list || list.dataset.avaStyled) return;
    list.dataset.avaStyled = '1';
    list.id = 'ava-course-list';
    var allItems = Array.from(list.querySelectorAll('li'));
    var items2026 = allItems.filter(function(li) { return li.textContent.includes('2026'); });
    var others    = allItems.filter(function(li) { return !li.textContent.includes('2026'); });
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

  function buildCoursesPage() {
    expandLayout();
    document.body.classList.add('page-mycourses');
    ['#inst552596','#inst492307','#theme_boost-drawers-blocks','.drawer-right-toggle','.drawer-toggler','.drawer-toggles','#page-footer','#footnote','.footer-popover','.learningtools-action-info','.floating-button'].forEach(function(sel) {
      document.querySelectorAll(sel).forEach(function(el) { el.style.display = 'none'; });
    });
    var pageHeader = document.getElementById('page-header');
    if (pageHeader) {
      var h1 = pageHeader.querySelector('h1, h2');
      if (h1) { h1.className = 'ava-block-title'; h1.textContent = '// MEUS CURSOS'; }
      pageHeader.style.cssText = 'padding:72px 24px 8px!important;display:block!important;background:transparent!important;';
    }
    fixCourseGrid();
  }

  function fixCourseGrid() {
    if (!document.body.classList.contains('ava-redesign-active')) return;
    document.querySelectorAll('[data-region="loading-placeholder-content"] .card-grid').forEach(function(el) {
      el.setAttribute('style','display:none!important;');
    });
    document.querySelectorAll('.card-grid').forEach(function(el) {
      if (el.closest('[data-region="loading-placeholder-content"]')) return;
      el.setAttribute('style',
        'display:grid!important;' +
        'grid-template-columns:repeat(auto-fill,minmax(160px,1fr))!important;' +
        'gap:16px!important;padding:0!important;overflow:visible!important;' +
        'height:auto!important;max-height:none!important;width:100%!important;margin:0!important;'
      );
      el.classList.remove('flex-nowrap','overflow-hidden','row','row-cols-1','row-cols-sm-2','row-cols-md-3','mx-0');
    });
    document.querySelectorAll('.card-grid .col, .card-grid [class*="col-"]').forEach(function(el) {
      if (el.closest('[data-region="loading-placeholder-content"]')) return;
      el.setAttribute('style','width:auto!important;min-width:0!important;max-width:none!important;flex:unset!important;padding:0!important;height:auto!important;');
      el.classList.remove('col','d-flex','px-1');
    });
    document.querySelectorAll('.card-img-top,.course-image,.courseimage,.dashboard-card-img').forEach(function(el) {
      el.style.setProperty('display','none','important');
    });
    document.querySelectorAll('[data-region="course-view-content"],[data-region="courses-view"]').forEach(function(el) {
      el.style.setProperty('overflow','visible','important');
      el.style.setProperty('height','auto','important');
      el.style.setProperty('max-height','none','important');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;

const STYLE_CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

body.ava-redesign-active {
  background: #080808 !important;
  color: #E0E0E0 !important;
}
body.ava-redesign-active *:not(i):not(.fa):not(.icon):not([class*="fa-"]):not(.userpicture) {
  font-family: 'JetBrains Mono', monospace !important;
}
body.ava-redesign-active i,
body.ava-redesign-active i.fa,
body.ava-redesign-active i.icon,
body.ava-redesign-active [class*="fa-"] {
  font-family: 'Font Awesome 6 Free', 'FontAwesome' !important;
  -webkit-font-smoothing: antialiased;
}
body.ava-redesign-active * {
  border-radius: 0 !important;
  box-shadow: none !important;
  transition: background 0.15s, color 0.15s, border-color 0.15s !important;
}
body.ava-redesign-active a { color: #9B4DCA !important; text-decoration: none !important; }
body.ava-redesign-active a:hover { color: #B06AE8 !important; }
body.ava-redesign-active ::-webkit-scrollbar { width: 6px !important; }
body.ava-redesign-active ::-webkit-scrollbar-track { background: #080808 !important; }
body.ava-redesign-active ::-webkit-scrollbar-thumb { background: #7B2FBE !important; }
body.ava-redesign-active::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  z-index: 99998;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px);
}
body.ava-redesign-active #page,
body.ava-redesign-active #page-wrapper,
body.ava-redesign-active #page-content,
body.ava-redesign-active #topofscroll,
body.ava-redesign-active #region-main,
body.ava-redesign-active #region-main-box,
body.ava-redesign-active .main-inner,
body.ava-redesign-active .container-fluid {
  max-width: 100% !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}
body.ava-redesign-active .limitedwidth #page.drawers { max-width: 100% !important; }
body.ava-redesign-active .navbar,
body.ava-redesign-active .navbar.fixed-top {
  background: #0f0f0f !important;
  border-bottom: 1px solid #1f1f1f !important;
  height: 52px !important;
}
body.ava-redesign-active .navbar .nav-link { color: #888 !important; font-size: 0.8rem !important; }
body.ava-redesign-active .navbar .nav-link:hover,
body.ava-redesign-active .navbar .nav-link.active { color: #9B4DCA !important; }
body.ava-redesign-active .ava-brand-text {
  color: #9B4DCA !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  letter-spacing: 1px !important;
}
body.ava-redesign-active #usernavigation .btn,
body.ava-redesign-active #usernavigation a.nav-link,
body.ava-redesign-active #usernavigation .popover-region-toggle,
body.ava-redesign-active #usernavigation .dropdown-toggle {
  background: transparent !important;
  border: none !important;
  color: #9B4DCA !important;
}
body.ava-redesign-active #usernavigation i { color: #9B4DCA !important; }
body.ava-redesign-active #usernavigation .divider { border-color: #2a2a2a !important; }
body.ava-redesign-active #inst552596,
body.ava-redesign-active #inst492307,
body.ava-redesign-active #theme_boost-drawers-blocks,
body.ava-redesign-active .drawer-right-toggle,
body.ava-redesign-active .drawer-toggler,
body.ava-redesign-active #page-header,
body.ava-redesign-active .learningtools-action-info,
body.ava-redesign-active .floating-button,
body.ava-redesign-active #page-footer,
body.ava-redesign-active #footnote,
body.ava-redesign-active .footer-popover,
body.ava-redesign-active .drawer-toggles,
body.ava-redesign-active .main-inner-wrapper > .drawer-toggles { display: none !important; }
body.ava-redesign-active #ava-dashboard-grid {
  display: flex !important;
  max-width: 1400px !important;
  width: 100% !important;
  margin: 0 auto !important;
  padding: 80px 24px 32px !important;
  gap: 20px !important;
  box-sizing: border-box !important;
}
body.ava-redesign-active #ava-col-left {
  flex: 3 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  min-width: 0 !important;
}
body.ava-redesign-active #ava-col-right {
  flex: 2 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  min-width: 0 !important;
}
@media (max-width: 768px) {
  body.ava-redesign-active #ava-dashboard-grid {
    flex-direction: column !important;
    padding: 64px 12px 16px !important;
  }
}
body.ava-redesign-active .card,
body.ava-redesign-active .card-body,
body.ava-redesign-active .card-header,
body.ava-redesign-active .card-footer,
body.ava-redesign-active .block,
body.ava-redesign-active [data-block],
body.ava-redesign-active section.card {
  background: #0f0f0f !important;
  border: 1px solid #1f1f1f !important;
  color: #E0E0E0 !important;
}
body.ava-redesign-active .ava-block-title {
  font-size: 0.85rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  color: #E0E0E0 !important;
  border-left: 3px solid #7B2FBE !important;
  padding-left: 10px !important;
  margin-bottom: 12px !important;
  letter-spacing: 1px !important;
  display: block !important;
}
body.ava-redesign-active section[data-block="timeline"] .card-text {
  border-left: 2px solid #7B2FBE !important;
  margin-left: 6px !important;
  padding-left: 16px !important;
}
body.ava-redesign-active section[data-block="timeline"] .list-group-item {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid #1a1a1a !important;
  padding: 8px 8px 8px 16px !important;
  position: relative !important;
  color: #E0E0E0 !important;
}
body.ava-redesign-active section[data-block="timeline"] .list-group-item::before {
  content: '' !important;
  position: absolute !important;
  left: -22px !important;
  top: 14px !important;
  width: 8px !important;
  height: 8px !important;
  background: #7B2FBE !important;
  border-radius: 50% !important;
}
body.ava-redesign-active section[data-block="timeline"] .list-group-item:hover { background: #141414 !important; }
body.ava-redesign-active section[data-block="timeline"] .btn-outline-secondary {
  background: #0f0f0f !important;
  border-color: #2a2a2a !important;
  color: #888 !important;
  font-size: 0.75rem !important;
}
body.ava-redesign-active section[data-block="timeline"] .form-control {
  background: #0f0f0f !important;
  border-color: #2a2a2a !important;
  color: #E0E0E0 !important;
  font-size: 0.75rem !important;
}
body.ava-redesign-active section[data-block="calendar_upcoming"] .event {
  border-bottom-color: #1a1a1a !important;
  padding: 8px 4px !important;
}
body.ava-redesign-active section[data-block="calendar_upcoming"] .event:hover { background: #141414 !important; }
body.ava-redesign-active section[data-block="calendar_upcoming"] .event h6 a { color: #E0E0E0 !important; font-size: 0.8rem !important; }
body.ava-redesign-active section[data-block="calendar_upcoming"] .date { color: #666 !important; font-size: 0.7rem !important; }
body.ava-redesign-active section[data-block="calendar_month"] { overflow: visible !important; }
body.ava-redesign-active section[data-block="calendar_month"] .maincalendar { transform: scale(0.95) !important; transform-origin: top center !important; overflow: visible !important; margin-top: -10px !important; }
body.ava-redesign-active section[data-block="calendar_month"] .card-body { height: 380px !important; overflow: visible !important; padding: 12px !important; }
body.ava-redesign-active section[data-block="calendar_month"] .footer,
body.ava-redesign-active section[data-block="calendar_month"] .header { display: none !important; }
body.ava-redesign-active .calendar-controls {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 8px 6px !important;
  margin-bottom: 8px !important;
}
body.ava-redesign-active .calendar-controls h4.current { font-size: 0.9rem !important; color: #E0E0E0 !important; margin: 0 !important; }
body.ava-redesign-active .calendar-controls .arrow_link { font-size: 0.85rem !important; color: #9B4DCA !important; padding: 6px 10px !important; }
body.ava-redesign-active .calendar-controls .arrow_text { display: none !important; }
body.ava-redesign-active .calendarmonth { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
body.ava-redesign-active .calendarmonth thead th {
  font-size: 0.75rem !important;
  color: #555 !important;
  text-align: center !important;
  padding: 8px 0 !important;
  border: none !important;
  background: transparent !important;
  font-weight: 400 !important;
}
body.ava-redesign-active .calendarmonth td {
  text-align: center !important;
  vertical-align: middle !important;
  padding: 6px 0 !important;
  height: 45px !important;
  max-height: 45px !important;
  min-width: 0 !important;
  font-size: 0.85rem !important;
  color: #888 !important;
  border: none !important;
  background: transparent !important;
  overflow: hidden !important;
  line-height: 1.2 !important;
}
body.ava-redesign-active .calendarmonth td.dayblank { background: transparent !important; }
body.ava-redesign-active .calendarmonth .day-number-circle {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  padding: 0 !important;
  margin: 0 auto !important;
  line-height: 1 !important;
}
body.ava-redesign-active .calendarmonth .day-number {
  font-size: 0.85rem !important;
  line-height: 1.2 !important;
  display: block !important;
  width: 100% !important;
  text-align: center !important;
}
body.ava-redesign-active .calendarmonth td .d-md-none { display: none !important; }
body.ava-redesign-active .calendarmonth td .d-none.d-md-block { display: block !important; }
body.ava-redesign-active .calendarmonth [data-region="day-content"] { display: none !important; }
body.ava-redesign-active .calendarmonth td .hidden { display: none !important; }
body.ava-redesign-active .calendarmonth td.today .day-number-circle { background: #7B2FBE !important; color: #fff !important; }
body.ava-redesign-active .calendarmonth td.today .day-number { color: #fff !important; }
body.ava-redesign-active .calendarmonth td.hasevent { border-bottom: 2px solid #7B2FBE !important; }
body.ava-redesign-active .calendarmonth td.hasevent a.aalink { color: #9B4DCA !important; }
body.ava-redesign-active .popover,
body.ava-redesign-active .tooltip,
body.ava-redesign-active .tooltip-inner,
body.ava-redesign-active .popover-body,
body.ava-redesign-active .popover-header,
body.ava-redesign-active [data-region="day-content"],
body.ava-redesign-active .calendar-popover,
body.ava-redesign-active .moodle-dialogue-base,
body.ava-redesign-active .moodle-dialogue-wrap,
body.ava-redesign-active .moodle-dialogue-content,
body.ava-redesign-active .moodle-dialogue-bd {
  background: #0f0f0f !important;
  background-color: #0f0f0f !important;
  color: #E0E0E0 !important;
  border-color: #2a2a2a !important;
}
body.ava-redesign-active .popover .arrow::after,
body.ava-redesign-active .popover .arrow::before {
  border-top-color: #0f0f0f !important;
  border-bottom-color: #0f0f0f !important;
}
body.ava-redesign-active #ava-course-list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
}
body.ava-redesign-active #ava-course-list li {
  padding: 6px 8px !important;
  border-bottom: 1px solid #1a1a1a !important;
  font-size: 0.75rem !important;
}
body.ava-redesign-active #ava-course-list li:hover { background: #141414 !important; }
body.ava-redesign-active #ava-course-list li a { color: #E0E0E0 !important; }
body.ava-redesign-active #ava-course-list li a:hover { color: #9B4DCA !important; }
body.ava-redesign-active .ava-show-all-btn {
  display: inline-block !important;
  margin-top: 8px !important;
  padding: 4px 12px !important;
  background: #0f0f0f !important;
  border: 1px solid #7B2FBE !important;
  color: #9B4DCA !important;
  font-size: 0.7rem !important;
  cursor: pointer !important;
  text-transform: uppercase !important;
}
body.ava-redesign-active .ava-show-all-btn:hover { border-color: #B06AE8 !important; color: #B06AE8 !important; }
body.ava-redesign-active #ava-float-btns {
  position: fixed !important;
  bottom: 16px !important;
  left: 16px !important;
  right: auto !important;
  z-index: 99999 !important;
  display: flex !important;
  gap: 8px !important;
}
body.ava-redesign-active .ava-float-btn {
  background: #080808 !important;
  border: 1px solid #7B2FBE !important;
  color: #9B4DCA !important;
  padding: 4px 10px !important;
  font-size: 0.6rem !important;
  cursor: pointer !important;
  text-transform: uppercase !important;
  font-family: 'JetBrains Mono', monospace !important;
  letter-spacing: 0.5px !important;
}
body.ava-redesign-active .ava-float-btn:hover { border-color: #B06AE8 !important; color: #B06AE8 !important; }
body.ava-redesign-active .form-control,
body.ava-redesign-active select,
body.ava-redesign-active textarea,
body.ava-redesign-active input[type="text"],
body.ava-redesign-active input[type="search"],
body.ava-redesign-active input[type="password"] {
  background: #0f0f0f !important;
  border: 1px solid #2a2a2a !important;
  color: #E0E0E0 !important;
  font-size: 0.8rem !important;
}
body.ava-redesign-active .form-control:focus { border-color: #7B2FBE !important; outline: none !important; }
body.ava-redesign-active .btn {
  background: #0f0f0f !important;
  border: 1px solid #2a2a2a !important;
  color: #888 !important;
  font-size: 0.75rem !important;
}
body.ava-redesign-active .btn:hover { border-color: #7B2FBE !important; color: #9B4DCA !important; }
body.ava-redesign-active .btn-primary { background: #7B2FBE !important; border-color: #7B2FBE !important; color: #fff !important; }
body.ava-redesign-active .dropdown-menu { background: #0f0f0f !important; border: 1px solid #2a2a2a !important; }
body.ava-redesign-active .dropdown-item { color: #E0E0E0 !important; font-size: 0.75rem !important; }
body.ava-redesign-active .dropdown-item:hover { background: #141414 !important; color: #9B4DCA !important; }
body.ava-redesign-active .popover-region-container { background: #0f0f0f !important; border: 1px solid #2a2a2a !important; }
body.ava-redesign-active .popover-region-header-container { background: #0f0f0f !important; border-bottom: 1px solid #1f1f1f !important; }
body.ava-redesign-active .popover-region-header-text { color: #E0E0E0 !important; }
body.ava-redesign-active .popover-region-content,
body.ava-redesign-active .popover-region-footer-container { background: #0f0f0f !important; }
body.ava-redesign-active .drawer,
body.ava-redesign-active .drawer-left,
body.ava-redesign-active .drawer-right,
body.ava-redesign-active .drawer-primary { background: #0f0f0f !important; }
body.ava-redesign-active .list-group-item { background: transparent !important; border-color: #1f1f1f !important; color: #E0E0E0 !important; }
body.ava-redesign-active .list-group-item:hover { background: #141414 !important; }
body.ava-redesign-active .list-group-item.active { background: #141414 !important; border-color: #7B2FBE !important; color: #9B4DCA !important; }
body.ava-redesign-active.page-login-index #page-wrapper,
body.ava-redesign-active.page-login-index #page,
body.ava-redesign-active.page-login-index .login-wrapper,
body.ava-redesign-active.page-login-index .login-container,
body.ava-redesign-active.page-login-index .loginform,
body.ava-redesign-active.page-login-index #region-main,
body.ava-redesign-active.page-login-index #page-content,
body.ava-redesign-active.page-login-index #page-header,
body.ava-redesign-active.page-login-index #page-footer,
body.ava-redesign-active.page-login-index #footnote { display: none !important; }
body.ava-redesign-active #ava-login-container {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 100vh !important;
  background: #000 !important;
  animation: avaFadeIn 0.5s ease !important;
  position: fixed !important;
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
  z-index: 999999 !important;
}
body.ava-redesign-active #ava-login-container h1 { color: #fff !important; font-size: 2.5rem !important; font-weight: 700 !important; margin-bottom: 8px !important; }
body.ava-redesign-active #ava-login-container .ava-subtitle { color: #9B4DCA !important; font-size: 0.9rem !important; margin-bottom: 32px !important; }
body.ava-redesign-active .ava-google-btn {
  background: #0f0f0f !important;
  border: 1px solid #7B2FBE !important;
  color: #9B4DCA !important;
  padding: 12px 32px !important;
  font-size: 0.85rem !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  text-decoration: none !important;
  display: inline-block !important;
  letter-spacing: 1px !important;
}
body.ava-redesign-active .ava-google-btn:hover { border-color: #B06AE8 !important; color: #B06AE8 !important; }
body.ava-redesign-active .ava-manual-link { color: #555 !important; font-size: 0.75rem !important; margin-top: 16px !important; cursor: pointer !important; }
body.ava-redesign-active .ava-manual-link:hover { color: #9B4DCA !important; }
body.ava-redesign-active .ava-login-footer { position: fixed !important; bottom: 16px !important; color: #333 !important; font-size: 0.65rem !important; }
@keyframes avaFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
body.ava-redesign-active.page-mycourses #page-header { display: block !important; background: transparent !important; padding: 72px 24px 8px !important; }
body.ava-redesign-active.page-mycourses #page-content,
body.ava-redesign-active.page-mycourses #region-main,
body.ava-redesign-active.page-mycourses [data-region="course-view-content"],
body.ava-redesign-active.page-mycourses [data-region="courses-view"],
body.ava-redesign-active.page-mycourses [data-region="myoverview"] { overflow: visible !important; height: auto !important; max-height: none !important; padding: 0 24px !important; width: 100% !important; }
body.ava-redesign-active.page-mycourses .card-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
  gap: 16px !important;
  padding: 16px 0 !important;
  overflow: visible !important;
  height: auto !important;
  max-height: none !important;
  width: 100% !important;
  margin: 0 !important;
}
body.ava-redesign-active.page-mycourses .card-grid .col,
body.ava-redesign-active.page-mycourses .card-grid [class*="col-"] {
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  flex: unset !important;
  padding: 0 !important;
  height: auto !important;
}
body.ava-redesign-active.page-mycourses .card {
  width: 100% !important;
  height: 160px !important;
  min-height: 160px !important;
  max-height: 160px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: center !important;
  text-align: center !important;
  padding: 12px !important;
  background: #0f0f0f !important;
  border: 1px solid #1f1f1f !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}
body.ava-redesign-active.page-mycourses .card:hover { border-color: #7B2FBE !important; }
body.ava-redesign-active.page-mycourses .card-img-top,
body.ava-redesign-active.page-mycourses .course-image,
body.ava-redesign-active.page-mycourses .courseimage,
body.ava-redesign-active.page-mycourses .dashboard-card-img { display: none !important; }
body.ava-redesign-active.page-mycourses .card .course-info-container,
body.ava-redesign-active.page-mycourses .card .card-body {
  padding: 4px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  flex: 1 !important;
}
body.ava-redesign-active.page-mycourses .coursename,
body.ava-redesign-active.page-mycourses .multiline a,
body.ava-redesign-active.page-mycourses .course-info-container a {
  color: #E0E0E0 !important;
  font-size: 0.68rem !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  text-align: center !important;
  word-break: break-word !important;
  overflow: hidden !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 5 !important;
  -webkit-box-orient: vertical !important;
}
body.ava-redesign-active.page-mycourses .coursename:hover,
body.ava-redesign-active.page-mycourses .multiline a:hover,
body.ava-redesign-active.page-mycourses .course-info-container a:hover { color: #9B4DCA !important; }
body.ava-redesign-active.page-mycourses .course-category,
body.ava-redesign-active.page-mycourses .progress,
body.ava-redesign-active.page-mycourses .course-card-actions { display: none !important; }
body.ava-redesign-active.page-mycourses [data-region="loading-placeholder-content"] { display: none !important; }
body.ava-redesign-active.page-mycourses [data-region="paging-bar"] .page-link {
  background: #0f0f0f !important;
  border-color: #2a2a2a !important;
  color: #9B4DCA !important;
}
body.ava-redesign-active .bg-pulse-grey { background: #1a1a1a !important; animation: avaPulse 1.5s ease-in-out infinite !important; }
@keyframes avaPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
body.ava-redesign-active #user-action-menu { background: #0f0f0f !important; border: 1px solid #2a2a2a !important; }
body.ava-redesign-active #user-action-menu .dropdown-item { color: #E0E0E0 !important; }
body.ava-redesign-active #user-action-menu .dropdown-item:hover { background: #141414 !important; color: #9B4DCA !important; }
body.ava-redesign-active #user-action-menu .loggedinas { color: #888 !important; }
body.ava-redesign-active #user-action-menu .dropdown-divider { border-color: #1f1f1f !important; }
body.ava-redesign-active .searchform-navbar .form-control { background: #0f0f0f !important; border: 1px solid #2a2a2a !important; color: #E0E0E0 !important; }`;

const POPUP_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>AVA</title>
<link rel="stylesheet" href="popup.css"/>
</head>
<body>
<div class="popup-header">
  <div class="popup-logo">AVA \u2014 ESCOLA PARQUE</div>
  <div class="popup-tagline">&gt; extensao de redesign</div>
</div>
<div class="popup-divider"></div>
<div class="popup-body">
  <div class="toggle-row">
    <div class="toggle-info">
      <div class="toggle-label" id="label-active">REDESIGN ATIVO</div>
      <div class="toggle-desc">injeta estilos no AVA</div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="toggle-active" checked/>
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
  </div>
</div>
<div class="popup-divider"></div>
<div class="popup-links">
  <a href="https://ava.escolaparque.g12.br/my/" target="_blank" class="popup-link">&rarr; abrir dashboard</a>
  <a href="https://ava.escolaparque.g12.br/login/index.php" target="_blank" class="popup-link">&rarr; pagina de login</a>
  <a href="https://ava.escolaparque.g12.br/my/courses.php" target="_blank" class="popup-link">&rarr; meus cursos</a>
</div>
<div class="popup-divider"></div>
<div class="popup-footer">
  <span class="popup-version">v2.0.0</span>
  <span class="popup-credit">Escola Parque // Redesign</span>
</div>
<script src="popup.js"><\/script>
</body>
</html>`;

const POPUP_JS = `'use strict';
var api = typeof browser !== 'undefined' ? browser : chrome;
var toggleActive = document.getElementById('toggle-active');
var labelActive  = document.getElementById('label-active');
api.storage.local.get({ extensionActive: true }, function(state) {
  var active = state.extensionActive !== false;
  toggleActive.checked = active;
  updateLabel(active);
});
toggleActive.addEventListener('change', function() {
  var active = toggleActive.checked;
  api.storage.local.set({ extensionActive: active });
  updateLabel(active);
  api.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0] || !tabs[0].id) return;
    if (!tabs[0].url || !tabs[0].url.includes('ava.escolaparque.g12.br')) return;
    api.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_ACTIVE', value: active }, function() {
      if (api.runtime.lastError) {}
    });
  });
});
function updateLabel(active) {
  labelActive.textContent = active ? 'REDESIGN ATIVO' : 'REDESIGN INATIVO';
  labelActive.style.color = active ? '#E0E0E0' : '#444';
}`;

const POPUP_CSS = `@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; border-radius:0!important; font-family:'JetBrains Mono',monospace; }
body { width:280px; background:#080808; color:#E0E0E0; font-size:12px; overflow:hidden; }
.popup-header { padding:14px 16px 10px; background:#0f0f0f; border-bottom:1px solid #1f1f1f; }
.popup-logo { font-size:0.82rem; font-weight:700; color:#9B4DCA; letter-spacing:0.06em; text-transform:uppercase; }
.popup-tagline { font-size:0.68rem; color:#444; margin-top:2px; }
.popup-divider { height:1px; background:#1f1f1f; }
.popup-body { padding:8px 0; }
.toggle-row { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #111; transition:background 0.15s; }
.toggle-row:hover { background:#0f0f0f; }
.toggle-info { display:flex; flex-direction:column; gap:2px; }
.toggle-label { font-size:0.75rem; font-weight:700; color:#E0E0E0; letter-spacing:0.06em; text-transform:uppercase; }
.toggle-desc { font-size:0.65rem; color:#444; }
.toggle-switch { position:relative; display:inline-flex; cursor:pointer; }
.toggle-switch input { opacity:0; width:0; height:0; position:absolute; }
.toggle-track { display:flex; align-items:center; width:40px; height:22px; background:#1a1a1a; border:1px solid #2a2a2a; position:relative; cursor:pointer; transition:background 0.2s,border-color 0.2s; }
.toggle-thumb { position:absolute; left:3px; width:14px; height:14px; background:#444; transition:left 0.2s,background 0.2s; }
.toggle-switch input:checked + .toggle-track { background:#1a0a2e; border-color:#7B2FBE; }
.toggle-switch input:checked + .toggle-track .toggle-thumb { left:21px; background:#7B2FBE; }
.popup-links { padding:6px 0; display:flex; flex-direction:column; }
.popup-link { display:block; padding:8px 16px; font-size:0.72rem; color:#888; text-decoration:none; letter-spacing:0.02em; transition:color 0.15s,background 0.15s; border-left:2px solid transparent; }
.popup-link:hover { color:#9B4DCA; background:#0f0f0f; border-left:2px solid #7B2FBE; }
.popup-footer { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#050505; }
.popup-version, .popup-credit { font-size:0.65rem; color:#333; }`;

async function downloadExtension(browser: 'chrome' | 'firefox') {
  const btn = document.getElementById(`btn-${browser}`) as HTMLButtonElement;
  const orig = btn.textContent!;
  btn.textContent = 'gerando zip...';
  btn.disabled = true;
  btn.className = 'dl-btn loading';
  try {
    const zip = new JSZip();
    zip.file('manifest.json',         browser === 'chrome' ? MANIFEST_CHROME : MANIFEST_FIREFOX);
    zip.file('content.js',            CONTENT_JS);
    zip.file('style.css',             STYLE_CSS);
    zip.file('popup.html',            POPUP_HTML);
    zip.file('popup.js',              POPUP_JS);
    zip.file('popup.css',             POPUP_CSS);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ava-extension-${browser}-v2.0.0.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    btn.textContent = 'baixando...';
    btn.className   = 'dl-btn done';
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; btn.className = 'dl-btn'; }, 2500);
  } catch (err) {
    console.error(err);
    btn.textContent = 'erro — tente novamente';
    btn.className   = 'dl-btn err';
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; btn.className = 'dl-btn'; }, 3000);
  }
}

function showTab(id: string, btn: HTMLElement) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id)!.classList.add('active');
  btn.classList.add('active');
}

declare global {
  interface Window {
    downloadExtension: typeof downloadExtension;
    showTab: typeof showTab;
  }
}

export default function App() {
  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    window.downloadExtension = downloadExtension;
    window.showTab = showTab;
  }, []);

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box;border-radius:0;font-family:'JetBrains Mono',monospace;}
        html{scroll-behavior:smooth;}
        body{background:#080808;color:#E0E0E0;min-height:100vh;overflow-x:hidden;}
        body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:#0a0a0a;}
        ::-webkit-scrollbar-thumb{background:#7B2FBE;}
        a{color:#9B4DCA;text-decoration:none;}
        a:hover{color:#B06AE8;}
        nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:#0f0f0f;border-bottom:1px solid #1f1f1f;padding:0 32px;height:48px;display:flex;align-items:center;justify-content:space-between;}
        .nav-brand{color:#9B4DCA;font-weight:700;font-size:0.82rem;letter-spacing:0.06em;}
        .nav-ver{color:#333;font-size:0.68rem;}
        section{padding:80px 32px 60px;max-width:900px;margin:0 auto;}
        section.hero{padding-top:140px;}
        .hero-title{font-size:clamp(2rem,5vw,3.2rem);font-weight:700;color:#fff;letter-spacing:0.04em;line-height:1.1;margin-bottom:16px;}
        .hero-sub{font-size:0.95rem;color:#9B4DCA;margin-bottom:40px;}
        .btn-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;}
        .dl-btn{background:#0f0f0f;border:1px solid #7B2FBE;color:#9B4DCA;font-family:'JetBrains Mono',monospace;font-size:0.82rem;font-weight:700;padding:12px 28px;cursor:pointer;text-transform:uppercase;letter-spacing:0.06em;transition:all 0.15s ease;white-space:nowrap;}
        .dl-btn:hover{background:#141414;border-color:#B06AE8;color:#B06AE8;}
        .dl-btn:disabled{opacity:0.5;cursor:not-allowed;}
        .dl-btn.loading{color:#888;border-color:#444;}
        .dl-btn.done{color:#4CAF50;border-color:#4CAF50;}
        .dl-btn.err{color:#f44336;border-color:#f44336;}
        .badge{font-size:0.72rem;color:#FFE600;letter-spacing:0.06em;}
        .section-divider{height:1px;background:#1f1f1f;margin:0 32px;}
        .section-title{font-size:0.78rem;font-weight:700;text-transform:uppercase;color:#9B4DCA;border-left:3px solid #7B2FBE;padding-left:12px;letter-spacing:0.1em;margin-bottom:28px;}
        .features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;}
        .feat-card{background:#0f0f0f;padding:20px 18px;border-top:1px solid #1f1f1f;}
        .feat-card:nth-child(1){border-left:3px solid #7B2FBE;}
        .feat-card:nth-child(2){border-left:3px solid #9B4DCA;}
        .feat-card:nth-child(3){border-left:3px solid #6A1FA0;}
        .feat-name{font-size:0.78rem;font-weight:700;color:#E0E0E0;letter-spacing:0.06em;margin-bottom:8px;}
        .feat-desc{font-size:0.7rem;color:#888;line-height:1.6;}
        .tabs{display:flex;gap:8px;margin-bottom:24px;}
        .tab-btn{background:#0f0f0f;border:1px solid #2a2a2a;color:#888;font-family:'JetBrains Mono',monospace;font-size:0.75rem;padding:7px 18px;cursor:pointer;transition:all 0.15s ease;text-transform:uppercase;letter-spacing:0.06em;}
        .tab-btn.active{border-color:#7B2FBE;color:#9B4DCA;background:#100818;}
        .tab-btn:hover:not(.active){border-color:#444;color:#E0E0E0;}
        .tab-panel{display:none;}
        .tab-panel.active{display:block;}
        .steps{display:flex;flex-direction:column;gap:10px;}
        .step{display:flex;gap:14px;align-items:flex-start;padding:12px 14px;background:#0f0f0f;border-left:2px solid #1f1f1f;}
        .step:hover{border-left-color:#7B2FBE;}
        .step-num{color:#7B2FBE;font-weight:700;font-size:0.72rem;flex-shrink:0;min-width:28px;}
        .step-text{font-size:0.72rem;color:#E0E0E0;line-height:1.6;}
        .step-text code{color:#9B4DCA;font-family:'JetBrains Mono',monospace;}
        footer{text-align:center;padding:40px 32px;border-top:1px solid #1f1f1f;color:#333;font-size:0.68rem;line-height:2;}
        @keyframes fadein{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        .s1{animation:fadein 0.4s ease-out 0.05s both;}
        .s2{animation:fadein 0.4s ease-out 0.15s both;}
        .s3{animation:fadein 0.4s ease-out 0.25s both;}
        .s4{animation:fadein 0.4s ease-out 0.35s both;}
        @media(max-width:600px){section{padding:60px 16px 40px;}section.hero{padding-top:100px;}.hero-title{font-size:1.8rem;}.btn-row{flex-direction:column;}.dl-btn{width:100%;text-align:center;}nav{padding:0 16px;}}
      `}</style>

      <nav>
        <span className="nav-brand">AVA — ESCOLA PARQUE</span>
        <span className="nav-ver">v2.0.0 // EXTENSAO</span>
      </nav>

      <section className="hero s1">
        <div className="hero-title">AVA —<br />ESCOLA PARQUE</div>
        <div className="hero-sub">&gt; redesign do seu portal escolar.</div>
        <div className="btn-row">
          <button className="dl-btn" id="btn-chrome" onClick={() => window.downloadExtension('chrome')}>
            [ DOWNLOAD — CHROME ]
          </button>
          <button className="dl-btn" id="btn-firefox" onClick={() => window.downloadExtension('firefox')}>
            [ DOWNLOAD — FIREFOX ]
          </button>
        </div>
        <div className="badge">v2.0.0 // STABLE</div>
      </section>

      <div className="section-divider" />

      <section className="s2">
        <div className="section-title">// FUNCIONALIDADES</div>
        <div className="features-grid">
          <div className="feat-card">
            <div className="feat-name">TEMA ESCURO</div>
            <div className="feat-desc">Redesign visual completo. Estetica dark minimalista com tipografia mono e roxo como destaque.</div>
          </div>
          <div className="feat-card">
            <div className="feat-name">DASHBOARD CUSTOM</div>
            <div className="feat-desc">Timeline, agenda, calendario e cursos de 2026 reorganizados em grid de duas colunas.</div>
          </div>
          <div className="feat-card">
            <div className="feat-name">ZERO BLOAT</div>
            <div className="feat-desc">Sem rastreamento. Sem dependencias externas. Roda direto no browser, acesso total ao DOM.</div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <section className="s3">
        <div className="section-title">// COMO INSTALAR</div>
        <div className="tabs">
          <button className="tab-btn active" onClick={(e) => window.showTab('chrome-tab', e.currentTarget)}>[ CHROME ]</button>
          <button className="tab-btn" onClick={(e) => window.showTab('firefox-tab', e.currentTarget)}>[ FIREFOX ]</button>
        </div>
        <div id="chrome-tab" className="tab-panel active">
          <div className="steps">
            <div className="step"><span className="step-num">[01]</span><span className="step-text">Clique em <strong>[ DOWNLOAD — CHROME ]</strong> acima e extraia o arquivo <code>.zip</code></span></div>
            <div className="step"><span className="step-num">[02]</span><span className="step-text">Abra <code>chrome://extensions</code> no navegador</span></div>
            <div className="step"><span className="step-num">[03]</span><span className="step-text">Ative o <strong>Modo desenvolvedor</strong> no canto superior direito</span></div>
            <div className="step"><span className="step-num">[04]</span><span className="step-text">Clique em <strong>Carregar sem compactacao</strong> e selecione a pasta extraida</span></div>
            <div className="step"><span className="step-num">[05]</span><span className="step-text">Acesse <code>ava.escolaparque.g12.br</code> — o redesign e aplicado automaticamente</span></div>
          </div>
        </div>
        <div id="firefox-tab" className="tab-panel">
          <div className="steps">
            <div className="step"><span className="step-num">[01]</span><span className="step-text">Clique em <strong>[ DOWNLOAD — FIREFOX ]</strong> acima e extraia o arquivo <code>.zip</code></span></div>
            <div className="step"><span className="step-num">[02]</span><span className="step-text">Renomeie <code>manifest-firefox.json</code> para <code>manifest.json</code> dentro da pasta</span></div>
            <div className="step"><span className="step-num">[03]</span><span className="step-text">Abra <code>about:debugging</code> e clique em <strong>Este Firefox</strong></span></div>
            <div className="step"><span className="step-num">[04]</span><span className="step-text">Clique em <strong>Carregar extensao temporaria</strong> e selecione o <code>manifest.json</code></span></div>
            <div className="step"><span className="step-num">[05]</span><span className="step-text">Acesse <code>ava.escolaparque.g12.br</code> — o redesign e aplicado automaticamente</span></div>
          </div>
        </div>
      </section>

      <div className="section-divider" />

      <footer className="s4">
        AVA — ESCOLA PARQUE // 2025<br />
        para uso pessoal. use por sua conta e risco.
      </footer>
    </>
  );
}
