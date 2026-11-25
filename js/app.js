/*
 * app.js — start-up, state, routing and saving.
 *
 * LM.state holds what the app knows right now:
 *   profiles  — profiles with their own progress (saved in plm.profiles)
 *   progress  — progress of the ACTIVE profile ({ <topic id>: true }, a reference into profiles…progress)
 *   ui        — the selected level (plm.ui)
 *   view      — what is on screen (the table in applyRoute)
 *   route     — the open topic page or cheat sheet ({ level, topicId } | { level, cheatsheet }) or null
 *   toolRoute — the parsed route of the other views
 * Levels, units, categories and topics come only from LM.syllabus (spec 06 E2); nothing of the content is stored.
 */
window.LM = window.LM || {};

(function (LM) {
  "use strict";

  const U = LM.utils;
  const el = U.el;

  const state = LM.state = {
    profiles: null,
    progress: {},
    ui: { levelId: "A1" },
    storageOk: true,
    view: "home",
    route: null,
    toolRoute: null,
    listScroll: 0 // scroll position of the level page, restored when coming back from a topic page
  };

  // =====================================================================
  // START
  // =====================================================================

  function init() {
    try {
      bindStaticEvents();
      state.storageOk = LM.store.isStorageAvailable();

      if (!state.storageOk) {
        // Without localStorage the app works, but only until the tab is closed
        state.profiles = LM.createEmptyProfiles();
        syncProgress();
        addBanner("error", "Browser storage (localStorage) is not available, so changes will NOT be saved. " +
          "Check your browser settings (private mode, blocked cookies). You can import a backup and use the app until you close the tab.",
          { label: "Import a backup…", onClick: function () { LM.dataMenu.importAll(); } });
        fixUi();
        applyRoute();
        state.ready = true;
        renderAll();
        return;
      }

      const prof = LM.store.loadProfiles();
      state.profiles = prof.data;
      syncProgress();
      state.ui = LM.store.loadUI();
      if (prof.status === "corrupt") {
        // Nothing is written until the learner chooses (the broken value stays in plm.profiles)
        showCorruptScreen(prof);
        return;
      }
      if (prof.status === "new") LM.store.saveProfiles(state.profiles);

      fixUi();
      if (LM.celebrate) LM.celebrate.baseline();
      applyRoute();
      syncSection();
      state.ready = true;
      renderAll();
    } catch (err) {
      showFatal(err);
    }
  }

  function bindStaticEvents() {
    LM.profiles.bindEvents();
    window.addEventListener("hashchange", onRoute);
    // Sidebar as a drawer on phones
    document.getElementById("menu-btn").addEventListener("click", function () { setNavOpen(!document.body.classList.contains("nav-open")); });
    document.getElementById("nav-overlay").addEventListener("click", function () { setNavOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open") && !document.querySelector("dialog[open]")) {
        setNavOpen(false);
        document.getElementById("menu-btn").focus();
      }
    });
  }

  /** Keeps the selected level valid. */
  function fixUi() {
    if (LM.LEVEL_IDS.indexOf(state.ui.levelId) === -1) state.ui.levelId = LM.LEVEL_IDS[0];
  }

  // =====================================================================
  // PROGRESS FROM THE SYLLABUS
  // =====================================================================

  /** "I know this" of a level: ticked topics / all topics of the level. */
  function getLevelStats(levelId) { return LM.syllabus.stats(state.progress, levelId); }

  /** Ticked topics of a profile (available levels only). */
  function countDone(progress) { return LM.syllabus.countDone(progress); }

  // =====================================================================
  // NAVIGATION
  // =====================================================================

  /** Address of a level page, e.g. "#/a1". */
  function levelHash(levelId) {
    return "#/" + String(levelId).toLowerCase();
  }

  /** Go to a level page (sidebar). */
  function selectLevel(levelId) {
    state.ui.levelId = levelId;
    saveUI();
    state.listScroll = 0;
    if (location.hash === levelHash(levelId)) renderAll({ resetScroll: true });
    else location.hash = levelHash(levelId);
  }

  // =====================================================================
  // ROUTES (spec 02 §6; no legacy redirects)
  //   "" or "#/"            home                 "#/a1" … "#/c2"          level page
  //   "#/a1/<category>-<slug>" topic page        "#/a1/test", "#/a1/cheatsheet"
  //   every other route belongs to one module's parseRoute (table below); anything else is "Page not found"
  // =====================================================================

  /** [view name, module name on LM] — the first module whose parseRoute(hash) returns a route wins. */
  const VIEWS = [
    ["placement", "placement"], ["today", "today"], ["review", "review"], ["mistakes", "mistakes"],
    ["practice", "exercises"], ["lab", "lab"], ["stats", "statsPage"], ["notes", "notes"], ["cards", "cards"],
    ["trail", "trail"], ["writing", "writing"], ["exam", "exams"]
  ];

  /** Reads the address and sets state.view, state.route, state.toolRoute and the selected level. */
  function applyRoute() {
    const hash = location.hash || "";
    state.route = null;
    state.toolRoute = null;

    if (!hash || hash === "#" || hash === "#/") { state.view = "home"; return; }
    for (let i = 0; i < VIEWS.length; i++) {
      const mod = LM[VIEWS[i][1]];
      const r = mod && mod.parseRoute ? mod.parseRoute(hash) : null;
      if (r) {
        state.view = VIEWS[i][0];
        state.toolRoute = r;
        if (r.kind === "final" && r.id) state.ui.levelId = r.id;
        return;
      }
    }
    const level = /^#\/([abc][12])\/?$/.exec(hash);
    if (level) {
      state.view = "level";
      state.ui.levelId = level[1].toUpperCase();
      return;
    }
    const page = LM.handbook.parseRoute(hash);
    if (page) {
      state.view = "page";
      state.route = page;
      state.ui.levelId = page.level;
      return;
    }
    state.view = "notfound";
  }

  /** Visual scope of a section: html[data-section="<exam id>"] inside an exam (tokens in css/style.css). */
  function syncSection() {
    document.documentElement.setAttribute("data-section", state.view === "exam" ? state.toolRoute.examId : "app");
  }

  /** Reaction to an address change (links, Back, logo, browser back button). */
  function onRoute() {
    if (!state.ready) return;
    const previous = state.view;
    const previousHash = state.lastHash;
    if (previous === "level") state.listScroll = U.getScroll();
    setNavOpen(false);
    if (LM.sidebar) LM.sidebar.afterNavigate();
    if (LM.motion) LM.motion.cleanup(); // animations of the previous page (GSAP)
    applyRoute();
    syncSection();
    document.documentElement.classList.remove("focus-mode"); // the trainer's focus mode ends on page change
    state.lastHash = location.hash;
    if (previousHash !== location.hash) {
      if (state.view === "mistakes" && LM.mistakes.onEnter) LM.mistakes.onEnter(state.toolRoute);
      if (state.view === "placement") LM.placement.onEnter();
      if (state.view === "practice") LM.exercises.onEnter(state.toolRoute);
    }
    saveUI();
    if (state.view !== "page") document.title = LM.APP.appTitle;
    if (state.view === "level" && previous === "page") {
      renderAll({ scrollTop: state.listScroll }); // back from a topic page: the same place in the list
    } else {
      renderAll({ resetScroll: true });
    }
    playViewEnter();
  }

  /** Short enter animation of the content after a page change (CSS: .view-enter). */
  function playViewEnter() {
    const view = document.getElementById("view");
    if (!view) return;
    view.classList.remove("view-enter");
    void view.offsetWidth; // restarts the animation
    view.classList.add("view-enter");
  }

  /** Opens / closes the sidebar as a drawer (narrow screens only). */
  function setNavOpen(open) {
    document.body.classList.toggle("nav-open", open);
    document.getElementById("nav-overlay").hidden = !open;
    document.getElementById("menu-btn").setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const first = document.querySelector("#sidebar a, #sidebar button");
      if (first) first.focus();
    }
  }

  /** Back from a topic page to its level page (with the list's scroll position). */
  function goToList(target) {
    if (target.levelId) state.ui.levelId = target.levelId;
    saveUI();
    const hash = levelHash(state.ui.levelId);
    if (location.hash === hash) onRoute();
    else location.hash = hash;
  }

  // =====================================================================
  // DRAWING
  // =====================================================================

  function renderAll(opts) {
    LM.profiles.render();
    LM.render.renderSidebar();
    LM.render.renderMain(opts);
  }

  /** Refreshes the learning badges in the sidebar (e.g. the number of reviews due today). */
  function refreshLearning() {
    LM.render.renderToolsNav();
  }

  /** Refreshes counters and progress bars without redrawing the content (focus stays). */
  function refreshProgress() {
    LM.render.renderSidebar();
    LM.render.updateEssentialsProgress();
  }

  // =====================================================================
  // SAVING
  // =====================================================================

  /** Saves the profiles (with the progress of each). */
  function saveProgressNow() {
    if (!state.storageOk) return;
    const res = LM.store.saveProfiles(state.profiles);
    if (!res.ok) reportSaveError("Progress was not saved. " + res.error);
  }

  function saveUI() {
    if (state.storageOk) LM.store.saveUI(state.ui);
  }

  /** Save error: a banner (once for the same message). */
  let lastSaveError = "";
  function reportSaveError(text) {
    if (text === lastSaveError) return;
    lastSaveError = text;
    addBanner("error", text + " Export your data so you do not lose your changes.");
  }

  // =====================================================================
  // LEARNER PROGRESS
  // =====================================================================

  /** "I know this" for one topic of the active profile. */
  function setProgress(topicId, checked) {
    if (!getActiveProfile()) return; // without a profile there is nowhere to save
    if (checked) state.progress[topicId] = true;
    else delete state.progress[topicId];
    saveProgressNow();
    LM.markActivity(); // a tick counts as a learning day
    if (LM.celebrate) LM.celebrate.check(); // milestones of ticks and levels
    refreshProgress();
  }

  // =====================================================================
  // PROFILES
  // =====================================================================

  /**
   * Replaces all profiles (import / reset / corrupt-data screen). parsed — every section of an imported backup
   * (LM.profileData.parseAll), written through the key registry; null after a reset (the stores are already empty).
   */
  function replaceProfiles(profilesData, parsed) {
    state.profiles = profilesData;
    if (parsed) LM.profileData.applyAll(parsed, profilesData.profiles.map(function (p) { return p.id; }));
    profilesChanged();
  }

  /** The active profile, or null when there is none. */
  function getActiveProfile() {
    const p = state.profiles;
    if (!p || !p.profiles.length) return null;
    return p.profiles.find(function (x) { return x.id === p.activeId; }) || p.profiles[0];
  }

  function hasProfiles() {
    return !!getActiveProfile();
  }

  /**
   * Guest mode: runs a saving action. With a profile at once; without one it shows "Create a profile…" and runs
   * the action after the profile is created (the page stays the same). reason — a note in the dialog.
   */
  function withProfile(reason, fn) {
    if (getActiveProfile()) { fn(); return; }
    LM.profiles.requireProfile({ reason: reason }).then(function (ok) { if (ok) fn(); });
  }

  /** Points state.progress at the active profile's progress (no profile: empty). */
  function syncProgress() {
    const active = getActiveProfile();
    state.profiles.activeId = active ? active.id : null;
    state.progress = active ? active.progress : {};
  }

  /** Adds a profile with this name and makes it active. */
  function addProfile(name) {
    const profile = { id: U.uid("p"), name: String(name).trim(), progress: {} };
    state.profiles.profiles.push(profile);
    state.profiles.activeId = profile.id;
    profilesChanged();
    return profile;
  }

  function selectProfile(profileId) {
    state.profiles.activeId = profileId;
    profilesChanged();
  }

  /** After every profile change: recount, save, redraw. */
  function profilesChanged() {
    syncProgress();
    saveProgressNow();
    if (LM.celebrate) LM.celebrate.baseline();
    if (state.ready) renderAll();
  }

  // =====================================================================
  // MESSAGES AND ERROR SCREENS
  // =====================================================================

  /** Banner above the content. type: "info" | "warning" | "error". */
  function addBanner(type, text, action) {
    const banner = el("div", { class: "banner is-" + type, role: type === "error" ? "alert" : "status" }, [
      el("span", { class: "banner-text", text: text }),
      action ? el("button", { type: "button", class: "btn btn-small btn-secondary", onclick: action.onClick }, action.label) : null,
      el("button", {
        type: "button",
        class: "icon-btn",
        "aria-label": "Close message",
        "data-tooltip": "Close message",
        "data-tooltip-align": "end",
        onclick: function () { banner.remove(); }
      }, LM.icon("x", { size: 18 }))
    ]);
    document.getElementById("banners").appendChild(banner);
  }

  /** Screen shown when the stored profiles (plm.profiles) are broken, instead of a blank page or silent data loss. */
  function showCorruptScreen(loaded) {
    document.getElementById("level-list").replaceChildren();
    document.getElementById("sidebar-category-name").textContent = "";

    const view = document.getElementById("view");
    view.replaceChildren(el("div", { class: "error-screen" }, [
      el("h1", { text: "Your saved profiles could not be read" }),
      el("p", { text: "The profile data in this browser is damaged or has an unknown format. Nothing has been deleted yet." }),
      el("p", { text: "Best: import your latest backup (" + LM.APP.exportName + "-….json). You can also download the damaged data to a file, or start again with no profiles." }),
      el("div", { class: "error-details", text: "Details: " + loaded.error }),
      el("div", { class: "error-actions" }, [
        el("button", {
          type: "button",
          class: "btn btn-primary",
          onclick: function () { LM.dataMenu.importAll(); }
        }, "Import a backup…"),
        el("button", {
          type: "button",
          class: "btn btn-secondary",
          onclick: function () {
            const blob = new Blob([loaded.raw], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = el("a", { href: url, download: LM.APP.exportName + "-damaged-" + U.dateStamp() + ".txt" });
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
          }
        }, "Download the damaged data"),
        el("button", {
          type: "button",
          class: "btn btn-danger",
          onclick: function () {
            LM.dialogs.confirm({
              title: "Start again with no profiles?",
              message: "The damaged profile list will be replaced by an empty one. Download it first if you may need it. This cannot be undone.",
              confirmLabel: "Start again"
            }).then(function (ok) {
              if (!ok) return;
              replaceProfiles(LM.createEmptyProfiles(), null);
              location.reload();
            });
          }
        }, "Start again")
      ])
    ]));
  }

  /** Last resort on an unexpected error. */
  function showFatal(err) {
    console.error(err);
    const view = document.getElementById("view");
    if (!view) return;
    view.replaceChildren(el("div", { class: "error-screen" }, [
      el("h1", { text: "Something went wrong" }),
      el("p", { text: "The app hit an unexpected error. Try reloading the page. If it keeps happening, import a backup from the Data menu." }),
      el("div", { class: "error-details", text: String(err && err.stack || err) }),
      el("div", { class: "error-actions" }, [
        el("button", { type: "button", class: "btn btn-primary", onclick: function () { location.reload(); } }, "Reload the page"),
        el("button", { type: "button", class: "btn btn-secondary", onclick: function () { LM.dataMenu.importAll(); } }, "Import data…")
      ])
    ]));
  }

  LM.app = {
    init: init,
    getLevelStats: getLevelStats,
    countDone: countDone,
    selectLevel: selectLevel,
    levelHash: levelHash,
    goToList: goToList,
    refreshProgress: refreshProgress,
    refreshLearning: refreshLearning,
    reportSaveError: reportSaveError,
    saveProgressNow: saveProgressNow,
    saveUI: saveUI,
    setProgress: setProgress,
    replaceProfiles: replaceProfiles,
    getActiveProfile: getActiveProfile,
    hasProfiles: hasProfiles,
    withProfile: withProfile,
    renderAll: renderAll,
    addProfile: addProfile,
    selectProfile: selectProfile,
    profilesChanged: profilesChanged
  };

  // Start once the page has loaded
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window.LM);
