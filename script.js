const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const results = document.getElementById("results");
const countEl = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");

const API = "https://commons.wikimedia.org/w/api.php";

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
  card.href = info.descriptionurl;   // opens the full image page
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

async function search(query) {
  query = query.trim();
  if (!query) return;                       // ignore blank searches

  const response = await fetch(buildUrl(query));
  if (!response.ok) {                       // check before using the data
    countEl.textContent = "Something went wrong. Try again.";
    return;
  }
  const data = await response.json();

  results.innerHTML = "";                   // clear old results
  const pages = data.query ? Object.values(data.query.pages) : [];
  const items = pages
    .filter((p) => p.imageinfo)
    .sort((a, b) => a.index - b.index);

  items.forEach((page) => results.appendChild(createCard(page)));

  countEl.textContent = `Showing ${items.length} results for “${query}”`;
  emptyState.hidden = items.length > 0;
  if (items.length === 0) emptyState.textContent = "No results found. Try another word.";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  search(input.value);
});

// Enhancement: quick-pick chips run a search
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.textContent;
    search(chip.textContent);
  });
});
// Enhancement: Clear also empties the grid
clearBtn.addEventListener("click", () => {
  results.innerHTML = "";
  countEl.textContent = "Showing 0 results";
  emptyState.hidden = false;
  emptyState.textContent = "🔭 Search above to start scouting.";
});
