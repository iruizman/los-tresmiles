/* =========================================================
   PERSONA — HISTORIA COMPARTIDA
   Datos provisionales y estructura preparada para conectarse
   más adelante a las tablas reales del archivo.
   ========================================================= */

const PEOPLE = [
  { id: "P001", name: "Gotzon Zubiaur", photo: "./img/personas/gotzon-zubiaur.jpg", firstYear: 2010, lastYear: 2025 },
  { id: "P002", name: "Jon Arostegi", photo: "./img/personas/jon-arostegi.jpg", firstYear: 2013, lastYear: 2025 },
  { id: "P003", name: "Mikel Agirre", photo: "./img/personas/mikel-agirre.jpg", firstYear: 2013, lastYear: 2024 },
  { id: "P004", name: "Jose Fonta", photo: "./img/personas/jose-fonta.jpg", firstYear: 2016, lastYear: 2024 },
  { id: "P005", name: "Josu Zubiaur", photo: "./img/personas/josu-zubiaur.jpg", firstYear: 2015, lastYear: 2025 },
  { id: "P006", name: "Roberto Fernandez", photo: "", firstYear: 2017, lastYear: 2017 },
  { id: "P007", name: "Raul Primo", photo: "", firstYear: 2022, lastYear: 2022 },
  { id: "P008", name: "Javi Lozano", photo: "", firstYear: 2019, lastYear: 2019 },
  { id: "P009", name: "Miguel del Rio", photo: "", firstYear: 2016, lastYear: 2016 },
  { id: "P011", name: "Oscar Garro", photo: "", firstYear: 2024, lastYear: 2024 },
];

const SAMPLE_ASCENTS = {
  P001: [
    [2010,"Turon de Néouvielle",3035,"01/07/2010","V001"], [2010,"Pic de Trois Conseillers",3039,"02/07/2010","V001"],
    [2013,"Monte Perdido",3355,"18/07/2013","V002"], [2013,"Cilindro de Marboré",3325,"19/07/2013","V002"],
    [2015,"Garmo Negro",3064,"11/07/2015","V003"], [2016,"Clarabide",3020,"16/07/2016","V004"],
    [2016,"Gías",3011,"16/07/2016","V004"], [2016,"Pico de la Paúl",3078,"17/07/2016","V004"],
    [2018,"Posets",3375,"21/07/2018","V005"], [2018,"Diente de Llardana",3094,"22/07/2018","V005"],
    [2022,"Balaitús",3144,"09/07/2022","V008"], [2022,"Frondella Central",3055,"10/07/2022","V008"],
    [2022,"Frondella Occidental",3001,"10/07/2022","V008"], [2022,"Pico de la Frondella",3071,"10/07/2022","V008"],
    [2024,"Aneto",3404,"13/07/2024","V010"], [2025,"Pico del Alba",3118,"12/07/2025","V011"]
  ],
  P002: [
    [2013,"Monte Perdido",3355,"18/07/2013","V002"], [2013,"Cilindro de Marboré",3325,"19/07/2013","V002"],
    [2015,"Garmo Negro",3064,"11/07/2015","V003"], [2015,"Algunas",3022,"11/07/2015","V003"],
    [2016,"Clarabide",3020,"16/07/2016","V004"], [2016,"Clarabide Oriental",3012,"16/07/2016","V004"], [2016,"Gías",3011,"16/07/2016","V004"],
    [2016,"Pico de la Paúl",3078,"17/07/2016","V004"], [2016,"Bardamina",3079,"17/07/2016","V004"],
    [2018,"Posets",3375,"21/07/2018","V005"], [2018,"Diente de Llardana",3094,"22/07/2018","V005"],
    [2019,"Bachimala",3177,"20/07/2019","V006"], [2019,"Punta del Sabre",3136,"20/07/2019","V006"],
    [2022,"Balaitús",3144,"09/07/2022","V008"], [2022,"Frondella Central",3055,"10/07/2022","V008"], [2022,"Frondella Occidental",3001,"10/07/2022","V008"], [2022,"Pico de la Frondella",3071,"10/07/2022","V008"],
    [2024,"Aneto",3404,"13/07/2024","V010"], [2024,"Pico del Medio",3346,"14/07/2024","V010"], [2025,"Pico del Alba",3118,"12/07/2025","V011"]
  ],
  P003: [[2013,"Monte Perdido",3355,"18/07/2013","V002"],[2015,"Garmo Negro",3064,"11/07/2015","V003"],[2016,"Clarabide",3020,"16/07/2016","V004"],[2016,"Gías",3011,"16/07/2016","V004"],[2018,"Posets",3375,"21/07/2018","V005"],[2019,"Bachimala",3177,"20/07/2019","V006"],[2022,"Balaitús",3144,"09/07/2022","V008"],[2024,"Aneto",3404,"13/07/2024","V010"]],
  P004: [[2016,"Clarabide",3020,"16/07/2016","V004"],[2016,"Gías",3011,"16/07/2016","V004"],[2018,"Posets",3375,"21/07/2018","V005"],[2019,"Bachimala",3177,"20/07/2019","V006"],[2022,"Balaitús",3144,"09/07/2022","V008"],[2024,"Aneto",3404,"13/07/2024","V010"]],
  P005: [[2015,"Garmo Negro",3064,"11/07/2015","V003"],[2016,"Clarabide",3020,"16/07/2016","V004"],[2018,"Posets",3375,"21/07/2018","V005"],[2022,"Balaitús",3144,"09/07/2022","V008"],[2025,"Pico del Alba",3118,"12/07/2025","V011"]],
  P006: [[2017,"Taillón",3144,"15/07/2017","V005"]],
  P007: [[2022,"Balaitús",3144,"09/07/2022","V008"]],
  P008: [[2019,"Bachimala",3177,"20/07/2019","V006"],[2019,"Punta del Sabre",3136,"20/07/2019","V006"]],
  P009: [[2016,"Clarabide",3020,"16/07/2016","V004"],[2016,"Clarabide Oriental",3012,"16/07/2016","V004"],[2016,"Gías",3011,"16/07/2016","V004"]],
  P011: [[2024,"Aneto",3404,"13/07/2024","V010"]],
};

