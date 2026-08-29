const API_URL = "https://customerworker.v987v654v321v0.workers.dev";
const TOKEN_KEY = "private-directory-session";

const elements = {
  loginScreen: document.querySelector("#loginScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginButton: document.querySelector("#loginButton"),
  loginMessage: document.querySelector("#loginMessage"),
  password: document.querySelector("#password"),
  showPasswordButton: document.querySelector("#showPasswordButton"),

  app: document.querySelector("#app"),
  logoutButton: document.querySelector("#logoutButton"),
  editModeButton: document.querySelector("#editModeButton"),
  addCategoryButton: document.querySelector("#addCategoryButton"),
  searchInput: document.querySelector("#searchInput"),
  categoryLinks: document.querySelector("#categoryLinks"),
  directory: document.querySelector("#directory"),

  categoryDialog: document.querySelector("#categoryDialog"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryDialogTitle: document.querySelector("#categoryDialogTitle"),
  categoryIndex: document.querySelector("#categoryIndex"),
  categoryName: document.querySelector("#categoryName"),

  websiteDialog: document.querySelector("#websiteDialog"),
  websiteForm: document.querySelector("#websiteForm"),
  websiteDialogTitle: document.querySelector("#websiteDialogTitle"),
  websiteCategoryIndex: document.querySelector("#websiteCategoryIndex"),
  websiteIndex: document.querySelector("#websiteIndex"),
  websiteName: document.querySelector("#websiteName"),
  websiteUrl: document.querySelector("#websiteUrl"),
  websiteDescription: document.querySelector("#websiteDescription"),

  notification: document.querySelector("#notification")
};

let directoryData = { categories: [] };
let editMode = false;
let notificationTimer;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authenticatedHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${getToken()}`,
    ...extra
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));

  if (response.status === 401) {
    removeToken();
    showLogin();
    throw new Error("Your session has expired. Please enter the password again.");
  }

  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return body;
}

function showLogin() {
  elements.app.classList.add("hidden");
  elements.loginScreen.classList.remove("hidden");
  elements.password.value = "";
  elements.password.focus();
}

function showApp() {
  elements.loginScreen.classList.add("hidden");
  elements.app.classList.remove("hidden");
}

async function loadDirectory() {
  directoryData = await apiRequest("/api/directory", {
    headers: authenticatedHeaders({
      Accept: "application/json"
    })
  });

  validateDirectory(directoryData);
  renderDirectory();
}

async function saveDirectory() {
  validateDirectory(directoryData);

  await apiRequest("/api/directory", {
    method: "PUT",
    headers: authenticatedHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(directoryData)
  });

  showNotification("Changes saved");
}

function validateDirectory(data) {
  if (!data || !Array.isArray(data.categories)) {
    throw new Error("The directory data is invalid.");
  }

  for (const category of data.categories) {
    if (
      typeof category.name !== "string" ||
      !category.name.trim() ||
      !Array.isArray(category.sites)
    ) {
      throw new Error("A category contains invalid data.");
    }

    for (const website of category.sites) {
      if (
        typeof website.name !== "string" ||
        !website.name.trim() ||
        !isValidUrl(website.url)
      ) {
        throw new Error(`A website in ${category.name} contains invalid data.`);
      }
    }
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return replacements[character];
  });
}

function categoryId(name, index) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `category-${slug || index}-${index}`;
}

function renderDirectory() {
  const query = elements.searchInput.value.trim().toLowerCase();

  elements.categoryLinks.innerHTML = directoryData.categories
    .map((category, index) => {
      return `
        <button
          class="category-link"
          type="button"
          data-category-target="${categoryId(category.name, index)}"
        >
          <span>${escapeHtml(category.name)}</span>
          <span>${category.sites.length}</span>
        </button>
      `;
    })
    .join("");

  const filteredCategories = directoryData.categories
    .map((category, categoryIndex) => {
      const sites = category.sites
        .map((website, websiteIndex) => ({
          ...website,
          originalIndex: websiteIndex
        }))
        .filter(website => {
          if (!query) return true;

          return [
            category.name,
            website.name,
            website.url,
            website.description || ""
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        });

      return {
        ...category,
        originalIndex: categoryIndex,
        sites
      };
    })
    .filter(category => category.sites.length > 0 || (!query && editMode));

  if (filteredCategories.length === 0) {
    elements.directory.innerHTML = `
      <div class="empty-state">
        <strong>No matching websites</strong>
        Try a different search.
      </div>
    `;
    return;
  }

  elements.directory.innerHTML = filteredCategories
    .map(category => {
      const categoryIndex = category.originalIndex;

      return `
        <section
          class="category-section"
          id="${categoryId(category.name, categoryIndex)}"
        >
          <div class="category-heading">
            <h2>${escapeHtml(category.name)}</h2>

            ${
              editMode
                ? `
                  <div class="category-actions">
                    <button
                      class="small-button"
                      type="button"
                      data-action="add-website"
                      data-category-index="${categoryIndex}"
                    >
                      Add website
                    </button>

                    <button
                      class="small-button"
                      type="button"
                      data-action="edit-category"
                      data-category-index="${categoryIndex}"
                    >
                      Rename
                    </button>

                    <button
                      class="danger-button"
                      type="button"
                      data-action="delete-category"
                      data-category-index="${categoryIndex}"
                    >
                      Delete
                    </button>
                  </div>
                `
                : ""
            }
          </div>

          ${
            category.sites.length
              ? `
                <div class="website-grid">
                  ${category.sites
                    .map(website =>
                      renderWebsite(
                        website,
                        categoryIndex,
                        website.originalIndex
                      )
                    )
                    .join("")}
                </div>
              `
              : `
                <div class="empty-state">
                  <strong>No websites in this category</strong>
                  Use “Add website” to add the first one.
                </div>
              `
          }
        </section>
      `;
    })
    .join("");
}

function renderWebsite(website, categoryIndex, websiteIndex) {
  let hostname = website.url;

  try {
    hostname = new URL(website.url).hostname.replace(/^www\./, "");
  } catch {
    // Worker validation prevents invalid URLs from being saved.
  }

  return `
    <article class="website-card">
      <a
        class="website-link"
        href="${escapeHtml(website.url)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="website-icon">
          ${escapeHtml(website.name.slice(0, 1))}
        </span>

        <span class="website-details">
          <strong>${escapeHtml(website.name)}</strong>
          <span>
            ${escapeHtml(website.description || hostname)}
          </span>
        </span>

        <span class="website-arrow" aria-hidden="true">↗</span>
      </a>

      ${
        editMode
          ? `
            <div class="website-actions">
              <button
                class="small-button"
                type="button"
                data-action="edit-website"
                data-category-index="${categoryIndex}"
                data-website-index="${websiteIndex}"
              >
                Edit
              </button>

              <button
                class="danger-button"
                type="button"
                data-action="delete-website"
                data-category-index="${categoryIndex}"
                data-website-index="${websiteIndex}"
              >
                Delete
              </button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

function openCategoryDialog(index = null) {
  elements.categoryForm.reset();

  if (index === null) {
    elements.categoryDialogTitle.textContent = "Add category";
    elements.categoryIndex.value = "";
  } else {
    elements.categoryDialogTitle.textContent = "Rename category";
    elements.categoryIndex.value = String(index);
    elements.categoryName.value = directoryData.categories[index].name;
  }

  elements.categoryDialog.showModal();
  elements.categoryName.focus();
}

function openWebsiteDialog(categoryIndex, websiteIndex = null) {
  elements.websiteForm.reset();
  elements.websiteCategoryIndex.value = String(categoryIndex);

  if (websiteIndex === null) {
    elements.websiteDialogTitle.textContent = "Add website";
    elements.websiteIndex.value = "";
  } else {
    const website =
      directoryData.categories[categoryIndex].sites[websiteIndex];

    elements.websiteDialogTitle.textContent = "Edit website";
    elements.websiteIndex.value = String(websiteIndex);
    elements.websiteName.value = website.name;
    elements.websiteUrl.value = website.url;
    elements.websiteDescription.value = website.description || "";
  }

  elements.websiteDialog.showModal();
  elements.websiteName.focus();
}

function closeDialog(dialog) {
  dialog.close();
}

function showNotification(message, error = false) {
  clearTimeout(notificationTimer);

  elements.notification.textContent = message;
  elements.notification.classList.toggle("error", error);
  elements.notification.classList.add("visible");

  notificationTimer = setTimeout(() => {
    elements.notification.classList.remove("visible");
  }, 2600);
}

async function commitChange(changeFunction) {
  const previousData = structuredClone(directoryData);

  try {
    changeFunction();
    renderDirectory();
    await saveDirectory();
  } catch (error) {
    directoryData = previousData;
    renderDirectory();
    showNotification(error.message, true);
  }
}

elements.loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  elements.loginButton.disabled = true;
  elements.loginButton.textContent = "Checking…";
  elements.loginMessage.textContent = "";

  try {
    const result = await apiRequest("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password: elements.password.value
      })
    });

    setToken(result.token);
    await loadDirectory();
    showApp();
  } catch (error) {
    elements.loginMessage.textContent =
      error.message === "Incorrect password"
        ? "Incorrect password."
        : error.message;
  } finally {
    elements.loginButton.disabled = false;
    elements.loginButton.textContent = "Unlock directory";
  }
});

elements.showPasswordButton.addEventListener("click", () => {
  const showing = elements.password.type === "text";
  elements.password.type = showing ? "password" : "text";
  elements.showPasswordButton.textContent = showing ? "Show" : "Hide";
});

elements.logoutButton.addEventListener("click", () => {
  removeToken();
  directoryData = { categories: [] };
  editMode = false;
  showLogin();
});

elements.editModeButton.addEventListener("click", () => {
  editMode = !editMode;

  elements.editModeButton.textContent = editMode
    ? "Finish editing"
    : "Edit directory";

  elements.addCategoryButton.classList.toggle("hidden", !editMode);
  renderDirectory();
});

elements.addCategoryButton.addEventListener("click", () => {
  openCategoryDialog();
});

elements.searchInput.addEventListener("input", renderDirectory);

elements.categoryLinks.addEventListener("click", event => {
  const button = event.target.closest("[data-category-target]");
  if (!button) return;

  document
    .getElementById(button.dataset.categoryTarget)
    ?.scrollIntoView({ behavior: "smooth" });
});

elements.categoryForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = elements.categoryName.value.trim();
  const indexValue = elements.categoryIndex.value;
  const editingIndex = indexValue === "" ? null : Number(indexValue);

  const duplicate = directoryData.categories.some((category, index) => {
    return (
      index !== editingIndex &&
      category.name.toLowerCase() === name.toLowerCase()
    );
  });

  if (duplicate) {
    showNotification("A category with that name already exists.", true);
    return;
  }

  closeDialog(elements.categoryDialog);

  await commitChange(() => {
    if (editingIndex === null) {
      directoryData.categories.push({
        name,
        sites: []
      });
    } else {
      directoryData.categories[editingIndex].name = name;
    }
  });
});

elements.websiteForm.addEventListener("submit", async event => {
  event.preventDefault();

  const categoryIndex = Number(elements.websiteCategoryIndex.value);
  const websiteIndexValue = elements.websiteIndex.value;
  const websiteIndex =
    websiteIndexValue === "" ? null : Number(websiteIndexValue);

  const website = {
    name: elements.websiteName.value.trim(),
    url: elements.websiteUrl.value.trim(),
    description: elements.websiteDescription.value.trim()
  };

  if (!isValidUrl(website.url)) {
    showNotification("Enter a valid http or https URL.", true);
    return;
  }

  closeDialog(elements.websiteDialog);

  await commitChange(() => {
    if (websiteIndex === null) {
      directoryData.categories[categoryIndex].sites.push(website);
    } else {
      directoryData.categories[categoryIndex].sites[websiteIndex] = website;
    }
  });
});

elements.directory.addEventListener("click", async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const categoryIndex = Number(button.dataset.categoryIndex);
  const websiteIndex = Number(button.dataset.websiteIndex);

  if (action === "add-website") {
    openWebsiteDialog(categoryIndex);
  }

  if (action === "edit-category") {
    openCategoryDialog(categoryIndex);
  }

  if (action === "edit-website") {
    openWebsiteDialog(categoryIndex, websiteIndex);
  }

  if (action === "delete-category") {
    const category = directoryData.categories[categoryIndex];

    const confirmed = confirm(
      `Delete “${category.name}” and all of its websites?`
    );

    if (!confirmed) return;

    await commitChange(() => {
      directoryData.categories.splice(categoryIndex, 1);
    });
  }

  if (action === "delete-website") {
    const website =
      directoryData.categories[categoryIndex].sites[websiteIndex];

    const confirmed = confirm(`Delete “${website.name}”?`);
    if (!confirmed) return;

    await commitChange(() => {
      directoryData.categories[categoryIndex].sites.splice(websiteIndex, 1);
    });
  }
});

document.querySelectorAll("[data-close-dialog]").forEach(button => {
  button.addEventListener("click", () => {
    button.closest("dialog").close();
  });
});

async function initialize() {
  if (!getToken()) {
    showLogin();
    return;
  }

  try {
    await loadDirectory();
    showApp();
  } catch {
    showLogin();
  }
}

initialize();
