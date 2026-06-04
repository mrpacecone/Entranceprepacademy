// ═══════════════════════════════════════════════
// MRPACECONE ACADEMY – Core JS
// ═══════════════════════════════════════════════

// ── STORAGE HELPERS ──
const S = {
  get: (k, def=null) => { try { const v=localStorage.getItem(k); return v!==null?JSON.parse(v):def; } catch{return def;} },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch{} },
  push: (k, item, max=500) => { const arr=S.get(k,[]); arr.push(item); if(arr.length>max)arr.shift(); S.set(k,arr); }
};

// ── TOAST ──
function toast(msg, type='info', dur=3200) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.className='', dur);
}

// ── NAV ──
let currentPage = 'dashboard';
function nav(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('pg-' + id);
  if(pg) pg.classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${id}"]`).forEach(n => n.classList.add('active'));
  const titleEl = document.getElementById('topbarTitle');
  if(titleEl) titleEl.textContent = PAGE_TITLES[id] || id;
  currentPage = id;
  window.scrollTo(0,0);
  closeSidebar();
  trackPageVisit(id);
  // lazy inits
  if(id==='progress'||id==='analytics') renderCharts();
  if(id==='readiness') animateProg();
}

const PAGE_TITLES = {
  dashboard:'Dashboard', syllabus:'Official Syllabus',
  module1:'Introduction to Law', module2:'Role of Law in Society',
  module3:'Sources of Law', module4:'Rights & Duties',
  module5:'Person & Legal Personality', module6:'Constitution of Nepal',
  module7:'Fundamental Rights', jurists:'Jurists & Legal Theories',
  mcq:'MCQ Practice', subjective:'Subjective Practice',
  writing:'Creative Writing', prevq:'Previous Year Questions',
  mock:'Mock Tests', progress:'My Progress', readiness:'Readiness Meter',
  studyplan:'Study Plan', admin:'Admin Panel', analytics:'User Analytics',
  materials:'Study Materials', settings:'Settings', bookmarks:'Bookmarks'
};

// ── SIDEBAR TOGGLE ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
}

// ── ANALYTICS / SESSION TRACKING ──
const SESSION_KEY = 'mpa_session';
const VISITS_KEY  = 'mpa_visits';

function startSession() {
  const uid = S.get('mpa_uid') || ('U' + Date.now().toString(36).toUpperCase());
  S.set('mpa_uid', uid);
  const session = {
    uid, start: Date.now(), pages: [], lastActive: Date.now(), duration: 0
  };
  S.set(SESSION_KEY, session);
  // update on activity
  document.addEventListener('click', heartbeat);
  document.addEventListener('keydown', heartbeat);
  window.addEventListener('beforeunload', endSession);
}

function heartbeat() {
  const s = S.get(SESSION_KEY);
  if(!s) return;
  s.duration = Math.round((Date.now() - s.start) / 1000);
  s.lastActive = Date.now();
  S.set(SESSION_KEY, s);
}

function endSession() {
  const s = S.get(SESSION_KEY);
  if(!s) return;
  s.duration = Math.round((Date.now() - s.start) / 1000);
  s.end = Date.now();
  // save to history
  const hist = S.get('mpa_sessions', []);
  hist.push(s);
  if(hist.length > 200) hist.splice(0, hist.length - 200);
  S.set('mpa_sessions', hist);
}

function trackPageVisit(pageId) {
  const s = S.get(SESSION_KEY);
  if(!s) return;
  if(!s.pages) s.pages = [];
  s.pages.push({ page: pageId, time: Date.now() });
  S.set(SESSION_KEY, s);

  // daily tracking
  const today = new Date().toISOString().slice(0,10);
  const daily = S.get('mpa_daily', {});
  if(!daily[today]) daily[today] = { pages:[], dur:0 };
  daily[today].pages.push(pageId);
  S.set('mpa_daily', daily);
}

function getSessionStats() {
  const sessions = S.get('mpa_sessions', []);
  const cur = S.get(SESSION_KEY);
  if(cur) sessions.push(cur);
  const totalSec = sessions.reduce((a,s)=>a+(s.duration||0),0);
  const pages = sessions.flatMap(s=>s.pages||[]).map(p=>p.page||p);
  const pageCounts = {};
  pages.forEach(p => pageCounts[p]=(pageCounts[p]||0)+1);
  return { sessions: sessions.length, totalSec, pageCounts, sessions: sessions };
}

