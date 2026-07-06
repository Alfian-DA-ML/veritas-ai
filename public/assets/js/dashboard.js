const API_URL_ME = `${CONFIG.BASE_URL}/auth_user/me.php`;
const API_URL_ANALYZE = `${CONFIG.BASE_URL}/analysis/analyze.php`;
const API_URL_HISTORY = `${CONFIG.BASE_URL}/analysis/history.php`;
const API_URL_DELETE = `${CONFIG.BASE_URL}/analysis/delete_history.php`;

const usernameDisplay = document.getElementById("usernameDisplay");
const logoutButton = document.getElementById("logoutButton");
const analyzeForm = document.getElementById("analyzeForm");
const urlInput = document.getElementById("urlInput");
const analyzeButton = document.getElementById("analyzeButton");
const refreshButton = document.getElementById("refreshButton");

const urlField = document.getElementById("urlField");
const urlError = document.getElementById("urlError");

const resultEmpty = document.getElementById("resultEmpty");
const resultContent = document.getElementById("resultContent");
const verdictBadge = document.getElementById("verdictBadge");
const verdictLabel = document.getElementById("verdictLabel");
const resultTitle = document.getElementById("resultTitle");
const confidenceBar = document.getElementById("confidenceBar");
const confidenceValue = document.getElementById("confidenceValue");
const resultExplanation = document.getElementById("resultExplanation");

const claimsSection = document.getElementById("claimsSection");
const claimsList = document.getElementById("claimsList");
const evidenceSection = document.getElementById("evidenceSection");
const evidenceList = document.getElementById("evidenceList");
const reportMetaSection = document.getElementById("reportMetaSection");
const reportMetaList = document.getElementById("reportMetaList");

const historyEmpty = document.getElementById("historyEmpty");
const historyList = document.getElementById("historyList");

let latestHistory = [];

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function redirectToLogin() {
  window.location.replace("login.html");
}

function buildAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function clearAuthData() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}

function setFieldError(message) {
  urlError.textContent = message;
  urlField.classList.toggle("is-error", Boolean(message));
}

function clearFieldError() {
  urlError.textContent = "";
  urlField.classList.remove("is-error");
}

function validateUrl() {
  const value = urlInput.value.trim();

  if (!value) {
    setFieldError("Please enter a news article URL.");
    return false;
  }

  try {
    new URL(value);
  } catch {
    setFieldError(
      "Please enter a valid URL (e.g. https://example.com/article).",
    );
    return false;
  }

  clearFieldError();
  return true;
}

function setAnalyzeLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeButton.classList.toggle("is-loading", isLoading);
}

function setRefreshLoading(isLoading) {
  refreshButton.classList.toggle("is-loading", isLoading);
  refreshButton.disabled = isLoading;
}

function normalizeVerdict(raw) {
  const value = (raw || "").toLowerCase();

  if (value.includes("fake") || value.includes("false")) return "fake";
  if (value.includes("real") || value.includes("true")) return "real";

  return "uncertain";
}

function verdictDisplayLabel(key) {
  const labels = {
    fake: "Likely False",
    real: "Likely Real",
    uncertain: "Needs Verification",
  };

  return labels[key] || "Needs Verification";
}

