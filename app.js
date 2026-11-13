/* Shared behavior for the try-on starter.
   Photo and product link stay in sessionStorage for this tab.
   Measurements stay in localStorage on this device.
   This file never sends anything over the network. */
(function () {
  "use strict";

  var PHOTO_KEY = "tryon-photo";
  var LINK_KEY = "tryon-ad-link";
  var MEASURE_KEY = "tryon-measurements";
  var CM_PER_IN = 2.54;
  var LB_PER_KG = 2.2046226218;
  var FIELDS = [
    { id: "height", key: "heightCm", kind: "length" },
    { id: "weight", key: "weightKg", kind: "weight" },
    { id: "chest", key: "chestCm", kind: "length" },
    { id: "waist", key: "waistCm", kind: "length" },
    { id: "hips", key: "hipsCm", kind: "length" },
    { id: "inseam", key: "inseamCm", kind: "length" }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function storageGet(store, key) {
    try {
      return store.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function storageSet(store, key, value) {
    try {
      store.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function storageRemove(store, key) {
    try {
      store.removeItem(key);
    } catch (err) {
      /* Storage can be blocked in private browsing. */
    }
  }

  function setMessage(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove("is-error", "is-ok");
    if (kind === "error") el.classList.add("is-error");
    if (kind === "ok") el.classList.add("is-ok");
  }

  function isHttpUrl(value) {
    try {
      var url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return false;
      return Boolean(url.hostname);
    } catch (err) {
      return false;
    }
  }

  function readPhoto() {
    var value = storageGet(sessionStorage, PHOTO_KEY);
    if (value && value.indexOf("data:image/") === 0) return value;
    return "";
  }

  function readLink() {
    var value = storageGet(sessionStorage, LINK_KEY) || "";
    return isHttpUrl(value) ? value : "";
  }

  function markDoneSteps() {
    var photoItem = document.querySelector('.steps [data-step="photo"]');
    var linkItem = document.querySelector('.steps [data-step="link"]');
    if (photoItem && !photoItem.classList.contains("is-current") && readPhoto()) {
      photoItem.classList.add("is-done");
    }
    if (linkItem && !linkItem.classList.contains("is-current") && readLink()) {
      linkItem.classList.add("is-done");
    }
  }

  function shrinkToJpeg(image) {
    var maxEdge = 1200;
    var longest = Math.max(image.width, image.height);
    if (!longest) return "";
    var scale = Math.min(1, maxEdge / longest);
    var width = Math.max(1, Math.round(image.width * scale));
    var height = Math.max(1, Math.round(image.height * scale));
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    try {
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (err) {
      return "";
    }
  }

  function initPhoto() {
    var input = $("photo-input");
    var frame = $("photo-frame");
    var img = $("photo-preview");
    var message = $("photo-message");
    if (!input || !frame || !img) return;

    var existing = readPhoto();
    if (existing) {
      img.src = existing;
      frame.hidden = false;
      setMessage(message, "Preview ready. It stays in this tab and is not uploaded.", "ok");
    } else {
      setMessage(message, "Choose a photo. It stays in this tab and is not uploaded.", "");
    }

    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.type && file.type.indexOf("image/") !== 0) {
        input.value = "";
        setMessage(message, "Choose an image file.", "error");
        return;
      }
      setMessage(message, "Preparing preview…", "");
      var reader = new FileReader();
      reader.onerror = function () {
        input.value = "";
        setMessage(message, "That file could not be read. Try a different photo.", "error");
      };
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var dataUrl = shrinkToJpeg(image);
          if (!dataUrl) {
            input.value = "";
            setMessage(message, "That photo could not be previewed. Try a JPG or PNG.", "error");
            return;
          }
          img.src = dataUrl;
          frame.hidden = false;
          if (!storageSet(sessionStorage, PHOTO_KEY, dataUrl)) {
            setMessage(message, "This photo is too large to keep in the browser. Try a smaller one.", "error");
            return;
          }
          setMessage(message, "Preview ready. It stays in this tab and is not uploaded.", "ok");
          markDoneSteps();
        };
        image.onerror = function () {
          input.value = "";
          setMessage(message, "That photo could not be previewed. Try a JPG or PNG.", "error");
        };
        image.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function initAdLink() {
    var form = $("ad-form");
    var input = $("ad-url");
    var message = $("ad-message");
    if (!form || !input) return;

    var existing = readLink();
    if (existing) {
      input.value = existing;
      setMessage(message, "Link saved for this tab.", "ok");
    }

    function remember(value) {
      if (!value) {
        storageRemove(sessionStorage, LINK_KEY);
        input.setAttribute("aria-invalid", "false");
        setMessage(message, "", "");
        return false;
      }
      if (!isHttpUrl(value)) {
        storageRemove(sessionStorage, LINK_KEY);
        input.setAttribute("aria-invalid", "true");
        setMessage(message, "Enter a full link starting with http:// or https://.", "error");
        return false;
      }
      input.setAttribute("aria-invalid", "false");
      if (!storageSet(sessionStorage, LINK_KEY, value)) {
        setMessage(message, "This browser blocked local storage, so the link cannot be kept.", "error");
        return false;
      }
      setMessage(message, "Link saved for this tab.", "ok");
      markDoneSteps();
      return true;
    }

    input.addEventListener("input", function () {
      remember(input.value.trim());
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = input.value.trim();
      if (!value) {
        input.setAttribute("aria-invalid", "true");
        setMessage(message, "Enter a product link to continue.", "error");
        input.focus();
        return;
      }
      if (!remember(value)) {
        input.focus();
        return;
      }
      window.location.href = "try-on.html";
    });
  }

  function initTryOn() {
    var photo = readPhoto();
    var frame = $("tryon-photo-frame");
    var missing = $("tryon-photo-missing");
    var image = $("tryon-photo");
    if (photo && frame && image) {
      image.src = photo;
      frame.hidden = false;
      if (missing) missing.hidden = true;
    }

    var link = readLink();
    var line = $("tryon-link");
    if (link && line) {
      line.textContent = "";
      var anchor = document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link;
      line.appendChild(anchor);
    }
  }

  function emptyMeasurements(units) {
    return {
      units: units === "imperial" ? "imperial" : "metric",
      heightCm: "",
      weightKg: "",
      chestCm: "",
      waistCm: "",
      hipsCm: "",
      inseamCm: ""
    };
  }

  function readMeasurements() {
    var raw = storageGet(localStorage, MEASURE_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      var clean = emptyMeasurements(data.units);
      FIELDS.forEach(function (field) {
        if (data[field.key] === null || data[field.key] === undefined || data[field.key] === "") return;
        var n = Number(data[field.key]);
        if (Number.isFinite(n) && n >= 0 && n <= 10000) clean[field.key] = n.toFixed(2);
      });
      return clean;
    } catch (err) {
      return null;
    }
  }

  function format1(n) {
    return (Math.round((n + Number.EPSILON) * 10) / 10).toString();
  }

  function fromDisplay(value, units, kind) {
    if (String(value).trim() === "") return "";
    var n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
    if (kind === "length") {
      return (units === "imperial" ? n * CM_PER_IN : n).toFixed(2);
    }
    return (units === "imperial" ? n / LB_PER_KG : n).toFixed(2);
  }

  function toDisplay(stored, units, kind) {
    if (!stored) return "";
    var n = Number(stored);
    if (!Number.isFinite(n)) return "";
    var shown = kind === "length"
      ? (units === "imperial" ? n / CM_PER_IN : n)
      : (units === "imperial" ? n * LB_PER_KG : n);
    return format1(shown);
  }

  function updateUnitLabels(units) {
    var lengthUnit = units === "imperial" ? "in" : "cm";
    var weightUnit = units === "imperial" ? "lb" : "kg";
    document.querySelectorAll("[data-unit='length']").forEach(function (el) {
      el.textContent = "(" + lengthUnit + ")";
    });
    document.querySelectorAll("[data-unit='weight']").forEach(function (el) {
      el.textContent = "(" + weightUnit + ")";
    });
  }

  function initMeasurements() {
    var form = $("measurements-form");
    var message = $("measure-message");
    if (!form) return;

    var state = readMeasurements() || emptyMeasurements("metric");

    function render() {
      FIELDS.forEach(function (field) {
        var input = $(field.id);
        if (input) input.value = toDisplay(state[field.key], state.units, field.kind);
      });
      form.querySelectorAll('input[name="units"]').forEach(function (radio) {
        radio.checked = radio.value === state.units;
      });
      updateUnitLabels(state.units);
    }

    function applyAll() {
      var next = emptyMeasurements(state.units);
      for (var i = 0; i < FIELDS.length; i += 1) {
        var field = FIELDS[i];
        var input = $(field.id);
        if (!input) return null;
        if (input.validity && input.validity.badInput) return null;
        var converted = fromDisplay(input.value, state.units, field.kind);
        if (converted === null) return null;
        next[field.key] = converted;
      }
      return next;
    }

    function persist(next) {
      if (!storageSet(localStorage, MEASURE_KEY, JSON.stringify(next))) {
        setMessage(message, "This browser blocked local storage, so measurements were not saved.", "error");
        return false;
      }
      state = next;
      setMessage(message, "Saved in this browser.", "ok");
      return true;
    }

    render();

    form.addEventListener("input", function (event) {
      var target = event.target;
      if (!target || target.name === "units") return;
      var next = applyAll();
      if (!next) {
        setMessage(message, "Enter numbers only (zero or greater).", "error");
        return;
      }
      persist(next);
    });

    form.addEventListener("change", function (event) {
      var target = event.target;
      if (!target || target.name !== "units") return;
      if (target.value === state.units) return;
      state.units = target.value === "imperial" ? "imperial" : "metric";
      if (!storageSet(localStorage, MEASURE_KEY, JSON.stringify(state))) {
        setMessage(message, "This browser blocked local storage, so measurements were not saved.", "error");
        return;
      }
      render();
      setMessage(message, "Saved in this browser.", "ok");
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var next = applyAll();
      if (!next) {
        setMessage(message, "Enter numbers only (zero or greater).", "error");
        return;
      }
      persist(next);
    });
  }

  function initSize() {
    var status = $("measure-status");
    if (!status) return;
    var data = readMeasurements();
    if (!data) {
      status.textContent = "No measurements saved in this browser yet.";
      return;
    }
    var names = {
      heightCm: "height",
      weightKg: "weight",
      chestCm: "chest/bust",
      waistCm: "waist",
      hipsCm: "hips",
      inseamCm: "inseam"
    };
    var filled = Object.keys(names).filter(function (key) {
      return data[key];
    });
    if (!filled.length) {
      status.textContent = "No measurements saved in this browser yet.";
      return;
    }
    var units = data.units === "imperial" ? "imperial (in, lb)" : "metric (cm, kg)";
    status.textContent = "Measurements saved on this device (" + units + "): " +
      filled.map(function (key) { return names[key]; }).join(", ") +
      ". Size: -- is still a placeholder.";
  }

  markDoneSteps();

  var page = document.body.getAttribute("data-page");
  if (page === "photo") initPhoto();
  else if (page === "ad-link") initAdLink();
  else if (page === "try-on") initTryOn();
  else if (page === "measurements") initMeasurements();
  else if (page === "size") initSize();
})();
