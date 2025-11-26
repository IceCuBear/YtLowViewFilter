// ==UserScript==
// @name         YouTube View Filter + UI
// @namespace    yt-view-filter-ui
// @version      3.4
// @description  Hide low-view/members-only videos. Fixed issue where SponsorBlock content was hidden.
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @updateURL    https://raw.githubusercontent.com/IceCuBear/YtLowViewFilter/main/YtLowViewFilter.js
// @downloadURL  https://raw.githubusercontent.com/IceCuBear/YtLowViewFilter/main/YtLowViewFilter.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    ////////////////////////////////////////////////////////////////////////////
    // 1. State & Config
    ////////////////////////////////////////////////////////////////////////////

    const state = {
        enabled: JSON.parse(localStorage.getItem("ytvf_enabled") || "true"),
        threshold: Number(localStorage.getItem("ytvf_threshold") || "100000"),
        lifetimeHidden: Number(localStorage.getItem("ytvf_lifetime") || "0"),
        uiVisible: false,
    };

    function saveState() {
        localStorage.setItem("ytvf_enabled", JSON.stringify(state.enabled));
        localStorage.setItem("ytvf_threshold", String(state.threshold));
        localStorage.setItem("ytvf_lifetime", String(state.lifetimeHidden));
    }

    ////////////////////////////////////////////////////////////////////////////
    // 2. Parsing Utilities
    ////////////////////////////////////////////////////////////////////////////

    function parseViews(text) {
        if (!text) return null;

        const suffixRegex = /(\d+(?:[.,]\d+)?)\s*([KMEB])\b/i;
        const match = text.match(suffixRegex);

        if (match) {
            let numStr = match[1].replace(",", ".");
            const suffix = match[2].toUpperCase();
            let multiplier = 1;

            if (suffix === 'K' || suffix === 'E') multiplier = 1_000;
            if (suffix === 'M') multiplier = 1_000_000;
            if (suffix === 'B') multiplier = 1_000_000_000;

            return parseFloat(numStr) * multiplier;
        }

        const digits = text.replace(/\D/g, "");
        return digits ? parseInt(digits, 10) : null;
    }

    function isMembersOnly(root) {
        // Scan for specific text badges that indicate exclusive content
        const badges = root.querySelectorAll(
            ".yt-badge-shape__text, .yt-core-attributed-string, span, .badge-shape"
        );
        for (const b of badges) {
            const t = (b.textContent || "").trim().toLowerCase();
            // Add more languages if needed
            if (t.includes("csak tagoknak") || t.includes("members only") ||
                t.includes("mitgliedern") || t.includes("miembros")) {
                return true;
            }
        }

        // Removed the check for 'SponsorBlockIcon' here.
        // That was causing the script to hide videos labeled by the extension.

        return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    // 3. Filter Logic
    ////////////////////////////////////////////////////////////////////////////

    function filterAll() {
        if (!state.enabled) return;

        const items = document.querySelectorAll([
            "ytd-rich-item-renderer",
            "ytd-video-renderer",
            "ytd-grid-video-renderer",
            "ytd-compact-video-renderer",
            "yt-lockup-view-model"
        ].join(","));

        let hasNewStats = false;

        for (const item of items) {
            if (item.dataset.ytvfChecked === "1") continue;

            let viewText = "";

            // Strategy 1: Standard metadata line
            const oldSpan = item.querySelector("#metadata-line span, span.ytd-video-meta-block");
            if (oldSpan) viewText = oldSpan.textContent;

            // Strategy 2: New UI or alternative layouts
            if (!viewText) {
                const metaRows = item.querySelectorAll(".yt-content-metadata-view-model__metadata-text, .yt-core-attributed-string");
                for (const row of metaRows) {
                    const t = row.textContent;
                    if (/\d/.test(t) && (
                        t.includes("megtekintés") || t.includes("views") ||
                        t.includes("Aufrufe") || t.match(/\d\s*[KMEB]\b/i)
                    )) {
                        viewText = t;
                        break;
                    }
                }
            }

            const views = parseViews(viewText);
            const members = isMembersOnly(item);
            let reason = null;

            if (members) reason = "mem";
            else if (views !== null && views < state.threshold) reason = "low";

            if (reason) {
                item.style.display = "none";
                item.dataset.ytvfHidden = reason;

                if (!item.dataset.ytvfCounted) {
                    state.lifetimeHidden++;
                    item.dataset.ytvfCounted = "1";
                    hasNewStats = true;
                }
            }

            item.dataset.ytvfChecked = "1";
        }

        if (hasNewStats) saveState();
        updateStatsUI();
    }

    ////////////////////////////////////////////////////////////////////////////
    // 4. Observer
    ////////////////////////////////////////////////////////////////////////////

    let debounceTimer;
    const observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filterAll();
            createCog();
        }, 200);
    });

    function startObserver() {
        const target = document.querySelector("ytd-page-manager") || document.body;
        observer.observe(target, { childList: true, subtree: true });
    }

    ////////////////////////////////////////////////////////////////////////////
    // 5. UI & Stats
    ////////////////////////////////////////////////////////////////////////////

    function updateStatsUI() {
        const elLow = document.getElementById("ytvf-stats-low");
        const elMem = document.getElementById("ytvf-stats-mem");
        const elLife = document.getElementById("ytvf-stats-lifetime");

        if (!elLow) return;

        const lowCount = document.querySelectorAll('[data-ytvf-hidden="low"]').length;
        const memCount = document.querySelectorAll('[data-ytvf-hidden="mem"]').length;

        elLow.textContent = lowCount;
        elMem.textContent = memCount;
        elLife.textContent = state.lifetimeHidden.toLocaleString();
    }

    function createUI() {
        if (document.getElementById("ytvf-panel")) return;

        const panel = document.createElement("div");
        panel.id = "ytvf-panel";
        panel.style = `
            position: fixed; top: 70px; right: 80px; width: 280px;
            background: #0f0f0fee; border: 1px solid #333; border-radius: 12px;
            z-index: 999999; color: white; font-family: Roboto, sans-serif; display: none;
            box-shadow: 0 10px 25px rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        `;

        panel.innerHTML = `
            <div id="ytvf-header" style="
                padding: 12px; background: #1f1f1f; border-radius: 12px 12px 0 0;
                display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; cursor: move;">
                <span style="font-weight:bold;">Filter Settings</span>
                <button id="ytvf-close" style="background:none; border:none; color:#aaa; font-size:20px; cursor:pointer;">×</button>
            </div>

            <div style="padding: 15px;">
                <label style="display:flex; align-items:center; gap: 10px; cursor: pointer; margin-bottom: 15px;">
                    <input id="ytvf-enabled" type="checkbox" ${state.enabled ? "checked":""} style="transform:scale(1.2);">
                    <span>Enable Filtering</span>
                </label>

                <div style="margin-bottom: 15px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px; color:#aaa;">
                        <span>Min View Threshold</span>
                        <span id="ytvf-label" style="color:#fff; font-weight:bold;">${state.threshold.toLocaleString()}</span>
                    </div>

                    <div id="ytvf-slider-wrapper" style="padding: 5px 0;">
                        <input id="ytvf-slider" type="range" min="1000" max="1000000" step="1000"
                               style="width:100%; cursor: pointer; accent-color: #3ea6ff; display: block;">
                    </div>

                    <div style="display:flex; justify-content:space-between; font-size:10px; color:#555; margin-top:2px;">
                        <span>1k</span><span>1M</span>
                    </div>
                </div>

                <div style="background: #222; padding: 10px; border-radius: 8px; font-size: 12px; color: #ccc; border: 1px solid #333;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                        <span>Hidden (Low):</span> <span id="ytvf-stats-low" style="color:#fff; font-weight:bold;">0</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span>Hidden (Members):</span> <span id="ytvf-stats-mem" style="color:#fff; font-weight:bold;">0</span>
                    </div>
                    <div style="border-top: 1px solid #444; padding-top: 6px; margin-top: 6px; display:flex; justify-content:space-between;">
                        <span>Total Lifetime:</span> <span id="ytvf-stats-lifetime" style="color:#3ea6ff; font-weight:bold;">${state.lifetimeHidden}</span>
                    </div>
                </div>

                <button id="ytvf-recheck" style="
                    width:100%; margin-top:15px; padding:8px; background:#333; color:white;
                    border:1px solid #444; border-radius:6px; cursor:pointer;">
                    Recheck Page
                </button>
            </div>
        `;

        document.body.appendChild(panel);

        document.getElementById("ytvf-close").onclick = () => {
            panel.style.display = "none";
            state.uiVisible = false;
        };

        // Dragging
        const header = document.getElementById("ytvf-header");
        let offsetX = 0, offsetY = 0, dragging = false;
        header.onmousedown = (e) => {
            dragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            e.preventDefault();
        };
        document.onmousemove = (e) => {
            if (!dragging) return;
            panel.style.left = (e.clientX - offsetX) + "px";
            panel.style.top = (e.clientY - offsetY) + "px";
        };
        document.onmouseup = () => dragging = false;

        document.getElementById("ytvf-enabled").onchange = (e) => {
            state.enabled = e.target.checked;
            saveState();
            resetAndRun();
        };

        const slider = document.getElementById("ytvf-slider");
        const sliderWrapper = document.getElementById("ytvf-slider-wrapper");
        slider.value = state.threshold;

        ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'].forEach(evt => {
            sliderWrapper.addEventListener(evt, (e) => e.stopPropagation());
        });

        slider.oninput = (e) => {
            state.threshold = Number(e.target.value);
            document.getElementById("ytvf-label").textContent = state.threshold.toLocaleString();
            saveState();
        };

        slider.onchange = () => {
            resetAndRun();
        };

        document.getElementById("ytvf-recheck").onclick = () => {
            resetAndRun();
        };
    }

    function resetAndRun() {
        document.querySelectorAll("[data-ytvf-checked]").forEach(el => {
            delete el.dataset.ytvfChecked;
            delete el.dataset.ytvfHidden;
            el.style.display = "";
        });
        filterAll();
    }

    function createCog() {
        if (document.getElementById("ytvf-cog")) return;
        const mastheadButtons = document.querySelector("ytd-masthead #buttons");
        if (!mastheadButtons) return;

        const cog = document.createElement("div");
        cog.id = "ytvf-cog";
        cog.style = "display: flex; align-items: center; margin-right: 8px; cursor: pointer;";
        cog.innerHTML = `<button style="background:none;border:none;color:white;padding:8px;border-radius:50%;cursor:pointer;"><span style="font-size:22px;">⚙️</span></button>`;

        cog.onclick = () => {
            const panel = document.getElementById("ytvf-panel");
            if (panel) {
                panel.style.display = panel.style.display === "none" ? "block" : "none";
                updateStatsUI();
            }
        };
        mastheadButtons.insertBefore(cog, mastheadButtons.firstChild);
    }

    function init() {
        createUI();
        createCog();
        startObserver();
        filterAll();
        window.addEventListener("yt-navigate-finish", () => {
            setTimeout(() => {
                createCog();
                resetAndRun();
            }, 500);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