function safeUrl(url) {
  try {
    return new URL(url).href;
  } catch {
    return "#";
  }
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Unknown source";
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(ms) {
  const value = Number(ms);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function renderClaims(claims) {
  clearChildren(claimsList);

  if (!Array.isArray(claims) || claims.length === 0) {
    claimsSection.hidden = true;
    return;
  }

  claims.forEach((claim) => {
    const li = document.createElement("li");
    li.textContent = claim;
    claimsList.appendChild(li);
  });

  claimsSection.hidden = false;
}

function renderEvidence(evidence) {
  clearChildren(evidenceList);

  if (!Array.isArray(evidence) || evidence.length === 0) {
    evidenceSection.hidden = true;
    return;
  }

  evidence.forEach((item) => {
    const card = document.createElement("article");
    card.className = "evidence-item";

    const source = document.createElement("span");
    source.className = "evidence-item__source";
    source.textContent = item.source || getDomain(item.url);

    const title = document.createElement("a");
    title.className = "evidence-item__title";
    title.href = safeUrl(item.url);
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.textContent = item.title || "Untitled evidence source";

    const snippet = document.createElement("p");
    snippet.className = "evidence-item__snippet";
    snippet.textContent = item.snippet || "No snippet available.";

    card.appendChild(source);
    card.appendChild(title);
    card.appendChild(snippet);
    evidenceList.appendChild(card);
  });

  evidenceSection.hidden = false;
}

function addMetaItem(label, value) {
  if (!value) return;

  const item = document.createElement("div");
  item.className = "report-meta__item";

  const labelEl = document.createElement("span");
  labelEl.className = "report-meta__label";
  labelEl.textContent = label;

  const valueEl = document.createElement("span");
  valueEl.className = "report-meta__value";
  valueEl.textContent = value;

  item.appendChild(labelEl);
  item.appendChild(valueEl);
  reportMetaList.appendChild(item);
}

function renderReportMeta(data, sourceUrl) {
  clearChildren(reportMetaList);

  const processingTime = formatDuration(data.processing_time_ms);
  const modelName = data.model_name || null;
  const sourceDomain = sourceUrl ? getDomain(sourceUrl) : null;
  const createdAt = data.created_at ? formatDate(data.created_at) : null;

  addMetaItem("Source Domain", sourceDomain);
  addMetaItem("AI Model", modelName);
  addMetaItem("Processing Time", processingTime);
  addMetaItem("Report Date", createdAt);

  reportMetaSection.hidden = reportMetaList.children.length === 0;
}

function renderResult(data) {
  const verdictKey = normalizeVerdict(data.verdict);
  const confidence = Math.round(parseFloat(data.confidence_score) || 0);
  const sourceUrl = data.source_url || data.url || urlInput.value.trim();

  verdictBadge.textContent = verdictDisplayLabel(verdictKey);
  verdictBadge.className = `result-verdict__badge result-verdict__badge--${verdictKey}`;
  verdictLabel.textContent = `${confidence}% evidence confidence`;

  resultTitle.textContent = data.title || sourceUrl || "Untitled article";
  resultExplanation.textContent =
    data.explanation || "No reasoning summary provided.";

  confidenceBar.className = `result-confidence__bar-fill result-confidence__bar-fill--${verdictKey}`;
  confidenceBar.style.width = "0%";
  confidenceValue.textContent = `${confidence}%`;

  requestAnimationFrame(() => {
    confidenceBar.style.width = `${confidence}%`;
  });

  renderClaims(data.claims || []);
  renderEvidence(data.evidence || []);
  renderReportMeta(data, sourceUrl);

  resultEmpty.hidden = true;
  resultContent.hidden = false;
}

function createHistoryItem(item, index) {
  const verdictKey = normalizeVerdict(item.verdict);
  const confidence = Math.round(parseFloat(item.confidence_score) || 0);

  const el = document.createElement("article");
  el.className = "history-item";

  const content = document.createElement("div");
  content.className = "history-item__content";

  const title = document.createElement("p");
  title.className = "history-item__title";
  title.textContent = item.title || item.url || "Untitled article";

  const meta = document.createElement("div");
  meta.className = "history-item__meta";

  const url = document.createElement("a");
  url.className = "history-item__url";
  url.href = safeUrl(item.url);
  url.target = "_blank";
  url.rel = "noopener noreferrer";
  url.textContent = item.url || "No URL";

  const confidenceText = document.createElement("span");
  confidenceText.className = "history-item__confidence";
  confidenceText.textContent = `${confidence}% confidence`;

  const date = document.createElement("span");
  date.className = "history-item__date";
  date.textContent = formatDate(item.created_at);

  meta.appendChild(url);
  meta.appendChild(confidenceText);
  meta.appendChild(date);

  content.appendChild(title);
  content.appendChild(meta);

  const side = document.createElement("div");
  side.className = "history-item__side";

  const badge = document.createElement("span");
  badge.className = `history-item__badge history-item__badge--${verdictKey}`;
  badge.textContent = verdictDisplayLabel(verdictKey);

  const detailButton = document.createElement("button");
  detailButton.type = "button";
  detailButton.className = "history-item__detail";
  detailButton.dataset.index = String(index);
  detailButton.textContent = "View Report";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "history-item__delete";
  deleteButton.dataset.id = item.id;
  deleteButton.textContent = "Delete";

  side.appendChild(badge);
  side.appendChild(detailButton);
  side.appendChild(deleteButton);

  el.appendChild(content);
  el.appendChild(side);

  return el;
}

function renderHistory(items) {
  clearChildren(historyList);
  latestHistory = Array.isArray(items) ? items : [];

  if (latestHistory.length === 0) {
    historyEmpty.hidden = false;
    historyList.hidden = true;
    return;
  }

  historyEmpty.hidden = true;
  historyList.hidden = false;

  latestHistory.forEach((item, index) => {
    historyList.appendChild(createHistoryItem(item, index));
  });
}

async function fetchMe() {
  const response = await fetch(API_URL_ME, {
    method: "GET",
    headers: buildAuthHeaders(),
  });

  return await response.json();
}

async function fetchHistory() {
  const response = await fetch(API_URL_HISTORY, {
    method: "GET",
    headers: buildAuthHeaders(),
  });

  return await response.json();
}

async function postAnalyze(url) {
  const response = await fetch(API_URL_ANALYZE, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: JSON.stringify({ url }),
  });

  return await response.json();
}

async function initPage() {
  const token = getToken();

  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const result = await fetchMe();

    if (!result.success) {
      clearAuthData();
      redirectToLogin();
      return;
    }

    usernameDisplay.textContent =
      result.data?.user?.username || result.data?.user?.email || "User";
  } catch {
    clearAuthData();
    redirectToLogin();
    return;
  }

  await loadHistory();
}

