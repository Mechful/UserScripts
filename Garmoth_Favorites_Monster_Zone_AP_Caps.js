// ==UserScript==
// @name         Garmoth.com: Favorites Monster Zone AP Caps
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Quickly favorite your Monster Zone AP Caps instead of scrolling all the way down, or pick multiple grind spots across different regions to save them in one place.
// @match        https://garmoth.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const FAVORITE_KEY = "garmothFavs_v3";
    const ROW_SELECTOR = ".grid.grid-cols-8.border-t";
    const NAME_SELECTOR = "p.cut-text";

    const getFavorites = () => {
        try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]"); }
        catch { return []; }
    };
    const saveFavorites = arr => localStorage.setItem(FAVORITE_KEY, JSON.stringify([...new Set(arr)]));

    const trim = el => el ? el.textContent.trim() : "";

    function findMainContainer() {
        return document.querySelector(".overflow-y-auto.overflow-x-hidden");
    }

    function buildFavoritesSection() {
        if (document.getElementById("favorites-section")) return;
        const container = findMainContainer();
        if (!container) return;

        const firstRegion = container.querySelector("section");
        if (!firstRegion) return;

        const section = document.createElement("section");
        section.id = "favorites-section";
        section.className = "mb-2 min-w-[900px] overflow-hidden rounded-md bg-700";

        section.innerHTML = `
            <div class="grid grid-cols-8 py-1 text-center bg-700">
              <div class="col-span-3 px-2 text-left font-bold">⭐ Favorites</div>
            </div>
        `;

        container.insertBefore(section, firstRegion);
    }

    function makeStar(name, filled = false) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "garmoth-fav-star";
        btn.dataset.spot = name;
        btn.textContent = filled ? "★" : "☆";
        btn.title = filled ? "Unfavorite" : "Favorite";
        btn.style.cssText = "border:none;background:transparent;cursor:pointer;font-size:18px;padding-right:6px;";
        btn.addEventListener("click", e => {
            e.stopPropagation();
            toggleFavorite(name);
        });
        return btn;
    }

    function toggleFavorite(name) {
        const favs = getFavorites();
        const idx = favs.indexOf(name);
        if (idx >= 0) favs.splice(idx, 1); else favs.push(name);
        saveFavorites(favs);
        refreshStars();
        refreshFavoritesSection();
    }

    function refreshStars() {
        const favs = new Set(getFavorites());
        document.querySelectorAll(ROW_SELECTOR).forEach(row => {
            const name = trim(row.querySelector(NAME_SELECTOR));
            if (!name) return;
            let btn = row.querySelector(".garmoth-fav-star");
            if (!btn) {
                const flex = row.querySelector(".col-span-3 .flex");
                if (flex) flex.prepend(makeStar(name, favs.has(name)));
            } else {
                btn.textContent = favs.has(name) ? "★" : "☆";
                btn.title = favs.has(name) ? "Unfavorite" : "Favorite";
            }
        });
    }

    function refreshFavoritesSection() {
        const favs = getFavorites();
        let section = document.getElementById("favorites-section");

        if (!favs.length) { if (section) section.remove(); return; }

        buildFavoritesSection();
        section = document.getElementById("favorites-section");
        if (!section) return;

        section.querySelectorAll(ROW_SELECTOR).forEach(r => r.remove());

        const rows = [...document.querySelectorAll(ROW_SELECTOR)];
        const nameToRow = new Map(rows.map(r => [trim(r.querySelector(NAME_SELECTOR)), r]));

        favs.forEach(name => {
            const orig = nameToRow.get(name);
            if (!orig) return;

            let clone = orig.cloneNode(true);

            // ensure single favorite star
            const flex = clone.querySelector(".col-span-3 .flex");
            if (flex) {
                flex.querySelectorAll(".garmoth-fav-star").forEach(el => el.remove());
                flex.prepend(makeStar(name, true));
            }

            section.appendChild(clone);

            // live sync without duplicates
            new MutationObserver(() => {
                const updated = orig.cloneNode(true);
                const updatedFlex = updated.querySelector(".col-span-3 .flex");
                if (updatedFlex) {
                    updatedFlex.querySelectorAll(".garmoth-fav-star").forEach(el => el.remove());
                    updatedFlex.prepend(makeStar(name, true));
                }
                clone.replaceWith(updated);
                clone = updated;
            }).observe(orig, { childList: true, subtree: true, characterData: true });
        });
    }

    async function init() {
        if (!location.pathname.includes("/pve/caps")) return;
        let tries = 0;
        while (!document.querySelector(ROW_SELECTOR) && tries < 20) {
            await new Promise(r => setTimeout(r, 300));
            tries++;
        }
        refreshStars();
        refreshFavoritesSection();
    }

    // watch SPA navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(init, 500);
        }
    }).observe(document, {subtree: true, childList: true});

    window.addEventListener("load", () => setTimeout(init, 500));
})();
