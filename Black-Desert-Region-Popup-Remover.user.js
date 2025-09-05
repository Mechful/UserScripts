// ==UserScript==
// @name         Black Desert Region Popup Remover
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Prevent the region selection popup from ever appearing
// @match        https://*.playblackdesert.com/*
// @match        https://*.pearlabyss.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Kill it before it shows
    const style = document.createElement('style');
    style.textContent = `
        #_modal_select_region {
            display: none !important;
            visibility: hidden !important;
        }
        body.modal-open {
            overflow: auto !important;
        }
    `;
    document.documentElement.appendChild(style);

    // Extra: If the script that shows the popup adds it dynamically
    new MutationObserver((mutations, observer) => {
        const modal = document.getElementById('_modal_select_region');
        if (modal) {
            modal.remove();
            observer.disconnect();
        }
    }).observe(document, { childList: true, subtree: true });
})();
