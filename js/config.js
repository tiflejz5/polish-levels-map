/*
 * config.js — LM.APP: the values that make this engine "the Polish app" (spec 02 §3).
 *
 * Language-neutral files read LM.APP and LM.lang; they never contain Polish words,
 * letters or locale codes. This file and js/lang.js are the only code files that may.
 * Loaded first (before js/utils.js).
 */
window.LM = window.LM || {};

// Version stamp: written by tools/build.js from package.json "lmVersion" (never by hand); LM.loadModule adds it as ?v=
LM.VERSION = 1;

LM.APP = {
  id: "pl",
  language: "Polish", nativeName: "polski",
  appTitle: "Polish Levels Map", tagline: "Your map of Polish, A1–C2",
  targetLang: "pl",
  storagePrefix: "plm.",
  exportName: "polish-levels-map",
  speech: { voices: ["pl-PL", "pl"], rate: 0.9 },
  chars: "ą ć ę ł ń ó ś ź ż".split(" "),
  mistakesHeading: "Common mistakes for English speakers",
  lab: { title: "Case Lab" },
  reportUrl: "https://github.com/tiflejz5/polish-levels-map/issues/new?labels=content&title=",
  reportMail: ""
};
