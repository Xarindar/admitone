const modules = [
  { id: "dashboard", label: "Dashboard", required: true, group: "Platform", summary: "Admin overview and platform status." },
  { id: "settings", label: "Settings", required: true, group: "Platform", summary: "Business configuration, theme, modules, keys." },
  { id: "users", label: "Users", required: true, group: "Platform", summary: "Admin users, roles, and access control." },
  { id: "help", label: "Help", required: true, group: "Platform", summary: "Admin help and module readiness notes." },
  { id: "content", label: "Content", group: "Core", summary: "Site content and basic public copy." },
  { id: "clients", label: "Clients", group: "Core", summary: "Client CRM records and exports." },
  { id: "appointments", label: "Appointments", group: "Scheduling", summary: "Booking queue, appointment detail, status changes." },
  { id: "scheduling", label: "Scheduling", group: "Scheduling", summary: "Services, availability, resources, reminders." },
  { id: "forms", label: "Forms", group: "Operations", summary: "Public forms, submissions, uploads, signatures." },
  { id: "media", label: "Media", group: "Creative", summary: "Media assets and storage mode." },
  { id: "portfolio", label: "Portfolio", group: "Creative", summary: "Galleries, proofing, public gallery access." },
  { id: "testimonials", label: "Testimonials", group: "Marketing", summary: "Reviews, consent, public testimonial display." },
  { id: "products", label: "Products", group: "Commerce", summary: "Products, collections, carts, checkout handoff." },
  { id: "billing", label: "Billing", group: "Commerce", summary: "Invoices, quotes, contracts, payment links." },
  { id: "communications", label: "Communications", group: "Messaging", summary: "Email sender, templates, outbox, provider events." },
  { id: "automation", label: "Automation", group: "Messaging", summary: "Automations and outbound webhook delivery." },
  { id: "analytics", label: "Analytics", group: "Growth", summary: "Analytics events, goals, exports, retention." }
];

const coreIds = new Set(["dashboard", "settings", "users", "help", "content", "clients", "appointments", "scheduling", "forms", "communications"]);
const state = { activeTab: "env" };

