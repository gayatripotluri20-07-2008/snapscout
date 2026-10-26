const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const clearBtn = document.getElementById("clear-btn");
const results = document.getElementById("results");
const countEl = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");

const API = "https://commons.wikimedia.org/w/api.php";
const IDLE_MESSAGE = "🔭 Search above to start scouting.";
const BASE_TITLE = "SnapScout – Find the perfect picture";

let latestRequest = 0; // lets us ignore out-of-date responses

function buildUrl(query) {
  const params =
    "action=query&generator=search&gsrnamespace=6&gsrlimit=12" +
    "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=400" +
    "&format=json&origin=*";
  const search = encodeURIComponent("filetype:bitmap " + query);
  return `${API}?${params}&gsrsearch=${search}`;
}

// The artist field comes back as HTML, so reduce it to plain text.
function plainText(html) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent.trim();
}

function createCard(page) {
  const info = page.imageinfo[0];

  const card = document.createElement("a");
  card.className = "card";
  card.href = info.descriptionurl;
  card.target = "_blank";
  card.rel = "noopener";

  const img = document.createElement("img");
  img.src = info.thumburl || info.url;
  img.alt = page.title;
  img.loading = "lazy";

  const body = document.createElement("div");
  body.className = "card-body";

  const title = document.createElement("h3");
  title.textContent = page.title.replace(/^File:/, "").replace(/\.[^.]+$/, "");

  const artist = info.extmetadata?.Artist?.value;
  const author = document.createElement("p");
  author.textContent = "By " + (artist ? plainText(artist) : "Unknown");

  body.append(title, author);
  card.append(img, body);
  return card;
}

// LOADING state: grey placeholder cards
function showSkeletons(count = 8) {
  results.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "card skeleton";
    sk.innerHTML =
      '<div class="sk-img"></div>' +
      '<div class="card-body"><div class="sk-line"></div><div class="sk-line short"></div></div>';
    results.appendChild(sk);
  }
}

function showMessage(text) {
  emptyState.textContent = text;
  emptyState.hidden = false;
}

async function search(query) {
  query = query.trim();

  // Blank search: don't call the API, just nudge the user
  if (!query) {
    countEl.textContent = "Please type a word to search.";
    return;
  }

  const requestId = ++latestRequest;
  searchBtn.disabled = true;
  emptyState.hidden = true;
  countEl.innerHTML = '<span class="spinner"></span> Searching…';
  showSkeletons();

  try {
    const response = await fetch(buildUrl(query));
    if (!response.ok) throw new Error("Bad status: " + response.status);
    const data = await response.json();

    if (requestId !== latestRequest) return; // a newer search took over

    results.innerHTML = ""; // clear skeletons / old results
    const pages = data.query ? Object.values(data.query.pages) : [];
    const items = pages
      .filter((p) => p.imageinfo)
      .sort((a, b) => a.index - b.index);

    if (items.length === 0) {
      // EMPTY state
      countEl.textContent = `Showing 0 results for “${query}”`;
      showMessage(`😕 No results for “${query}”. Try another word.`);
    } else {
      // RESULTS state
      items.forEach((page) => results.appendChild(createCard(page)));
      countEl.textContent = `Showing ${items.length} results for “${query}”`;
      emptyState.hidden = true;
      document.title = `${query} – SnapScout`; // polish touch
    }
  } catch (error) {
    // ERROR state
    if (requestId !== latestRequest) return;
    results.innerHTML = "";
    countEl.textContent = "";
    showMessage("⚠️ Something went wrong. Check your connection and try again.");
  } finally {
    if (requestId === latestRequest) searchBtn.disabled = false;
  }
}

// Catch the search (click or Enter)
form.addEventListener("submit", (event) => {
  event.preventDefault();
  search(input.value);
});

// Quick-pick chips run a search
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.textContent;
    search(chip.textContent);
  });
});

// Clear: back to the IDLE state
clearBtn.addEventListener("click", () => {
  latestRequest++; // cancel any search still in flight
  searchBtn.disabled = false;
  results.innerHTML = "";
  countEl.textContent = "Showing 0 results";
  showMessage(IDLE_MESSAGE);
  document.title = BASE_TITLE;
});