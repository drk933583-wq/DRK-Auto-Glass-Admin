
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {

    navigator.serviceWorker.register(
      "./service-worker.js",
      { scope: "./" }
    )
    .then(registration => {
      console.log(
        "DR. KHALED App Registered:",
        registration.scope
      );
    })
    .catch(error => {
      console.error(
        "PWA Registration Error:",
        error
      );
    });

  });
}
