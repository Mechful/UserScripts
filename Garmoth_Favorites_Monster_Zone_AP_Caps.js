// ==UserScript==
// @name         Garmoth.com: Favorites Monster Zone AP Caps
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Quickly favorite your Monster Zone AP Caps instead of scrolling all the way down, or pick multiple grind spots across different regions to save them in one place.
// @match        https://garmoth.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const FAVORITE_KEY = "garmothFavs_v2_5";
    const ROW_SELECTOR = ".grid.grid-cols-8.border-t";
    const NAME_SELECTOR = "p.cut-text";

    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]"); }
        catch { return []; }
    }
    function saveFavorites(arr) {
        localStorage.setItem(FAVORITE_KEY, JSON.stringify(Array.from(new Set(arr))));
    }
    function textTrim(el) {
        return el ? (el.textContent || "").trim() : "";
    }

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

        const header = document.createElement("div");
        header.className = "grid grid-cols-8 py-1 text-center bg-700";
        header.innerHTML = `<div class="col-span-3 px-2 text-left font-bold">⭐ Favorites</div>`;
        section.appendChild(header);

        container.insertBefore(section, firstRegion);
    }

    function makeStarButton(name) {
        const favs = new Set(getFavorites());
        const isFav = favs.has(name);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "garmoth-fav-star";
        btn.dataset.spot = name;
        btn.textContent = isFav ? "★" : "☆";
        btn.title = isFav ? "Unfavorite" : "Favorite";
        btn.style.cssText = "border:none;background:transparent;cursor:pointer;font-size:18px;padding-right:6px;";

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleFavorite(name);
        });

        return btn;
    }

    function toggleFavorite(name) {
        const favs = getFavorites();
        const idx = favs.indexOf(name);
        if (idx >= 0) favs.splice(idx, 1);
        else favs.push(name);
        saveFavorites(favs);
        refreshStars();
        refreshFavoritesSection();
    }

    function refreshStars() {
        const favsSet = new Set(getFavorites());
        document.querySelectorAll(ROW_SELECTOR).forEach(row => {
            const nameEl = row.querySelector(NAME_SELECTOR);
            if (!nameEl) return;
            const name = textTrim(nameEl);

            let btn = row.querySelector(".garmoth-fav-star");
            if (!btn) {
                const flex = row.querySelector(".col-span-3 .flex");
                if (flex) {
                    btn = makeStarButton(name);
                    flex.prepend(btn);
                }
            } else {
                btn.textContent = favsSet.has(name) ? "★" : "☆";
            }
        });
    }

    function refreshFavoritesSection() {
        const favs = getFavorites();
        let section = document.getElementById("favorites-section");

        if (!favs.length) {
            if (section) section.remove();
            return;
        }

        buildFavoritesSection();
        section = document.getElementById("favorites-section");
        if (!section) return;

        section.querySelectorAll(ROW_SELECTOR).forEach(r => r.remove());

        const allRows = Array.from(document.querySelectorAll(ROW_SELECTOR));
        const nameToRow = new Map();
        allRows.forEach(r => {
            const name = textTrim(r.querySelector(NAME_SELECTOR));
            if (name && !nameToRow.has(name)) nameToRow.set(name, r);
        });

        favs.forEach(name => {
            const orig = nameToRow.get(name);
            if (!orig) return;
            const clone = orig.cloneNode(true);

            const oldStar = clone.querySelector(".garmoth-fav-star");
            if (oldStar) oldStar.remove();
            const flex = clone.querySelector(".col-span-3 .flex");
            if (flex) {
                const cloneStar = document.createElement("button");
                cloneStar.textContent = "★";
                cloneStar.title = "Unfavorite";
                cloneStar.style.cssText = "border:none;background:transparent;cursor:pointer;font-size:18px;padding-right:6px;";
                cloneStar.addEventListener("click", () => toggleFavorite(name));
                flex.prepend(cloneStar);
            }

            section.appendChild(clone);
        });
    }

    async function init() {
        if (!location.pathname.includes("/pve/caps")) return; // only run on PvE Caps
        let tries = 0;
        while (!document.querySelector(ROW_SELECTOR) && tries < 20) {
            await new Promise(r => setTimeout(r, 500));
            tries++;
        }
        refreshStars();
        refreshFavoritesSection();
    }

    // 🔹 Detect SPA navigation (URL changes)
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            setTimeout(init, 1000);
        }
    }).observe(document, {subtree: true, childList: true});

    window.addEventListener("load", () => setTimeout(init, 1000));
})();
