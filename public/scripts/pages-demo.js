document.querySelectorAll("[data-demo-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const status = form.querySelector("[data-demo-status]");
    if (status) {
      status.textContent =
        "Validation passed. This demo does not send or store your information.";
      status.hidden = false;
    }
  });
});

document.querySelectorAll("[data-demo-oauth]").forEach((button) => {
  button.addEventListener("click", () => {
    const status = button
      .closest(".col-sm-4")
      ?.querySelector("[data-demo-oauth-status]");
    if (status) {
      status.textContent =
        "Google sign-in is a demo only. Authentication requires a server-side OAuth callback.";
    }
  });
});
