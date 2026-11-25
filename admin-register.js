
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "./admin-service-worker.js",
        { scope: "./" }
      );

      console.log(
        "DR. KHALED Admin PWA registered:",
        registration.scope
      );
    } catch (error) {
      console.error("Admin PWA registration failed:", error);
    }
  });
}
