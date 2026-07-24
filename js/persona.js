import { loadRawData } from './data.js';
import { buildDatabase } from './db.js';
import { escapeHtml, formatDate, summitUrl, tripUrl } from './shared.js';
import { personMedia } from './person-media.js';

const EXCLUDED_IDS=new Set(['P010']);
const $=s=>document.querySelector(s);
function nameOf(p){return p.nombreCompleto||p.alias||p.nombre||p.id;}
function plural(n,a,b){return n===1?a:b;}
function getId(){return new URLSearchParams(location.search).get('id')?.trim().toUpperCase()||'';}
function uniqueBy(items,key){const m=new Map();items.forEach(x=>{const k=key(x);if(k&&!m.has(k))m.set(k,x)});return [...m.values()];}
function ascentYear(a){return a.fechaDate?.getFullYear()||null;}
function sortedAscents(a){return [...a].sort((x,y)=>(x.fechaDate?.getTime()||0)-(y.fechaDate?.getTime()||0));}
function uniqueTrips(a){return uniqueBy(a.filter(x=>x.viaje),x=>x.viaje.id).map(x=>x.viaje);}
function uniqueSummits(a){return uniqueBy(a.filter(x=>x.cumbre),x=>x.cumbre.id).map(x=>x.cumbre);}
function groupYears(ascents){const m=new Map();sortedAscents(ascents).forEach(a=>{const y=ascentYear(a);if(!y)return;if(!m.has(y))m.set(y,[]);m.get(y).push(a)});return m;}
function renderSelectedYear(year,ascents){const d=$('#year-detail');d.classList.add('is-updating');setTimeout(()=>{$('#selected-year').textContent=year;$('#active-year-indicator').textContent=year;$('#selected-year-summary').textContent=`${ascents.length} ${plural(ascents.length,'cumbre compartida','cumbres compartidas')}`;$('#selected-ascents').innerHTML=ascents.map(a=>`<a class="year-ascent" href="${summitUrl(a.cumbre)}"><strong>${escapeHtml(a.cumbre?.nombre||a.nombre)}</strong><span>${a.cumbre?.altitud||a.altitud||'—'} m · ${escapeHtml(formatDate(a.fecha))}</span></a>`).join('');d.classList.remove('is-updating')},120);}
function renderRidge(ascents){
  const grouped=groupYears(ascents), years=[...grouped.keys()].sort((a,b)=>a-b); if(!years.length){$('.mountain-history').hidden=true;return;}
  const min=years[0],max=years.at(-1),all=[];for(let y=min;y<=max;y++)all.push(y);
  const counts=all.map(y=>grouped.get(y)?.length||0),maxCount=Math.max(...counts,1),W=1440,H=520,L=55,R=55,T=55,B=72,base=H-B,usable=base-T;
  const pts=all.map((y,i)=>({y,count:counts[i],x:L+(all.length===1?0.5:i/(all.length-1))*(W-L-R),py:base-(counts[i]?(.18+.82*counts[i]/maxCount)*usable:0)}));
  const line=pts.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.py.toFixed(1)}`).join(' '), area=`${line} L ${pts.at(-1).x} ${base} L ${pts[0].x} ${base} Z`;
  $('#ridge-line').setAttribute('d',line);$('#ridge-area').setAttribute('d',area);
  $('#ridge-grid').innerHTML=`<line class="ridge-grid-line" x1="${L}" y1="${base}" x2="${W-R}" y2="${base}"></line>`;
  $('#ridge-points').innerHTML=pts.map(p=>`<g class="ridge-point" data-year="${p.y}" tabindex="0" role="button" aria-label="${p.y}: ${p.count} ${plural(p.count,'cumbre','cumbres')}"><circle cx="${p.x}" cy="${p.py}" r="6"></circle><circle class="ridge-point-hit" cx="${p.x}" cy="${p.py}" r="22"></circle></g>`).join('');
  $('#ridge-labels').innerHTML=pts.map((p,i)=>((all.length<=12||i%2===0||i===all.length-1)?`<text class="ridge-year-label" data-year-label="${p.y}" x="${p.x}" y="${H-24}">${p.y}</text>`:'')).join('');
  function select(year){document.querySelectorAll('.ridge-point').forEach(e=>e.classList.toggle('is-active',Number(e.dataset.year)===year));document.querySelectorAll('.ridge-year-label').forEach(e=>e.classList.toggle('is-active',Number(e.dataset.yearLabel)===year));renderSelectedYear(year,grouped.get(year)||[]);}
  document.querySelectorAll('.ridge-point').forEach(el=>{const y=Number(el.dataset.year);el.addEventListener('click',()=>select(y));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(y)}})});
  const peak=[...grouped.entries()].sort((a,b)=>b[1].length-a[1].length||b[0]-a[0])[0][0];select(peak);
}
function renderTrips(ascents,person){const trips=uniqueTrips(ascents);$('#stat-trips').textContent=trips.length;if(!trips.length){$('#shared-trips-section').hidden=true;return;}$('#shared-trips').innerHTML=trips.slice(0,6).map(t=>{const count=new Set(ascents.filter(a=>a.idViaje===t.id).map(a=>a.idCumbre)).size;return `<a class="trip-card" href="${tripUrl(t)}"><img src="./img/hero-viajes.jpg" alt="" loading="lazy"><span class="trip-card__copy"><strong>${escapeHtml(t.nombre)}</strong><span>${t.fechaInicioDate?.getFullYear()||''} · ${count} ${plural(count,'tresmil','tresmiles')}</span></span></a>`}).join('');}
function renderGallery(person){const media=personMedia(person);if(!media?.gallery.length){$('#gallery-section').hidden=true;return;}$('#person-gallery').innerHTML=media.gallery.map((photo,index)=>`<figure><img src="${photo}" alt="Recuerdo de montaña ${index+1} con ${escapeHtml(nameOf(person))}" loading="lazy" decoding="async"></figure>`).join('');}
function renderAll(ascents){const rows=sortedAscents(ascents);$('#all-ascents-count').textContent=`${rows.length} ${plural(rows.length,'ascensión','ascensiones')}`;const groups=groupYears(rows);$('#all-ascents').innerHTML=[...groups.entries()].map(([year,list])=>`<section class="journal-year"><h3 class="journal-year__label">${year}</h3><div class="journal-year__entries">${list.map(a=>`<a class="journal-entry" href="${summitUrl(a.cumbre)}"><strong>${escapeHtml(a.cumbre?.nombre||a.nombre)}</strong><span class="journal-entry__date">${escapeHtml(formatDate(a.fecha))}</span><span class="journal-entry__altitude">${a.cumbre?.altitud||a.altitud||'—'} m</span></a>`).join('')}</div></section>`).join('');}
function renderPagination(person,people){const i=people.findIndex(p=>p.id===person.id),prev=people[(i-1+people.length)%people.length],next=people[(i+1)%people.length];const pl=$('#previous-person'),nl=$('#next-person');pl.href=`./persona.html?id=${prev.id}`;pl.querySelector('strong').textContent=nameOf(prev);nl.href=`./persona.html?id=${next.id}`;nl.querySelector('strong').textContent=nameOf(next);}
async function start(){
  try{const db=buildDatabase(await loadRawData()),person=db.indexes.personasById.get(getId());if(!person||EXCLUDED_IDS.has(person.id)){throw new Error('PERSON_NOT_FOUND')}
    const ascents=sortedAscents(person.ascensiones),summits=uniqueSummits(ascents),years=[...new Set(ascents.map(ascentYear).filter(Boolean))],people=db.personas.filter(p=>!EXCLUDED_IDS.has(p.id)&&p.ascensiones.length).sort((a,b)=>nameOf(a).localeCompare(nameOf(b),'es'));
    document.title=`${nameOf(person)} | Los Tresmiles de Iñaki`;$('#person-name').textContent=nameOf(person);$('#person-breadcrumb').textContent=nameOf(person);$('#person-intro').textContent=years.length?`Compartiendo montaña desde ${Math.min(...years)}.`:'Una historia pendiente de completar en el archivo.';$('#stat-summits').textContent=summits.length;$('#stat-years').textContent=years.length;
    const hero=$('#person-hero-image'),media=personMedia(person);if(media){hero.src=media.cover;hero.alt=`${nameOf(person)} en la montaña`;hero.style.objectPosition=media.heroPosition;}else{hero.remove();$('#person-hero').classList.add('person-hero--without-photo');}
    renderTrips(ascents,person);renderGallery(person);renderAll(ascents);renderPagination(person,people);renderRidge(ascents);$('#person-page').hidden=false;
  }catch(error){console.error(error);$('#person-not-found').hidden=false;if(error.message!=='PERSON_NOT_FOUND')$('#person-not-found p:last-of-type').textContent=`No se pudieron cargar los datos: ${error.message}`;}
}
start();
