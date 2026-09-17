// ============================================================
//  RUTINAS PROPIAS + BIBLIOTECA DE EJERCICIOS (ES/EN)
//  Tablas: fenix_biblioteca, fenix_rutinas, fenix_rutina_ejercicios
//  Se carga despues de app.js. Usa: sb, state, showToast, renderListaDia,
//  openModal, todayStr, renderers.
// ============================================================

const DIAS_SEM = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_SEM_L = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const GRUPOS = ['Pecho','Espalda','Hombros','Hombro Post.','Trapecio','Biceps','Triceps','Antebrazos','Pierna','Isquios','Gluteos','Abductores','Adductores','Pantorrillas','Abdomen','Core','Cardio','Otro'];
const EQUIPOS = ['Máquina','Smith','Barra','Mancuernas','Polea','Peso corporal','Cardio','Otro'];

// ---------- helpers ----------
function bibDe(id){ return state.biblioteca.find(b=>b.id===Number(id)) || null; }
function itemsDeRutina(rid){ return state.rutinaEjs.filter(x=>x.rutina_id===rid).sort((a,b)=>a.orden-b.orden); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function rutKey(fecha){ return 'fenix_rutina_fecha:'+fecha; }

// Que rutina manda en una fecha:
//  - eleccion manual guardada para esa fecha (0 = "usar protocolo Renfit")
//  - si no, la rutina activa asignada a ese dia de la semana
function rutinaParaFecha(fecha){
  if(!fecha) return null;
  let rid = null;
  const manual = localStorage.getItem(rutKey(fecha));
  if(manual !== null){
    rid = Number(manual);
    if(rid === 0) return null;
  } else {
    const dow = new Date(fecha+'T12:00:00').getDay();
    const r = state.rutinas.find(x=>x.activa && x.dia_semana===dow);
    if(!r) return null;
    rid = r.id;
  }
  const r = state.rutinas.find(x=>x.id===rid);
  if(!r) return null;
  const ejs = itemsDeRutina(r.id).map((it,i)=>{
    const b = bibDe(it.ejercicio_id) || {nombre_es:'(ejercicio borrado)', grupo:'Otro'};
    return {
      nombre: b.nombre_es, en: b.nombre_en || '', video: b.video_url || '',
      o: i+1, d: 0, g: b.grupo, reps: it.reps || '10', series: it.series || 3,
      desc: it.descanso || '60s', notas: it.notas || '',
      hist: [b.nombre_en || ''].filter(Boolean)
    };
  });
  return { id: r.id, nombre: r.nombre, ejs };
}

// selector que aparece arriba de la lista de registro (modal Ejercicio)
function selectorRutinaHTML(fecha){
  if(!state.rutinas.length) return '';
  const manual = localStorage.getItem(rutKey(fecha));
  const actual = rutinaParaFecha(fecha);
  const sel = manual!==null ? Number(manual) : (actual ? actual.id : 0);
  const ops = ['<option value="0"'+(sel===0?' selected':'')+'>Protocolo Renfit (por defecto)</option>']
    .concat(state.rutinas.map(r=>`<option value="${r.id}"${sel===r.id?' selected':''}>${esc(r.nombre)}${r.dia_semana!=null?' · '+DIAS_SEM[r.dia_semana]:''}</option>`));
  return `<div class="rut-sel"><select onchange="elegirRutinaFecha('${fecha}', this.value)">${ops.join('')}</select></div>`;
}
function elegirRutinaFecha(fecha, rid){
  localStorage.setItem(rutKey(fecha), String(Number(rid)));
  renderListaDia();
}

// ---------- TAB RUTINAS ----------
function renderRutinas(){
  const app = document.getElementById('app');
  let html = `<div class="rut-head"><div class="section-title">Mis rutinas</div><button class="btn-o" onclick="editarRutina(null)">+ Nueva rutina</button></div>`;
  if(!state.rutinas.length){
    html += `<div class="rut-empty"><b>Todavía no tienes rutinas propias.</b><br>Crea una, agrega ejercicios de la biblioteca con sus series y reps, y asígnala a un día. Ese día la app la usa en vez del protocolo Renfit.</div>`;
  }
  state.rutinas.forEach(r=>{
    const items = itemsDeRutina(r.id);
    const prev = items.map(it=>{ const b=bibDe(it.ejercicio_id); return b?b.nombre_es:'?'; }).slice(0,5).join(', ') + (items.length>5?` … +${items.length-5}`:'');
    html += `<div class="rut-card">
      <div><span class="rut-name">${esc(r.nombre)}</span>${r.dia_semana!=null?`<span class="rut-day">${DIAS_SEM_L[r.dia_semana]}</span>`:''}${!r.activa?'<span class="rut-day" style="background:#333;color:#aaa">pausada</span>':''}</div>
      <div class="rut-prev">${items.length} ejercicio${items.length===1?'':'s'}${items.length?' · '+esc(prev):''}</div>
      <div class="rut-actions">
        <button class="btn-o" onclick="iniciarRutina(${r.id})">▶ Iniciar hoy</button>
        <button class="btn-g" onclick="editarRutina(${r.id})">Editar</button>
        <button class="btn-g" onclick="duplicarRutina(${r.id})">Duplicar</button>
        <button class="btn-g btn-red" onclick="borrarRutina(${r.id})">Borrar</button>
      </div>
    </div>`;
  });

  // biblioteca
  html += `<div class="rut-head" style="margin-top:26px"><div class="section-title">Biblioteca (${state.biblioteca.filter(b=>b.activo).length})</div><button class="btn-g" onclick="abrirPicker('bib')">+ Ejercicio</button></div>
    <input class="bib-search" id="bib-q" placeholder="Buscar en español o inglés…" oninput="renderBibLista()">
    <div class="rp-chips" id="bib-chips">${['Todos'].concat(GRUPOS).map(g=>`<span class="rp-chip${g==='Todos'?' on':''}" data-g="${g}" onclick="bibChip(this)">${g}</span>`).join('')}</div>
    <div id="bib-lista"></div>`;
  app.innerHTML = html;
  renderBibLista();
}
let BIB_G = 'Todos';
function bibChip(el){ document.querySelectorAll('#bib-chips .rp-chip').forEach(c=>c.classList.remove('on')); el.classList.add('on'); BIB_G = el.dataset.g; renderBibLista(); }
function renderBibLista(){
  const cont = document.getElementById('bib-lista'); if(!cont) return;
  const q = (document.getElementById('bib-q').value||'').toLowerCase().trim();
  const lista = state.biblioteca.filter(b=>b.activo && (BIB_G==='Todos'||b.grupo===BIB_G) && (!q || (b.nombre_es+' '+(b.nombre_en||'')).toLowerCase().includes(q)));
  if(!lista.length){ cont.innerHTML = '<div class="rut-empty">Nada con ese nombre. Créalo con “+ Ejercicio”.</div>'; return; }
  cont.innerHTML = lista.map(b=>`<div class="bib-row" onclick="editarEjercicio(${b.id})">
      <div class="rp-n">${esc(b.nombre_es)}<small>${esc(b.nombre_en||'')}</small></div>
      <div class="rp-g">${esc(b.grupo)} · ${esc(b.equipo||'')}${b.video_url?`<br><a href="${esc(b.video_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ video</a>`:''}</div>
    </div>`).join('');
}

function iniciarRutina(rid){
  const hoy = todayStr();
  localStorage.setItem(rutKey(hoy), String(rid));
  openModal();
  const f = document.getElementById('ej-fecha'); if(f && f.value!==hoy){ f.value = hoy; }
  renderListaDia();
}
async function duplicarRutina(rid){
  const r = state.rutinas.find(x=>x.id===rid); if(!r) return;
  const {data, error} = await sb.from('fenix_rutinas').insert({nombre:r.nombre+' (copia)', dia_semana:null, activa:true, orden:(r.orden||0)+1}).select().single();
  if(error){ showToast('Error: '+error.message); return; }
  const items = itemsDeRutina(rid).map(it=>({rutina_id:data.id, ejercicio_id:it.ejercicio_id, orden:it.orden, series:it.series, reps:it.reps, descanso:it.descanso, notas:it.notas}));
  if(items.length){ const {error:e2} = await sb.from('fenix_rutina_ejercicios').insert(items); if(e2){ showToast('Error: '+e2.message); return; } }
  await loadAll(); renderRutinas(); showToast('Rutina duplicada ✓');
}
async function borrarRutina(rid){
  const r = state.rutinas.find(x=>x.id===rid); if(!r) return;
  if(!confirm(`¿Borrar "${r.nombre}"? El historial de entrenos no se toca.`)) return;
  const {error} = await sb.from('fenix_rutinas').delete().eq('id', rid);
  if(error){ showToast('Error: '+error.message); return; }
  await loadAll(); renderRutinas(); showToast('Rutina borrada');
}

// ---------- EDITOR DE RUTINA ----------
let RUT_EDIT = null; // {id, nombre, dia_semana, activa, items:[{ejercicio_id, series, reps, descanso, notas}]}
function editarRutina(rid){
  if(rid){
    const r = state.rutinas.find(x=>x.id===rid); if(!r) return;
    RUT_EDIT = {id:r.id, nombre:r.nombre, dia_semana:r.dia_semana, activa:r.activa,
      items: itemsDeRutina(rid).map(it=>({ejercicio_id:it.ejercicio_id, series:it.series, reps:it.reps, descanso:it.descanso||'60s', notas:it.notas||''}))};
  } else {
    RUT_EDIT = {id:null, nombre:'', dia_semana:null, activa:true, items:[]};
  }
  renderEditorRutina();
}
function renderEditorRutina(){
  const app = document.getElementById('app');
  const e = RUT_EDIT;
  let html = `<div class="rut-form">
    <div class="rut-head"><div class="section-title">${e.id?'Editar rutina':'Nueva rutina'}</div><button class="btn-g btn-sm" onclick="renderRutinas()">← Volver</button></div>
    <label>Nombre</label><input id="re-nombre" value="${esc(e.nombre)}" placeholder="ej: Día 1 — Pecho + Bíceps" oninput="RUT_EDIT.nombre=this.value">
    <div class="row2">
      <div><label>Día asignado</label><select id="re-dia" onchange="RUT_EDIT.dia_semana=this.value===''?null:Number(this.value)">
        <option value=""${e.dia_semana==null?' selected':''}>Sin día fijo</option>
        ${[1,2,3,4,5,6,0].map(d=>`<option value="${d}"${e.dia_semana===d?' selected':''}>${DIAS_SEM_L[d]}</option>`).join('')}
      </select></div>
      <div><label>Estado</label><select onchange="RUT_EDIT.activa=this.value==='1'"><option value="1"${e.activa?' selected':''}>Activa</option><option value="0"${!e.activa?' selected':''}>Pausada</option></select></div>
    </div>
    <label style="margin-top:18px">Ejercicios en orden de ejecución</label>
    <div id="re-items">${itemsEditorHTML()}</div>
    <button class="re-add" onclick="abrirPicker('rutina')">+ Agregar ejercicio</button>
    <div class="rut-sticky"><button class="btn-o" onclick="guardarRutina()">Guardar rutina</button><button class="btn-g" onclick="renderRutinas()">Cancelar</button></div>
  </div>`;
  app.innerHTML = html;
}
function itemsEditorHTML(){
  const e = RUT_EDIT;
  if(!e.items.length) return `<div class="rut-empty">Sin ejercicios. Toca “+ Agregar ejercicio”.</div>`;
  return e.items.map((it,i)=>{
    const b = bibDe(it.ejercicio_id) || {nombre_es:'?', nombre_en:'', grupo:''};
    return `<div class="re-item">
      <div class="re-top">
        <span class="re-num">#${i+1}</span>
        <div class="re-name">${esc(b.nombre_es)}<small>${esc(b.nombre_en||'')}${b.grupo?' · '+esc(b.grupo):''}</small></div>
        <div class="re-mv">
          <button onclick="moverItem(${i},-1)" ${i===0?'disabled':''}>▲</button>
          <button onclick="moverItem(${i},1)" ${i===e.items.length-1?'disabled':''}>▼</button>
          <button class="del" onclick="quitarItem(${i})">✕</button>
        </div>
      </div>
      <div class="re-fields">
        <div><label>Series</label><input type="number" min="1" value="${it.series}" oninput="RUT_EDIT.items[${i}].series=parseInt(this.value)||1"></div>
        <div><label>Reps</label><input value="${esc(it.reps)}" placeholder="8-12" oninput="RUT_EDIT.items[${i}].reps=this.value"></div>
        <div><label>Descanso</label><input value="${esc(it.descanso)}" placeholder="60s" oninput="RUT_EDIT.items[${i}].descanso=this.value"></div>
      </div>
      <div class="re-notes"><input value="${esc(it.notas)}" placeholder="Nota (opcional): tempo, agarre, RIR objetivo…" oninput="RUT_EDIT.items[${i}].notas=this.value"></div>
    </div>`;
  }).join('');
}
function refreshItems(){ const c=document.getElementById('re-items'); if(c) c.innerHTML = itemsEditorHTML(); }
function moverItem(i, dir){ const a=RUT_EDIT.items; const j=i+dir; if(j<0||j>=a.length) return; [a[i],a[j]]=[a[j],a[i]]; refreshItems(); }
function quitarItem(i){ RUT_EDIT.items.splice(i,1); refreshItems(); }
function agregarItem(ejercicio_id){
  const b = bibDe(ejercicio_id);
  RUT_EDIT.items.push({ejercicio_id, series:3, reps: b && b.grupo==='Cardio' ? '1' : '10', descanso: b && b.grupo==='Cardio' ? '-' : '60s', notas:''});
  refreshItems();
}
async function guardarRutina(){
  const e = RUT_EDIT;
  e.nombre = (document.getElementById('re-nombre').value||'').trim();
  if(!e.nombre){ showToast('Ponle nombre a la rutina'); return; }
  if(!e.items.length){ showToast('Agrega al menos un ejercicio'); return; }
  let rid = e.id;
  if(rid){
    const {error} = await sb.from('fenix_rutinas').update({nombre:e.nombre, dia_semana:e.dia_semana, activa:e.activa}).eq('id', rid);
    if(error){ showToast('Error: '+error.message); return; }
    const {error:e2} = await sb.from('fenix_rutina_ejercicios').delete().eq('rutina_id', rid);
    if(e2){ showToast('Error: '+e2.message); return; }
  } else {
    const {data, error} = await sb.from('fenix_rutinas').insert({nombre:e.nombre, dia_semana:e.dia_semana, activa:e.activa, orden:state.rutinas.length}).select().single();
    if(error){ showToast('Error: '+error.message); return; }
    rid = data.id;
  }
  const rows = e.items.map((it,i)=>({rutina_id:rid, ejercicio_id:it.ejercicio_id, orden:i+1, series:it.series||3, reps:String(it.reps||'10'), descanso:it.descanso||'60s', notas:it.notas||null}));
  const {error:e3} = await sb.from('fenix_rutina_ejercicios').insert(rows);
  if(e3){ showToast('Error: '+e3.message); return; }
  await loadAll();
  RUT_EDIT = null;
  renderRutinas();
  showToast('Rutina guardada ✓');
}

// ---------- PICKER / CREAR / EDITAR EJERCICIO ----------
let PICK_MODE = 'rutina'; // 'rutina' = agregar a rutina | 'bib' = solo crear
let PICK_G = 'Todos';
let BIB_EDIT_ID = null;
function ensurePicker(){
  if(document.getElementById('rpick')) return;
  const div = document.createElement('div');
  div.id = 'rpick'; div.className = 'rpick';
  div.innerHTML = `<div class="rpick-box">
    <div class="rpick-head"><b id="rp-title">Agregar ejercicio</b><button class="btn-g btn-sm" onclick="cerrarPicker()">Cerrar</button></div>
    <div id="rp-browse">
      <input class="rp-search" id="rp-q" placeholder="Buscar (español o inglés)…" oninput="renderPickLista()">
      <div class="rp-chips" id="rp-chips"></div>
      <div class="rp-list" id="rp-list"></div>
      <div class="rp-new"><button class="btn-g" style="width:100%" onclick="abrirFormEj(null)">+ Crear ejercicio nuevo</button></div>
    </div>
    <div class="rp-form" id="rp-form">
      <label>Nombre en español</label><input id="nf-es" placeholder="ej: Press Inclinado con Mancuernas">
      <label>Nombre en inglés</label><input id="nf-en" placeholder="ej: Incline Bench Press (Dumbbell)">
      <div class="rut-form" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div><label>Grupo</label><select id="nf-g">${GRUPOS.map(g=>`<option>${g}</option>`).join('')}</select></div>
        <div><label>Equipo</label><select id="nf-eq">${EQUIPOS.map(g=>`<option>${g}</option>`).join('')}</select></div>
      </div>
      <label>Video demostrativo (link YouTube/Drive/IG — subir video directo viene en Fase 3)</label><input id="nf-video" placeholder="https://…">
      <label>Notas técnicas</label><input id="nf-notas" placeholder="opcional">
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn-o" style="flex:2" onclick="guardarEjercicio()">Guardar ejercicio</button>
        <button class="btn-g" style="flex:1" onclick="cerrarFormEj()">Atrás</button>
        <button class="btn-g btn-red" id="nf-del" style="display:none" onclick="desactivarEjercicio()">Ocultar</button>
      </div>
    </div>
  </div>`;
  div.addEventListener('click', ev=>{ if(ev.target===div) cerrarPicker(); });
  document.body.appendChild(div);
}
function abrirPicker(mode){
  ensurePicker();
  PICK_MODE = mode; PICK_G = 'Todos';
  document.getElementById('rp-title').textContent = mode==='rutina' ? 'Agregar ejercicio' : 'Biblioteca';
  document.getElementById('rp-q').value = '';
  document.getElementById('rp-chips').innerHTML = ['Todos'].concat(GRUPOS).map(g=>`<span class="rp-chip${g==='Todos'?' on':''}" data-g="${g}" onclick="pickChip(this)">${g}</span>`).join('');
  cerrarFormEj();
  if(mode==='bib'){ abrirFormEj(null); }
  renderPickLista();
  document.getElementById('rpick').classList.add('open');
}
function cerrarPicker(){ const p=document.getElementById('rpick'); if(p) p.classList.remove('open'); }
function pickChip(el){ document.querySelectorAll('#rp-chips .rp-chip').forEach(c=>c.classList.remove('on')); el.classList.add('on'); PICK_G = el.dataset.g; renderPickLista(); }
function renderPickLista(){
  const cont = document.getElementById('rp-list'); if(!cont) return;
  const q = (document.getElementById('rp-q').value||'').toLowerCase().trim();
  const enRutina = new Set((RUT_EDIT && RUT_EDIT.items || []).map(i=>i.ejercicio_id));
  const lista = state.biblioteca.filter(b=>b.activo && (PICK_G==='Todos'||b.grupo===PICK_G) && (!q || (b.nombre_es+' '+(b.nombre_en||'')).toLowerCase().includes(q)));
  if(!lista.length){ cont.innerHTML = '<div class="rut-empty">No está. Créalo abajo.</div>'; return; }
  cont.innerHTML = lista.map(b=>`<div class="rp-row${enRutina.has(b.id)?' added':''}" onclick="${PICK_MODE==='rutina'?`pickAdd(${b.id})`:`editarEjercicio(${b.id})`}">
      <div class="rp-n">${esc(b.nombre_es)}<small>${esc(b.nombre_en||'')}</small></div>
      <div class="rp-g">${esc(b.grupo)}<br>${esc(b.equipo||'')}${enRutina.has(b.id)?'<br>✓ en rutina':''}</div>
    </div>`).join('');
}
function pickAdd(id){
  agregarItem(id);
  const b = bibDe(id);
  showToast(`+ ${b?b.nombre_es:'ejercicio'}`);
  renderPickLista();
}
function abrirFormEj(id){
  BIB_EDIT_ID = id;
  const f = document.getElementById('rp-form');
  const b = id ? bibDe(id) : null;
  document.getElementById('nf-es').value = b?b.nombre_es:'';
  document.getElementById('nf-en').value = b?(b.nombre_en||''):'';
  document.getElementById('nf-g').value = b?b.grupo:(PICK_G!=='Todos'?PICK_G:'Pecho');
  document.getElementById('nf-eq').value = b?(b.equipo||'Máquina'):'Máquina';
  document.getElementById('nf-video').value = b?(b.video_url||''):'';
  document.getElementById('nf-notas').value = b?(b.notas||''):'';
  document.getElementById('nf-del').style.display = id?'block':'none';
  document.getElementById('rp-browse').style.display = 'none';
  f.classList.add('open');
  document.getElementById('rp-title').textContent = id ? 'Editar ejercicio' : 'Nuevo ejercicio';
}
function cerrarFormEj(){
  const f = document.getElementById('rp-form'); if(!f) return;
  f.classList.remove('open');
  document.getElementById('rp-browse').style.display = '';
  document.getElementById('rp-title').textContent = PICK_MODE==='rutina' ? 'Agregar ejercicio' : 'Biblioteca';
  if(PICK_MODE==='bib' && BIB_EDIT_ID===null && !f.classList.contains('open')){ /* volver a lista */ }
}
function editarEjercicio(id){
  ensurePicker();
  if(!document.getElementById('rpick').classList.contains('open')){ PICK_MODE='bib'; document.getElementById('rpick').classList.add('open'); }
  abrirFormEj(id);
}
async function guardarEjercicio(){
  const row = {
    nombre_es: document.getElementById('nf-es').value.trim(),
    nombre_en: document.getElementById('nf-en').value.trim() || null,
    grupo: document.getElementById('nf-g').value,
    equipo: document.getElementById('nf-eq').value,
    video_url: document.getElementById('nf-video').value.trim() || null,
    notas: document.getElementById('nf-notas').value.trim() || null,
  };
  if(!row.nombre_es){ showToast('Falta el nombre en español'); return; }
  let id = BIB_EDIT_ID;
  if(id){
    const {error} = await sb.from('fenix_biblioteca').update(row).eq('id', id);
    if(error){ showToast('Error: '+error.message); return; }
  } else {
    const {data, error} = await sb.from('fenix_biblioteca').insert(row).select().single();
    if(error){ showToast('Error: '+error.message); return; }
    id = data.id;
  }
  await loadAll();
  showToast(`${row.nombre_es} guardado ✓`);
  if(PICK_MODE==='rutina' && !BIB_EDIT_ID){ agregarItem(id); cerrarPicker(); return; }
  cerrarFormEj(); renderPickLista();
  if(document.getElementById('bib-lista')) renderBibLista();
  if(document.getElementById('re-items')) refreshItems();
}
async function desactivarEjercicio(){
  if(!BIB_EDIT_ID) return;
  if(!confirm('¿Ocultar este ejercicio de la biblioteca? Las rutinas que lo usan lo seguirán mostrando.')) return;
  const {error} = await sb.from('fenix_biblioteca').update({activo:false}).eq('id', BIB_EDIT_ID);
  if(error){ showToast('Error: '+error.message); return; }
  await loadAll(); cerrarFormEj(); renderPickLista(); if(document.getElementById('bib-lista')) renderBibLista();
}

// registrar tab
renderers.rutinas = renderRutinas;