const TRIPS = {
  V001: { name: "Néouvielle", year: 2010, image: "./img/personas/gotzon-zubiaur.jpg" },
  V002: { name: "Monte Perdido", year: 2013, image: "./img/personas/jon-arostegi.jpg" },
  V003: { name: "Garmo Negro", year: 2015, image: "./img/personas/mikel-agirre.jpg" },
  V004: { name: "Ibón de Gías", year: 2016, image: "./img/personas/jose-fonta.jpg" },
  V005: { name: "Posets", year: 2018, image: "./img/personas/josu-zubiaur.jpg" },
  V006: { name: "Bachimala", year: 2019, image: "./img/personas/jon-arostegi.jpg" },
  V008: { name: "Balaitús", year: 2022, image: "./img/personas/gotzon-zubiaur.jpg" },
  V010: { name: "Aneto", year: 2024, image: "./img/personas/mikel-agirre.jpg" },
  V011: { name: "Valle de Benasque", year: 2025, image: "./img/personas/josu-zubiaur.jpg" },
};

const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const plural = (n, one, many) => n === 1 ? one : many;

function getPersonId() { return new URLSearchParams(location.search).get("id") || PEOPLE[0].id; }
function toAscents(rows = []) { return rows.map(([year,name,altitude,date,trip]) => ({year,name,altitude,date,trip})); }
function yearsShared(ascents) { return new Set(ascents.map(a => a.year)).size; }
function uniqueTrips(ascents) { return [...new Set(ascents.map(a => a.trip).filter(Boolean))]; }

