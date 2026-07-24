/* =========================================================
   PERSONAS V7 — TARJETAS INTEGRADAS
   ========================================================= */

const PHOTO_BY_ID = {
  P001: "./img/personas/gotzon-zubiaur.jpg",
  P002: "./img/personas/jon-arostegi.jpg",
  P003: "./img/personas/mikel-agirre.jpg",
  P004: "./img/personas/jose-fonta.jpg",
  P005: "./img/personas/josu-zubiaur.jpg",
};

const PEOPLE = [
  { id: "P001", name: "Gotzon Zubiaur", firstYear: 2010, lastYear: 2025, summits: 28, trips: 8 },
  { id: "P002", name: "Jon Arostegi", firstYear: 2013, lastYear: 2025, summits: 31, trips: 7 },
  { id: "P003", name: "Mikel Agirre", firstYear: 2013, lastYear: 2024, summits: 24, trips: 6 },
  { id: "P004", name: "Jose Fonta", firstYear: 2016, lastYear: 2024, summits: 20, trips: 5 },
  { id: "P005", name: "Josu Zubiaur", firstYear: 2015, lastYear: 2025, summits: 19, trips: 5 },
  { id: "P006", name: "Roberto Fernandez", firstYear: 2017, lastYear: 2017, summits: 1, trips: 1 },
  { id: "P007", name: "Raul Primo", firstYear: 2022, lastYear: 2022, summits: 1, trips: 1 },
  { id: "P008", name: "Javi Lozano", firstYear: 2019, lastYear: 2019, summits: 2, trips: 1 },
  { id: "P009", name: "Miguel del Rio", firstYear: 2016, lastYear: 2016, summits: 3, trips: 1 },
  { id: "P011", name: "Oscar Garro", firstYear: 2024, lastYear: 2024, summits: 1, trips: 1 },
].map((person) => ({ ...person, photo: PHOTO_BY_ID[person.id] || "" }));

const state = { query: "", sort: "summits-desc" };
const grid = document.querySelector("#people-grid");
const count = document.querySelector("#people-count");
const empty = document.querySelector("#people-empty");
const search = document.querySelector("#people-search");
const sort = document.querySelector("#people-sort");

function normalise(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function personImage(person) {
  if (!person.photo) {
    return `<span class="person-card__fallback" aria-hidden="true">${initials(person.name)}</span>`;
  }

  return `<img src="${person.photo}" alt="${person.name} en la montaña" loading="lazy" decoding="async">`;
}

function personCard(person) {
  const href = `./persona.html?id=${encodeURIComponent(person.id)}`;
  const summitLabel = person.summits === 1 ? "Cumbre" : "Cumbres";
  const tripLabel = person.trips === 1 ? "Viaje" : "Viajes";

  return `
    <article class="person-card">
      <a class="person-card__link" href="${href}" aria-label="Ver la historia compartida con ${person.name}">
        <div class="person-card__visual">
          ${personImage(person)}
          <div class="person-card__shade" aria-hidden="true"></div>
          <h2>${person.name}</h2>
        </div>

        <div class="person-card__footer">
          <div class="person-card__stat">
            <strong>${person.summits}</strong>
            <span>${summitLabel}</span>
          </div>
          <div class="person-card__stat">
            <strong>${person.trips}</strong>
            <span>${tripLabel}</span>
          </div>
          <span class="person-card__action">Ver historia <span aria-hidden="true">→</span></span>
        </div>
      </a>
    </article>`;
}

function sortedPeople(items) {
  const result = [...items];
  const byName = (a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });

  switch (state.sort) {
    case "trips-desc":
      return result.sort((a, b) => b.trips - a.trips || b.summits - a.summits || byName(a, b));
    case "recent-desc":
      return result.sort((a, b) => b.lastYear - a.lastYear || b.summits - a.summits || byName(a, b));
    case "first-asc":
      return result.sort((a, b) => a.firstYear - b.firstYear || byName(a, b));
    case "name-asc":
      return result.sort(byName);
    default:
      return result.sort((a, b) => b.summits - a.summits || b.trips - a.trips || byName(a, b));
  }
}

function render() {
  const query = normalise(state.query);
  const filtered = query
    ? PEOPLE.filter((person) => normalise(person.name).includes(query))
    : PEOPLE;
  const visible = sortedPeople(filtered);

  grid.innerHTML = visible.map(personCard).join("");
  count.textContent = visible.length === 1 ? "1 compañero" : `${visible.length} compañeros`;
  grid.hidden = visible.length === 0;
  empty.hidden = visible.length !== 0;
}

search.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  render();
});

sort.addEventListener("change", (event) => {
  state.sort = event.currentTarget.value;
  render();
});

render();