async function loadHistory() {
  setRefreshLoading(true);

  try {
    const result = await fetchHistory();

    if (result.success) {
      renderHistory(result.data?.history || []);
    } else {
      renderHistory([]);
    }
  } catch {
    renderHistory([]);
  } finally {
    setRefreshLoading(false);
  }
}

async function handleAnalyzeSubmit(event) {
  event.preventDefault();

  if (!validateUrl()) return;

  const url = urlInput.value.trim();

  setAnalyzeLoading(true);
  clearFieldError();

  try {
    const result = await postAnalyze(url);

    if (result.success) {
      renderResult(result.data.analysis);
      await loadHistory();
    } else {
      setFieldError(result.message || "Verification failed. Please try again.");
    }
  } catch {
    setFieldError("Unable to connect to the server. Please try again later.");
  } finally {
    setAnalyzeLoading(false);
  }
}

function handleLogout() {
  const confirmed = confirm("Are you sure you want to sign out?");

  if (!confirmed) {
    return;
  }

  clearAuthData();
  window.location.replace("login.html");
}

async function deleteHistory(id) {
  const response = await fetch(`${API_URL_DELETE}?id=${id}`, {
    method: "DELETE",
    headers: buildAuthHeaders(),
  });

  return await response.json();
}

async function handleHistoryClick(event) {
  const detailButton = event.target.closest(".history-item__detail");
  const deleteButton = event.target.closest(".history-item__delete");

  if (detailButton) {
    const index = Number(detailButton.dataset.index);
    const item = latestHistory[index];

    if (item) {
      renderResult(item);
      document.getElementById("resultCard").scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    return;
  }

  if (!deleteButton) return;

  const historyId = deleteButton.dataset.id;
  const confirmed = confirm("Delete this verification report?");

  if (!confirmed) {
    return;
  }

  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting...";

  try {
    const result = await deleteHistory(historyId);

    if (result.success) {
      await loadHistory();
    } else {
      alert(result.message || "Failed to delete report.");
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete";
    }
  } catch {
    alert("Unable to connect to the server. Please try again later.");
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
}

analyzeForm.addEventListener("submit", handleAnalyzeSubmit);
urlInput.addEventListener("blur", validateUrl);
logoutButton.addEventListener("click", handleLogout);
refreshButton.addEventListener("click", loadHistory);
historyList.addEventListener("click", handleHistoryClick);

initPage();