// ── PROGRESS HELPERS ──
function saveProgress(type, correct) {
  const p = S.get('mpa_progress', { mcq:0, correct:0, essays:0, mock:0, streak:0, lastDay:'' });
  const today = new Date().toISOString().slice(0,10);
  if(p.lastDay !== today) { p.streak = (p.lastDay === getPrevDay()) ? p.streak+1 : 1; p.lastDay = today; }
  if(type==='mcq') { p.mcq++; if(correct) p.correct++; }
  if(type==='essay') p.essays++;
  if(type==='mock') p.mock++;
  S.set('mpa_progress', p);
  updateStreakDisplay();
}

function getPrevDay() {
  const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10);
}

function updateStreakDisplay() {
  const p = S.get('mpa_progress',{streak:0});
  const el = document.getElementById('streakVal');
  if(el) el.textContent = p.streak || 0;
}

// ── RENDER CHARTS ──
function renderCharts() {
  // Weekly bar chart
  const chartEl = document.getElementById('weeklyChart');
  if(chartEl && !chartEl.dataset.built) {
    chartEl.dataset.built = '1';
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const vals = [2.5,3.0,1.5,4.0,2.0,3.5,2.5];
    const max = Math.max(...vals);
    chartEl.innerHTML = '';
    vals.forEach((v,i) => {
      const col = document.createElement('div');
      col.className = 'bar-col';
      const bar = document.createElement('div');
      bar.className = 'bar-body' + (i===3?' gold':'');
      bar.style.height = Math.round(v/max*80)+'px';
      bar.setAttribute('data-v', v+'h');
      const lbl = document.createElement('div');
      lbl.className = 'bar-lbl';
      lbl.textContent = days[i];
      col.appendChild(bar); col.appendChild(lbl);
      chartEl.appendChild(col);
    });
  }
}

// ── ANIMATE PROGRESS BARS ──
function animateProg() {
  document.querySelectorAll('.prog-fill[data-w]').forEach(el => {
    el.style.width = '0';
    requestAnimationFrame(()=>{
      setTimeout(()=>{ el.style.width = el.dataset.w; },50);
    });
  });
}

// ── MCQ ENGINE ──
let mcqBank = [];
let currentMCQ = 0;
let mcqScore = { correct:0, wrong:0, total:0 };

function selectOpt(el, answer) {
  const card = el.closest('.q-card');
  card.querySelectorAll('.opt').forEach(o => o.classList.add('locked'));
  if(answer === 'correct') { el.classList.add('correct'); mcqScore.correct++; }
  else {
    el.classList.add('wrong');
    card.querySelector('.opt[data-correct="true"]')?.classList.add('correct');
    mcqScore.wrong++;
  }
  mcqScore.total++;
  const expBox = card.querySelector('.exp-box');
  if(expBox) expBox.classList.add('show');
  saveProgress('mcq', answer==='correct');
  updateMCQStats();
}

function updateMCQStats() {
  const acc = mcqScore.total > 0 ? Math.round(mcqScore.correct/mcqScore.total*100) : 0;
  document.getElementById('mcqAccuracy') && (document.getElementById('mcqAccuracy').textContent = acc+'%');
  document.getElementById('mcqCount') && (document.getElementById('mcqCount').textContent = mcqScore.total);
}

function showExp(btn) {
  const box = btn.closest('.q-card').querySelector('.exp-box');
  box.classList.toggle('show');
  btn.textContent = box.classList.contains('show')? '▲ Hide':'📖 Explanation';
}

// ── WORD COUNT ──
function wc(textarea, spanId, max=300) {
  const words = textarea.value.trim() ? textarea.value.trim().split(/\s+/).length : 0;
  const span = document.getElementById(spanId);
  if(span) span.textContent = words;
  const bar = textarea.closest('.writing-pad')?.querySelector('.word-bar-fill');
  if(bar) bar.style.width = Math.min(100, Math.round(words/max*100))+'%';
}

// ── TOGGLE ANSWER ──
function toggleAns(btn) {
  const box = btn.nextElementSibling;
  const open = box.classList.toggle('show');
  btn.innerHTML = open ? '▲ Hide Answer' : '▼ Show Answer & Explanation';
}

