// ==UserScript==
// @name         Bdolytics Marketplace: Copy Item Names
// @namespace    bdolytics-helper
// @version      2.1
// @description  Adds a button to quickly copy item names from the Bdolytics marketplace. Include Pearl item names
// @match        https://bdolytics.com/*/market/*
// @run-at       document-idle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  const MARKER = 'data-copy-col';
  const ICON_SVG = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z"/>
    </svg>`.trim();

  function copyScopedAttrs(src, dest) {
    if (!src || !dest) return;
    for (const attr of src.attributes) {
      if (attr.name.startsWith('data-v-')) dest.setAttribute(attr.name, '');
    }
  }

  function makeCopyButton(getName) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Copy item name';
    Object.assign(btn.style, {
      all: 'unset',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'color 0.2s ease',
      color: '#ccc'
    });
    btn.innerHTML = ICON_SVG;

    btn.onmouseenter = () => (btn.style.color = '#17e368');
    btn.onmouseleave = () => (btn.style.color = '#ccc');

    btn.addEventListener('click', () => {
      const text = getName();
      if (!text) return;
      if (typeof GM_setClipboard === 'function') GM_setClipboard(text, 'text');
      else navigator.clipboard?.writeText(text);

      btn.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
        { duration: 180 }
      );
      showToast(`"${text}" copied to clipboard!`);
    });

    return btn;
  }

  function processRow(tr) {
    if (tr.querySelector(`td[${MARKER}]`)) return;
    const firstTd = tr.querySelector('td');
    if (!firstTd) return;

    const td = document.createElement('td');
    td.setAttribute(MARKER, '');
    td.className = firstTd.className;
    copyScopedAttrs(firstTd, td);
    td.style.textAlign = 'center';
    td.style.width = '32px';

    const getName = () => {
      const link = tr.querySelector('a[href*="/market/"], a[href*="/item/"]');
      return (link?.textContent || firstTd.textContent).trim().replace(/\s+/g, ' ');
    };

    td.appendChild(makeCopyButton(getName));
    tr.prepend(td);
  }

  function processHead(thead) {
    const tr = thead?.querySelector('tr');
    if (!tr || tr.querySelector(`th[${MARKER}]`)) return;
    const modelTh = tr.querySelector('th');
    const th = document.createElement('th');
    th.setAttribute(MARKER, '');
    th.className = modelTh?.className || '';
    copyScopedAttrs(modelTh, th);
    th.style.width = '32px';
    th.style.textAlign = 'center';
    th.setAttribute('aria-label', 'Copy');
    tr.prepend(th);
  }

  function wireTable(table) {
    if (!table || table.getAttribute(MARKER) === 'done') return;
    table.setAttribute(MARKER, 'done');
    processHead(table.querySelector('thead'));
    table.querySelectorAll('tbody tr').forEach(processRow);

    new MutationObserver(() =>
      table.querySelectorAll('tbody tr').forEach(processRow)
    ).observe(table.querySelector('tbody'), { childList: true, subtree: true });
  }

  function findAndWire() {
    document.querySelectorAll('.vue3-easy-data-table__main table, table.styled-table')
      .forEach(wireTable);
  }

  // --- Toast ---
  function showToast(message) {
    let container = document.getElementById('userscript-toast-container');
    if (!container) {
      container = document.createElement('div');
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 99999,
      });
      container.id = 'userscript-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      marginTop: '10px',
      background: '#202020',
      color: 'white',
      padding: '10px 16px',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      opacity: '0',
      transform: 'translateY(20px)',
    });

    toast.innerHTML = `
      <svg viewBox="0 0 512 512" width="18" height="18" style="margin-right:8px">
        <path fill="currentColor" d="M504 256c0 136.967-111.033 248-248 248S8 392.967
        8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248
        6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216
        308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627
        22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249
        16.379 6.249 22.628.001z"/>
      </svg>
      <div>${message}</div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Run
  findAndWire();
  new MutationObserver(findAndWire).observe(document.body, { childList: true, subtree: true });
})();
