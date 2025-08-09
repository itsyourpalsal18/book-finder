console.log("📚 Book Finder loaded");

document.getElementById("search-btn").addEventListener("click", () => {
  const query = document.getElementById("search-input").value.trim();
  if (query) {
    alert(`You searched for: ${query}`);
  }
});

// ====== Book Finder: Search Functionality ======

// DOM refs
const searchInput = document.getElementById("search-input");
const searchBtn   = document.getElementById("search-btn");
const resultsEl   = document.getElementById("results");
const historyEl   = document.getElementById("search-history");
const HISTORY_KEY = "searchHistory";
const READING_KEY = "readingList";
const LAST_QUERY_KEY = "lastQuery";

// Hook up search button
searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) {
    alert("Please enter a search term.");
    return;
  }
  runSearch(query);
  saveSearch(query);
});

// Optional: allow Enter key to search
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    searchBtn.click();
  }
});

const clearHistoryBtn = document.getElementById("clear-history");
clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

// Main search flow
async function runSearch(query) {
  clearResults();
  showLoading();

  localStorage.setItem(LAST_QUERY_KEY, query);

  try {
    const books = await fetchBooks(query);
    renderResults(books);
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = renderMessageCard("Could not fetch books. Please try again.");
  } finally {
    hideLoading();
  }
}

// Fetch from Google Books API
async function fetchBooks(query) {
  // encode user input so spaces/special chars work
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();

  // Normalize empty results
  if (!data.items || data.items.length === 0) return [];
  return data.items;
}

// Render all result cards
function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = renderMessageCard("No results found. Try another search.");
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const v = item.volumeInfo || {};
    const title = v.title || "Untitled";
    const authors = Array.isArray(v.authors) ? v.authors.join(", ") : "Unknown Author";
    const thumb = v.imageLinks?.thumbnail || "https://via.placeholder.com/128x195?text=No+Image";
    const desc = v.description ? v.description.slice(0, 140) + "…" : "No description available.";
    const preview = v.previewLink || v.infoLink || "#";

    // column
    const col = document.createElement("div");
    col.className = "col-12 col-sm-6 col-lg-4 mb-4";

    // card
    col.innerHTML = `
        <div class="card h-100">
            <img src="${thumb}" loading="lazy" class="card-img-top" alt="Book cover for ${escapeHtml(title)}">
            <div class="card-body d-flex flex-column">
                <h5 class="card-title">${escapeHtml(title)}</h5>
                <p class="card-text"><em>${escapeHtml(authors)}</em></p>
                <p class="card-text line-clamp-3">${escapeHtml(desc)}</p>
                <div class="mt-auto d-grid gap-2">
                    ${preview && preview !== '#'
                        ? `<a class="btn btn-outline-primary btn-sm" href="${preview}" target="_blank" rel="noopener" aria-label="Preview ${escapeHtmlAttr(title)}">Preview</a>`
                        : `<button class="btn btn-outline-secondary btn-sm" disabled aria-disabled="true" title="No preview available">No Preview</button>`}
                    <button class="btn btn-success btn-sm" data-title="${escapeHtmlAttr(title)}" aria-label="Save ${escapeHtmlAttr(title)} to reading list">Save to Reading List</button>
                </div>
            </div>
        </div>
    `;

    // add save handler
    const saveBtn = col.querySelector("button");
    saveBtn.addEventListener("click", () => {
      addToReadingList(saveBtn.dataset.title);
    });

    fragment.appendChild(col);
  });

  resultsEl.appendChild(fragment);
}

// Basic reading list (localStorage)
function addToReadingList(title) {
  const key = "readingList";
  let list = JSON.parse(localStorage.getItem(key)) || [];
  if (!list.includes(title)) {
    list.unshift(title);
    localStorage.setItem(key, JSON.stringify(list));
    alert(`Saved: ${title}`);
    renderReadingList();
  }
}

function renderReadingList() {
  const key = "readingList";
  const ul = document.getElementById("reading-list");
  ul.innerHTML = "";
  const list = JSON.parse(localStorage.getItem(key)) || [];

  list.forEach((t) => {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    li.textContent = t;

    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-danger";
    btn.textContent = "Remove";
    btn.addEventListener("click", () => {
      removeFromReadingList(t);
    });

    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function removeFromReadingList(title) {
  const key = "readingList";
  let list = JSON.parse(localStorage.getItem(key)) || [];
  list = list.filter((t) => t !== title);
  localStorage.setItem(key, JSON.stringify(list));
  renderReadingList();
}

// Search history (localStorage)
function saveSearch(q) {
  const key = "searchHistory";
  let history = JSON.parse(localStorage.getItem(key)) || [];
  // keep unique & last 8
  history = [q, ...history.filter((h) => h.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  localStorage.setItem(key, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const key = "searchHistory";
  const history = JSON.parse(localStorage.getItem(key)) || [];
  historyEl.innerHTML = "";

  history.forEach((q) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.textContent = q;
    li.addEventListener("click", () => runSearch(q));
    historyEl.appendChild(li);
  });

  li.tabIndex = 0; // focusable
    li.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            runSearch(q);
        }
    });
}

// Small helpers
function clearResults() {
  resultsEl.innerHTML = "";
}
function showLoading() {
  resultsEl.innerHTML = `
    <div class="d-flex justify-content-center my-4">
      <div class="spinner-border" role="status" aria-label="Loading results"></div>
    </div>`;
}
function hideLoading() {
  // no-op: renderResults replaces content
}
function renderMessageCard(msg) {
  return `
    <div class="col-12">
      <div class="alert alert-info text-center" role="alert">${escapeHtml(msg)}</div>
    </div>`;
}

// minimal escaping for safety in HTML/attrs
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
function escapeHtmlAttr(str) {
  // same as escapeHtml for this simple usage
  return escapeHtml(str);
}

// init
renderHistory();
renderReadingList();

// Auto-run last search (nice UX)
const last = localStorage.getItem(LAST_QUERY_KEY);
if (last) {
  searchInput.value = last;
  runSearch(last);
}