function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function renderRidge(ascents) {
  const grouped = new Map();
  ascents.forEach(a => { if (!grouped.has(a.year)) grouped.set(a.year, []); grouped.get(a.year).push(a); });
  const years = [...grouped.keys()].sort((a,b) => a-b);
  const minYear = years[0], maxYear = years.at(-1);
  const fullYears = Array.from({length: maxYear-minYear+1}, (_,i) => minYear+i);
  const counts = fullYears.map(year => grouped.get(year)?.length || 0);
  const maxCount = Math.max(...counts, 1);
  const W=1440, H=520, left=56, right=56, top=46, base=410;
  const step = fullYears.length === 1 ? 0 : (W-left-right)/(fullYears.length-1);
  const points = fullYears.map((year,i) => ({year, count: counts[i], x: fullYears.length===1 ? W/2 : left+i*step, y: base-(counts[i]/maxCount)*(base-top)}));
  const line = smoothPath(points);
  const area = `${line} L ${points.at(-1).x.toFixed(1)} ${base} L ${points[0].x.toFixed(1)} ${base} Z`;
  $("#ridge-line").setAttribute("d", line); $("#ridge-area").setAttribute("d", area);
  $("#ridge-grid").innerHTML = `<line class="ridge-grid-line" x1="${left}" y1="${base}" x2="${W-right}" y2="${base}"/>`;
  $("#ridge-labels").innerHTML = points.map((p,i) => (i===0 || i===points.length-1 || fullYears.length<9 || i%2===0) ? `<text class="ridge-year-label" data-year="${p.year}" x="${p.x}" y="${base+42}">${p.year}</text>` : '').join('');
  $("#ridge-points").innerHTML = points.map(p => p.count ? `<g class="ridge-point" data-year="${p.year}" tabindex="0" role="button" aria-label="${p.year}: ${p.count} ${plural(p.count,'cumbre','cumbres')}"><circle cx="${p.x}" cy="${p.y}" r="6"></circle><circle class="ridge-point-hit" cx="${p.x}" cy="${p.y}" r="22"></circle></g>` : '').join('');

  const selectYear = year => {
    document.querySelectorAll('.ridge-point').forEach(el => el.classList.toggle('is-active', Number(el.dataset.year)===year));
    document.querySelectorAll('.ridge-year-label').forEach(el => el.classList.toggle('is-active', Number(el.dataset.year)===year));
    const indicator = $("#active-year-indicator");
    if (indicator) indicator.textContent = year;
    renderSelectedYear(year, grouped.get(year) || []);
  };
  document.querySelectorAll('.ridge-point').forEach(el => {
    const year=Number(el.dataset.year);
    el.addEventListener('click',()=>selectYear(year));
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();selectYear(year);} });
    el.addEventListener('mouseenter',e=>showTooltip(e.currentTarget, year, grouped.get(year).length));
    el.addEventListener('mouseleave',hideTooltip);
    el.addEventListener('focus',e=>showTooltip(e.currentTarget, year, grouped.get(year).length));
    el.addEventListener('blur',hideTooltip);
  });
  const peak = [...grouped.entries()].sort((a,b)=>b[1].length-a[1].length || b[0]-a[0])[0][0];
  selectYear(peak);
}

function showTooltip(el, year, count) {
  const tooltip=$("#ridge-tooltip"), ridge=$("#ridge"), circle=el.querySelector('circle');
  const svgRect=$("#ridge-svg").getBoundingClientRect(), ridgeRect=ridge.getBoundingClientRect();
  const cx=Number(circle.getAttribute('cx'))/1440*svgRect.width + svgRect.left-ridgeRect.left;
  const cy=Number(circle.getAttribute('cy'))/520*svgRect.height + svgRect.top-ridgeRect.top;
  tooltip.innerHTML=`<strong>${year}</strong><br>${count} ${plural(count,'cumbre','cumbres')}`;
  tooltip.style.left=`${cx}px`; tooltip.style.top=`${cy}px`; tooltip.hidden=false;
}
function hideTooltip(){ $("#ridge-tooltip").hidden=true; }

function renderSelectedYear(year, ascents) {
  const detail = $("#year-detail");
  detail?.classList.add('is-updating');
  window.setTimeout(() => {
    $("#selected-year").textContent=year;
    $("#selected-year-summary").textContent=`${ascents.length} ${plural(ascents.length,'cumbre compartida','cumbres compartidas')}`;
    $("#selected-ascents").innerHTML=ascents.map(a=>`<a class="year-ascent" href="./cumbre.html?nombre=${encodeURIComponent(a.name)}"><strong>${escapeHtml(a.name)}</strong><span>${a.altitude} m · ${escapeHtml(a.date)}</span></a>`).join('');
    detail?.classList.remove('is-updating');
  }, 120);
}

