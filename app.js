// Double or Die redesigned app controller
window.__dodErrors = [];
window.addEventListener('error', e => window.__dodErrors.push(e.message || String(e.error || e)));

const qs = (s, r=document) => r.querySelector(s);
const qsa = (s, r=document) => [...r.querySelectorAll(s)];
const DATA = window.SEEDED_DATA || SEEDED_DATA;
const WEEKS = ['week1','week2'];
// Local identity accents only; source team tokens and selection colors stay intact.
const TEAM_COLORS = {
  arizona:'#c43c4d', atlanta:'#c52b39', baltimore:'#8152b8', buffalo:'#3c79ca',
  carolina:'#169fc9', chicago:'#e77332', cincinnati:'#ef722e', cleveland:'#d67738',
  dallas:'#6d97bb', denver:'#f47c32', detroit:'#2799ca', greenbay:'#438866',
  houston:'#c64556', indianapolis:'#4279bf', jacksonville:'#289b9b', kansascity:'#e44855',
  lachargers:'#39a6db', larams:'#507bdb', lasvegas:'#a5aab0', miami:'#2bbdb2',
  minnesota:'#9968cc', newengland:'#b84757', neworleans:'#bbaa76', nygiants:'#487ace',
  nyjets:'#32977a', philadelphia:'#359b94', pittsburgh:'#c7a44b', sanfrancisco:'#d25151',
  seattle:'#6fba51', tampabay:'#d44943', tennessee:'#639bc6', washington:'#ac5268'
};
const state = { tab:'home', user:'Vince D.', avatar:null, picks:{}, theme:'dark', activeGame:null, liveScores:[], liveLoaded:false, liveLoading:false, liveError:null };

function init(){
  loadState();
  bind();
  initFootballs();
  populateProfileOptions();
  renderAll();
}
// Project the surface of a pointed solid of revolution around its long X axis.
// The silhouette and lighting stay fixed; back-facing surface details are culled.
function initFootballs(){
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(hover: hover)');
  const ns = 'http://www.w3.org/2000/svg';
  qsa('.rail-nav .rail-btn').forEach((button, index) => {
    const template = qs('#footballTemplate');
    const svg = template.content.firstElementChild.cloneNode(true);
    // Each inline SVG owns its paint servers, including when dialogs change focus.
    svg.innerHTML = svg.innerHTML.replace(/id="([^"]+)"/g, `id="ball${index}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#ball${index}-$1)`);
    button.prepend(svg);
    const seams = qs('.football-seams', svg);
    const seamPaths = Array.from({length:4}, () => {
      const path = document.createElementNS(ns, 'path'); seams.append(path); return path;
    });
    const grain = qs('.football-grain', svg);
    const grains = [];
    for(let x=22; x<=146; x+=8){
      for(let j=0; j<14; j++){
        const dot = document.createElementNS(ns, 'ellipse');
        dot.setAttribute('rx', '.85'); grain.append(dot);
        grains.push({dot,x,phase:j*Math.PI/7 + (x%16 ? .09 : 0)});
      }
    }
    const lace = qs('.football-laces', svg);
    const radius = x => 36 * (1 - ((x-84)/78)**2);
    const point = (x, angle) => `${x.toFixed(2)} ${(46-radius(x)*Math.sin(angle)).toFixed(2)}`;
    const restAngle = .22;
    function draw(angle){
      svg.dataset.roll = angle.toFixed(3);
      seamPaths.forEach((path, i) => {
        const a = angle + i*Math.PI/2;
        path.setAttribute('opacity', Math.cos(a)>0 ? String(.45 + .25*Math.cos(a)) : '0');
        path.setAttribute('d', Array.from({length:27}, (_,j) => `${j?'L':'M'}${point(6+j*6,a)}`).join(' '));
      });
      grains.forEach(({dot,x,phase}) => {
        const a = angle+phase, front = Math.cos(a);
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', (46-radius(x)*Math.sin(a)).toFixed(2));
        dot.setAttribute('ry', Math.max(.08,.85*front).toFixed(2));
        dot.setAttribute('opacity', front>0 ? String(.32*front) : '0');
      });
      let d = '';
      if(Math.cos(angle)>0){
        for(let x=55; x<=113; x+=2) d += `${x===55?'M':'L'}${point(x,angle)} `;
      }
      // Each cross-lace follows the curved surface; partial visibility is clipped
      // geometrically at the horizon, not faded through the back of the ball.
      for(let x=59; x<=110; x+=8){
        let connected = false;
        for(let step=0; step<=12; step++){
          const a = angle-.19 + step*.38/12;
          if(Math.cos(a)>0){ d += `${connected?'L':'M'}${point(x,a)} `; connected=true; }
          else connected=false;
        }
      }
      lace.setAttribute('d', d);
    }
    let frame = 0, started = 0, tapUntil = 0, touchTapArmed = false;
    const tapDuration = 720;
    const continuousEngaged = () => (hover.matches && button.matches(':hover')) || button.matches(':focus-visible');
    const engaged = (now=performance.now()) => !reduced.matches && !document.hidden && (continuousEngaged() || now < tapUntil);
    function tick(now){
      if(!engaged(now)){ frame=0; tapUntil=0; draw(restAngle); return; }
      if(now < tapUntil){
        const progress = Math.min(1, (now-started)/tapDuration);
        const eased = 1 - (1-progress)**2;
        draw(restAngle + eased*Math.PI*4);
      } else draw(restAngle + (now-started)*Math.PI*2/950);
      frame=requestAnimationFrame(tick);
    }
    function update(){
      if(reduced.matches || document.hidden) tapUntil=0;
      if(engaged() && !frame){ started=performance.now(); frame=requestAnimationFrame(tick); }
      else if(!engaged()){ cancelAnimationFrame(frame); frame=0; draw(restAngle); }
    }
    function startTapSpiral(){
      if(hover.matches || reduced.matches || document.hidden) return;
      started=performance.now(); tapUntil=started+tapDuration;
      cancelAnimationFrame(frame);
      draw(restAngle);
      frame=requestAnimationFrame(tick);
    }
    ['pointerenter','pointerleave','focus','blur'].forEach(type=>button.addEventListener(type,update));
    button.addEventListener('pointerdown', event => { touchTapArmed=event.pointerType==='touch'; }, {passive:true});
    button.addEventListener('pointercancel', () => { touchTapArmed=false; }, {passive:true});
    button.addEventListener('click', event => {
      const isTouchTap = event.pointerType==='touch' || touchTapArmed;
      touchTapArmed=false;
      if(isTouchTap) startTapSpiral();
    });
    reduced.addEventListener('change',update);
    document.addEventListener('visibilitychange',update);
    draw(restAngle);
  });
}
function loadState(){
  state.user = localStorage.getItem('dod_user') || state.user;
  state.avatar = localStorage.getItem('dod_avatar_'+state.user) || null;
  state.theme = localStorage.getItem('dod_theme2') || 'dark';
  const p = localStorage.getItem('dod_picks_w3_'+state.user);
  state.picks = p ? safeJson(p,{}) : {};
  document.body.classList.toggle('light', state.theme === 'light');
}
function savedKey(){ return 'dod_picks_w3_'+state.user; }
function savedAtKey(){ return 'dod_picks_w3_saved_at_'+state.user; }
function isSaved(){ return !!localStorage.getItem(savedAtKey()); }
function savePicks(){
  localStorage.setItem(savedKey(), JSON.stringify(state.picks));
  localStorage.setItem(savedAtKey(), new Date().toLocaleString());
}

