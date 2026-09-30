(() => {
  "use strict";

  const config = window.MOBADRA_CONFIG || {};
  const DATA_API_URL = String(config.dataApiUrl || "").replace(/\/$/, "");
  const AUTH_BASE_URL = String(config.authBaseUrl || "").replace(/\/$/, "");
  const HAS_BACKEND = Boolean(DATA_API_URL && AUTH_BASE_URL);
  const MAX_EVIDENCE = Number(config.maxEvidenceImages || 6);
  const MAX_WIDTH = Number(config.maxImageWidth || 1400);
  const JPEG_QUALITY = Number(config.jpegQuality || 0.82);

  const $ = (id) => document.getElementById(id);

  const els = {
    toast: $("toast"),
    authScreen: $("authScreen"),
    enterPlatformBtn: $("enterPlatformBtn"),
    platformShell: $("platformShell"),
    dashboardScreen: $("dashboardScreen"),
    openEventsModule: $("openEventsModule"),
    openNewslettersModule: $("openNewslettersModule"),
    homeBtn: $("homeBtn"),

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

    sheetLogo: $("sheetLogo"),
    sheetOrganization: $("sheetOrganization"),
    sheetEventName: $("sheetEventName"),
    sheetDate: $("sheetDate"),
    sheetDirector: $("sheetDirector"),
    sheetLocation: $("sheetLocation"),
    sheetField: $("sheetField"),
    sheetFieldCard: $("sheetFieldCard"),
    sheetAudience: $("sheetAudience"),
    sheetParticipants: $("sheetParticipants"),
    sheetGoal: $("sheetGoal"),
    sheetSummary: $("sheetSummary"),
    sheetEvidence: $("sheetEvidence"),
    extraEvidenceSection: $("extraEvidenceSection"),
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

  let anonymousJwt = "";
  let anonymousJwtAt = 0;

  const eventFields = [
    "eventName",
    "organizationName",
    "eventDate",
    "eventLocation",
    "participantCount",
    "eventField",
    "eventDirector",
    "targetAudience",
    "eventGoal",
    "summary",
    "assistants",
    "schoolPrincipal"
  ];

  const toast = (message, type = "ok") => {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.toggle("error", type === "error");
    els.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove("show"), 2800);
  };

  const clean = (value) => String(value ?? "").trim();

  const setHidden = (el, hidden) => {
    if (!el) return;
    el.classList.toggle("hidden", hidden);
  };

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
      throw new Error(
        payload?.message ||
        payload?.error ||
        (typeof payload === "string" ? payload : null) ||
        ("AUTH HTTP " + response.status)
      );
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

    if (!token) throw new Error("تعذر الحصول على رمز الوصول العام");

    anonymousJwt = token;
    anonymousJwtAt = Date.now();
    return token;
  };

  const dataApiFetch = async (path, options = {}, retry = true) => {
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

    if (response.status === 401 && retry) {
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
      throw new Error(
        payload?.message ||
        payload?.error ||
        payload?.details ||
        payload?.hint ||
        (typeof payload === "string" ? payload : null) ||
        ("HTTP " + response.status)
      );
    }

    return payload;
  };

  const rpc = (name, body = {}) =>
    dataApiFetch("/rpc/" + name, {
      method: "POST",
      body: JSON.stringify(body)
    });

  const compressImage = (file, maxWidth = MAX_WIDTH, quality = JPEG_QUALITY) =>
    new Promise((resolve, reject) => {
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

  const waitForAssets = async (element) => {
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
    if (!window.html2canvas) throw new Error("أداة التصدير لم يتم تحميلها");
    await waitForAssets(element);

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
        width,
        height,
        scrollX: 0,
        scrollY: 0,
        windowWidth: Math.max(1200, width + 100),
        windowHeight: Math.max(900, height + 100),
        onclone: (doc) => {
          const cloned = doc.getElementById(element.id);
          if (!cloned) return;
          cloned.classList.add("export-capture");
          cloned.style.transform = "none";
          cloned.style.width = width + "px";
          cloned.style.height = "auto";
          cloned.style.minHeight = "0";
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

  const downloadPng = (canvas, filename) => {
    const link = document.createElement("a");
    link.download = filename + ".png";
    link.href = canvas.toDataURL("image/png", 1);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadPdf = (canvas, filename) => {
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

  const showDashboard = () => {
    setHidden(els.authScreen, true);
    setHidden(els.platformShell, false);
    setHidden(els.dashboardScreen, false);
    setHidden(els.app, true);
    setHidden(els.newsletterApp, true);
    setHidden(els.homeBtn, true);
    setHidden(els.newEventBtn, true);
    setHidden(els.exportPngTopBtn, true);
    setHidden(els.exportPdfTopBtn, true);
    setHidden(els.newsletterPngTopBtn, true);
    setHidden(els.newsletterPdfTopBtn, true);
    document.title = "التحول الذكي في التعليم";
  };

  const showEventsModule = () => {
    setHidden(els.dashboardScreen, true);
    setHidden(els.newsletterApp, true);
    setHidden(els.app, false);
    setHidden(els.homeBtn, false);
    setHidden(els.newEventBtn, false);
    setHidden(els.exportPngTopBtn, false);
    setHidden(els.exportPdfTopBtn, false);
    setHidden(els.newsletterPngTopBtn, true);
    setHidden(els.newsletterPdfTopBtn, true);
    if (els.editorPanel) els.editorPanel.classList.remove("hidden");
    if (els.publicActions) els.publicActions.classList.add("hidden");
    if (els.app) els.app.style.gridTemplateColumns = "";
    renderUploads();
    renderSheet();
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const showNewslettersModule = () => {
    setHidden(els.dashboardScreen, true);
    setHidden(els.app, true);
    setHidden(els.newsletterApp, false);
    setHidden(els.homeBtn, false);
    setHidden(els.newEventBtn, true);
    setHidden(els.exportPngTopBtn, true);
    setHidden(els.exportPdfTopBtn, true);
    setHidden(els.newsletterPngTopBtn, false);
    setHidden(els.newsletterPdfTopBtn, false);
    renderNewsletter();
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const getEventData = () => {
    const data = {};
    eventFields.forEach((name) => {
      const input = $(name);
      data[name] = input ? clean(input.value) : "";
    });

    data.participantCount = data.participantCount
      ? Number(data.participantCount)
      : null;
    data.logoDataUrl = eventState.logoDataUrl;
    data.evidence = [...eventState.evidence];
    data.id = eventState.id;
    data.slug = eventState.slug;
    data.designTheme = "blue";
    return data;
  };

  const renderUploads = () => {
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
      els.evidenceManager.innerHTML = eventState.evidence.map((src,index) =>
        '<div class="evidence-thumb">' +
          '<img alt="شاهد ' + (index+1) + '" src="' + src + '">' +
          '<button class="remove-evidence" type="button" data-index="' + index + '" aria-label="حذف الصورة">×</button>' +
        '</div>'
      ).join("");
    }
  };

  const renderSheet = () => {
    if (!els.achievementSheet) return;
    const data = getEventData();

    els.sheetOrganization.textContent = data.organizationName || "اسم المؤسسة / المدرسة";
    els.sheetEventName.textContent = data.eventName || "اسم الفعالية";
    els.sheetDate.textContent = formatArabicDate(data.eventDate);
    els.sheetDirector.textContent = data.eventDirector || "—";
    els.sheetLocation.textContent = data.eventLocation || "—";
    els.sheetField.textContent = data.eventField || "—";
    els.sheetFieldCard.textContent = data.eventField || "—";
    els.sheetAudience.textContent = data.targetAudience || "—";
    els.sheetParticipants.textContent =
      data.participantCount === null || Number.isNaN(data.participantCount)
        ? "—"
        : new Intl.NumberFormat("ar").format(data.participantCount);
    els.sheetGoal.textContent = data.eventGoal || "يظهر هنا هدف الفعالية.";
    els.sheetSummary.textContent = data.summary || "يظهر هنا وصف مختصر لما تم تنفيذه.";
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
        '<img class="hero-evidence-image" alt="صورة الفعالية" src="' +
        eventState.evidence[0] +
        '">';
    } else {
      els.heroEvidenceFrame.innerHTML =
        '<div class="hero-evidence-placeholder"><span>صورة الفعالية</span></div>';
    }

    const extras = eventState.evidence.slice(1);
    if (extras.length) {
      setHidden(els.extraEvidenceSection,false);
      els.sheetEvidence.innerHTML = extras
        .map((src,i) =>
          '<figure class="evidence-frame ref-extra-frame">' +
            '<div class="evidence-image-box">' +
              '<img alt="شاهد إضافي ' + (i+1) + '" src="' + src + '">' +
            '</div>' +
          '</figure>'
        ).join("");
    } else {
      setHidden(els.extraEvidenceSection,true);
      els.sheetEvidence.innerHTML = "";
    }
  };

  const normalizeRemoteEvent = (raw={}) => ({
    id: raw.id,
    slug: raw.slug,
    eventName: raw.event_name ?? "",
    organizationName: raw.organization_name ?? "",
    eventDate: raw.event_date ?? "",
    eventLocation: raw.event_location ?? "",
    participantCount: raw.participant_count ?? "",
    eventField: raw.event_field ?? "",
    eventDirector: raw.event_director ?? "",
    targetAudience: raw.target_audience ?? "",
    eventGoal: raw.event_goal ?? "",
    summary: raw.summary ?? "",
    assistants: raw.assistants ?? "",
    schoolPrincipal: raw.school_principal ?? "",
    logoDataUrl: raw.logo_data_url ?? "",
    evidence: raw.evidence_images ?? []
  });

  const populateEventForm = (data={}) => {
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

  const slugify = () => {
    const bytes = new Uint8Array(4);
    if (crypto?.getRandomValues) {
      crypto.getRandomValues(bytes);
      return "event-" + Date.now().toString(36) + "-" +
        Array.from(bytes).map(v=>v.toString(16).padStart(2,"0")).join("");
    }
    return "event-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,10);
  };

  const makePublicUrl = (slug) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("event",slug);
    return url.toString();
  };

  const drawShareQr = (url) => {
    if (!els.shareQr) return;
    els.shareQr.innerHTML = "";
    if (!window.QRCode || !url) return;
    new QRCode(els.shareQr,{
      text:url,
      width:92,
      height:92,
      correctLevel:QRCode.CorrectLevel.M
    });
  };

  const setPublished = (slug,url) => {
    eventState.slug = slug;
    eventState.publishedUrl = url || makePublicUrl(slug);
    els.shareUrl.value = eventState.publishedUrl;
    setHidden(els.sharePanel,false);
    setHidden(els.shareBtn,false);
    els.saveState.textContent = "منشور";
    els.saveState.style.background = "#e8f7ef";
    els.saveState.style.color = "#157347";
    drawShareQr(eventState.publishedUrl);
  };

  const publishEvent = async () => {
    if (!els.form.reportValidity()) return;

    const data = getEventData();
    els.publishBtn.disabled = true;
    els.publishBtn.textContent = "جارٍ النشر...";

    try {
      const body = {...data,slug:data.slug || slugify()};
      const payload = await rpc("mobadra_save_event",{
        p_admin_key:"",
        p_event:body
      });

      const remote = Array.isArray(payload) ? payload[0] : payload;
      const saved = normalizeRemoteEvent(remote || body);

      eventState.id = saved.id || eventState.id;
      populateEventForm({...data,...saved,slug:saved.slug || body.slug});
      setPublished(saved.slug || body.slug,makePublicUrl(saved.slug || body.slug));
      toast("تم نشر ورقة الإنجاز بنجاح");
    } catch (error) {
      toast("تعذر النشر: " + (error?.message || "خطأ غير معروف"),"error");
    } finally {
      els.publishBtn.disabled = false;
      els.publishBtn.textContent = eventState.id ? "حفظ التعديلات" : "نشر الفعالية";
    }
  };

  const loadPublicEvent = async (slug) => {
    setHidden(els.authScreen,true);
    setHidden(els.platformShell,false);
    setHidden(els.dashboardScreen,true);
    setHidden(els.newsletterApp,true);
    setHidden(els.app,false);
    setHidden(els.homeBtn,true);
    setHidden(els.newEventBtn,true);
    setHidden(els.exportPngTopBtn,true);
    setHidden(els.exportPdfTopBtn,true);
    setHidden(els.newsletterPngTopBtn,true);
    setHidden(els.newsletterPdfTopBtn,true);
    setHidden(els.publicActions,false);
    els.editorPanel.classList.add("hidden");
    els.app.style.gridTemplateColumns = "1fr";

    try {
      const params = new URLSearchParams({
        select:"*",
        slug:"eq." + slug,
        is_published:"eq.true",
        limit:"1"
      });

      const payload = await dataApiFetch("/mobadra_events?" + params.toString(),{
        method:"GET"
      });

      const row = Array.isArray(payload) ? payload[0] : payload;
      if (!row) throw new Error("لم يتم العثور على الفعالية");

      populateEventForm(normalizeRemoteEvent(row));
      eventState.slug = row.slug;
      eventState.publishedUrl = makePublicUrl(row.slug);
      renderSheet();
      document.title = (row.event_name || "ورقة إنجاز") + " | التحول الذكي في التعليم";
    } catch (error) {
      toast(error?.message || "تعذر تحميل الفعالية","error");
    }
  };

  const eventFilename = () => {
    const base = clean($("eventName")?.value || "فعالية")
      .replace(/[\\/:*?"<>|]+/g,"-")
      .replace(/\s+/g," ")
      .slice(0,80);
    return "ورقة إنجاز - " + (base || "فعالية");
  };

  const exportEventPng = async () => {
    try {
      toast("جارٍ تجهيز PNG...");
      const canvas = await captureElement(els.achievementSheet);
      downloadPng(canvas,eventFilename());
      toast("تم تجهيز PNG");
    } catch (error) {
      toast("تعذر تصدير PNG: " + (error?.message || "خطأ غير معروف"),"error");
    }
  };

  const exportEventPdf = async () => {
    try {
      toast("جارٍ تجهيز PDF...");
      const canvas = await captureElement(els.achievementSheet);
      downloadPdf(canvas,eventFilename());
      toast("تم تجهيز PDF");
    } catch (error) {
      toast("تعذر تصدير PDF: " + (error?.message || "خطأ غير معروف"),"error");
    }
  };

  const resetEvent = () => {
    if (!confirm("إنشاء فعالية جديدة؟ سيتم مسح البيانات الحالية من النموذج فقط.")) return;
    els.form.reset();
    eventState={id:null,slug:null,logoDataUrl:"",evidence:[],publishedUrl:""};
    setHidden(els.sharePanel,true);
    setHidden(els.shareBtn,true);
    els.saveState.textContent="مسودة";
    els.saveState.removeAttribute("style");
    els.publishBtn.textContent="نشر الفعالية";
    renderUploads();
    renderSheet();
    window.scrollTo({top:0,behavior:"smooth"});
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
    if (navigator.share) {
      try {
        await navigator.share({
          title:clean($("eventName")?.value) || "ورقة إنجاز فعالية",
          text:"ورقة إنجاز الفعالية",
          url:eventState.publishedUrl
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  const getNewsletterData = () => ({
    id:newsletterState.id,
    slug:newsletterState.slug,
    title:clean(els.newsletterTitle?.value),
    preparedBy:clean(els.newsletterPreparedBy?.value),
    newsletterDate:clean(els.newsletterDate?.value),
    imageDataUrl:newsletterState.imageDataUrl
  });

  const renderNewsletter = () => {
    if (!els.newsletterSheet) return;
    const data=getNewsletterData();

    els.newsletterSheetTitle.textContent=data.title || "عنوان النشرة";
    els.newsletterSheetPreparedBy.textContent=data.preparedBy || "—";
    els.newsletterSheetDate.textContent=formatArabicDate(data.newsletterDate);

    if (newsletterState.imageDataUrl) {
      els.newsletterSheetImage.classList.remove("empty");
      els.newsletterSheetImage.innerHTML='<img alt="صورة النشرة" src="' + newsletterState.imageDataUrl + '">';
      els.newsletterImagePreview.classList.remove("empty");
      els.newsletterImagePreview.innerHTML='<img alt="صورة النشرة" src="' + newsletterState.imageDataUrl + '">';
    } else {
      els.newsletterSheetImage.classList.add("empty");
      els.newsletterSheetImage.innerHTML="<span>صورة النشرة</span>";
      els.newsletterImagePreview.classList.add("empty");
      els.newsletterImagePreview.textContent="لم يتم رفع صورة";
    }
  };

  const saveNewsletter = async () => {
    if (!els.newsletterForm.reportValidity()) return;

    const data=getNewsletterData();
    els.saveNewsletterBtn.disabled=true;
    els.saveNewsletterBtn.textContent="جارٍ الحفظ...";

    try {
      const saved=await rpc("smart_save_newsletter",{
        p_token:"",
        p_newsletter:data
      });

      newsletterState.id=saved?.id || newsletterState.id;
      newsletterState.slug=saved?.slug || newsletterState.slug;
      els.newsletterSaveState.textContent="محفوظ";
      els.newsletterSaveState.style.background="#e8f7ef";
      els.newsletterSaveState.style.color="#157347";
      toast("تم حفظ النشرة");
    } catch (error) {
      toast("تعذر حفظ النشرة: " + (error?.message || "خطأ غير معروف"),"error");
    } finally {
      els.saveNewsletterBtn.disabled=false;
      els.saveNewsletterBtn.textContent=newsletterState.id ? "حفظ التعديلات" : "حفظ النشرة";
    }
  };

  const newsletterFilename = () => {
    const base=clean(els.newsletterTitle?.value || "نشرة")
      .replace(/[\\/:*?"<>|]+/g,"-")
      .replace(/\s+/g," ")
      .slice(0,80);
    return "نشرة - " + (base || "نشرة");
  };

  const exportNewsletterPng = async () => {
    try {
      const canvas=await captureElement(els.newsletterSheet);
      downloadPng(canvas,newsletterFilename());
      toast("تم تجهيز PNG");
    } catch (error) {
      toast("تعذر تصدير PNG: " + (error?.message || "خطأ غير معروف"),"error");
    }
  };

  const exportNewsletterPdf = async () => {
    try {
      const canvas=await captureElement(els.newsletterSheet);
      downloadPdf(canvas,newsletterFilename());
      toast("تم تجهيز PDF");
    } catch (error) {
      toast("تعذر تصدير PDF: " + (error?.message || "خطأ غير معروف"),"error");
    }
  };

  els.enterPlatformBtn?.addEventListener("click",showDashboard);
  els.homeBtn?.addEventListener("click",showDashboard);
  els.openEventsModule?.addEventListener("click",showEventsModule);
  els.openNewslettersModule?.addEventListener("click",showNewslettersModule);

  els.form?.addEventListener("input",() => {
    els.saveState.textContent=eventState.id ? "تعديلات غير محفوظة" : "مسودة";
    renderSheet();
  });

  els.form?.addEventListener("submit",(event) => {
    event.preventDefault();
    publishEvent();
  });

  els.logoInput?.addEventListener("change",async() => {
    const file=els.logoInput.files?.[0];
    if (!file) return;
    try {
      eventState.logoDataUrl=await compressImage(file,900,.9);
      renderUploads();
      renderSheet();
      toast("تم إضافة الشعار");
    } catch (error) {
      toast(error?.message || "تعذر إضافة الشعار","error");
    } finally {
      els.logoInput.value="";
    }
  });

  els.evidenceInput?.addEventListener("change",async() => {
    const files=Array.from(els.evidenceInput.files || []);
    if (!files.length) return;

    const available=Math.max(0,MAX_EVIDENCE-eventState.evidence.length);
    if (!available) {
      toast("الحد الأقصى " + MAX_EVIDENCE + " صور","error");
      els.evidenceInput.value="";
      return;
    }

    try {
      const selected=files.slice(0,available);
      const compressed=[];
      for (const file of selected) compressed.push(await compressImage(file));
      eventState.evidence.push(...compressed);
      renderUploads();
      renderSheet();
      toast("تمت إضافة الشواهد");
    } catch (error) {
      toast(error?.message || "تعذر إضافة الصور","error");
    } finally {
      els.evidenceInput.value="";
    }
  });

  els.evidenceManager?.addEventListener("click",(event) => {
    const btn=event.target.closest(".remove-evidence");
    if (!btn) return;
    eventState.evidence.splice(Number(btn.dataset.index),1);
    renderUploads();
    renderSheet();
  });

  els.newEventBtn?.addEventListener("click",resetEvent);
  els.exportPngTopBtn?.addEventListener("click",exportEventPng);
  els.exportPdfTopBtn?.addEventListener("click",exportEventPdf);
  els.exportPngBtn?.addEventListener("click",exportEventPng);
  els.exportPdfBtn?.addEventListener("click",exportEventPdf);
  els.publicPngBtn?.addEventListener("click",exportEventPng);
  els.publicPdfBtn?.addEventListener("click",exportEventPdf);
  els.copyLinkBtn?.addEventListener("click",copyLink);
  els.shareBtn?.addEventListener("click",shareLink);

  els.newsletterForm?.addEventListener("input",() => {
    els.newsletterSaveState.textContent=newsletterState.id ? "تعديلات غير محفوظة" : "مسودة";
    els.newsletterSaveState.removeAttribute("style");
    renderNewsletter();
  });

  els.newsletterForm?.addEventListener("submit",(event) => {
    event.preventDefault();
    saveNewsletter();
  });

  els.newsletterImageInput?.addEventListener("change",async() => {
    const file=els.newsletterImageInput.files?.[0];
    if (!file) return;
    try {
      newsletterState.imageDataUrl=await compressImage(file,1600,.88);
      renderNewsletter();
      toast("تم إضافة صورة النشرة");
    } catch (error) {
      toast(error?.message || "تعذر إضافة الصورة","error");
    } finally {
      els.newsletterImageInput.value="";
    }
  });

  els.newsletterPngBtn?.addEventListener("click",exportNewsletterPng);
  els.newsletterPdfBtn?.addEventListener("click",exportNewsletterPdf);
  els.newsletterPngTopBtn?.addEventListener("click",exportNewsletterPng);
  els.newsletterPdfTopBtn?.addEventListener("click",exportNewsletterPdf);

  const start=async() => {
    renderUploads();
    renderSheet();
    renderNewsletter();

    if (!HAS_BACKEND) setHidden(els.backendNotice,false);
    else setHidden(els.backendNotice,true);

    const publicSlug=new URLSearchParams(window.location.search).get("event");
    if (publicSlug) {
      await loadPublicEvent(publicSlug);
      return;
    }

    setHidden(els.authScreen,false);
    setHidden(els.platformShell,true);
  };

  start();
})();