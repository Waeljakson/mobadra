window.MOBADRA_CONFIG = {
  appName: "التحول الذكي في التعليم",
  backendMode: "data-api",
  dataApiUrl: "https://ep-square-cell-b4zrcv3b.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1",
  authBaseUrl: "https://ep-square-cell-b4zrcv3b.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth",
  requiresAdminKey: false,
  maxEvidenceImages: 6,
  maxImageWidth: 1100,
  jpegQuality: 0.76
};

(() => {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "./platform-enhancements.css?v=1";
  document.head.appendChild(css);

  const script = document.createElement("script");
  script.src = "./platform-enhancements.js?v=1";
  script.defer = true;
  document.head.appendChild(script);
})();
