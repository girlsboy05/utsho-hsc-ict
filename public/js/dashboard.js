// Build weeks, rows, countdown, and modal behaviors from ROUTINE JSON.
(function(){
  const weeksEl = document.getElementById('weeks');
  const tz = ROUTINE.timezone || 'Asia/Dhaka';
  const now = new Date();

  function parseTime(d, timeStr){
    if (timeStr === 'All Day') return { start: new Date(d+'T00:00:00'), end: new Date(d+'T23:59:59') };
    const [hh, mm] = timeStr.split(':').map(Number);
    const start = new Date(d+'T'+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':00');
    const end = new Date(start.getTime() + 60*60*1000); // assume 1 hour
    return { start, end };
  }

  // build data entries flat list with week index
  const flat = [];
  ['week0','week1','week2','week3'].forEach((wk, idx)=>{
    (ROUTINE.weeks[wk]||[]).forEach(item=> flat.push({ ...item, week: idx }));
  });

  // Upcoming
  const future = flat
    .map(it => ({...it, ...parseTime(it.date, it.time)}))
    .filter(it => it.module_type !== 'NoModule')
    .sort((a,b)=>a.start-b.start);
  const nowTs = Date.now();
  const next = future.find(it => it.start.getTime() > nowTs) || future[future.length-1];
  const countdownEl = document.getElementById('timeLeft');
  const nextMeta = document.getElementById('nextMeta');
  const nextBtn = document.getElementById('nextDetails');

  function updateCountdown(){
    const diff = next.start.getTime() - Date.now();
    if (diff <= 0) { countdownEl.textContent = '00:00:00'; return; }
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    countdownEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  if (next){
    nextMeta.textContent = `${next.day} ${next.date} • ${next.time} • ${next.topic}`;
    setInterval(updateCountdown, 1000); updateCountdown();
    nextBtn.addEventListener('click', () => showDetails(next));
  }

  // Ongoing class banner
  const ongoingEl = document.getElementById('ongoing');
  const active = future.find(it => it.module_type==='Class' && it.start.getTime()<=nowTs && it.end.getTime()>=nowTs);
  if (active){ ongoingEl.classList.remove('d-none'); }

  // Build accordion per week
  function rowHTML(it){
    const btn = `<button class="btn btn-sm btn-outline-danger" data-date="${it.date}" data-week="${it.week}">Details</button>`;
    const timeTxt = it.time;
    return `<tr>
      <td>${it.module}</td>
      <td>${it.day}<br>${it.date}</td>
      <td>${timeTxt}</td>
      <td>${btn}</td>
    </tr>`;
  }

  function buildWeek(idx, items){
    const id = 'wk'+idx;
    const header = ['Week 0','Week 1','Week 2','Week 3'][idx];
    const rows = items.map(rowHTML).join('');
    const table = `<div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>Module</th><th>Date</th><th>Time</th><th>Details</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
    return `<div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">${header}</button>
      </h2>
      <div id="${id}" class="accordion-collapse collapse" data-bs-parent="#weeks">
        <div class="accordion-body">${table}</div>
      </div>
    </div>`;
  }

  const weeks = [0,1,2,3].map(i => (ROUTINE.weeks['week'+i]||[]).map((it)=>({...it, week:i})));
  weeksEl.innerHTML = weeks.map((items, i)=>buildWeek(i, items)).join('');

  // Auto-expand current week based on date
  const today = new Date().toISOString().slice(0,10);
  const currentIdx = weeks.findIndex(list => list.some(it => it.date === today));
  const expandIdx = currentIdx >=0 ? currentIdx : 0;
  const collapse = document.getElementById('wk'+expandIdx);
  if (collapse){
    new bootstrap.Collapse(collapse, { toggle: true });
  }

  // Details modal behavior
  weeksEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-date]');
    if (!btn) return;
    const d = btn.getAttribute('data-date');
    const wk = parseInt(btn.getAttribute('data-week'),10);
    const item = weeks[wk].find(it => it.date === d);
    if (item) showDetails(item);
  });

  function showDetails(item){
    const body = document.getElementById('modalBody');
    const foot = document.getElementById('modalFooter');
    body.innerHTML = `<div><div class="fw-semibold">${item.topic}</div><div class="small text-muted">${item.day} ${item.date} • ${item.time}</div></div>`;
    foot.innerHTML = '';
    const btn = document.createElement('a');
    btn.className = 'btn btn-danger';
    if (item.module_type === 'Class'){
      btn.textContent = 'Join Class (Google Meet)';
      btn.href = 'https://meet.google.com/'; btn.target='_blank';
      const mat = document.createElement('a');
      mat.className='btn btn-outline-secondary'; mat.textContent='Materials (Google Drive)';
      mat.href='https://drive.google.com/'; mat.target='_blank';
      foot.appendChild(btn); foot.appendChild(mat);
    } else if (item.module_type === 'Practice' || item.module_type === 'Assignment'){
      btn.textContent = 'Open Task (Google Forms)';
      btn.href = 'https://forms.google.com/'; btn.target='_blank';
      const marks = document.createElement('span');
      marks.className='ms-2 align-self-center';
      marks.textContent = 'Marks: ongoing';
      foot.appendChild(btn); foot.appendChild(marks);
    } else {
      btn.textContent = 'Close'; btn.setAttribute('data-bs-dismiss','modal');
      foot.appendChild(btn);
    }
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  }

  window.showDetails = showDetails;
})();