const els = {
  businessName: document.querySelector("#businessName"),
  clientSlug: document.querySelector("#clientSlug"),
  adminEmail: document.querySelector("#adminEmail"),
  appUrl: document.querySelector("#appUrl"),
  timezone: document.querySelector("#timezone"),
  themePreset: document.querySelector("#themePreset"),
  moduleGrid: document.querySelector("#moduleGrid"),
  moduleCount: document.querySelector("#moduleCount"),
  clientSlugPreview: document.querySelector("#clientSlugPreview"),
  outputBox: document.querySelector("#outputBox")
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function selectedModuleIds() {
  return [...document.querySelectorAll("[data-module-id]:checked")].map((input) => input.value);
}

function clientData() {
  const selected = selectedModuleIds();
  return {
    clientId: slugify(els.clientSlug.value) || "client-slug",
    businessName: els.businessName.value.trim() || "Client Business",
    adminEmail: els.adminEmail.value.trim() || "owner@example.com",
    appUrl: els.appUrl.value.trim() || "https://example.up.railway.app",
    timezone: els.timezone.value.trim() || "America/Chicago",
    themePreset: els.themePreset.value,
    moduleIncl: selected.join(","),
    modules: selected
  };
}

function renderModules() {
  els.moduleGrid.innerHTML = modules
    .map((module) => {
      const checked = coreIds.has(module.id) || module.required ? "checked" : "";
      const disabled = module.required ? "disabled" : "";
      const requiredClass = module.required ? " required" : "";

      return `
        <label class="module-card${requiredClass}">
          <input data-module-id type="checkbox" value="${module.id}" ${checked} ${disabled} />
          <span>
            <strong>${module.label}</strong>
            <small>${module.summary}</small>
            <span class="pill">${module.required ? "Required" : module.group}</span>
          </span>
        </label>
      `;
    })
    .join("");
}

function envOutput(data) {
  return [
    `MODULE_INCL="${data.moduleIncl}"`,
    `NEXT_PUBLIC_APP_URL="${data.appUrl}"`,
    `ADMIN_EMAIL="${data.adminEmail}"`,
    `CLIENT_ID="${data.clientId}"`,
    `CLIENT_BUSINESS_NAME="${data.businessName}"`,
    `CLIENT_TIMEZONE="${data.timezone}"`,
    `CLIENT_THEME_PRESET="${data.themePreset}"`,
    "",
    "# Railway still needs these generated per client:",
    'DATABASE_URL="postgresql://..."',
    'AUTH_SECRET="replace-with-a-long-random-secret"',
    'ADMIN_PASSWORD="temporary-password-to-rotate"',
    'EMAIL_WORKER_SECRET="replace-with-a-long-random-worker-secret"',
    'MEDIA_URL_SIGNING_SECRET="replace-with-a-long-random-media-secret"'
  ].join("\n");
}

function configOutput(data) {
  return JSON.stringify(
    {
      clientId: data.clientId,
      businessName: data.businessName,
      adminEmail: data.adminEmail,
      appUrl: data.appUrl,
      timezone: data.timezone,
      themePreset: data.themePreset,
      moduleIncl: data.modules,
      generatedAt: new Date().toISOString()
    },
    null,
    2
  );
}

function sqlOutput(data) {
  const moduleRows = data.modules
    .map(
      (moduleId) =>
        `(${sqlString(data.clientId)}, ${sqlString(moduleId)}, true, true, false, false, NOW(), NOW())`
    )
    .join(",\n  ");
  const moduleArray = data.modules.map(sqlString).join(", ");
  const moduleJson = sqlString(JSON.stringify(data.modules));

  return `-- AdmitOne client seed for ${data.businessName}
-- Run after Prisma migrations have created the database schema.

BEGIN;

INSERT INTO "Tenant" ("id", "slug", "name", "createdAt", "updatedAt")
VALUES (${sqlString(data.clientId)}, ${sqlString(data.clientId)}, ${sqlString(data.businessName)}, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "Site" ("id", "tenantId", "slug", "name", "isDefault", "createdAt", "updatedAt")
VALUES (${sqlString(data.clientId)}, ${sqlString(data.clientId)}, ${sqlString(data.clientId)}, ${sqlString(data.businessName)}, true, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

INSERT INTO "SiteSettings" (
  "id",
  "siteId",
  "businessName",
  "contactEmail",
  "timezone",
  "themePreset",
  "enabledModules",
  "createdAt",
  "updatedAt"
)
VALUES (
  ${sqlString(data.clientId)},
  ${sqlString(data.clientId)},
  ${sqlString(data.businessName)},
  ${sqlString(data.adminEmail)},
  ${sqlString(data.timezone)},
  ${sqlString(data.themePreset)},
  ${moduleJson}::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("siteId") DO UPDATE SET
  "businessName" = EXCLUDED."businessName",
  "contactEmail" = EXCLUDED."contactEmail",
  "timezone" = EXCLUDED."timezone",
  "themePreset" = EXCLUDED."themePreset",
  "enabledModules" = EXCLUDED."enabledModules",
  "updatedAt" = NOW();

DELETE FROM "ModuleInstallation"
WHERE "siteId" = ${sqlString(data.clientId)}
  AND "moduleId" NOT IN (${moduleArray});

INSERT INTO "ModuleInstallation" (
  "siteId",
  "moduleId",
  "installed",
  "enabled",
  "visibleToPublic",
  "beta",
  "createdAt",
  "updatedAt"
)
VALUES
  ${moduleRows}
ON CONFLICT ("siteId", "moduleId") DO UPDATE SET
  "installed" = true,
  "enabled" = true,
  "updatedAt" = NOW();

COMMIT;`;
}

function gitOutput(data) {
  return `Recommended client repo files:

config/client.json
railway.env
sql/client-seed.sql

Git handoff:

git checkout -b client/${data.clientId}
mkdir config sql
# Add the generated files above
git add config/client.json railway.env sql/client-seed.sql
git commit -m "Add ${data.businessName} deployment config"
git push origin client/${data.clientId}

Railway:

1. Create a Railway project from the client GitHub repo.
2. Attach Postgres.
3. Add the generated railway.env values.
4. Deploy.
5. Run the SQL seed after migrations, or wire this SQL into a one-time deploy command.

Canonical MODULE_INCL:

${data.moduleIncl}`;
}

function currentOutput(data) {
  if (state.activeTab === "config") return configOutput(data);
  if (state.activeTab === "sql") return sqlOutput(data);
  if (state.activeTab === "git") return gitOutput(data);
  return envOutput(data);
}

function fileNameForTab(data) {
  if (state.activeTab === "config") return "client.config.json";
  if (state.activeTab === "sql") return "client-seed.sql";
  if (state.activeTab === "git") return "git-handoff.txt";
  return "railway.env";
}

function update() {
  const data = clientData();
  els.moduleCount.textContent = String(data.modules.length);
  els.clientSlugPreview.textContent = data.clientId;
  els.outputBox.textContent = currentOutput(data);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function setCoreModules() {
  document.querySelectorAll("[data-module-id]").forEach((input) => {
    input.checked = coreIds.has(input.value) || input.disabled;
  });
  update();
}

function setAllModules() {
  document.querySelectorAll("[data-module-id]").forEach((input) => {
    input.checked = true;
  });
  update();
}

function resetForm() {
  els.businessName.value = "Acme Studio";
  els.clientSlug.value = "acme-studio";
  els.adminEmail.value = "owner@example.com";
  els.appUrl.value = "https://acme-studio.up.railway.app";
  els.timezone.value = "America/Chicago";
  els.themePreset.value = "clean";
  setCoreModules();
}

renderModules();
update();

document.querySelectorAll("input, select").forEach((input) => {
  input.addEventListener("input", () => {
    if (input.id === "businessName" && !els.clientSlug.dataset.touched) {
      els.clientSlug.value = slugify(input.value);
    }
    if (input.id === "clientSlug") {
      els.clientSlug.dataset.touched = "true";
    }
    update();
  });
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    state.activeTab = tab.dataset.tab;
    update();
  });
});

document.querySelector("#selectCoreButton").addEventListener("click", setCoreModules);
document.querySelector("#selectAllButton").addEventListener("click", setAllModules);
document.querySelector("#resetButton").addEventListener("click", resetForm);

document.querySelector("#copyOutputButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(els.outputBox.textContent);
});

document.querySelector("#downloadOutputButton").addEventListener("click", () => {
  const data = clientData();
  downloadText(fileNameForTab(data), currentOutput(data));
});

document.querySelector("#downloadPackageButton").addEventListener("click", () => {
  const data = clientData();
  downloadText(`${data.clientId}-client.config.json`, configOutput(data));
  downloadText(`${data.clientId}-railway.env`, envOutput(data));
  downloadText(`${data.clientId}-client-seed.sql`, sqlOutput(data));
  downloadText(`${data.clientId}-git-handoff.txt`, gitOutput(data));
});
