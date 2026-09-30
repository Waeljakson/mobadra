(() => {
  "use strict";

  const config = window.MOBADRA_CONFIG || {};
  const DATA_API_URL = String(config.dataApiUrl || "").replace(/\/$/, "");
  const AUTH_BASE_URL = String(config.authBaseUrl || "").replace(/\/$/, "");
  const HAS_BACKEND = Boolean(DATA_API_URL && AUTH_BASE_URL);
  const MAX_EVIDENCE = Number(config.maxEvidenceImages || 6);
  const MAX_WIDTH = Number(config.maxImageWidth || 1400);
  const JPEG_QUALITY = Number(config.jpegQuality || 0.82);
  const SESSION_KEY = "smartEdu:session";

  const $ = (id) => document.getElementById(id);

  const els = {
    toast: $("toast"),

    authScreen: $("authScreen"),
    setupPanel: $("setupPanel"),
    setupForm: $("setupForm"),
    setupDisplayName: $("setupDisplayName"),
    setupUsername: $("setupUsername"),
    setupPassword: $("setupPassword"),
    loginForm: $("loginForm"),
    loginUsername: $("loginUsername"),
    loginPassword: $("loginPassword"),
    authMessage: $("authMessage"),

    platformShell: $("platformShell"),
    dashboardScreen: $("dashboardScreen"),
    openEventsModule: $("openEventsModule"),
    openNewslettersModule: $("openNewslettersModule"),
    currentUserBadge: $("currentUserBadge"),
    homeBtn: $("homeBtn"),
    logoutBtn: $("logoutBtn"),

    app: $("app"),
    form: $("eventForm"),
    editorPanel: $("editorPanel"),
    newEventBtn: $("newEventBtn"),
    exportPngTopBtn: $("exportPngTopBtn"),
    exportPdfTopBtn: $("exportPdfTopBtn"),
    exportPngBtn: $("exportPngBtn"),
    exportPdfBtn: $("exportPdfBtn"),
    publicPngBtn: $("publicPngBtn"),
    publicPdfBtn: $("publicPdfBtn"),
    publicActions: $("publicActions"),
    achievementSheet: $("achievementSheet"),
    designTheme: $("designTheme"),
    designOptions: $("designOptions"),
    shareBtn: $("shareBtn"),
    publishBtn: $("publishBtn"),
    saveState: $("saveState"),
    backendNotice: $("backendNotice"),
    logoInput: $("logoInput"),
    evidenceInput: $("evidenceInput"),
    logoPreview: $("logoPreview"),
    evidenceManager: $("evidenceManager"),
    sharePanel: $("sharePanel"),
    shareUrl: $("shareUrl"),
    copyLinkBtn: $("copyLinkBtn"),
    shareQr: $("shareQr"),
    sheetQr: $("sheetQr"),
    sheetLogo: $("sheetLogo"),
    sheetOrganization: $("sheetOrganization"),
    sheetEventName: $("sheetEventName"),
    sheetDate: $("sheetDate"),
    sheetLocation: $("sheetLocation"),
    sheetField: $("sheetField"),
    sheetAudience: $("sheetAudience"),
    sheetParticipants: $("sheetParticipants"),
    sheetGoal: $("sheetGoal"),
    sheetSummary: $("sheetSummary"),
    sheetEvidence: $("sheetEvidence"),
    sheetAssistants: $("sheetAssistants"),
    sheetPrincipal: $("sheetPrincipal"),
    heroEvidenceFrame: $("heroEvidenceFrame"),

    newsletterApp: $("newsletterApp"),
    newsletterForm: $("newsletterForm"),
    newsletterSaveState: $("newsletterSaveState"),
    newsletterTitle: $("newsletterTitle"),
    newsletterPreparedBy: $("newsletterPreparedBy"),
    newsletterDate: $("newsletterDate"),
    newsletterImageInput: $("newsletterImageInput"),
    newsletterImagePreview: $("newsletterImagePreview"),
    saveNewsletterBtn: $("saveNewsletterBtn"),
    newsletterSheet: $("newsletterSheet"),
    newsletterSheetImage: $("newsletterSheetImage"),
    newsletterSheetTitle: $("newsletterSheetTitle"),
    newsletterSheetPreparedBy: $("newsletterSheetPreparedBy"),
    newsletterSheetDate: $("newsletterSheetDate"),
    newsletterPngBtn: $("newsletterPngBtn"),
    newsletterPdfBtn: $("newsletterPdfBtn"),
    newsletterPngTopBtn: $("newsletterPngTopBtn"),
    newsletterPdfTopBtn: $("newsletterPdfTopBtn")
  };

  let eventState = {
    id: null,
    slug: null,
    logoDataUrl: "",
    evidence: [],
    publishedUrl: ""
  };

  let newsletterState = {
    id: null,
    slug: null,
    imageDataUrl: ""
  };

  let platformSession = {
    token: "",
    user: null
  };

  let anonymousJwt = "";
  let anonymousJwtAt = 0;

  const eventFields = [
    "eventName", "organizationName", "eventDate", "eventLocation",
    "participantCount", "eventField", "targetAudience", "eventGoal",
    "summary", "assistants", "schoolPrincipal", "designTheme"
  ];

  const DESIGN_THEMES = ["blue", "gold", "green", "burgundy"];

  const toast = (message, type = "ok") => {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.toggle("error", type === "error");
    els.toast.classList.add("show");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => els.toast.classList.remove("show"), 2800);
  };

  const clean = (value) => String(value ?? "").trim();

  const formatArabicDate = (dateValue) => {
    if (!dateValue) return "—";
    try {
      return new Intl.DateTimeFormat("ar-BH", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }).format(new Date(dateValue + "T12:00:00"));
    } catch {
      return dateValue;
    }
  };

  const setHidden = (element, hidden) => {
    if (!element) return;
    element.classList.toggle("hidden", hidden);
  };

  const getAnonymousJwt = async (forceRefresh = false) => {
    if (!HAS_BACKEND) throw new Error("BACKEND_NOT_CONFIGURED");

    const fresh = anonymousJwt && (Date.now() - anonymousJwtAt) < 8 * 60 * 1000;
    if (!forceRefresh && fresh) return anonymousJwt;

    const response = await fetch(AUTH_BASE_URL + "/token/anonymous", {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "omit"
    });

    const raw = await response.text();
    let payload = null;
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = raw; }
    }

    if (!response.ok) {
      const error = new Error(
        payload?.message ||
        payload?.error ||
        (typeof payload === "string" ? payload : null) ||
        ("AUTH HTTP " + response.status)
      );
      error.status = response.status;
      throw error;
    }

    const token =
      payload?.token ||
      payload?.jwt ||
      payload?.accessToken ||
      payload?.access_token ||
      payload?.data?.token ||
      payload?.data?.jwt ||
      payload?.data?.accessToken ||
      payload?.data?.access_token;

    if (!token || typeof token !== "string") {
      throw new Error("تعذر الحصول على رمز الوصول العام من Neon");
    }

    anonymousJwt = token;
    anonymousJwtAt = Date.now();
    return anonymousJwt;
  };

  const dataApiFetch = async (path, options = {}, canRetry = true) => {
    if (!HAS_BACKEND) throw new Error("BACKEND_NOT_CONFIGURED");

    const token = await getAnonymousJwt();
    const response = await fetch(DATA_API_URL + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Bearer " + token,
        ...(options.headers || {})
      }
    });

    if (response.status === 401 && canRetry) {
      anonymousJwt = "";
      anonymousJwtAt = 0;
      await getAnonymousJwt(true);
      return dataApiFetch(path, options, false);
    }

    const raw = await response.text();
    let payload = null;
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = raw; }
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.details ||
        payload?.hint ||
        (typeof payload === "string" ? payload : null) ||
        ("HTTP " + response.status);
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return payload;
  };

  const rpc = (name, body = {}) =>
    dataApiFetch("/rpc/" + name, {
      method: "POST",
      body: JSON.stringify(body)
    });

  const compressImage = (file, maxWidth = MAX_WIDTH, quality = JPEG_QUALITY) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("الملف ليس صورة صالحة"));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("تعذر معالجة الصورة"));
        img.onload = () => {
          const ratio = Math.min(1, maxWidth / img.width);
          const width = Math.max(1, Math.round(img.width * ratio));
          const height = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          const type = file.type === "image/png" && file.size < 450000
            ? "image/png"
            : "image/jpeg";
          resolve(canvas.toDataURL(type, type === "image/png" ? undefined : quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const waitForElementAssets = async (element) => {
    if (document.fonts?.ready) {
      try { await document.fonts.ready; } catch {}
    }

    try {
      if (document.fonts?.load) {
        await Promise.all([
          document.fonts.load('400 16px "Cairo"'),
          document.fonts.load('700 16px "Cairo"'),
          document.fonts.load('900 34px "Cairo"')
        ]);
      }
    } catch {}

    const images = Array.from(element?.querySelectorAll("img") || []);
    await Promise.all(images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }));
  };

  const nextFrame = () =>
    new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const captureElement = async (element) => {
    if (!window.html2canvas) throw new Error("أداة تصدير الصورة لم يتم تحميلها");
    if (!element) throw new Error("عنصر التصدير غير موجود");

    await waitForElementAssets(element);
    element.classList.add("export-capture");
    await nextFrame();

    try {
      const rect = element.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);

      return await window.html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0,
        width,
        height,
        windowWidth: Math.max(1200, width + 100),
        windowHeight: Math.max(900, height + 100),
        onclone: (clonedDocument) => {
          const cloned = clonedDocument.getElementById(element.id);
          if (!cloned) return;
          cloned.classList.add("export-capture");
          cloned.style.transform = "none";
          cloned.style.transformOrigin = "top right";
          cloned.style.width = width + "px";
          cloned.style.minHeight = "0";
          cloned.style.height = "auto";
          cloned.style.overflow = "hidden";
          cloned.style.boxSizing = "border-box";
          cloned.setAttribute("dir", "rtl");
          cloned.querySelectorAll("h1,h2,h3,p,strong,span").forEach((node) => {
            node.style.letterSpacing = "0";
          });
        }
      });
    } finally {
      element.classList.remove("export-capture");
    }
  };

  const downloadCanvasPng = (canvas, filename) => {
    const link = document.createElement("a");
    link.download = filename + ".png";
    link.href = canvas.toDataURL("image/png", 1);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadCanvasPdf = (canvas, filename) => {
    if (!window.jspdf?.jsPDF) throw new Error("أداة PDF لم يتم تحميلها");
    const imageData = canvas.toDataURL("image/png", 1);
    const { jsPDF } = window.jspdf;
    const ratio = canvas.width / canvas.height;
    const pageWidth = 210;
    const pageHeight = pageWidth / ratio;

    const pdf = new jsPDF({
      orientation: pageHeight > pageWidth ? "portrait" : "landscape",
      unit: "mm",
      format: [pageWidth, pageHeight],
      compress: true
    });

    pdf.setFillColor(255,255,255);
    pdf.rect(0,0,pageWidth,pageHeight,"F");
    pdf.addImage(imageData,"PNG",0,0,pageWidth,pageHeight,undefined,"FAST");
    pdf.save(filename + ".pdf");
  };

  /* =============================
     Platform authentication
     ============================= */

  const saveSession = (token, user) => {
    platformSession = { token, user };
    localStorage.setItem(SESSION_KEY, JSON.stringify(platformSession));
  };

  const clearSession = () => {
    platformSession = { token: "", user: null };
    localStorage.removeItem(SESSION_KEY);
  };

  const readStoredSession = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      if (saved?.token) platformSession = saved;
    } catch {}
  };

  const showAuthMessage = (message = "", error = false) => {
    if (!els.authMessage) return;
    els.authMessage.textContent = message;
    els.authMessage.style.color = error ? "#a33b3b" : "#2e775f";
  };

  const showLoginScreen = async () => {
    setHidden(els.platformShell, true);
    setHidden(els.authScreen, false);
    setHidden(els.setupPanel, true);
    setHidden(els.loginForm, true);
    showAuthMessage("جارٍ التحقق من إعداد المنصة...");

    try {
      const hasUsers = await rpc("smart_has_users");
      showAuthMessage("");

      if (!hasUsers) {
        setHidden(els.setupPanel, false);
        setHidden(els.loginForm, true);
      } else {
        setHidden(els.setupPanel, true);
        setHidden(els.loginForm, false);
      }
    } catch (error) {
      showAuthMessage("تعذر تحميل إعدادات الدخول: " + (error?.message || "خطأ غير معروف"), true);
    }
  };

  const setPlatformHeader = (moduleName = "") => {
    const loggedIn = Boolean(platformSession.user);
    setHidden(els.currentUserBadge, !loggedIn);
    setHidden(els.logoutBtn, !loggedIn);

    if (els.currentUserBadge && loggedIn) {
      els.currentUserBadge.textContent =
        platformSession.user.displayName ||
        platformSession.user.display_name ||
        platformSession.user.username ||
        "مستخدم";
    }

    const inEvents = moduleName === "events";
    const inNewsletters = moduleName === "newsletters";
    const inModule = inEvents || inNewsletters;

    setHidden(els.homeBtn, !inModule);
    setHidden(els.newEventBtn, !inEvents);
    setHidden(els.exportPngTopBtn, !inEvents);
    setHidden(els.exportPdfTopBtn, !inEvents);
    setHidden(els.newsletterPngTopBtn, !inNewsletters);
    setHidden(els.newsletterPdfTopBtn, !inNewsletters);
  };

  const showDashboard = () => {
    if (!platformSession.user) return showLoginScreen();

    setHidden(els.authScreen, true);
    setHidden(els.platformShell, false);
    setHidden(els.dashboardScreen, false);
    setHidden(els.app, true);
    setHidden(els.newsletterApp, true);
    setPlatformHeader("");
    document.title = "مبادرة التحول الذكي في التعليم";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showEventsModule = () => {
    if (!platformSession.user) return showLoginScreen();

    setHidden(els.dashboardScreen, true);
    setHidden(els.newsletterApp, true);
    setHidden(els.app, false);
    if (els.editorPanel) els.editorPanel.classList.remove("hidden");
    if (els.publicActions) els.publicActions.classList.add("hidden");
    if (els.app) els.app.style.gridTemplateColumns = "";
    setPlatformHeader("events");
    renderUploads();
    renderSheet();
    document.title = "إنجاز الفعاليات | مبادرة التحول الذكي";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showNewslettersModule = () => {
    if (!platformSession.user) return showLoginScreen();

    setHidden(els.dashboardScreen, true);
    setHidden(els.app, true);
    setHidden(els.newsletterApp, false);
    setPlatformHeader("newsletters");
    renderNewsletter();
    document.title = "النشرات | مبادرة التحول الذكي";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restorePlatformSession = async () => {
    readStoredSession();
    if (!platformSession.token) return false;

    try {
      const user = await rpc("smart_edu_session", { p_token: platformSession.token });
      if (!user) {
        clearSession();
        return false;
      }
      platformSession.user = user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(platformSession));
      return true;
    } catch {
      clearSession();
      return false;
    }
  };

  const login = async (username, password) => {
    const payload = await rpc("smart_edu_login", {
      p_username: clean(username),
      p_password: String(password || "")
    });

    if (!payload?.token || !payload?.user) throw new Error("تعذر إنشاء جلسة المستخدم");
    saveSession(payload.token, payload.user);
    if (els.loginPassword) els.loginPassword.value = "";
    showDashboard();
  };

  /* =============================
     Activity achievement module
     ============================= */

  const getEventData = () => {
    const data = {};
    eventFields.forEach((name) => {
      const input = $(name);
      data[name] = input ? clean(input.value) : "";
    });
    data.participantCount = data.participantCount ? Number(data.participantCount) : null;
    data.logoDataUrl = eventState.logoDataUrl;
    data.evidence = [...eventState.evidence];
    data.id = eventState.id;
    data.slug = eventState.slug;
    return data;
  };

  const applyDesignTheme = (theme) => {
    const selected = DESIGN_THEMES.includes(theme) ? theme : "blue";
    if (els.designTheme) els.designTheme.value = selected;

    if (els.achievementSheet) {
      DESIGN_THEMES.forEach((name) => els.achievementSheet.classList.remove("theme-" + name));
      els.achievementSheet.classList.add("theme-" + selected);
    }

    if (els.designOptions) {
      els.designOptions.querySelectorAll(".design-option").forEach((button) => {
        const active = button.dataset.theme === selected;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    return selected;
  };

  const renderUploads = () => {
    if (!els.logoPreview || !els.evidenceManager) return;

    if (eventState.logoDataUrl) {
      els.logoPreview.classList.remove("empty");
      els.logoPreview.innerHTML =
        '<img alt="شعار المؤسسة" src="' + eventState.logoDataUrl + '">';
    } else {
      els.logoPreview.classList.add("empty");
      els.logoPreview.textContent = "لم يتم رفع شعار";
    }

    if (!eventState.evidence.length) {
      els.evidenceManager.classList.add("empty");
      els.evidenceManager.textContent = "لا توجد صور مضافة";
    } else {
      els.evidenceManager.classList.remove("empty");
      els.evidenceManager.innerHTML = eventState.evidence.map((src, index) => (
        '<div class="evidence-thumb">' +
          '<img alt="شاهد ' + (index + 1) + '" src="' + src + '">' +
          '<button class="remove-evidence" type="button" data-index="' + index + '" aria-label="حذف الصورة">×</button>' +
        '</div>'
      )).join("");
    }
  };

  const renderSheet = () => {
    if (!els.achievementSheet) return;
    const data = getEventData();
    applyDesignTheme(data.designTheme || "blue");

    els.sheetOrganization.textContent = data.organizationName || "اسم المؤسسة / المدرسة";
    els.sheetEventName.textContent = data.eventName || "اسم الفعالية";
    els.sheetDate.textContent = "التاريخ: " + formatArabicDate(data.eventDate);
    els.sheetLocation.textContent = "المكان: " + (data.eventLocation || "—");
    els.sheetField.textContent = data.eventField || "—";
    els.sheetAudience.textContent = data.targetAudience || "—";
    els.sheetParticipants.textContent =
      data.participantCount === null || Number.isNaN(data.participantCount)
        ? "—"
        : new Intl.NumberFormat("ar").format(data.participantCount);
    els.sheetGoal.textContent = data.eventGoal || "يظهر هنا هدف الفعالية بعد إدخاله في النموذج.";
    els.sheetSummary.textContent = data.summary || "يظهر هنا وصف مختصر لما تم تنفيذه وأبرز مخرجات الفعالية.";
    els.sheetAssistants.textContent = data.assistants || "—";
    els.sheetPrincipal.textContent = data.schoolPrincipal || "—";

    if (eventState.logoDataUrl) {
      els.sheetLogo.innerHTML =
        '<img alt="شعار المؤسسة" src="' + eventState.logoDataUrl + '">';
    } else {
      els.sheetLogo.innerHTML = "<span>الشعار</span>";
    }

    if (eventState.evidence.length) {
      els.heroEvidenceFrame.innerHTML =
        '<img class="hero-evidence-image" alt="صورة مختارة من شواهد الفعالية" src="' +
        eventState.evidence[0] +
        '">';
    } else {
      els.heroEvidenceFrame.innerHTML =
        '<div class="hero-evidence-placeholder"><span>صورة من الشواهد</span></div>';
    }

    const count = eventState.evidence.length;
    els.sheetEvidence.className = "sheet-evidence";

    if (!count) {
      els.sheetEvidence.classList.add("empty");
      els.sheetEvidence.innerHTML =
        '<div class="evidence-placeholder">أضف صور الشواهد لتظهر هنا</div>';
    } else {
      els.sheetEvidence.classList.add("count-" + Math.min(count, 6));
      els.sheetEvidence.innerHTML = eventState.evidence
        .map((src, i) =>
          '<figure class="evidence-frame">' +
            '<div class="evidence-image-box">' +
              '<img alt="شاهد الفعالية ' + (i + 1) + '" src="' + src + '">' +
            '</div>' +
          '</figure>'
        )
        .join("");
    }

    if (eventState.publishedUrl) drawQrs(eventState.publishedUrl);
  };

  const populateEventForm = (data = {}) => {
    eventFields.forEach((name) => {
      const input = $(name);
      if (input) input.value = data[name] ?? "";
    });

    eventState.id = data.id || null;
    eventState.slug = data.slug || null;
    eventState.logoDataUrl = data.logoDataUrl || data.logo_data_url || "";
    eventState.evidence = Array.isArray(data.evidence)
      ? data.evidence
      : Array.isArray(data.evidence_images)
        ? data.evidence_images
        : [];

    renderUploads();
    renderSheet();
  };

  const normalizeRemoteEvent = (raw = {}) => ({
    id: raw.id,
    slug: raw.slug,
    eventName: raw.eventName ?? raw.event_name ?? "",
    organizationName: raw.organizationName ?? raw.organization_name ?? "",
    eventDate: raw.eventDate ?? raw.event_date ?? "",
    eventLocation: raw.eventLocation ?? raw.event_location ?? "",
    participantCount: raw.participantCount ?? raw.participant_count ?? "",
    eventField: raw.eventField ?? raw.event_field ?? "",
    targetAudience: raw.targetAudience ?? raw.target_audience ?? "",
    eventGoal: raw.eventGoal ?? raw.event_goal ?? "",
    summary: raw.summary ?? "",
    designTheme: raw.designTheme ?? raw.design_theme ?? "blue",
    assistants: raw.assistants ?? "",
    schoolPrincipal: raw.schoolPrincipal ?? raw.school_principal ?? "",
    logoDataUrl: raw.logoDataUrl ?? raw.logo_data_url ?? "",
    evidence: raw.evidence ?? raw.evidence_images ?? []
  });

  const slugify = () => {
    const bytes = new Uint8Array(4);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      return "event-" +
        Date.now().toString(36) + "-" +
        Array.from(bytes).map(v => v.toString(16).padStart(2,"0")).join("");
    }
    return "event-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10);
  };

  const makePublicUrl = (slug) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("event", slug);
    return url.toString();
  };

  const drawQr = (container, url, size) => {
    if (!container) return;
    container.innerHTML = "";
    if (!window.QRCode || !url) {
      container.innerHTML = "<span>QR</span>";
      return;
    }
    new QRCode(container, {
      text: url,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel.M
    });
  };

  const drawQrs = (url) => {
    drawQr(els.sheetQr, url, 80);
    drawQr(els.shareQr, url, 92);
  };

  const setPublished = (slug, url) => {
    eventState.slug = slug;
    eventState.publishedUrl = url || makePublicUrl(slug);
    if (els.shareUrl) els.shareUrl.value = eventState.publishedUrl;
    setHidden(els.sharePanel, false);
    setHidden(els.shareBtn, false);
    if (els.saveState) {
      els.saveState.textContent = "منشور";
      els.saveState.style.background = "#e8f7ef";
      els.saveState.style.color = "#157347";
    }
    drawQrs(eventState.publishedUrl);
  };

  const publishEvent = async () => {
    if (!els.form?.reportValidity()) return;

    if (!platformSession.token) {
      toast("انتهت جلسة المستخدم. سجل الدخول مرة أخرى.", "error");
      clearSession();
      return showLoginScreen();
    }

    const data = getEventData();
    els.publishBtn.disabled = true;
    els.publishBtn.textContent = "جارٍ النشر...";

    try {
      const body = { ...data, slug: data.slug || slugify() };

      const payload = await rpc("mobadra_save_event", {
        p_admin_key: platformSession.token,
        p_event: body
      });

      const remote = Array.isArray(payload) ? payload[0] : payload;
      const saved = normalizeRemoteEvent(remote || body);

      eventState.id = saved.id || eventState.id;
      populateEventForm({ ...data, ...saved, slug: saved.slug || body.slug });
      setPublished(saved.slug || body.slug, makePublicUrl(saved.slug || body.slug));
      toast("تم نشر ورقة الإنجاز بنجاح");
    } catch (error) {
      const message = String(error?.message || "");
      if (/auth_required/i.test(message)) {
        clearSession();
        toast("انتهت جلسة المستخدم. سجل الدخول مرة أخرى.", "error");
        return showLoginScreen();
      }
      toast("تعذر النشر: " + (message || "خطأ غير معروف"), "error");
    } finally {
      els.publishBtn.disabled = false;
      els.publishBtn.textContent = eventState.id ? "حفظ التعديلات" : "نشر الفعالية";
    }
  };

  const loadPublicEvent = async (slug) => {
    setHidden(els.authScreen, true);
    setHidden(els.platformShell, false);
    setHidden(els.dashboardScreen, true);
    setHidden(els.newsletterApp, true);
    setHidden(els.app, false);

    document.body.classList.add("public-view");
    if (els.editorPanel) els.editorPanel.classList.add("hidden");
    setHidden(els.publicActions, false);
    setHidden(els.newEventBtn, true);
    setHidden(els.shareBtn, true);
    setHidden(els.currentUserBadge, true);
    setHidden(els.logoutBtn, true);
    setHidden(els.homeBtn, true);
    setHidden(els.exportPngTopBtn, true);
    setHidden(els.exportPdfTopBtn, true);
    if (els.app) els.app.style.gridTemplateColumns = "1fr";

    try {
      const params = new URLSearchParams({
        select: "*",
        slug: "eq." + slug,
        is_published: "eq.true",
        limit: "1"
      });

      const payload = await dataApiFetch("/mobadra_events?" + params.toString(), {
        method: "GET"
      });

      const row = Array.isArray(payload) ? payload[0] : payload;
      if (!row) throw new Error("لم يتم العثور على الفعالية");

      const data = normalizeRemoteEvent(row);
      populateEventForm(data);
      eventState.slug = data.slug || slug;
      eventState.publishedUrl = makePublicUrl(eventState.slug);
      renderSheet();
      drawQrs(eventState.publishedUrl);
      document.title = (data.eventName || "ورقة إنجاز") + " | مبادرة التحول الذكي";
    } catch (error) {
      toast(error?.message || "تعذر تحميل الفعالية", "error");
      if (els.sheetEventName) els.sheetEventName.textContent = "تعذر تحميل الفعالية";
    }
  };

  const exportEventFileName = () => {
    const base = clean($("eventName")?.value || "فعالية")
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .slice(0,80);
    return "ورقة إنجاز - " + (base || "فعالية");
  };

  const exportEventPng = async () => {
    try {
      toast("جارٍ تجهيز PNG...");
      const canvas = await captureElement(els.achievementSheet);
      downloadCanvasPng(canvas, exportEventFileName());
      toast("تم تجهيز PNG");
    } catch (error) {
      toast("تعذر تصدير PNG: " + (error?.message || "خطأ غير معروف"), "error");
    }
  };

  const exportEventPdf = async () => {
    try {
      toast("جارٍ تجهيز PDF...");
      const canvas = await captureElement(els.achievementSheet);
      downloadCanvasPdf(canvas, exportEventFileName());
      toast("تم تجهيز PDF");
    } catch (error) {
      toast("تعذر تصدير PDF: " + (error?.message || "خطأ غير معروف"), "error");
    }
  };

  const resetEventForm = () => {
    if (!window.confirm("إنشاء فعالية جديدة؟ سيتم مسح البيانات الحالية من النموذج فقط.")) return;
    els.form.reset();
    if (els.designTheme) els.designTheme.value = "blue";
    eventState = { id:null, slug:null, logoDataUrl:"", evidence:[], publishedUrl:"" };
    setHidden(els.sharePanel,true);
    setHidden(els.shareBtn,true);
    els.saveState.textContent = "مسودة";
    els.saveState.removeAttribute("style");
    els.publishBtn.textContent = "نشر الفعالية";
    applyDesignTheme("blue");
    renderUploads();
    renderSheet();
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const copyLink = async () => {
    if (!eventState.publishedUrl) return;
    try {
      await navigator.clipboard.writeText(eventState.publishedUrl);
      toast("تم نسخ الرابط");
    } catch {
      els.shareUrl.select();
      document.execCommand("copy");
      toast("تم نسخ الرابط");
    }
  };

  const shareLink = async () => {
    if (!eventState.publishedUrl) return;
    const data = getEventData();
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.eventName || "ورقة إنجاز فعالية",
          text: "ورقة إنجاز الفعالية",
          url: eventState.publishedUrl
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  /* =============================
     Newsletters module
     ============================= */

  const getNewsletterData = () => ({
    id: newsletterState.id,
    slug: newsletterState.slug,
    title: clean(els.newsletterTitle?.value),
    preparedBy: clean(els.newsletterPreparedBy?.value),
    newsletterDate: clean(els.newsletterDate?.value),
    imageDataUrl: newsletterState.imageDataUrl
  });

  const renderNewsletter = () => {
    if (!els.newsletterSheet) return;
    const data = getNewsletterData();

    els.newsletterSheetTitle.textContent = data.title || "عنوان النشرة";
    els.newsletterSheetPreparedBy.textContent = data.preparedBy || "—";
    els.newsletterSheetDate.textContent = formatArabicDate(data.newsletterDate);

    if (newsletterState.imageDataUrl) {
      els.newsletterSheetImage.classList.remove("empty");
      els.newsletterSheetImage.innerHTML =
        '<img alt="صورة النشرة" src="' + newsletterState.imageDataUrl + '">';

      els.newsletterImagePreview.classList.remove("empty");
      els.newsletterImagePreview.innerHTML =
        '<img alt="صورة النشرة" src="' + newsletterState.imageDataUrl + '">';
    } else {
      els.newsletterSheetImage.classList.add("empty");
      els.newsletterSheetImage.innerHTML = "<span>صورة النشرة</span>";
      els.newsletterImagePreview.classList.add("empty");
      els.newsletterImagePreview.textContent = "لم يتم رفع صورة";
    }
  };

  const saveNewsletter = async () => {
    if (!els.newsletterForm?.reportValidity()) return;

    if (!platformSession.token) {
      toast("انتهت جلسة المستخدم. سجل الدخول مرة أخرى.", "error");
      clearSession();
      return showLoginScreen();
    }

    const data = getNewsletterData();
    els.saveNewsletterBtn.disabled = true;
    els.saveNewsletterBtn.textContent = "جارٍ الحفظ...";

    try {
      const saved = await rpc("smart_save_newsletter", {
        p_token: platformSession.token,
        p_newsletter: data
      });

      newsletterState.id = saved?.id || newsletterState.id;
      newsletterState.slug = saved?.slug || newsletterState.slug;
      els.newsletterSaveState.textContent = "محفوظ";
      els.newsletterSaveState.style.background = "#e8f7ef";
      els.newsletterSaveState.style.color = "#157347";
      toast("تم حفظ النشرة");
    } catch (error) {
      const message = String(error?.message || "");
      if (/auth_required/i.test(message)) {
        clearSession();
        toast("انتهت جلسة المستخدم. سجل الدخول مرة أخرى.", "error");
        return showLoginScreen();
      }
      toast("تعذر حفظ النشرة: " + (message || "خطأ غير معروف"), "error");
    } finally {
      els.saveNewsletterBtn.disabled = false;
      els.saveNewsletterBtn.textContent = newsletterState.id ? "حفظ التعديلات" : "حفظ النشرة";
    }
  };

  const newsletterFileName = () => {
    const base = clean(els.newsletterTitle?.value || "نشرة")
      .replace(/[\\/:*?"<>|]+/g,"-")
      .replace(/\s+/g," ")
      .slice(0,80);
    return "نشرة - " + (base || "نشرة");
  };

  const exportNewsletterPng = async () => {
    try {
      toast("جارٍ تجهيز PNG...");
      const canvas = await captureElement(els.newsletterSheet);
      downloadCanvasPng(canvas, newsletterFileName());
      toast("تم تجهيز PNG");
    } catch (error) {
      toast("تعذر تصدير PNG: " + (error?.message || "خطأ غير معروف"), "error");
    }
  };

  const exportNewsletterPdf = async () => {
    try {
      toast("جارٍ تجهيز PDF...");
      const canvas = await captureElement(els.newsletterSheet);
      downloadCanvasPdf(canvas, newsletterFileName());
      toast("تم تجهيز PDF");
    } catch (error) {
      toast("تعذر تصدير PDF: " + (error?.message || "خطأ غير معروف"), "error");
    }
  };

  /* =============================
     Event listeners
     ============================= */

  els.setupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = clean(els.setupUsername.value);
    const displayName = clean(els.setupDisplayName.value);
    const password = els.setupPassword.value;

    showAuthMessage("جارٍ إنشاء الحساب...");
    try {
      await rpc("smart_create_first_user", {
        p_username: username,
        p_display_name: displayName,
        p_password: password
      });
      await login(username, password);
      toast("تم إنشاء أول مستخدم");
    } catch (error) {
      showAuthMessage("تعذر إنشاء الحساب: " + (error?.message || "خطأ غير معروف"), true);
    }
  });

  els.loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("جارٍ تسجيل الدخول...");
    try {
      await login(els.loginUsername.value, els.loginPassword.value);
      showAuthMessage("");
    } catch (error) {
      showAuthMessage(
        /invalid_credentials/i.test(String(error?.message || ""))
          ? "اسم المستخدم أو كلمة المرور غير صحيحة."
          : "تعذر تسجيل الدخول: " + (error?.message || "خطأ غير معروف"),
        true
      );
    }
  });

  els.logoutBtn?.addEventListener("click", () => {
    clearSession();
    showLoginScreen();
  });

  els.homeBtn?.addEventListener("click", showDashboard);
  els.openEventsModule?.addEventListener("click", showEventsModule);
  els.openNewslettersModule?.addEventListener("click", showNewslettersModule);

  els.designOptions?.addEventListener("click", (event) => {
    const button = event.target.closest(".design-option");
    if (!button) return;
    applyDesignTheme(button.dataset.theme || "blue");
    if (els.saveState) els.saveState.textContent = eventState.id ? "تعديلات غير محفوظة" : "مسودة";
    renderSheet();
  });

  els.form?.addEventListener("input", () => {
    if (els.saveState) els.saveState.textContent = eventState.id ? "تعديلات غير محفوظة" : "مسودة";
    renderSheet();
  });

  els.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    publishEvent();
  });

  els.logoInput?.addEventListener("change", async () => {
    const file = els.logoInput.files?.[0];
    if (!file) return;
    try {
      eventState.logoDataUrl = await compressImage(file,900,.9);
      renderUploads();
      renderSheet();
      toast("تم إضافة الشعار");
    } catch (error) {
      toast(error?.message || "تعذر إضافة الشعار","error");
    } finally {
      els.logoInput.value = "";
    }
  });

  els.evidenceInput?.addEventListener("change", async () => {
    const files = Array.from(els.evidenceInput.files || []);
    if (!files.length) return;

    const available = Math.max(0,MAX_EVIDENCE-eventState.evidence.length);
    if (!available) {
      toast("الحد الأقصى " + MAX_EVIDENCE + " صور","error");
      els.evidenceInput.value = "";
      return;
    }

    try {
      const selected = files.slice(0,available);
      const compressed = [];
      for (const file of selected) compressed.push(await compressImage(file));
      eventState.evidence.push(...compressed);
      renderUploads();
      renderSheet();
      toast(files.length > available
        ? "تمت إضافة " + available + " صور فقط بسبب الحد الأقصى"
        : "تمت إضافة الشواهد");
    } catch (error) {
      toast(error?.message || "تعذر إضافة الصور","error");
    } finally {
      els.evidenceInput.value = "";
    }
  });

  els.evidenceManager?.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-evidence");
    if (!button) return;
    eventState.evidence.splice(Number(button.dataset.index),1);
    renderUploads();
    renderSheet();
  });

  els.newEventBtn?.addEventListener("click", resetEventForm);
  els.exportPngTopBtn?.addEventListener("click", exportEventPng);
  els.exportPdfTopBtn?.addEventListener("click", exportEventPdf);
  els.exportPngBtn?.addEventListener("click", exportEventPng);
  els.exportPdfBtn?.addEventListener("click", exportEventPdf);
  els.publicPngBtn?.addEventListener("click", exportEventPng);
  els.publicPdfBtn?.addEventListener("click", exportEventPdf);
  els.copyLinkBtn?.addEventListener("click", copyLink);
  els.shareBtn?.addEventListener("click", shareLink);

  els.newsletterForm?.addEventListener("input", () => {
    if (els.newsletterSaveState) {
      els.newsletterSaveState.textContent = newsletterState.id ? "تعديلات غير محفوظة" : "مسودة";
      els.newsletterSaveState.removeAttribute("style");
    }
    renderNewsletter();
  });

  els.newsletterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveNewsletter();
  });

  els.newsletterImageInput?.addEventListener("change", async () => {
    const file = els.newsletterImageInput.files?.[0];
    if (!file) return;
    try {
      newsletterState.imageDataUrl = await compressImage(file,1600,.88);
      renderNewsletter();
      toast("تم إضافة صورة النشرة");
    } catch (error) {
      toast(error?.message || "تعذر إضافة الصورة","error");
    } finally {
      els.newsletterImageInput.value = "";
    }
  });

  els.newsletterPngBtn?.addEventListener("click", exportNewsletterPng);
  els.newsletterPdfBtn?.addEventListener("click", exportNewsletterPdf);
  els.newsletterPngTopBtn?.addEventListener("click", exportNewsletterPng);
  els.newsletterPdfTopBtn?.addEventListener("click", exportNewsletterPdf);

  /* =============================
     Startup
     ============================= */

  const start = async () => {
    if (!HAS_BACKEND) {
      setHidden(els.backendNotice,false);
      return;
    }

    renderUploads();
    renderSheet();
    renderNewsletter();

    const publicSlug = new URLSearchParams(window.location.search).get("event");
    if (publicSlug) {
      await loadPublicEvent(publicSlug);
      return;
    }

    setHidden(els.backendNotice,true);

    const restored = await restorePlatformSession();
    if (restored) {
      showDashboard();
    } else {
      await showLoginScreen();
    }
  };

  start();
})();