import { loadRawData } from './data.js';
import { buildDatabase } from './db.js';
import { escapeHtml, normalizeSearch } from './shared.js';

const PHOTO_BY_ID = {
  P001: './img/personas/gotzon-zubiaur.jpg',
  P002: './img/personas/jon-arostegi.jpg',
  P003: './img/personas/mikel-agirre.jpg',
  P004: './img/personas/jose-fonta.jpg',
  P005: './img/personas/josu-zubiaur.jpg'
};
const EXCLUDED_IDS = new Set(['P010']);
const state = { query: '', sort: 'summits-desc', people: [] };
const grid = document.querySelector('#people-grid');
const count = document.querySelector('#people-count');
const empty = document.querySelector('#people-empty');
const search = document.querySelector('#people-search');
const sort = document.querySelector('#people-sort');

function personName(person){ return person.nombreCompleto || person.alias || person.nombre || person.id; }
function initials(name){ return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase(); }
function tripCount(person){ return new Set(person.ascensiones.map(a=>a.idViaje).filter(Boolean)).size; }
function summitCount(person){ return new Set(person.ascensiones.map(a=>a.idCumbre).filter(Boolean)).size; }
function years(person){ return person.ascensiones.map(a=>a.fechaDate?.getFullYear()).filter(Boolean); }
function firstYear(person){ const y=years(person); return y.length?Math.min(...y):9999; }
function lastYear(person){ const y=years(person); return y.length?Math.max(...y):0; }

function personImage(person){
  const name=personName(person), photo=PHOTO_BY_ID[person.id];
  return photo ? `<img src="${photo}" alt="${escapeHtml(name)} en la montaña" loading="lazy" decoding="async">` : `<span class="person-card__fallback" aria-hidden="true">${escapeHtml(initials(name))}</span>`;
}
function personCard(person){
  const name=personName(person), summits=summitCount(person), trips=tripCount(person);
  return `<article class="person-card"><a class="person-card__link" href="./persona.html?id=${encodeURIComponent(person.id)}" aria-label="Ver la historia compartida con ${escapeHtml(name)}"><div class="person-card__visual">${personImage(person)}<div class="person-card__shade" aria-hidden="true"></div><h2>${escapeHtml(name)}</h2></div><div class="person-card__footer"><div class="person-card__stat"><strong>${summits}</strong><span>${summits===1?'Cumbre':'Cumbres'}</span></div><div class="person-card__stat"><strong>${trips}</strong><span>${trips===1?'Viaje':'Viajes'}</span></div><span class="person-card__action">Ver historia <span aria-hidden="true">→</span></span></div></a></article>`;
}
function sortedPeople(items){
  const result=[...items], byName=(a,b)=>personName(a).localeCompare(personName(b),'es',{sensitivity:'base'});
  switch(state.sort){
    case 'trips-desc': return result.sort((a,b)=>tripCount(b)-tripCount(a)||summitCount(b)-summitCount(a)||byName(a,b));
    case 'recent-desc': return result.sort((a,b)=>lastYear(b)-lastYear(a)||summitCount(b)-summitCount(a)||byName(a,b));
    case 'first-asc': return result.sort((a,b)=>firstYear(a)-firstYear(b)||byName(a,b));
    case 'name-asc': return result.sort(byName);
    default: return result.sort((a,b)=>summitCount(b)-summitCount(a)||tripCount(b)-tripCount(a)||byName(a,b));
  }
}
function render(){
  const q=normalizeSearch(state.query);
  const filtered=q?state.people.filter(p=>normalizeSearch([personName(p),p.alias].filter(Boolean).join(' ')).includes(q)):state.people;
  const visible=sortedPeople(filtered);
  grid.innerHTML=visible.map(personCard).join('');
  count.textContent=visible.length===1?'1 compañero':`${visible.length} compañeros`;
  grid.hidden=!visible.length; empty.hidden=!!visible.length;
}
async function start(){
  try{
    const db=buildDatabase(await loadRawData());
    state.people=db.personas.filter(p=>!EXCLUDED_IDS.has(p.id)&&p.ascensiones.length>0);
    search.addEventListener('input',e=>{state.query=e.currentTarget.value;render();});
    sort.addEventListener('change',e=>{state.sort=e.currentTarget.value;render();});
    render();
  }catch(error){ console.error(error); count.textContent='No se pudieron cargar los datos'; grid.innerHTML=`<div class="archive-empty"><p>${escapeHtml(error.message)}</p></div>`; }
}
start();
