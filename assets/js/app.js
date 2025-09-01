/* BMC - App logic
   - تحميل الوحدات من data/units.json
   - تتبع التقدم عبر localStorage
   - إظهار الامتحان النهائي فقط عند إكمال كل الوحدات
   - تشغيل MP3 + PDF
*/

const STORAGE_KEY = 'bmc_progress_v1';
const FINAL_EXAM_URL = 'https://forms.gle/wfSe35kTS9ZSkVPv7'; // رابط الامتحان الخارجي

const STATE = {
  units: [],
  progress: {}, // { unitId: true|false }
  activeUnitId: null
};

const els = {
  unitsList: document.getElementById('unitsList'),
  unitSearch: document.getElementById('unitSearch'),
  unitTitle: document.getElementById('unitTitle'),
  unitPath: document.getElementById('unitPath'),
  unitAudio: document.getElementById('unitAudio'),
  unitAudioSrc: document.getElementById('unitAudioSrc'),
  unitPdf: document.getElementById('unitPdf'),
  downloadAudio: document.getElementById('downloadAudio'),
  openPdf: document.getElementById('openPdf'),
  completeBtn: document.getElementById('completeUnitBtn'),
  completeState: document.getElementById('completeState'),
  progressFill: document.getElementById('progressFill'),
  progressPercent: document.getElementById('progressPercent'),
  unitsCount: document.getElementById('unitsCount'),
  finalExamBtn: document.getElementById('finalExamBtn')
};

// تهيئة
document.addEventListener('DOMContentLoaded', init);

async function init(){
  loadProgress();
  const units = await fetchUnits();
  STATE.units = units;
  ensureProgressKeys();
  renderUnitsList();
  hydrateFromHashOrFirst();
  bindEvents();
  updateProgressUI();
  updateExamButton();
}

function loadProgress(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    STATE.progress = saved.progress || {};
    STATE.activeUnitId = saved.activeUnitId || null;
  }catch(e){
    STATE.progress = {};
  }
}

function saveProgress(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    progress: STATE.progress,
    activeUnitId: STATE.activeUnitId
  }));
}

async function fetchUnits(){
  const res = await fetch('data/units.json', {cache:'no-cache'});
  if(!res.ok) throw new Error('تعذر تحميل الوحدات');
  const data = await res.json();
  return data.units || [];
}

function ensureProgressKeys(){
  for(const u of STATE.units){
    if(!(u.id in STATE.progress)){
      STATE.progress[u.id] = false;
    }
  }
  saveProgress();
}

function renderUnitsList(filterText=''){
  els.unitsList.innerHTML = '';
  const norm = (s)=> s.toLowerCase();
  const f = norm(filterText.trim());
  const list = STATE.units.filter(u => !f || norm(u.title).includes(f) || norm(u.path || '').includes(f));

  for(const u of list){
    const li = document.createElement('li');
    li.className = 'unit-item';
    li.dataset.id = u.id;

    const done = !!STATE.progress[u.id];

    const title = document.createElement('div');
    title.className = 'unit-title';
    title.textContent = u.title;

    const badge = document.createElement('span');
    badge.className = 'badge ' + (done ? 'done' : '');
    badge.textContent = done ? 'مكتملة' : 'غير مكتملة';

    li.appendChild(title);
    li.appendChild(badge);

    li.addEventListener('click', ()=>selectUnit(u.id));
    els.unitsList.appendChild(li);
  }

  els.unitsCount.textContent = `${Object.values(STATE.progress).filter(Boolean).length}/${STATE.units.length} وحدات`;
}

function selectUnit(id){
  const unit = STATE.units.find(u => u.id === id);
  if(!unit) return;

  STATE.activeUnitId = id;
  saveProgress();

  // تحديث الميتا
  els.unitTitle.textContent = unit.title;
  els.unitPath.textContent = unit.path || '';

  // الصوت
  const audioUrl = unit.audio || '';
  els.unitAudioSrc.src = audioUrl;
  els.unitAudio.load();
  els.downloadAudio.href = audioUrl || '#';
  els.downloadAudio.setAttribute('aria-disabled', audioUrl ? 'false':'true');

  // PDF
  const pdfUrl = unit.pdf || '';
  els.unitPdf.src = pdfUrl ? pdfUrl : '';
  els.openPdf.href = pdfUrl || '#';
  els.openPdf.setAttribute('aria-disabled', pdfUrl ? 'false':'true');

  // حالة زر الإكمال
  const done = !!STATE.progress[id];
  els.completeBtn.disabled = done ? true : false;
  els.completeState.textContent = done ? 'تمت علامة هذه الوحدة كمكتملة.' : '';

  // تحديث الهاش لروابط مباشرة للوحدات
  location.hash = `#unit=${encodeURIComponent(id)}`;

  // تحديث قائمة الوحدات لعرض الشارة محدثة
  renderUnitsList(els.unitSearch.value);
  updateProgressUI();
  updateExamButton();
}

function hydrateFromHashOrFirst(){
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const id = hash.get('unit');
  if(id && STATE.units.some(u=>u.id===id)){
    selectUnit(id);
  }else if(STATE.activeUnitId && STATE.units.some(u=>u.id===STATE.activeUnitId)){
    selectUnit(STATE.activeUnitId);
  }else if(STATE.units.length){
    selectUnit(STATE.units[0].id);
  }
}

function bindEvents(){
  els.unitSearch.addEventListener('input', (e)=> renderUnitsList(e.target.value));

  els.completeBtn.addEventListener('click', ()=>{
    const id = STATE.activeUnitId;
    if(!id) return;
    STATE.progress[id] = true;
    saveProgress();
    els.completeBtn.disabled = true;
    els.completeState.textContent = 'أحسنت! تم إنجاز هذه الوحدة.';
    renderUnitsList(els.unitSearch.value);
    updateProgressUI();
    updateExamButton();
  });

  els.finalExamBtn.addEventListener('click', ()=>{
    if(els.finalExamBtn.disabled) return;
    // توجيه إلى رابط الامتحان الخارجي
    window.open(FINAL_EXAM_URL, '_blank', 'noopener');
  });

  window.addEventListener('hashchange', hydrateFromHashOrFirst);
}

function updateProgressUI(){
  const total = STATE.units.length;
  const done = Object.values(STATE.progress).filter(Boolean).length;
  const pct = total ? Math.round((done/total)*100) : 0;

  els.progressFill.style.width = pct + '%';
  els.progressPercent.textContent = pct + '%';
  els.unitsCount.textContent = `${done}/${total} وحدات`;
}

function allDone(){
  const total = STATE.units.length;
  if(total === 0) return false;
  return Object.values(STATE.progress).every(Boolean);
}

function updateExamButton(){
  const ready = allDone();
  els.finalExamBtn.hidden = !ready;
  els.finalExamBtn.disabled = !ready;
  if(ready){
    els.finalExamBtn.classList.add('ready');
  }else{
    els.finalExamBtn.classList.remove('ready');
  }
}
