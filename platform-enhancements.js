(() => {
  const parts = [
    "./platform-enhancements.1.b64",
    "./platform-enhancements.2.b64",
    "./platform-enhancements.3.b64",
    "./platform-enhancements.4.b64",
    "./platform-enhancements.5.b64"
  ];

  Promise.all(parts.map(async (url) => {
    const response = await fetch(url + "?v=1", { cache: "no-store" });
    if (!response.ok) throw new Error("تعذر تحميل تحديث المنصة");
    return (await response.text()).trim();
  }))
    .then((chunks) => {
      const b64 = chunks.join("");
      const binary = atob(b64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const code = new TextDecoder("utf-8").decode(bytes);
      new Function(code)();
    })
    .catch((error) => {
      console.error("Platform enhancements failed:", error);
    });
})();