// ── YEAR TABS ──
function selYear(el, year) {
  document.querySelectorAll('.yr-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  // filter questions
  document.querySelectorAll('.prev-q[data-year]').forEach(q => {
    q.style.display = (q.dataset.year===year||year==='all') ? '' : 'none';
  });
  toast('Showing '+year+' questions');
}

// ── MOCK TEST RANK CALC ──
function calcRank() {
  const mcq = parseInt(document.getElementById('rMcq')?.value)||0;
  const sub = parseInt(document.getElementById('rSub')?.value)||0;
  const cw  = parseInt(document.getElementById('rCw')?.value)||0;
  const tot = mcq+sub+cw;
  const resEl = document.getElementById('rankResult');
  if(!resEl) return;
  let rank,msg,color;
  if(tot>=85){rank='Top 50';msg='🏆 Excellent! Very strong merit position.';color='var(--green)'}
  else if(tot>=75){rank='~100–200';msg='⚡ Good score. Merit seat likely.';color='var(--gold)'}
  else if(tot>=65){rank='~200–500';msg='📊 Average range. More practice needed.';color='var(--sky)'}
  else if(tot>=40){rank='500+';msg='⚠ Passing score. Intensive revision needed.';color='var(--amber)'}
  else{rank='Below Pass';msg='❌ Below pass mark (40).';color='var(--crimson)'}
  resEl.style.display='block';
  resEl.innerHTML=`<div style="font-size:16px;font-weight:700;color:${color}">${tot}/100 &nbsp;·&nbsp; Est. Merit: ${rank}</div><div style="font-size:13px;color:var(--text2);margin-top:6px">${msg}</div><div style="font-size:11px;color:var(--text3);margin-top:5px;font-family:'DM Mono',monospace">MCQ: ${mcq}/30 | Subjective: ${sub}/50 | Creative Writing: ${cw}/20</div>`;
  saveProgress('mock', false);
}

// ── ADMIN: AI BREAKDOWN OF UPLOADED MATERIAL ──
async function processUploadedFile(file, fileId) {
  const itemEl = document.getElementById('file-'+fileId);
  if(!itemEl) return;
  itemEl.querySelector('.fi-status').innerHTML = '<span class="processing-badge">⚙ Processing…</span>';

  // Read file as text
  let text = '';
  try {
    text = await readFileAsText(file);
  } catch(e) {
    toast('Could not read file: '+e.message, 'error');
    return;
  }
  if(text.length > 12000) text = text.slice(0, 12000) + '...';

  // Call Anthropic API to generate study materials
  const prompt = `You are an expert BALLB entrance exam tutor. Analyze the following study material and generate:
1. A brief SUMMARY (3-4 sentences)
2. 5 KEY POINTS (bullet list)
3. 5 MCQ QUESTIONS with 4 options each and correct answer marked and brief explanation
4. 3 SHORT ANSWER QUESTIONS with model answers

Format your response as JSON with keys: summary, keyPoints (array), mcqs (array of {q,opts:[],correct(0-3 index),exp}), shortAnswers (array of {q,answer})

Study Material:
${text}

RESPOND WITH VALID JSON ONLY. No markdown fences.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    const raw = data.content?.find(c=>c.type==='text')?.text || '';
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()); }
    catch(e) { throw new Error('AI response parse error'); }

    // Save processed material
    const materials = S.get('mpa_materials', []);
    materials.push({
      id: fileId, name: file.name, size: file.size,
      date: new Date().toISOString(),
      ...parsed
    });
    S.set('mpa_materials', materials);

    // Update UI
    itemEl.querySelector('.fi-status').innerHTML = '<span class="done-badge">✓ Ready</span>';
    toast('✅ '+file.name+' processed! MCQs & notes generated.', 'success');
    renderMaterials();
  } catch(e) {
    itemEl.querySelector('.fi-status').innerHTML = '<span style="color:var(--crimson);font-size:11px">❌ Failed</span>';
    toast('Processing failed: '+e.message, 'error');
  }
}

function readFileAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = () => rej(new Error('Read failed'));
    if(file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      r.readAsText(file);
    } else {
      // For non-text files, use name as stub
      res(`[File: ${file.name} — PDF/binary content detected. Generating questions based on file title and BALLB curriculum context.]`);
    }
  });
}

function renderMaterials() {
  const matEl = document.getElementById('materialsGrid');
  if(!matEl) return;
  const mats = S.get('mpa_materials', []);
  if(!mats.length) { matEl.innerHTML='<p class="text-dim" style="text-align:center;padding:24px">No materials yet. Upload study files in Admin Panel.</p>'; return; }
  matEl.innerHTML = mats.slice().reverse().map(m => `
    <div class="card card-p" style="cursor:pointer" onclick="viewMaterial('${m.id}')">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px">${m.name}</div>
          <div style="font-size:11px;color:var(--text3)">${new Date(m.date).toLocaleDateString()} · ${m.mcqs?.length||0} MCQs · ${m.shortAnswers?.length||0} short answers</div>
        </div>
        <span class="done-badge">✓ Ready</span>
      </div>
      <div style="font-size:12.5px;color:var(--text2);margin-top:10px;line-height:1.6">${m.summary||'No summary'}</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <span class="badge badge-gold">${m.mcqs?.length||0} MCQs</span>
        <span class="badge badge-teal">${m.keyPoints?.length||0} Key Points</span>
        <span class="badge badge-sky">${m.shortAnswers?.length||0} Q&A</span>
      </div>
    </div>
  `).join('');
}

function viewMaterial(id) {
  const mats = S.get('mpa_materials', []);
  const m = mats.find(x=>x.id===id);
  if(!m) return;
  const modal = document.getElementById('matModal');
  const body  = document.getElementById('matModalBody');
  if(!modal||!body) return;
  body.innerHTML = `
    <h3 style="font-family:'Playfair Display',serif;font-size:20px;margin-bottom:4px">${m.name}</h3>
    <p style="font-size:11px;color:var(--text3);margin-bottom:18px">${new Date(m.date).toLocaleDateString()}</p>
    <h4 style="color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Summary</h4>
    <p style="font-size:13.5px;color:var(--text2);line-height:1.7;margin-bottom:18px">${m.summary||'—'}</p>
    <h4 style="color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Key Points</h4>
    <ul style="padding-left:18px;margin-bottom:18px">${(m.keyPoints||[]).map(p=>`<li style="font-size:13px;color:var(--text2);margin-bottom:5px">${p}</li>`).join('')}</ul>
    <h4 style="color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">MCQ Questions (${m.mcqs?.length||0})</h4>
    ${(m.mcqs||[]).map((q,i)=>`
      <div style="background:var(--bg3);border-radius:8px;padding:14px;margin-bottom:12px">
        <div style="font-size:13.5px;font-weight:600;margin-bottom:10px">${i+1}. ${q.q}</div>
        ${(q.opts||[]).map((o,j)=>`<div style="font-size:12.5px;padding:4px 0;color:${j===q.correct?'var(--green)':'var(--text2)'}">${j===q.correct?'✓':'◦'} ${o}</div>`).join('')}
        <div style="font-size:12px;color:var(--teal);margin-top:8px;font-style:italic">${q.exp||''}</div>
      </div>`).join('')}
    <h4 style="color:var(--gold);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:18px 0 12px">Short Answer Questions</h4>
    ${(m.shortAnswers||[]).map((qa,i)=>`
      <div style="background:var(--bg3);border-radius:8px;padding:14px;margin-bottom:10px">
        <div style="font-size:13.5px;font-weight:600;margin-bottom:7px">${i+1}. ${qa.q}</div>
        <div style="font-size:12.5px;color:var(--text2);line-height:1.6">${qa.answer}</div>
      </div>`).join('')}
  `;
  modal.classList.add('show');
}

// ── ADMIN ANALYTICS ──
function renderAnalytics() {
  const el = document.getElementById('analyticsBody');
  if(!el) return;
  const sessions = S.get('mpa_sessions', []);
  const cur = S.get(SESSION_KEY);

  // Build display sessions
  const all = [...sessions];
  if(cur) all.push({...cur, uid: S.get('mpa_uid','You'), live:true});

  if(!all.length) { el.innerHTML='<p class="text-dim center" style="padding:24px">No sessions recorded yet.</p>'; return; }

  const byUser = {};
  all.forEach(s => {
    if(!byUser[s.uid]) byUser[s.uid]={uid:s.uid,sessions:0,totalSec:0,pages:[],live:false};
    byUser[s.uid].sessions++;
    byUser[s.uid].totalSec += (s.duration||0);
    byUser[s.uid].pages.push(...(s.pages||[]).map(p=>p.page||p));
    if(s.live) byUser[s.uid].live=true;
  });

  el.innerHTML = Object.values(byUser).sort((a,b)=>b.totalSec-a.totalSec).map(u => {
    const mins = Math.round(u.totalSec/60);
    const hrs = (mins/60).toFixed(1);
    const topPage = u.pages.length ? u.pages.sort((a,b)=>u.pages.filter(x=>x===b).length-u.pages.filter(x=>x===a).length)[0] : '—';
    return `
    <div class="user-row">
      ${u.live?'<div class="live-dot"></div>':''}
      <div class="user-avatar">${u.uid.slice(0,2).toUpperCase()}</div>
      <div class="user-info">
        <strong>${u.live?'You (Current Session)':u.uid}</strong>
        <span>${u.sessions} session${u.sessions>1?'s':''} · Top: ${PAGE_TITLES[topPage]||topPage}</span>
      </div>
      <div class="user-stats">
        <div class="u-time">${mins < 60 ? mins+'m' : hrs+'h'}</div>
        <div class="u-pages">${u.pages.length} page views</div>
      </div>
    </div>`;
  }).join('');
}

// ── ADMIN: QUESTION EDITOR ──
function addAdminQ() {
  const q    = document.getElementById('aqQ')?.value.trim();
  const a    = document.getElementById('aqA')?.value.trim();
  const b    = document.getElementById('aqB')?.value.trim();
  const c    = document.getElementById('aqC')?.value.trim();
  const d    = document.getElementById('aqD')?.value.trim();
  const corr = document.getElementById('aqCorr')?.value;
  const exp  = document.getElementById('aqExp')?.value.trim();
  const topic= document.getElementById('aqTopic')?.value;
  if(!q||!a||!b||!c||!d) { toast('Fill all fields','error'); return; }
  const questions = S.get('mpa_admin_qs', []);
  questions.push({ q, opts:[a,b,c,d], correct:parseInt(corr), exp, topic, id:'Q'+Date.now(), added:new Date().toISOString() });
  S.set('mpa_admin_qs', questions);
  toast('✅ Question added! Total: '+questions.length, 'success');
  ['aqQ','aqA','aqB','aqC','aqD','aqExp'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
}

// ── ADMIN: NOTICE ──
function publishNotice() {
  const title = document.getElementById('noticeTitle')?.value.trim();
  const body  = document.getElementById('noticeBody')?.value.trim();
  if(!title||!body) { toast('Fill title and body','error'); return; }
  const notices = S.get('mpa_notices', []);
  notices.unshift({ title, body, date: new Date().toISOString(), id:'N'+Date.now() });
  S.set('mpa_notices', notices);
  toast('📢 Notice published!', 'success');
  document.getElementById('noticeTitle').value='';
  document.getElementById('noticeBody').value='';
  renderNotices();
}

function renderNotices() {
  const el = document.getElementById('noticesBox');
  if(!el) return;
  const notices = S.get('mpa_notices', []);
  if(!notices.length) { el.innerHTML='<p class="text-dim">No notices yet.</p>'; return; }
  el.innerHTML = notices.slice(0,5).map(n=>`
    <div class="notif-item">
      <div class="notif-icon">📢</div>
      <div class="notif-body"><strong>${n.title}</strong><span>${n.body.slice(0,80)}${n.body.length>80?'...':''}</span></div>
      <div class="notif-time">${new Date(n.date).toLocaleDateString()}</div>
    </div>`).join('');
}

// ── BOOKMARK ──
function bookmark(id, title) {
  const bm = S.get('mpa_bookmarks', []);
  const idx = bm.findIndex(b=>b.id===id);
  if(idx>-1) { bm.splice(idx,1); toast('Removed from bookmarks'); }
  else { bm.push({id,title,date:new Date().toISOString()}); toast('⭐ Bookmarked: '+title,'success'); }
  S.set('mpa_bookmarks', bm);
  renderBookmarks();
}

function renderBookmarks() {
  const el = document.getElementById('bookmarksGrid');
  if(!el) return;
  const bm = S.get('mpa_bookmarks', []);
  if(!bm.length) { el.innerHTML='<p class="text-dim center" style="padding:32px">No bookmarks yet. Star items to save them here.</p>'; return; }
  el.innerHTML = bm.reverse().map(b=>`
    <div class="card card-p" style="cursor:pointer" onclick="nav('${b.id.startsWith('mod')?b.id:'module1'}')">
      <div style="font-size:14px;font-weight:600;margin-bottom:4px">⭐ ${b.title}</div>
      <div style="font-size:11px;color:var(--text3)">${new Date(b.date).toLocaleDateString()}</div>
    </div>`).join('');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  startSession();
  updateStreakDisplay();
  renderNotices();
  renderBookmarks();
  renderMaterials();
  renderAnalytics();
  animateProg();
  // Animate stat bars on load
  setTimeout(() => {
    document.querySelectorAll('.stat-bar-fill[data-w]').forEach(el => {
      el.style.width = '0';
      setTimeout(()=>el.style.width=el.dataset.w, 150);
    });
  }, 200);
  // close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if(e.target===o) o.classList.remove('show'); });
  });
});
