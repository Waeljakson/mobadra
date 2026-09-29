(() => {
  "use strict";

  const config = window.MOBADRA_CONFIG || {};
  const DATA_API_URL = String(config.dataApiUrl || "").replace(/\/$/, "");
  const HAS_BACKEND = Boolean(DATA_API_URL);
  const MAX_EVIDENCE = Number(config.maxEvidenceImages || 6);
  const MAX_WIDTH = Number(config.maxImageWidth || 1400);
  const JPEG_QUALITY = Number(config.jpegQuality || 0.82);

  const $ = (id) => document.getElementById(id);
  const els = {
    form: $("eventForm"),
    editorPanel: $("editorPanel"),
    app: $("app"),
    newEventBtn: $("newEventBtn"),
    printTopBtn: $("printTopBtn"),
    printBtn: $("printBtn"),
    publicPrintBtn: $("publicPrintBtn"),
    publicActions: $("publicActions"),
    shareBtn: $("shareBtn"),
    publishBtn: $("publishBtn"),
    saveState: $("saveState"),
    backendNotice: $("backendNotice"),
    toast: $("toast"),
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
    sheetDesigner: $("sheetDesigner"),
    sheetFollowUp: $("sheetFollowUp"),
    sheetDirector: $("sheetDirector"),
    sheetAssistants: $("sheetAssistants"),
    sheetPrincipal: $("sheetPrincipal")
  };

  let state = {
    id: null,
    slug: null,
    logoDataUrl: "",
    evidence: [],
    publishedUrl: ""
  };

  const fields = [
    "eventName", "organizationName", "eventDate", "eventLocation",
    "participantCount", "eventField", "targetAudience", "eventGoal",
    "summary", "designer", "followUp", "eventDirector",
    "assistants", "schoolPrincipal"
  ];

  const toast = (message, type = "ok") => {
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

  const getFormData = () => {
    const data = {};
    fields.forEach((name) => {
      const input = $(name);
      data[name] = input ? clean(input.value) : "";
    });
    data.participantCount = data.participantCount ? Number(data.participantCount) : null;
    data.logoDataUrl = state.logoDataUrl;
    data.evidence = [...state.evidence];
    data.id = state.id;
    data.slug = state.slug;
    return data;
  };

  const populateForm = (data = {}) => {
    fields.forEach((name) => {
      const input = $(name);
      if (input) input.value = data[name] ?? "";
    });
    state.id = data.id || null;
    state.slug = data.slug || null;
    state.logoDataUrl = data.logoDataUrl || data.logo_data_url || "";
    state.evidence = Array.isArray(data.evidence)
      ? data.evidence
      : Array.isArray(data.evidence_images)
        ? data.evidence_images
        : [];
    renderUploads();
    renderSheet();
  };

  const renderUploads = () => {
    if (state.logoDataUrl) {
      els.logoPreview.classList.remove("empty");
      els.logoPreview.innerHTML = '<img alt="شعار المؤسسة" src="' + state.logoDataUrl + '">';
    } else {
      els.logoPreview.classList.add("empty");
      els.logoPreview.textContent = "لم يتم رفع شعار";
    }

    if (!state.evidence.length) {
      els.evidenceManager.classList.add("empty");
      els.evidenceManager.textContent = "لا توجد صور مضافة";
    } else {
      els.evidenceManager.classList.remove("empty");
      els.evidenceManager.innerHTML = state.evidence.map((src, index) => (
        '<div class="evidence-thumb">' +
          '<img alt="شاهد ' + (index + 1) + '" src="' + src + '">' +
          '<button class="remove-evidence" type="button" data-index="' + index + '" aria-label="حذف الصورة">×</button>' +
        '</div>'
      )).join("");
    }
  };

  const renderSheet = () => {
    const data = getFormData();

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
    els.sheetDesigner.textContent = data.designer || "—";
    els.sheetFollowUp.textContent = data.followUp || "—";
    els.sheetDirector.textContent = data.eventDirector || "—";
    els.sheetAssistants.textContent = data.assistants || "—";
    els.sheetPrincipal.textContent = data.schoolPrincipal || "—";

    if (state.logoDataUrl) {
      els.sheetLogo.innerHTML = '<img alt="شعار المؤسسة" src="' + state.logoDataUrl + '">';
    } else {
      els.sheetLogo.innerHTML = "<span>الشعار</span>";
    }

    const count = state.evidence.length;
    els.sheetEvidence.className = "sheet-evidence";
    if (!count) {
      els.sheetEvidence.classList.add("empty");
      els.sheetEvidence.innerHTML = '<div class="evidence-placeholder">أضف صور الشواهد لتظهر هنا</div>';
    } else {
      if (count === 1) els.sheetEvidence.classList.add("one");
      if (count === 2) els.sheetEvidence.classList.add("two");
      if (count === 4) els.sheetEvidence.classList.add("four");
      els.sheetEvidence.innerHTML = state.evidence
        .map((src, i) => '<img alt="شاهد الفعالية ' + (i + 1) + '" src="' + src + '">')
        .join("");
    }

    if (state.publishedUrl) drawQrs(state.publishedUrl);
  };

  const drawQr = (container, url, size) => {
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
          const type = file.type === "image/png" && file.size < 450000 ? "image/png" : "image/jpeg";
          const out = canvas.toDataURL(type, type === "image/png" ? undefined : quality);
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const slugify = () => {
    const random = (crypto?.getRandomValues)
      ? Array.from(crypto.getRandomValues(new Uint8Array(4))).map(v => v.toString(16).padStart(2, "0")).join("")
      : Math.random().toString(36).slice(2, 10);
    return "event-" + Date.now().toString(36) + "-" + random;
  };

  const makePublicUrl = (slug) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("event", slug);
    return url.toString();
  };

  const setPublished = (slug, url) => {
    state.slug = slug;
    state.publishedUrl = url || makePublicUrl(slug);
    els.shareUrl.value = state.publishedUrl;
    els.sharePanel.classList.remove("hidden");
    els.shareBtn.classList.remove("hidden");
    els.saveState.textContent = "منشور";
    els.saveState.style.background = "#e8f7ef";
    els.saveState.style.color = "#157347";
    drawQrs(state.publishedUrl);
  };

  const getAdminKey = () => {
    if (!config.requiresAdminKey) return "";
    let key = sessionStorage.getItem("mobadra:adminKey") || "";
    if (!key) {
      key = window.prompt("أدخل رمز إدارة المنصة") || "";
      if (key) sessionStorage.setItem("mobadra:adminKey", key);
    }
    return key;
  };

  const dataApiFetch = async (path, options = {}) => {
    if (!HAS_BACKEND) throw new Error("BACKEND_NOT_CONFIGURED");

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(options.headers || {})
    };

    const response = await fetch(DATA_API_URL + path, {
      ...options,
      headers
    });

    let payload = null;
    const bodyText = await response.text();
    if (bodyText) {
      try { payload = JSON.parse(bodyText); } catch { payload = bodyText; }
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.details ||
        (typeof payload === "string" ? payload : null) ||
        ("HTTP " + response.status);
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    return payload;
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
    designer: raw.designer ?? "",
    followUp: raw.followUp ?? raw.follow_up ?? "",
    eventDirector: raw.eventDirector ?? raw.event_director ?? "",
    assistants: raw.assistants ?? "",
    schoolPrincipal: raw.schoolPrincipal ?? raw.school_principal ?? "",
    logoDataUrl: raw.logoDataUrl ?? raw.logo_data_url ?? "",
    evidence: raw.evidence ?? raw.evidence_images ?? []
  });

  const saveLocalDraft = (data) => {
    const slug = data.slug || slugify();
    const record = { ...data, slug, id: data.id || slug, savedLocally: true };
    localStorage.setItem("mobadra:event:" + slug, JSON.stringify(record));
    return record;
  };

  const loadLocal = (slug) => {
    try {
      return JSON.parse(localStorage.getItem("mobadra:event:" + slug) || "null");
    } catch {
      return null;
    }
  };

  const publishEvent = async () => {
    if (!els.form.reportValidity()) return;

    const data = getFormData();
    els.publishBtn.disabled = true;
    els.publishBtn.textContent = "جارٍ النشر...";

    try {
      if (!HAS_BACKEND) throw new Error("BACKEND_NOT_CONFIGURED");

      const adminKey = getAdminKey();
      if (!adminKey) throw new Error("يلزم إدخال رمز إدارة المنصة");

      const body = {
        ...data,
        slug: data.slug || slugify()
      };

      const payload = await dataApiFetch("/rpc/mobadra_save_event", {
        method: "POST",
        body: JSON.stringify({
          p_admin_key: adminKey,
          p_event: body
        })
      });

      const remote = Array.isArray(payload) ? payload[0] : payload;
      const saved = normalizeRemoteEvent(remote || body);
      state.id = saved.id || state.id;
      populateForm({ ...data, ...saved, slug: saved.slug || body.slug });
      setPublished(saved.slug || body.slug, makePublicUrl(saved.slug || body.slug));
      toast("تم نشر ورقة الإنجاز بنجاح");
    } catch (error) {
      const message = String(error?.message || "");
      if (error?.status === 401 || /invalid_admin_key/i.test(message)) {
        sessionStorage.removeItem("mobadra:adminKey");
      }
      toast(
        message === "BACKEND_NOT_CONFIGURED"
          ? "لم يتم ربط قاعدة البيانات بعد"
          : /invalid_admin_key/i.test(message)
            ? "رمز إدارة المنصة غير صحيح"
            : "تعذر النشر: " + (message || "خطأ غير معروف"),
        "error"
      );
    } finally {
      els.publishBtn.disabled = false;
      els.publishBtn.textContent = state.id ? "حفظ التعديلات" : "نشر الفعالية";
    }
  };

  const loadPublicEvent = async (slug) => {
    document.body.classList.add("public-view");
    els.editorPanel.classList.add("hidden");
    els.publicActions.classList.remove("hidden");
    els.newEventBtn.classList.add("hidden");
    els.shareBtn.classList.add("hidden");
    els.app.style.gridTemplateColumns = "1fr";

    try {
      if (!HAS_BACKEND) throw new Error("BACKEND_NOT_CONFIGURED");

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
      populateForm(data);
      state.slug = data.slug || slug;
      state.publishedUrl = makePublicUrl(state.slug);
      renderSheet();
      drawQrs(state.publishedUrl);
      document.title = (data.eventName || "ورقة إنجاز") + " | منصة إنجاز الفعاليات";
    } catch (error) {
      toast(error?.message || "تعذر تحميل الفعالية", "error");
      els.sheetEventName.textContent = "تعذر تحميل الفعالية";
      els.sheetSummary.textContent =
        error?.message === "BACKEND_NOT_CONFIGURED"
          ? "لم يكتمل ربط قاعدة البيانات بعد."
          : "الرابط غير صحيح أو لم تعد الفعالية متاحة.";
    }
  };

  const copyLink = async () => {
    if (!state.publishedUrl) return;
    try {
      await navigator.clipboard.writeText(state.publishedUrl);
      toast("تم نسخ الرابط");
    } catch {
      els.shareUrl.select();
      document.execCommand("copy");
      toast("تم نسخ الرابط");
    }
  };

  const shareLink = async () => {
    if (!state.publishedUrl) return;
    const data = getFormData();
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.eventName || "ورقة إنجاز فعالية",
          text: "ورقة إنجاز الفعالية",
          url: state.publishedUrl
        });
        return;
      } catch {}
    }
    await copyLink();
  };

  const resetForm = () => {
    if (!window.confirm("إنشاء فعالية جديدة؟ سيتم مسح البيانات الحالية من النموذج فقط.")) return;
    els.form.reset();
    state = { id: null, slug: null, logoDataUrl: "", evidence: [], publishedUrl: "" };
    els.sharePanel.classList.add("hidden");
    els.shareBtn.classList.add("hidden");
    els.saveState.textContent = "مسودة";
    els.saveState.removeAttribute("style");
    els.publishBtn.textContent = "نشر الفعالية";
    renderUploads();
    renderSheet();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  els.form.addEventListener("input", () => {
    els.saveState.textContent = state.id ? "تعديلات غير محفوظة" : "مسودة";
    renderSheet();
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    publishEvent();
  });

  els.logoInput.addEventListener("change", async () => {
    const file = els.logoInput.files?.[0];
    if (!file) return;
    try {
      state.logoDataUrl = await compressImage(file, 900, 0.9);
      renderUploads();
      renderSheet();
      toast("تم إضافة الشعار");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      els.logoInput.value = "";
    }
  });

  els.evidenceInput.addEventListener("change", async () => {
    const files = Array.from(els.evidenceInput.files || []);
    if (!files.length) return;
    const available = Math.max(0, MAX_EVIDENCE - state.evidence.length);
    if (!available) {
      toast("الحد الأقصى " + MAX_EVIDENCE + " صور", "error");
      els.evidenceInput.value = "";
      return;
    }
    try {
      const selected = files.slice(0, available);
      const compressed = [];
      for (const file of selected) compressed.push(await compressImage(file));
      state.evidence.push(...compressed);
      renderUploads();
      renderSheet();
      if (files.length > available) toast("تمت إضافة " + available + " صور فقط بسبب الحد الأقصى");
      else toast("تمت إضافة الشواهد");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      els.evidenceInput.value = "";
    }
  });

  els.evidenceManager.addEventListener("click", (event) => {
    const btn = event.target.closest(".remove-evidence");
    if (!btn) return;
    const index = Number(btn.dataset.index);
    state.evidence.splice(index, 1);
    renderUploads();
    renderSheet();
  });

  els.newEventBtn.addEventListener("click", resetForm);
  els.printTopBtn.addEventListener("click", () => window.print());
  els.printBtn.addEventListener("click", () => window.print());
  els.publicPrintBtn.addEventListener("click", () => window.print());
  els.copyLinkBtn.addEventListener("click", copyLink);
  els.shareBtn.addEventListener("click", shareLink);

  if (!HAS_BACKEND) els.backendNotice.classList.remove("hidden");

  const publicSlug = new URLSearchParams(window.location.search).get("event");
  if (publicSlug) {
    loadPublicEvent(publicSlug);
  } else {
    renderUploads();
    renderSheet();
  }
})();