function savedTicketText(){
  return games().map(g => {
    const p = gamePick(g);
    return `G${g.id}: ${p.team || '—'} | ${p.wager || '—'} pts${p.double ? ' | 2X' : ''}`;
  }).join('\n');
}
function copySavedTicket(){
  const text = `Double or Die Week 3 - ${state.user}
${savedTicketText()}`;
  if(navigator.clipboard?.writeText){ navigator.clipboard.writeText(text).then(()=>alert('Saved ticket copied.')).catch(()=>prompt('Copy saved ticket:', text)); }
  else prompt('Copy saved ticket:', text);
}
function downloadSavedTicket(){
  const text = `Double or Die Week 3 - ${state.user}
${savedTicketText()}
Saved: ${localStorage.getItem(savedAtKey()) || 'not saved'}`;
  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `double-or-die-${state.user.replace(/\W+/g,'-')}-week3.txt`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
function bind(){
  qsa('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
  qs('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dod_theme2', state.theme);
    document.body.classList.toggle('light', state.theme === 'light');
    qs('#themeToggle span').textContent = state.theme === 'dark' ? '☀ Light' : '☾ Dark';
  });
  qs('#profileBtn').addEventListener('click', openProfile);
  qs('#rulesBtn').addEventListener('click', () => qs('#rulesDialog').showModal());
  qsa('[data-open-rules]').forEach(b=>b.addEventListener('click', () => qs('#rulesDialog').showModal()));
  qs('#autoPickBtn').addEventListener('click', autoPick);
  qs('#resetPicksBtn').addEventListener('click', resetPicks);
  qs('#submitPicksBtn').addEventListener('click', submitPicks);
  qs('#reviewTicketLink').addEventListener('click', e => {
    e.preventDefault();
    const ticket = qs('#ticketPanel');
    ticket.focus({preventScroll:true});
    ticket.scrollIntoView({block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  });
  qs('#leaderMode').addEventListener('change', renderLeaderboard);
  qs('#leaderSearch').addEventListener('input', renderLeaderboard);
  qs('#statsPlayer').addEventListener('change', renderStats);
  qs('#statsCompare').addEventListener('change', renderStats);
  qs('#avatarUpload').addEventListener('change', previewAvatar);
  qs('#saveProfileBtn').addEventListener('click', saveProfile);
}
function switchTab(tab){
  state.tab = tab;
  qsa('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
  qsa('.rail-btn,.brand-mark').forEach(b => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    if(active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
  if(tab === 'leaderboard') renderLeaderboard();
  if(tab === 'stats') renderStats();
  if(tab === 'history') renderHistory();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  scrollTo({top:0, behavior: reduced ? 'auto' : 'smooth'});
}
function renderAll(){
  qs('#themeToggle span').textContent = state.theme === 'dark' ? '☀ Light' : '☾ Dark';
  updateUser(); renderHome(); renderPicks(); renderLeaderboard(); renderStats(); renderHistory(); loadLiveScores();
}
function updateUser(){ qs('#topUser').textContent = state.user; qs('#topAvatar').src = avatarFor(state.user); }
function standings(){ return DATA.standings || []; }
function games(){ return DATA.week3_games || []; }
function currentUserStanding(){ return standings().find(s => s.name === state.user) || {}; }
function pickStatus(){
  const gs = games(); const used = usedWagers(); const picked = gs.filter(g => gamePick(g).team).length;
  const wagered = gs.filter(g => gamePick(g).wager).length; const dbl = gs.find(g => gamePick(g).double);
  const valid = gs.every(g => {
    const p = gamePick(g), n = Number(p.wager);
    return [g.team1,g.team2].includes(p.team) && Number.isInteger(n) && n>=1 && n<=16;
  });
  const firstNoTeam = gs.find(g => !gamePick(g).team);
  const firstNoWager = gs.find(g => gamePick(g).team && !gamePick(g).wager);
  const next = firstNoTeam ? `Pick a side for Game ${firstNoTeam.id}` : firstNoWager ? `Assign confidence to Game ${firstNoWager.id}` : !dbl ? 'Choose your 2X Double' : Object.keys(used).length !== 16 ? 'Resolve confidence values' : 'Ready to save';
  return {picked,wagered,dbl,used,next,ready:valid && picked===16 && wagered===16 && Object.keys(used).length===16 && gs.filter(g=>gamePick(g).double).length===1};
}
function renderHome(){
  const list = standings(), leader = list[0] || {}, user = currentUserStanding();
  const ps = pickStatus(), locked = isSaved();
  const behind = user.name ? Number(leader.total||0)-Number(user.total||0) : '—';
  const progress = Math.round((ps.picked + ps.wagered + Number(!!ps.dbl))/33*100);
  qs('#weekCommandCard').innerHTML = `
    <div class="command-copy"><p class="eyebrow">Week 03 · Your card</p><h2>${locked ? 'Your picks are locked.' : ps.ready ? 'Ready to double down.' : 'Make your call.'}</h2><p>${locked ? 'Your Week 3 ticket is saved. Good luck.' : h(ps.next)+'.'}</p></div>
    <div class="command-controls"><div class="command-numbers">
      <div class="command-stat"><small>Picks</small><strong>${ps.picked}<em> / 16</em></strong></div>
      <div class="command-stat"><small>Confidence</small><strong>${ps.wagered}<em> / 16</em></strong></div>
      <div class="command-stat"><small>Your double</small><strong>${ps.dbl ? 'G'+ps.dbl.id : '—'}</strong></div>
    </div><button class="primary-btn" data-tab="picks" type="button">${locked ? 'View saved card' : ps.ready ? 'Review card' : ps.picked ? 'Finish picks' : 'Make picks'} <span aria-hidden="true">→</span></button></div>
    <div class="command-progress"><div class="progress-track" role="progressbar" aria-label="Card completion" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div><span>${locked ? 'Saved & locked' : ps.ready ? 'Ready to save · not locked' : '16 games · 1 double'}</span></div>`;
  qs('#weekCommandCard [data-tab]').addEventListener('click', () => switchTab('picks'));
  qs('#heroLeaderCard').innerHTML = `<div class="panel-head"><h3>Season standings</h3><button class="text-btn" type="button" onclick="switchTab('leaderboard')">Full board <span aria-hidden="true">↗</span></button></div><table class="mini-table"><thead><tr><th scope="col">Rank</th><th scope="col">Player</th><th scope="col">Points</th><th scope="col">Behind</th></tr></thead><tbody>${list.slice(0,5).map((s,i)=>`<tr><td><b class="${i===0?'leader-rank':''}">${h(s.rank)}</b></td><td><button class="player-link" type="button" data-player="${attr(s.name)}" onclick="openStatsFor(this.dataset.player)">${h(s.name)}</button></td><td class="mini-points">${h(s.total)}</td><td class="mini-behind">${i===0 ? '—' : h(s.out)}</td></tr>`).join('')}</tbody></table>`;
  qs('#homeMetrics').innerHTML = [
    ['Your season rank', user.rank ? '#'+user.rank : '—', ''],
    ['Season points', user.total ?? '—', 'pts'],
    ['Behind the leader', behind, 'pts'],
    ['Best week', user.name ? Math.max(Number(user.w1)||0,Number(user.w2)||0) : '—', 'pts']
  ].map(([a,b,c]) => `<div class="metric"><small>${h(a)}</small><strong>${h(b)} <em>${h(c)}</em></strong></div>`).join('');
  const tools = [['leaderboard','Standings','Season totals & weekly matrices'],['stats','Player stats','Your record, side by side'],['history','The archive','Champions & saved cards']];
  qs('#legacyList').innerHTML = tools.map(([tab,a,b])=>`<button class="legacy-item" type="button" data-tab="${tab}" onclick="switchTab(this.dataset.tab)"><span><strong>${h(a)}</strong><small>${h(b)}</small></span><span aria-hidden="true">↗</span></button>`).join('');
  renderLastWeekWinner();
  renderLiveScores();
}
function renderLastWeekWinner(){
  const winner = [...standings()].sort((a,b)=>Number(b.w2||0)-Number(a.w2||0))[0];
  const el = qs('#lastWeekWinner'); if(!el || !winner) return;
  el.innerHTML = `<div class="winner-spotlight"><div><p class="eyebrow">Week 2 winner</p><h2>${h(winner.name)}</h2><p>Season #${h(winner.rank)} · ${h(winner.total)} total points</p></div><div class="winner-score"><strong>${h(winner.w2)}</strong><small>POINTS</small></div></div>`;
}

function gamePick(g){ return state.picks[g.id] || {}; }
function usedWagers(){ const used={}; Object.entries(state.picks).forEach(([gid,p]) => { if(p.wager) used[p.wager] = Number(gid); }); return used; }
function guardLocked(){ if(isSaved()){ alert('Your Week 3 picks are saved and locked. Ask the commissioner if a correction is needed.'); return true; } return false; }
function setTeam(id, team){ if(guardLocked()) return; state.activeGame = Number(id); state.picks[id] = {...(state.picks[id] || {}), team}; renderAll(); }
function setWager(id, w){
  if(guardLocked()) return;
  const n = Number(w), used = usedWagers();
  if(w !== '' && (!Number.isInteger(n) || n<1 || n>16 || (used[n] && used[n]!==Number(id)))) return;
  state.activeGame = Number(id);
  const p = state.picks[id] || {};
  state.picks[id] = {...p, wager:String(w)};
  renderAll();
}
function assignRemaining(w){ if(guardLocked()) return; const id = state.activeGame || Number(games().find(g => !gamePick(g).wager)?.id || games()[0]?.id); if(id) setWager(id, w); }
function setDouble(id){ if(guardLocked()) return; state.activeGame = Number(id); Object.keys(state.picks).forEach(k => state.picks[k].double = false); state.picks[id] = {...(state.picks[id] || {}), double:true}; renderAll(); }
function resetPicks(){ if(isSaved()){ alert('Saved picks are locked and cannot be reset.'); return; } state.picks = {}; renderAll(); }
function renderPicks(){
  const gs = games(), used = usedWagers(), ps = pickStatus(), locked = isSaved();
  const focused = document.activeElement?.dataset.focusKey;
  const expanded = qs('#remainingWagers details')?.open || false;
  const doubleWager = ps.dbl ? Number(gamePick(ps.dbl).wager) || 0 : 0;
  const nextGame = gs.find(g => !gamePick(g).team || !gamePick(g).wager);
  const doubleStatus = ps.dbl ? `2X G${ps.dbl.id}` : '2X needed';
  const mobileStatus = locked ? 'Saved & locked' : ps.ready ? `Ready to save · ${doubleStatus}` : nextGame ? `Next G${nextGame.id} · ${doubleStatus}` : !ps.dbl ? 'Choose your 2X' : `Check points · ${doubleStatus}`;
  qs('#mobilePickStatus').innerHTML = `<strong>${ps.picked}/${gs.length} picks · ${Object.keys(used).length}/16 pts</strong><small>${h(mobileStatus)}</small>`;
  qs('#pickSummary').innerHTML = [
    ['Next', locked ? 'Saved and locked' : ps.next, 'next-action'], ['Picked', `${ps.picked}/${gs.length}`], ['Confidence', `${Object.keys(used).length}/16`], ['Double', ps.dbl ? `G${ps.dbl.id}` : '—'], ['Max win / loss', `±${136+doubleWager}`]
  ].map(([a,b,cls='']) => `<div class="summary-cell ${cls}"><small>${h(a)}</small><strong>${h(b)}</strong></div>`).join('');
  const remaining = Array.from({length:16},(_,i)=>i+1).filter(n => !used[n]);
  qs('#remainingWagers').innerHTML = remaining.length && !locked ? `<details ${expanded?'open':''}><summary>Available confidence · ${remaining.length} remaining</summary><div class="remaining-options"><p>Assign to ${state.activeGame ? 'Game '+state.activeGame : 'the next unassigned game'}.</p>${remaining.map(n=>`<button type="button" onclick="assignRemaining(${n})" aria-label="Assign ${n} confidence points to ${state.activeGame ? 'Game '+state.activeGame : 'the next unassigned game'}">${n}</button>`).join('')}</div></details>` : `<span>${locked ? 'Saved card · contact the commissioner for corrections' : 'All 16 confidence values assigned'}</span>`;
  qs('#gamesGrid').innerHTML = gs.map(g => gameCard(g, used, locked)).join('');
  qs('#ticketPanel').innerHTML = `<p class="eyebrow">Week 03 · Pick ticket</p><h3>${h(state.user)}</h3><div class="ticket-rows">${gs.map(g => {const p=gamePick(g); return `<div class="ticket-line ${p.double?'doubled':''}"><span>G${g.id} · ${h(p.team ? teamLabel(p.team) : 'No pick')}</span><strong>${h(p.wager || '—')}${p.double ? ' ×2' : ''}</strong></div>`}).join('')}</div><div class="ready-stamp ${ps.ready?'ready':''}">${locked ? 'Saved & locked' : ps.ready ? 'Ready to save · not locked' : `${ps.picked}/16 picks · ${ps.dbl ? 'Double selected' : 'Choose one double'}`}</div>${locked ? `<div class="save-status">Saved ${h(localStorage.getItem(savedAtKey()) || '')}</div><p class="lock-note">Need a correction? Contact the commissioner. Keep a copy of your ticket below.</p><div class="ticket-tools"><button class="ghost-btn" type="button" onclick="copySavedTicket()">Copy ticket</button><button class="ghost-btn" type="button" onclick="downloadSavedTicket()">Download</button></div>` : `<button class="primary-btn full" type="button" ${!ps.ready?'disabled':''} onclick="submitPicks()">${ps.ready ? 'Save & lock picks' : 'Complete your card to save'}</button>`}`;
  const saveBtn = qs('#submitPicksBtn');
  saveBtn.disabled = locked || !ps.ready;
  saveBtn.textContent = locked ? 'Saved & locked' : 'Save picks';
  saveBtn.title = locked ? 'Your card is locked' : ps.ready ? 'Review, then confirm and lock your card' : 'Complete all 16 picks, unique confidence values and one double to save';
  qs('#resetPicksBtn').disabled = locked;
  qs('#autoPickBtn').disabled = locked;
  if(focused) qs(`[data-focus-key="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
}
function teamLabel(team){
  return String(team).toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(Ny|La)\b/g,s=>s.toUpperCase());
}
function gameCard(g, used, locked=false){
  const p = gamePick(g), hasTeam = !!p.team, hasWager = !!p.wager;
  const opts = ['<option value="">Choose points</option>'].concat(Array.from({length:16},(_,i)=>i+1).map(n => `<option value="${n}" ${p.wager==n?'selected':''} ${used[n]&&used[n]!==g.id?'disabled':''}>${n} ${n===1?'point':'points'}${used[n]&&used[n]!==g.id?' · used on G'+used[n]:''}</option>`)).join('');
  const live = liveForGame(g), projected = livePickResult(g, live, p);
  const teamButton = (team,code,i) => `<button class="team-btn ${p.team===team?'selected':''}" style="--team-color:${TEAM_COLORS[normalizeTeam(team)] || '#929b96'}" aria-pressed="${p.team===team}" aria-label="Game ${g.id}: ${attr(teamLabel(team))}, ${team===g.fav?'-':'+'}${attr(g.spread)}" type="button" ${locked?'disabled':''} data-focus-key="team-${g.id}-${i}" data-game-id="${g.id}" data-team="${attr(team)}" onclick="event.stopPropagation();setTeam(Number(this.dataset.gameId),this.dataset.team)"><span class="team-abbr">${h(code||abbr(team))}</span><span class="team-text"><b>${h(teamLabel(team))}</b><small>${team===g.fav?'-':'+'}${h(g.spread)}</small></span></button>`;
  return `<article class="game-card ${locked?'locked':''} ${p.double?'double':''} ${hasTeam?'has-team':''} ${hasWager?'has-wager':''} ${projected.cls}" data-game="${g.id}">
    <div class="game-top"><strong>GAME ${String(g.id).padStart(2,'0')}</strong><span class="muted">${h(live?.detail || g.time.replace('/',' · '))}</span><span class="game-tag ${p.double?'is-double':''}">${p.double?'2X':hasTeam&&hasWager?'✓':''}</span></div>
    ${projected.html}
    <div class="team-row">${teamButton(g.team1,g.team1_abbr,1)}${teamButton(g.team2,g.team2_abbr,2)}</div>
    <div class="game-controls"><div class="wager-select-row"><label for="confidence-${g.id}">Confidence</label><select id="confidence-${g.id}" data-focus-key="confidence-${g.id}" aria-label="Confidence for game ${g.id}" ${locked?'disabled':''} onchange="setWager(${g.id},this.value)">${opts}</select></div>
    <button class="double-btn" type="button" data-focus-key="double-${g.id}" ${locked || !(hasTeam && hasWager) ? 'disabled' : ''} aria-pressed="${!!p.double}" aria-label="${p.double?'Double selected for':'Double'} game ${g.id}" title="${hasTeam&&hasWager?'Double the points on this game':'Choose a team and confidence first'}" onclick="setDouble(${g.id})"><b>2X</b> ${locked ? (p.double?'Double locked':'Card locked') : p.double?'Selected':'Double'}</button></div>
  </article>`;
}

async function loadLiveScores(){
  if(state.liveLoaded || state.liveLoading) return;
  state.liveLoading = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try{
    const r = await fetch('https://cdn.espn.com/core/nfl/scoreboard?xhr=1', {cache:'no-store', credentials:'omit', signal:controller.signal});
    if(!r.ok) throw new Error('ESPN '+r.status);
    const data = await r.json();
    const events = data?.content?.sbData?.events;
    if(!Array.isArray(events)) throw new Error('Unexpected ESPN scoreboard response');
    state.liveScores = events.map(normalizeLiveEvent);
    state.liveLoaded = true; state.liveError = null;
  }catch(err){
    state.liveLoaded = true; state.liveError = err.name === 'AbortError' ? 'Live score request timed out' : (err.message || 'Live scores unavailable'); state.liveScores = [];
  }finally{
    clearTimeout(timer);
    state.liveLoading = false;
  }
  renderLiveScores(); renderPicks();
}
function normalizeLiveEvent(e){
  const comp = e.competitions?.[0] || {}, teams = comp.competitors || [];
  const away = teams.find(t=>t.homeAway==='away') || teams[0] || {};
  const home = teams.find(t=>t.homeAway==='home') || teams[1] || {};
  return { id:e.id, date:e.date || comp.date || '', name:e.name, shortName:e.shortName, detail:e.status?.type?.shortDetail || e.date || '', state:e.status?.type?.state || 'pre', completed:!!e.status?.type?.completed,
    away:{name:away.team?.displayName||away.team?.name||'', abbr:away.team?.abbreviation||'', score:Number(away.score||0)}, home:{name:home.team?.displayName||home.team?.name||'', abbr:home.team?.abbreviation||'', score:Number(home.score||0)} };
}
function teamMatch(a,b){ a=normalizeTeam(a); b=normalizeTeam(b); return a && b && (a.includes(b)||b.includes(a)); }
function liveForGame(g){
  // The historical Week 3 seed has no season/kickoff date. Never attach the
  // current scoreboard to it just because a franchise happens to be playing.
  const date = g.kickoffISO || g.date;
  if(!/^\d{4}-\d{2}-\d{2}T/.test(date || '')) return undefined;
  const kickoff = Date.parse(date);
  if(!Number.isFinite(kickoff)) return undefined;
  const matches = (side, name, code) => code && side.abbr
    ? normalizeTeam(code) === normalizeTeam(side.abbr)
    : teamMatch(side.name, name);
  return state.liveScores.find(e => {
    const eventTime = Date.parse(e.date);
    const samePeriod = Number.isFinite(eventTime) && Math.abs(eventTime-kickoff) <= 6*60*60*1000;
    const bothTeams = (matches(e.home,g.team1,g.team1_abbr) && matches(e.away,g.team2,g.team2_abbr)) ||
      (matches(e.away,g.team1,g.team1_abbr) && matches(e.home,g.team2,g.team2_abbr));
    return samePeriod && bothTeams;
  });
}
function livePickResult(g, live, p){
  if(!live || !p.team) return {cls:'', html:''};
  const pickedHome = teamMatch(live.home.name,p.team), pickedAway = teamMatch(live.away.name,p.team);
  const picked = pickedHome ? live.home : pickedAway ? live.away : null;
  const opp = pickedHome ? live.away : pickedAway ? live.home : null;
  if(!picked || !opp) return {cls:'', html:''};
  const margin = picked.score - opp.score; const spread = Number(String(g.spread).replace('½','.5')) || 0;
  const isFavPick = normalizeTeam(p.team) === normalizeTeam(g.fav);
  const coverMargin = isFavPick ? margin - spread : margin + spread;
  const won = coverMargin > 0, push = coverMargin === 0;
  const value = Number(p.wager||0) * (p.double ? 2 : 1);
  const cls = live.state==='pre' ? 'not-started' : push ? 'push-live' : won ? 'winning-live' : 'losing-live';
  const label = live.state==='pre' ? 'Kickoff pending' : push ? 'PUSH' : won ? `Winning +${value}` : `Losing -${value}`;
  return {cls, html:`<div class="pick-result-pill ${cls}">${h(label)} • ${h(live.away.abbr)} ${h(live.away.score)} @ ${h(live.home.abbr)} ${h(live.home.score)}</div>`};
}
function renderLiveScores(){
  const grid = qs('#liveScoreGrid'), status = qs('#liveScoreStatus'); if(!grid) return;
  const compact = !state.liveLoaded || !!state.liveError || !state.liveScores.length;
  grid.closest('.live-score-section').classList.toggle('is-compact', compact);
  grid.hidden = compact;
  grid.tabIndex = compact ? -1 : 0;
  status.textContent = !state.liveLoaded ? 'Connecting…' : state.liveError ? 'Scores unavailable' : !state.liveScores.length ? 'No games in feed' : 'ESPN · current schedule';
  status.title = state.liveError ? 'Current NFL scores are unavailable. Your Week 3 pool card is still available.' : '';
  if(compact){ grid.replaceChildren(); return; }
  grid.innerHTML = state.liveScores.slice(0,16).map(e=>{
    const detail = e.state==='pre' && Number.isFinite(Date.parse(e.date))
      ? new Date(e.date).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'})
      : e.detail;
    return `<div class="live-card ${e.state}" title="${attr(e.name)}"><small>${h(detail)}</small>${[e.away,e.home].map(t=>`<div class="score-team"><span class="team-dot" aria-hidden="true"></span><b>${h(t.abbr)}</b><b>${e.state==='pre'?'—':h(t.score)}</b></div>`).join('')}</div>`;
  }).join('');
}

function submitPicks(){
  if(isSaved()) return alert('Your Week 3 picks are already saved and locked.');
  const gs = games(), missingTeam = gs.filter(g => !gamePick(g).team), missingWager = gs.filter(g => !gamePick(g).wager), unique = new Set(gs.map(g => gamePick(g).wager).filter(Boolean)), doubles = gs.filter(g => gamePick(g).double);
  if(missingTeam.length) return alert(`Pick a team for every game. Missing: ${missingTeam.map(g=>g.id).join(', ')}`);
  if(missingWager.length || unique.size !== 16) return alert('Use each wager number 1–16 exactly once.');
  if(doubles.length !== 1) return alert('Select exactly one 2X Double.');
  if(!pickStatus().ready) return alert('Check that every game has a valid team and confidence from 1–16.');
  if(!confirm('Save and lock this Week 3 card? You will not be able to edit or reset it after saving.')) return;
  savePicks(); renderAll(); alert(`Week 3 picks saved and locked for ${state.user}.`);
}
function autoPick(){ if(guardLocked()) return; const nums=shuffle(Array.from({length:16},(_,i)=>String(i+1))); const dbl=Math.floor(Math.random()*16); state.picks={}; games().forEach((g,i)=>state.picks[g.id]={team:Math.random()>.5?g.team1:g.team2,wager:nums[i],double:i===dbl}); renderAll(); }
function renderLeaderboard(){
  const mode = qs('#leaderMode').value, query = qs('#leaderSearch').value.toLowerCase();
  const podium = qs('#podium'), table = qs('#leaderTable'), legend = qs('#matrixLegend'), summary = qs('#leaderSummary');
  if(mode === 'season'){
    legend.hidden = true; podium.style.display = 'grid'; summary.hidden = false;
    const rows = standings().filter(s => s.name.toLowerCase().includes(query));
    const me = currentUserStanding(), leader = standings()[0] || {};
    const bestWeek = Math.max(Number(me.w1)||0, Number(me.w2)||0, Number(me.w3)||0);
    summary.innerHTML = me.name ? [['Your rank','#'+me.rank],['Your points',me.total],['Behind leader',(Number(leader.total||0)-Number(me.total||0))+' pts'],['Best week',bestWeek]].map(([a,b])=>`<div class="summary-cell"><small>${h(a)}</small><strong>${h(b)}</strong></div>`).join('') : '';
    podium.innerHTML = standings().slice(0,3).map((s,i) => `<div class="podium-card ${i===0?'first':''}"><div class="place">${i+1}</div><h3>${h(s.name)}</h3><p><b>${h(s.total)}</b> pts • ${h(s.wins)} wins</p><small class="muted">Avg ${h(s.avg)} • Behind ${h(s.out)}</small></div>`).join('');
    table.innerHTML = `<thead><tr><th>#</th><th class="sticky-name">Player</th><th>Total</th><th>Wins</th><th>Avg</th><th title="Points behind current leader">Behind 1st</th><th title="Points behind second place">Behind 2nd</th><th title="Points behind third place">Behind 3rd</th><th title="Week 1 score">Week 1</th><th title="Week 2 score">Week 2</th></tr></thead><tbody>${rows.map(s => `<tr class="${s.name===state.user?'is-you':''}" data-player="${attr(s.name)}" role="button" tabindex="0" aria-label="Open stats for ${attr(s.name)}"><td>${h(s.rank)}</td><td class="sticky-name"><strong>${h(s.name)}</strong>${s.name===state.user?' <b style="color:var(--gold)">YOU</b>':''}</td><td class="num">${h(s.total)}</td><td>${h(s.wins)}</td><td>${h(s.avg)}</td><td>${h(s.out)}</td><td>${h(s.second)}</td><td>${h(s.third)}</td><td>${h(s.w1)}</td><td>${h(s.w2)}</td></tr>`).join('')}</tbody>`;
    qsa('#leaderTable tbody tr').forEach(tr => {
      tr.addEventListener('click', () => openStatsFor(tr.dataset.player));
      tr.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openStatsFor(tr.dataset.player); } });
    });
  } else {
    legend.hidden = false; podium.style.display = 'none'; summary.hidden = true; summary.innerHTML = '';
    const wd = DATA[mode] || {}, meta = parseWeekGames(mode), rows = (wd.results || []).filter(r => r.name.toLowerCase().includes(query));
    table.innerHTML = `<thead><tr><th class="sticky-name">Player</th><th>Score</th><th>Double</th>${meta.map((g,i)=>`<th title="${attr((DATA[mode].games_header||[])[i]||'')}">G${i+1}<br><small>${h(g.winner||'Result')}</small></th>`).join('')}</tr></thead><tbody>${rows.map(r => { const scoreClass = Number(r.score)>=100?'score-good':Number(r.score)<50?'score-bad':'score-mid'; return `<tr><td class="sticky-name"><strong>${h(r.name)}</strong></td><td class="num ${scoreClass}">${h(r.score)}</td><td style="color:var(--gold);font-weight:900">${h(r.double)}</td>${r.picks.map(p => matrixCell(p,r,meta)).join('')}</tr>`; }).join('')}</tbody>`;
  }
}
function matrixCell(p, row, meta){
  const game = meta.find(g => g.game === Number(p.game_num));
  const correct = game && normalizeTeam(p.team) === normalizeTeam(game.winner);
  const doubled = row.double === `Game ${p.game_num}`;
  return `<td class="${correct?'is-correct':'is-wrong'} ${doubled?'is-double':''}"><strong>${h(p.team)}</strong><br><small class="muted">${h(p.wager)} pt${doubled?' • 2X':''}</small></td>`;
}
function openStatsFor(name){ switchTab('stats'); qs('#statsPlayer').value = name; renderStats(); }
function populateProfileOptions(){ const names = standings().map(s => s.name); ['profilePlayer','statsPlayer','statsCompare'].forEach(id => { qs('#'+id).innerHTML = names.map(n => `<option value="${attr(n)}">${h(n)}</option>`).join(''); }); if(names.includes(state.user)) qs('#profilePlayer').value = state.user; qs('#statsPlayer').value = names.includes(state.user) ? state.user : names[0]; qs('#statsCompare').value = names.includes('Henry') ? 'Henry' : names[0]; }
function parseWeekGames(week){
  return (DATA[week]?.games_header || []).map((raw,i) => {
    const lines = String(raw).split('\n').map(s => s.trim()).filter(Boolean); const first = lines[0] || '';
    const m = first.match(/Game\s+(\d+)\s+(.+?)\s+-([\d½.]+)/i);
    return {game:Number(m?.[1] || i+1), fav:(m?.[2]||'').trim(), spread:m?.[3]||'', other:lines[1]||'', winner:lines[2]||''};
  });
}
function calcPlayer(name){
  const standing = standings().find(s => s.name === name) || {}; const teamCounts={}, teamLabels={}; let picks=0,doubles=0,high=0,fav=0,dog=0,wagerTotal=0,correct=0,wrong=0,doubleWins=0,doubleLosses=0;
  WEEKS.forEach(w => { const row = DATA[w]?.results?.find(r => r.name === name); if(!row) return; const meta = parseWeekGames(w); row.picks.forEach(p => { picks++; const key = normalizeTeam(p.team); teamCounts[key]=(teamCounts[key]||0)+1; teamLabels[key]=teamLabel(p.team); wagerTotal += Number(p.wager)||0; if(Number(p.wager)>=12) high++; const gm=meta.find(g=>g.game===Number(p.game_num)); const isFav = gm && normalizeTeam(p.team) === normalizeTeam(gm.fav); isFav ? fav++ : dog++; const isCorrect = gm && normalizeTeam(p.team) === normalizeTeam(gm.winner); isCorrect ? correct++ : wrong++; const isDouble = row.double === `Game ${p.game_num}`; if(isDouble){ isCorrect ? doubleWins++ : doubleLosses++; } }); if(row.double) doubles++; });
  return {name, standing, picks, teamCounts, teamLabels, doubles, high, fav, dog, correct, wrong, winPct:picks?Math.round(correct/picks*100):0, doubleWins, doubleLosses, wagerAvg:picks?(wagerTotal/picks).toFixed(1):0};
}
function renderStats(){
  const name = qs('#statsPlayer').value || state.user, compare = qs('#statsCompare').value || 'Henry'; const p = calcPlayer(name), c = calcPlayer(compare);
  qs('#statsGrid').innerHTML = `<div class="stat-card profile"><img src="${avatarFor(name)}" alt="${attr(name)} avatar"><div><small>Player</small><strong>${h(name)}</strong><div class="muted">#${h(p.standing.rank||'—')} • ${p.picks} picks on file</div></div></div>${[['Total',p.standing.total||0],['Games won',`${p.correct}/${p.picks}`],['Win %',`${p.winPct}%`],['Double record',`${p.doubleWins}-${p.doubleLosses}`]].map(([a,b])=>`<div class="stat-card"><small>${h(a)}</small><strong>${h(b)}</strong></div>`).join('')}`;
  const teams = Object.entries(p.teamCounts).sort((a,b)=>b[1]-a[1]).slice(0,12); const max = Math.max(1,...teams.map(t=>t[1]));
  qs('#teamBars').innerHTML = teams.length ? teams.map(([t,n])=>`<div class="bar-row"><strong>${h(p.teamLabels[t])}</strong><div class="bar"><i style="width:${n/max*100}%"></i></div><b>${n}</b></div>`).join('') : '<p class="muted">No picks found for this player.</p>';
  const gap = Number(p.standing.total||0) - Number(c.standing.total||0);
  const ahead = gap >= 0 ? p.name : c.name;
  qs('#h2hPanel').innerHTML = `<div class="h2h-winner"><small>Currently ahead</small><strong>${h(ahead)} by ${Math.abs(gap)} pts</strong></div><div class="compare-row"><span>Metric</span><b>${h(p.name)}</b><b>${h(c.name)}</b></div>${[['Rank','#'+(p.standing.rank||'—'),'#'+(c.standing.rank||'—')],['Total',p.standing.total||0,c.standing.total||0],['Games won',p.correct,c.correct],['Win %',p.winPct+'%',c.winPct+'%'],['Double record',`${p.doubleWins}-${p.doubleLosses}`,`${c.doubleWins}-${c.doubleLosses}`],['Average wager',p.wagerAvg,c.wagerAvg],['High confidence',p.high,c.high]].map(([a,b,d])=>`<div class="compare-row"><span>${h(a)}</span><b>${h(b)}</b><b>${h(d)}</b></div>`).join('')}`;
}
function renderHistory(){
  const champs = DATA.champions || [];
  const stage = qs('#championsStage'); if(stage) stage.innerHTML = champs.slice(0,6).map((c,i)=>`<section class="champion-slide ${i===0?'reigning':''}"><span>${h(c.year)}</span><h3>${h(c.name)}</h3><p>${i===0?'Reigning champion.':'Champion season.'}</p></section>`).join('');
  qs('#championsGrid').innerHTML = champs.map(c => `<div class="champion"><b>${h(c.year)}</b><div>${h(c.name)}</div></div>`).join('');
  const saved = localStorage.getItem('dod_picks_w3_'+state.user), when = localStorage.getItem('dod_picks_w3_saved_at_'+state.user);
  qs('#savedWeeks').innerHTML = saved ? `<div class="saved-item"><strong>Week 3 locked</strong><div class="muted">${h(when||'Saved')} • ${Object.keys(safeJson(saved,{})).length} games</div><button class="secondary-btn" type="button" data-tab="picks">View card</button></div>` : '<p class="muted">No saved picks yet for this profile.</p>';
  qsa('#savedWeeks [data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
}
function openProfile(){ qs('#profileName').value = state.user; qs('#profileName').dataset.original = state.user; if([...qs('#profilePlayer').options].some(o=>o.value===state.user)) qs('#profilePlayer').value = state.user; qs('#avatarPreview').src = avatarFor(state.user); qs('#profileDialog').showModal(); }
function previewAvatar(e){ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=ev=>{state.avatar=ev.target.result; qs('#avatarPreview').src=state.avatar;}; reader.readAsDataURL(file); }
function saveProfile(){ const selected=qs('#profilePlayer').value; const nameInput=qs('#profileName'); const typed=nameInput.value.trim(); const original=nameInput.dataset.original || state.user; state.user = (typed && typed !== original) ? typed : (selected || typed || state.user); localStorage.setItem('dod_user', state.user); if(state.avatar) localStorage.setItem('dod_avatar_'+state.user, state.avatar); const p=localStorage.getItem('dod_picks_w3_'+state.user); state.picks = p ? safeJson(p,{}) : {}; updateUser(); populateProfileOptions(); renderAll(); qs('#profileDialog').close(); }
function avatarFor(name=state.user){ const stored = localStorage.getItem('dod_avatar_'+name); if(stored) return stored; const initials = name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase() || '2X'; const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#fffc01"/><text x="48" y="58" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-size="34" fill="#040705">${h(initials)}</text></svg>`; return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg); }
function normalizeTeam(t){ return String(t||'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function h(s){ return String(s ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function attr(s){ return h(s).replace(/'/g,'&#39;'); }
function jsq(s){ return JSON.stringify(String(s)); }
function safeJson(s,fallback){ try{return JSON.parse(s)}catch{return fallback} }
function abbr(t){ return String(t).split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase(); }
window.setTeam=setTeam; window.setWager=setWager; window.assignRemaining=assignRemaining; window.setDouble=setDouble; window.submitPicks=submitPicks; window.copySavedTicket=copySavedTicket; window.downloadSavedTicket=downloadSavedTicket; window.openStatsFor=openStatsFor;
document.addEventListener('DOMContentLoaded', init);