function renderTrips(ascents, person) {
  const ids=uniqueTrips(ascents);
  $("#stat-trips").textContent=ids.length;
  if (!ids.length) { $("#shared-trips-section").hidden=true; return; }
  $("#shared-trips").innerHTML=ids.slice(0,6).map(id=>{
    const trip=TRIPS[id] || {name:id,year:'',image:person.photo};
    const count=ascents.filter(a=>a.trip===id).length;
    return `<a class="trip-card" href="./viaje.html?id=${encodeURIComponent(id)}"><img src="${escapeHtml(trip.image || person.photo)}" alt="" loading="lazy"><span class="trip-card__copy"><strong>${escapeHtml(trip.name)}</strong><span>${trip.year} · ${count} ${plural(count,'tresmil','tresmiles')}</span></span></a>`;
  }).join('');
}

function renderGallery(person, ascents) {
  const images=[person.photo, ...uniqueTrips(ascents).map(id=>TRIPS[id]?.image)].filter(Boolean);
  const unique=[...new Set(images)].slice(0,5);
  if (!unique.length) { $("#gallery-section").hidden=true; return; }
  $("#person-gallery").innerHTML=unique.map((src,i)=>`<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(person.name)} en la montaña${i?` · recuerdo ${i+1}`:''}" loading="lazy"></figure>`).join('');
}

function renderAllAscents(ascents) {
  const sorted=[...ascents].sort((a,b)=>a.year-b.year || a.date.localeCompare(b.date,'es'));
  $("#all-ascents-count").textContent=`${sorted.length} ${plural(sorted.length,'ascensión','ascensiones')}`;
  const groups = sorted.reduce((acc, ascent) => {
    (acc[ascent.year] ||= []).push(ascent);
    return acc;
  }, {});
  $("#all-ascents").innerHTML = Object.entries(groups).map(([year, rows]) => `
    <section class="journal-year">
      <h3 class="journal-year__label">${year}</h3>
      <div class="journal-year__entries">
        ${rows.map(a=>`<a class="journal-entry" href="./cumbre.html?nombre=${encodeURIComponent(a.name)}"><strong>${escapeHtml(a.name)}</strong><span class="journal-entry__date">${escapeHtml(a.date)}</span><span class="journal-entry__altitude">${a.altitude} m</span></a>`).join('')}
      </div>
    </section>`).join('');
}

function renderPagination(person) {
  const index=PEOPLE.findIndex(p=>p.id===person.id);
  const prev=PEOPLE[(index-1+PEOPLE.length)%PEOPLE.length], next=PEOPLE[(index+1)%PEOPLE.length];
  const prevLink=$("#previous-person"), nextLink=$("#next-person");
  prevLink.href=`./persona.html?id=${prev.id}`; prevLink.querySelector('strong').textContent=prev.name;
  nextLink.href=`./persona.html?id=${next.id}`; nextLink.querySelector('strong').textContent=next.name;
}

function renderPage() {
  const person=PEOPLE.find(p=>p.id===getPersonId());
  if (!person) { $("#person-not-found").hidden=false; return; }
  const ascents=toAscents(SAMPLE_ASCENTS[person.id] || []);
  const summitCount=ascents.length, tripCount=uniqueTrips(ascents).length, activeYears=yearsShared(ascents);
  const first=ascents[0];
  document.title=`${person.name} | Los Tresmiles de Iñaki`;
  $("#person-name").textContent=person.name;
  $("#person-breadcrumb").textContent=person.name;
  $("#person-intro").textContent=first ? `Compartiendo montaña desde ${first.year}.` : 'Una historia pendiente de completar en el archivo.';
  $("#stat-summits").textContent=summitCount; $("#stat-years").textContent=activeYears;
  const hero=$("#person-hero-image");
  if(person.photo){ hero.src=person.photo; hero.alt=`${person.name} en la montaña`; } else { hero.remove(); $("#person-hero").classList.add('person-hero--without-photo'); }
  renderTrips(ascents, person); renderGallery(person, ascents); renderAllAscents(ascents); renderPagination(person);
  if(ascents.length) renderRidge(ascents); else $(".mountain-history").hidden=true;
  $("#person-page").hidden=false;
}

renderPage();
