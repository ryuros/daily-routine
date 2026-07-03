import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

var firebaseConfig = {
  apiKey: "AIzaSyAcrKtSZTcTlgEXKSOalo5XYiYqPrh2BZY",
  authDomain: "daily-routine-d3b38.firebaseapp.com",
  projectId: "daily-routine-d3b38",
  storageBucket: "daily-routine-d3b38.firebasestorage.app",
  messagingSenderId: "1067720448634",
  appId: "1:1067720448634:web:a27046e8e7cf7ee666b9c3"
};
var SYNC_DOC_ID = "d7CKIRH_JFyWyMzAgG9sLD0nHw_P5yFn";
var fbApp = initializeApp(firebaseConfig);
var db = getFirestore(fbApp);
var syncDocRef = doc(db, "routineSync", SYNC_DOC_ID);

(function(){
  "use strict";

  var STORAGE_KEY   = 't_plan_v2';
  var SCHEDULE_KEY  = 't_plan_schedule_v1';
  var PRESET_KEY    = 't_plan_preset_v1';
  var ROUTINES_KEY  = 't_plan_routines_v1';
  var presets = (function(){
    try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || {}; } catch(e){ return {}; }
  })();
  presets.wake  = presets.wake  || '06:00';
  presets.sleep = presets.sleep || '23:00';
  function savePresets(){ try { localStorage.setItem(PRESET_KEY, JSON.stringify(presets)); } catch(e){} }

  var routines = (function(){
    try { return JSON.parse(localStorage.getItem(ROUTINES_KEY)) || []; } catch(e){ return []; }
  })();
  function saveRoutines(){ try { localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines)); } catch(e){} }
  var RING = 'oklch(0.64 0.05 200)';
  var VIEWS = ['1a'];

  var cats = {
    meal:      { dot: '#FFD22D', soft: '#FFFBE0', label: '일상' },
    exercise:  { dot: '#00DF72', soft: '#E0FFF2', label: '운동' },
    study:     { dot: '#00D4F2', soft: '#E0FAFF', label: '공부' },
    work:      { dot: '#2B7FFF', soft: '#EBF1FF', label: '업무' },
    housework: { dot: '#615FFF', soft: '#EEECFF', label: '집안일' },
    hobbies:   { dot: '#FF637E', soft: '#FFE8EC', label: '여가·취미' },
    promise:   { dot: '#FF8704', soft: '#FFF3E0', label: '약속' },
    rest:      { dot: '#90A0B9', soft: '#F0F3F6', label: '휴식' }
  };
  // Migration map: old category/color keys → new keys
  var CAT_MIGRATION = {
    routine: 'rest',  exercise: 'exercise', study: 'study',
    career:  'work',  hobby: 'hobbies',     free: 'hobbies',
    red: 'hobbies', orange: 'promise', amber: 'hobbies', yellow: 'meal',
    lime: 'exercise', green: 'exercise', emerald: 'exercise',
    teal: 'rest', cyan: 'study', sky: 'study', blue: 'study',
    indigo: 'work', violet: 'hobbies', purple: 'housework',
    fuchsia: 'hobbies', pink: 'hobbies', rose: 'hobbies', slate: 'rest'
  };
  function getCat(key){ return cats[key] || cats[CAT_MIGRATION[key]] || cats['rest']; }

  var DEFAULT_SCHEDULE = {
    weekday: [
      { id:'wd2',  start:'06:30', end:'07:30', cat:'exercise',  title:'아침 산책 / 러닝 5km',    note:'가볍게 40분' },
      { id:'wd3',  start:'07:30', end:'08:30', cat:'meal',      title:'샤워 · 아침 식사' },
      { id:'wd4',  start:'08:30', end:'10:30', cat:'study',     title:'한국사 집중 공부',         note:'8월 1급 대비' },
      { id:'wd5',  start:'10:30', end:'11:00', cat:'rest',      title:'휴식 · 커피' },
      { id:'wd6',  start:'11:00', end:'12:00', cat:'exercise',  title:'운동 (PT / 근력+유산소)', note:'주 2회 PT' },
      { id:'wd7',  start:'12:00', end:'13:30', cat:'meal',      title:'점심 · 충분한 휴식' },
      { id:'wd8',  start:'13:30', end:'15:30', cat:'work',      title:'이직 준비',               note:'이력서·포폴·블렌더·앱·AI' },
      { id:'wd9',  start:'15:30', end:'17:00', cat:'rest',      title:'자유시간',                note:'독서·낮잠·산책' },
      { id:'wd10', start:'17:00', end:'18:00', cat:'hobbies',   title:'기타 연습',               note:'주 2~3회 50분' },
      { id:'wd11', start:'18:00', end:'19:30', cat:'meal',      title:'저녁 · 휴식' },
      { id:'wd12', start:'19:30', end:'21:00', cat:'hobbies',   title:'자유시간',                note:'취미·창작·여가' },
      { id:'wd13', start:'21:00', end:'22:00', cat:'study',     title:'한국사 복습 · 독서' },
      { id:'wd14', start:'22:00', end:'23:00', cat:'rest',      title:'하루 정리 · 내일 계획' }
    ],
    weekend: [
      { id:'we2',  start:'08:00', end:'09:30', cat:'exercise',  title:'느긋한 아침 · 산책',              note:'1시간 산책' },
      { id:'we3',  start:'09:30', end:'11:00', cat:'study',     title:'한국사 공부 (감 유지)',            note:'가볍게 1.5h' },
      { id:'we4',  start:'11:00', end:'12:00', cat:'exercise',  title:'자유 운동 / 러닝 또는 휴식' },
      { id:'we5',  start:'12:00', end:'14:00', cat:'meal',      title:'점심 · 여유' },
      { id:'we6',  start:'14:00', end:'16:00', cat:'hobbies',   title:'취미 · 창작',                    note:'기타·블렌더·만들기' },
      { id:'we7',  start:'16:00', end:'19:00', cat:'promise',   title:'자유시간',                       note:'외출·약속·문화생활' },
      { id:'we8',  start:'19:00', end:'20:30', cat:'meal',      title:'저녁' },
      { id:'we9',  start:'20:30', end:'22:30', cat:'hobbies',   title:'자유시간 · 독서 · 다음 주 계획' },
      { id:'we10', start:'22:30', end:'23:00', cat:'rest',      title:'취침 준비' }
    ]
  };

  var schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));

  function loadChecks(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e){ return {}; }
  }
  function saveChecks(checks){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checks)); } catch(e){}
  }

  var applyingRemote = false;
  var syncWriteTimer = null;
  function buildCloudPayload(){
    return {
      checks: JSON.stringify(state.checks),
      schedule: JSON.stringify({ weekday: schedule.weekday, weekend: schedule.weekend }),
      presets: JSON.stringify(presets),
      routines: JSON.stringify(routines),
      updatedAt: Date.now()
    };
  }
  function pushChecksToCloud(){
    clearTimeout(syncWriteTimer);
    syncWriteTimer = setTimeout(function(){
      setDoc(syncDocRef, buildCloudPayload())
        .catch(function(e){ console.error('sync write failed', e); });
    }, 400);
  }
  function pushScheduleToCloud(){
    setDoc(syncDocRef, buildCloudPayload())
      .catch(function(e){ console.error('schedule sync failed', e); });
  }
  function persistChecks(){
    saveChecks(state.checks);
    if (!applyingRemote) pushChecksToCloud();
  }

  function pad2(n){ return n < 10 ? '0' + n : '' + n; }
  function todayDate(){
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }
  function dateKey(d){ return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayTypeOf(d){
    var w = d.getDay();
    return (w === 0 || w === 6) ? 'weekend' : 'weekday';
  }
  function formatDateLabel(d){
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()) + ' ' + days[d.getDay()];
  }

  // Load custom schedule if saved
  (function(){
    try {
      var s = JSON.parse(localStorage.getItem(SCHEDULE_KEY));
      if (s && Array.isArray(s.weekday) && Array.isArray(s.weekend)){
        schedule.weekday = s.weekday;
        schedule.weekend = s.weekend;
      }
    } catch(e){}
  })();

  var state = { selectedDate: todayDate(), activeView: '1a', checks: loadChecks() };

  function toMin(s){ var p = s.split(':'); return (+p[0]) * 60 + (+p[1]); }

  function durLabel(b){
    if (!b.end) return '취침';
    var m = toMin(b.end) - toMin(b.start);
    var h = Math.floor(m / 60), mm = m % 60;
    var out = '';
    if (h) out += h + '시간';
    if (mm) out += (h ? ' ' : '') + mm + '분';
    return out || (m + '분');
  }

  function isChecked(opt, id){
    var c = state.checks, k = dateKey(state.selectedDate);
    return !!(c[k] && c[k][opt] && c[k][opt][id]);
  }

  function toggle(opt, id){
    var k = dateKey(state.selectedDate);
    state.checks[k] = state.checks[k] || {};
    state.checks[k][opt] = state.checks[k][opt] || {};
    if (state.checks[k][opt][id]) delete state.checks[k][opt][id];
    else state.checks[k][opt][id] = true;
    persistChecks();
    render();
  }

  function resetOpt(opt){
    var k = dateKey(state.selectedDate);
    if (state.checks[k]) delete state.checks[k][opt];
    persistChecks();
    render();
  }

  function doPrint(opt){
    document.body.setAttribute('data-print', opt);
    window.print();
  }
  window.addEventListener('afterprint', function(){ document.body.removeAttribute('data-print'); });

  function box(sz, checked, dot){
    return 'width:' + sz + 'px;height:' + sz + 'px;border-radius:' + 4 + 'px;' +
      'display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer;' +
      'font-size:' + (sz > 22 ? 14 : 12) + 'px;color:#fff;line-height:1;transition:all .15s;' +
      'border:1.5px solid ' + (checked ? '#94a3b8' : 'oklch(0.928 0.006 264.531)') + ';' +
      'background:' + (checked ? '#94a3b8' : '#fff') + ';' +
      'align-self:flex-start; margin-top:0;';
  }

  function enrich(b, opt, nowMin, isToday){
    var c = getCat(b.cat);
    var checked = isChecked(opt, b.id);
    var startM = toMin(b.start);
    var endM = b.end ? toMin(b.end) : startM + 30;
    var isNow = isToday && nowMin >= startM && nowMin < endM;
    var titleStyle = checked
      ? 'text-decoration:line-through; color:oklch(0.872 0.01 258.338);'
      : 'color:oklch(0.28 0.012 70);';
    return {
      id: b.id, start: b.start, end: b.end, cat: b.cat, title: b.title, fixed: !!b.fixed,
      checked: checked, dot: c.dot, soft: c.soft,
      meta: b.note || '',
      range: b.end ? b.start + '–' + b.end : b.start,
      durLabel: durLabel(b),
      isNow: isNow, titleStyle: titleStyle,
      boxStyle: box(24, checked, c.dot), boxStyleSm: box(22, checked, c.dot),
      rowBg: checked ? c.soft : 'transparent'
    };
  }

  function esc(s){
    return String(s).replace(/[&<>"']/g, function(ch){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];
    });
  }

  function checkBtn(opt, b, sm){
    return '<button data-toggle="' + opt + ':' + b.id + '" class="no-print" style="' + (sm ? b.boxStyleSm : b.boxStyle) + '" aria-label="완료 체크">' +
      (b.checked ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 13 9 20 22 5"></polyline></svg>' : '') + '</button>';
  }

  function timelineRow(b, showCheck, showLine){
    return '<div style="display:flex; gap:16px; align-items:flex-start;">' +
      '<div style="width:54px; flex:none; text-align:left;">' +
        '<div style="font-family:\'Pretendard\',sans-serif; font-size:15px; color:oklch(0.34 0.012 70);">' + esc(b.start) + '</div>' +
        '<div style="font-size:10.5px; color:oklch(0.707 0.022 261.325); margin-top:1px;">' + esc(b.durLabel) + '</div>' +
      '</div>' +
      '<div style="width:16px; flex:none; display:flex; flex-direction:column; align-items:center; align-self:' + (showLine !== false ? 'stretch' : 'flex-start') + ';">' +
        '<span style="width:11px; height:11px; border-radius:50%; margin-top:4px; flex-shrink:0; background:' + b.dot + ';"></span>' +
        (showLine !== false ? '<span style="flex:1; width:1px; background:oklch(0.928 0.006 264.531); margin-top:4px;"></span>' : '') +
      '</div>' +
      '<div style="flex:1; padding-bottom:' + (showLine !== false ? '28px' : '0') + '; min-width:0;">' +
        '<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">' +
          '<span style="font-size:15.5px; font-weight:550; ' + b.titleStyle + '">' + esc(b.title) + '</span>' +
          (b.isNow ? '<span class="now-badge"><span class="now-dot"></span>Now</span>' : '') +
        '</div>' +
        '<div style="font-size:12.5px; color:oklch(0.707 0.022 261.325); margin-top:3px;">' + esc(b.meta) + '</div>' +
      '</div>' +
      (showCheck ? checkBtn('1a', b, false) : '<div style="width:24px; flex-shrink:0;"></div>') +
    '</div>';
  }

  function renderBlocksA(arr){
    var restC = getCat('rest');
    // 기상 preset row
    var wakeB = { start: presets.wake, durLabel: '', title: '기상', meta: '', dot: 'oklch(0.372 0.044 257.287)', soft: restC.soft, titleStyle: 'color:oklch(0.28 0.012 70);', isNow: false };
    // 취침 preset row
    var sleepB = { start: presets.sleep, durLabel: '', title: '취침', meta: '', dot: 'oklch(0.372 0.044 257.287)', soft: restC.soft, titleStyle: 'color:oklch(0.28 0.012 70);', isNow: false };

    var html = timelineRow(wakeB, false) +
      arr.map(function(b){ return timelineRow(b, true); }).join('') +
      timelineRow(sleepB, false, false);
    document.getElementById('blocksA').innerHTML = html;
  }

  function renderBoardCol(containerId, items, colType, nowMin, isToday){
    var EMPTY = '<p style="font-size:12px; color:oklch(0.68 0.012 70); text-align:center; padding:20px 0;">없음</p>';
    if (!items.length){ document.getElementById(containerId).innerHTML = EMPTY; return; }
    var html = items.map(function(b){
      var c = getCat(b.cat);
      var startM = toMin(b.start);
      var endM = b.end ? toMin(b.end) : startM + 60;
      var isNow = colType === 'notStarted' && isToday && nowMin >= startM && nowMin < endM;
      var range = b.end ? b.start + '–' + b.end : b.start;
      var wrapStyle = 'padding:11px 13px; border-radius:4px; background:' + c.soft + ';';
      if (colType === 'incomplete') wrapStyle += ' opacity:0.55;';
      return '<div style="' + wrapStyle + '">' +
        '<div style="font-size:11px; color:oklch(0.52 0.012 70); margin-bottom:4px; display:flex; align-items:center; gap:5px;">' +
          esc(range) +
          (isNow ? '<span class="now-badge"><span class="now-dot"></span>Now</span>' : '') +
        '</div>' +
        '<div style="font-size:13.5px; font-weight:550; color:oklch(0.28 0.012 70);">' + esc(b.title) + '</div>' +
        '<div style="font-size:11px; color:oklch(0.56 0.012 70); margin-top:5px;">' +
          esc(b.note || '') +
        '</div>' +
      '</div>';
    }).join('');
    document.getElementById(containerId).innerHTML = html;
  }

  function categorizeBoardItems(raw, nowMin, isToday, isPast){
    var notStarted = [], completed = [], incomplete = [];
    raw.forEach(function(b){
      var checked = isChecked('1a', b.id);
      var endM = b.end ? toMin(b.end) : toMin(b.start) + 60;
      if (checked) {
        completed.push(b);
      } else if (isPast || (isToday && nowMin >= endM)) {
        incomplete.push(b);
      } else {
        notStarted.push(b);
      }
    });
    return { notStarted: notStarted, completed: completed, incomplete: incomplete };
  }

  function renderBlocksC(arr){
    var html = arr.map(function(b){
      return '' +
      '<div style="display:flex; gap:12px; align-items:center; padding:9px 12px; border-radius:4px; background:' + b.rowBg + ';">' +
        checkBtn('1c', b, true) +
        '<span style="width:9px; height:9px; border-radius:50%; background:' + b.dot + '; flex:none;"></span>' +
        '<span style="font-family:\'Pretendard\',sans-serif; font-size:13px; color:oklch(0.44 0.012 70); width:46px; flex:none;">' + esc(b.start) + '</span>' +
        '<span style="font-size:13.5px; flex:1; min-width:0; ' + b.titleStyle + '">' + esc(b.title) + '</span>' +
        (b.isNow ? '<span class="now-badge"><span class="now-dot"></span>Now</span>' : '') +
      '</div>';
    }).join('');
    document.getElementById('blocksC').innerHTML = html;
  }

  function buildClockSvg(items, nowMin, isToday){
    var R = 140, cx = 160, cy = 160, hole = 64;
    function pol(r, a){ var rad = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]; }
    var parts = [];
    items.forEach(function(b, i){
      var s = toMin(b.start);
      var e = b.end ? toMin(b.end) : 1440;
      if (e <= s) e = 1440;
      var a0 = s / 1440 * 360, a1 = e / 1440 * 360;
      var large = (a1 - a0) > 180 ? 1 : 0;
      var p0 = pol(R, a0), p1 = pol(R, a1);
      var d = 'M ' + cx + ' ' + cy + ' L ' + p0[0] + ' ' + p0[1] + ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p1[0] + ' ' + p1[1] + ' Z';
      parts.push('<path d="' + d + '" fill="' + (b.checked ? b.dot : 'oklch(0.984 0.003 247.858)') + '"></path>');
      var span = a1 - a0;
      if (span >= 12) {
        var midA = (a0 + a1) / 2;
        var midR = (hole + R) / 2;
        var tp = pol(midR, midA);
        var lbl = getCat(b.cat).label || '';
        if (lbl) parts.push('<text x="' + tp[0].toFixed(1) + '" y="' + tp[1].toFixed(1) + '" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="Pretendard" font-weight="600" opacity="0.7">' + esc(lbl) + '</text>');
      }
    });
    // Sleep area drawn AFTER schedule segments so it overlaps correctly
    var sleepMin = toMin(presets.sleep), wakeMin = toMin(presets.wake);
    var sa0 = sleepMin / 1440 * 360;
    var sleepSpan = (wakeMin + 1440 - sleepMin) % 1440;
    var sa1adj = sa0 + sleepSpan / 1440 * 360;
    var sLarge = sleepSpan / 1440 * 360 > 180 ? 1 : 0;
    var sp0 = pol(R, sa0), sp1 = pol(R, sa1adj);
    parts.push('<path d="M ' + cx + ' ' + cy + ' L ' + sp0[0] + ' ' + sp0[1] + ' A ' + R + ' ' + R + ' 0 ' + sLarge + ' 1 ' + sp1[0] + ' ' + sp1[1] + ' Z" fill="oklch(0.372 0.044 257.287)"></path>');
    var sMidA = sa0 + sleepSpan / 1440 * 360 / 2;
    var sMidR = (hole + R) / 2;
    var stp = pol(sMidR, sMidA);
    parts.push('<text x="' + stp[0].toFixed(1) + '" y="' + stp[1].toFixed(1) + '" font-size="10" fill="#fff" text-anchor="middle" dominant-baseline="central" font-family="Pretendard" font-weight="600" opacity="0.7">취침</text>');
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + hole + '" fill="#fff"></circle>');
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + hole + '" fill="none" stroke="oklch(0.93 0.006 78)" stroke-width="1"></circle>');
    for (var h = 0; h < 24; h++){
      var a = h / 24 * 360;
      var t = pol(R + 9, a);
      parts.push('<text x="' + t[0] + '" y="' + t[1] + '" font-size="9" fill="oklch(0.707 0.022 261.325)" text-anchor="middle" dominant-baseline="central" font-family="Pretendard">' + h + '</text>');
    }
    if (isToday){
      var a = nowMin / 1440 * 360;
      var hp = pol(R - 4, a);
      parts.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + hp[0] + '" y2="' + hp[1] + '" stroke="oklch(0.42 0.02 70)" stroke-width="1" stroke-linecap="round"></line>');
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="oklch(0.42 0.02 70)"></circle>');
    }
    return '<svg viewBox="0 0 320 320" style="width:100%; display:block; overflow:visible;">' + parts.join('') + '</svg>';
  }

  function prog(arr){
    var total = arr.length;
    var done = arr.filter(function(x){ return x.checked; }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    return { done: done, total: total, pct: pct, ring: 'conic-gradient(' + RING + ' ' + pct + '%, oklch(0.92 0.006 78) 0)' };
  }

  // ===== 루틴 불러오기 모달 =====
  function openRoutineLoadModal(){
    renderRoutineLoadBody();
    document.getElementById('routineLoadOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeRoutineLoadModal(){
    document.getElementById('routineLoadOverlay').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderRoutineLoadBody(){
    var body = document.getElementById('routineLoadBody');
    var html = '<div class="routine-section-label">기본 루틴</div>';
    ['weekday','weekend'].forEach(function(dt){
      var label = dt === 'weekday' ? '평일' : '주말';
      html += '<div class="routine-item" data-rtype="default" data-day="' + dt + '">' +
        '<div class="routine-item-info">' +
          '<div class="routine-item-name">기본 루틴 (' + label + ')</div>' +
          '<div class="routine-item-meta">' + DEFAULT_SCHEDULE[dt].length + '개 항목</div>' +
        '</div>' +
      '</div>';
    });
    html += '<div class="routine-section-label">저장된 루틴</div>';
    if (routines.length === 0){
      html += '<div style="padding:16px 12px; font-size:13px; color:oklch(0.62 0.012 70);">저장된 루틴이 없어요</div>';
    } else {
      routines.slice().reverse().forEach(function(r){
        html += '<div class="routine-item" data-rtype="saved" data-rid="' + r.id + '">' +
          '<div class="routine-item-info">' +
            '<div class="routine-item-name">' + esc(r.name) + '</div>' +
            '<div class="routine-item-meta">' + r.items.length + '개 항목</div>' +
          '</div>' +
          '<button class="routine-del-btn" data-rid="' + r.id + '" aria-label="삭제">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>';
      });
    }
    body.innerHTML = html;

    body.querySelectorAll('.routine-item').forEach(function(item){
      item.addEventListener('click', function(e){
        if (e.target.closest('.routine-del-btn')) return;
        var day = dayTypeOf(state.selectedDate);
        var rtype = item.getAttribute('data-rtype');
        if (rtype === 'default'){
          var dt = item.getAttribute('data-day');
          if (!confirm((dt === 'weekday' ? '평일' : '주말') + ' 기본 루틴을 적용하면 현재 루틴이 초기화됩니다. 계속할까요?')) return;
          schedule[day] = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE[dt]));
        } else {
          var rid = item.getAttribute('data-rid');
          var r = routines.find(function(x){ return x.id === rid; });
          if (!r) return;
          if (!confirm('"' + r.name + '" 루틴을 현재 날짜에 적용할까요?')) return;
          schedule[day] = JSON.parse(JSON.stringify(r.items));
        }
        try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify({ weekday: schedule.weekday, weekend: schedule.weekend })); } catch(e){}
        pushScheduleToCloud();
        closeRoutineLoadModal();
        render();
      });
    });

    body.querySelectorAll('.routine-del-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var rid = btn.getAttribute('data-rid');
        if (!confirm('이 루틴을 삭제할까요?')) return;
        routines = routines.filter(function(r){ return r.id !== rid; });
        saveRoutines();
        pushScheduleToCloud();
        renderRoutineLoadBody();
      });
    });
  }

  // ===== 루틴 저장 모달 =====
  function openRoutineSaveModal(){
    var d = state.selectedDate;
    var suggested = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 루틴';
    var input = document.getElementById('routineNameInput');
    input.value = suggested;
    document.getElementById('routineSaveOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ input.focus(); input.select(); }, 50);
  }
  function closeRoutineSaveModal(){
    document.getElementById('routineSaveOverlay').classList.add('hidden');
    document.body.style.overflow = '';
  }
  function confirmSaveRoutine(){
    var name = document.getElementById('routineNameInput').value.trim();
    if (!name){ alert('루틴 이름을 입력해주세요.'); return; }
    var day = dayTypeOf(state.selectedDate);
    var items = schedule[day].map(function(b){
      return { id: b.id, start: b.start, end: b.end || '', cat: b.cat, title: b.title, note: b.note || '' };
    }).filter(function(b){ return b.title; });
    routines.push({ id: 'r_' + Date.now(), name: name, createdAt: Date.now(), items: items });
    saveRoutines();
    pushScheduleToCloud();
    closeRoutineSaveModal();
  }

  function applyTabStyles(){
    document.getElementById('btnViewA').className = 'tab-btn' + (state.activeView === '1a' ? ' active' : '');
    document.getElementById('btnViewB').className = 'tab-btn' + (state.activeView === '1b' ? ' active' : '');
    VIEWS.forEach(function(v){
      document.getElementById(v).style.display = (v === state.activeView) ? '' : 'none';
    });
  }

  function render(){
    var day = dayTypeOf(state.selectedDate);
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var isToday = dateKey(state.selectedDate) === dateKey(todayDate());
    var raw = schedule[day];

    var isPast = dateKey(state.selectedDate) < dateKey(todayDate());
    var blocksA = raw.map(function(b){ return enrich(b, '1a', nowMin, isToday); });
    var boardCats = categorizeBoardItems(raw, nowMin, isToday, isPast);

    document.getElementById('todayLabelDate').textContent = formatDateLabel(state.selectedDate);
    document.getElementById('datePicker').value = dateKey(state.selectedDate);

    var pA = prog(blocksA);
    document.getElementById('pctAclock').textContent = pA.pct + '%';
    document.getElementById('dayLabelShort').textContent = '진행률';
    document.getElementById('clockSvgTop').innerHTML = buildClockSvg(blocksA, nowMin, isToday);

    applyTabStyles();

    renderBlocksA(blocksA);
    document.getElementById('countNotStarted').textContent = boardCats.notStarted.length;
    document.getElementById('countCompleted').textContent = boardCats.completed.length;
    document.getElementById('countIncomplete').textContent = boardCats.incomplete.length;
    renderBoardCol('blocksB-notStarted', boardCats.notStarted, 'notStarted', nowMin, isToday);
    renderBoardCol('blocksB-completed', boardCats.completed, 'completed', nowMin, isToday);
    renderBoardCol('blocksB-incomplete', boardCats.incomplete, 'incomplete', nowMin, isToday);
  }

  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-toggle]');
    if (t){
      var parts = t.getAttribute('data-toggle').split(':');
      toggle(parts[0], parts[1]);
      return;
    }
    if (e.target.id === 'btnViewA'){ state.activeView = '1a'; applyTabStyles(); return; }
    if (e.target.id === 'btnViewB'){ state.activeView = '1b'; applyTabStyles(); return; }
    if (e.target.closest('#printCurrent')){ doPrint(state.activeView); return; }
    if (e.target.closest('#resetCurrent')){ resetOpt(state.activeView); return; }
    if (e.target.closest('#editBtn')){ openEditModal(); return; }
    if (e.target.id === 'applyDefault'){ openRoutineLoadModal(); return; }
    if (e.target.id === 'saveRoutineBtn'){ openRoutineSaveModal(); return; }
  });

  var datePickerEl = document.getElementById('datePicker');

  datePickerEl.addEventListener('change', function(e){
    var p = e.target.value.split('-');
    if (p.length === 3){
      state.selectedDate = new Date(+p[0], +p[1] - 1, +p[2]);
      render();
    }
  });

  // Mobile opens the native picker on tap regardless of where on the input
  // it lands, but desktop browsers only do that for the small calendar-icon
  // hit area. Calling showPicker() from a direct click on the input covers
  // desktop without affecting the mobile behavior.
  datePickerEl.addEventListener('click', function(){
    if (datePickerEl.showPicker){
      try { datePickerEl.showPicker(); } catch (err) {}
    }
  });

  onSnapshot(syncDocRef, function(snap){
    if (!snap.exists()) return;
    var data = snap.data();
    if (!data) return;
    applyingRemote = true;
    if (typeof data.checks === 'string'){
      try {
        var remoteChecks = JSON.parse(data.checks);
        state.checks = remoteChecks;
        saveChecks(remoteChecks);
      } catch(e){}
    }
    if (typeof data.schedule === 'string'){
      try {
        var remoteSchedule = JSON.parse(data.schedule);
        if (remoteSchedule && Array.isArray(remoteSchedule.weekday) && Array.isArray(remoteSchedule.weekend)){
          schedule.weekday = remoteSchedule.weekday;
          schedule.weekend = remoteSchedule.weekend;
          try { localStorage.setItem(SCHEDULE_KEY, data.schedule); } catch(e){}
        }
      } catch(e){}
    }
    if (typeof data.presets === 'string'){
      try {
        var remotePresets = JSON.parse(data.presets);
        if (remotePresets && remotePresets.wake && remotePresets.sleep){
          presets.wake  = remotePresets.wake;
          presets.sleep = remotePresets.sleep;
          savePresets();
        }
      } catch(e){}
    }
    if (typeof data.routines === 'string'){
      try {
        var remoteRoutines = JSON.parse(data.routines);
        if (Array.isArray(remoteRoutines)){
          routines = remoteRoutines;
          saveRoutines();
        }
      } catch(e){}
    }
    render();
    applyingRemote = false;
  }, function(err){ console.error('sync listen failed', err); });

  // ===== Edit Modal =====
  var editDayType = 'weekday';

  function openEditModal(){
    editDayType = dayTypeOf(state.selectedDate);
    document.getElementById('editDateLabel').textContent = '루틴 수정하기';
    document.getElementById('presetWake').value  = presets.wake;
    document.getElementById('presetSleep').value = presets.sleep;
    ['presetWake','presetSleep'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.onclick = function(){ if (el.showPicker) try { el.showPicker(); } catch(e){} };
    });
    renderEditModal();
    document.getElementById('editOverlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeEditModal(){
    document.getElementById('editOverlay').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function buildColorPicker(selectedKey){
    var resolved = CAT_MIGRATION[selectedKey] || selectedKey || 'rest';
    if (!cats[resolved]) resolved = 'rest';
    var options = Object.keys(cats).map(function(k){
      return '<div class="edit-color-option' + (k === resolved ? ' edit-color-option-sel' : '') + '" data-color="' + k + '">' +
        '<span class="edit-color-option-dot" style="background:' + cats[k].dot + ';"></span>' +
        '<span class="edit-color-option-label">' + cats[k].label + '</span>' +
      '</div>';
    }).join('');
    return '<div class="edit-color-select" data-field="cat" data-selected="' + resolved + '">' +
      '<div class="edit-color-select-trigger">' +
        '<span class="edit-color-select-preview" style="background:' + cats[resolved].dot + ';"></span>' +
        '<span class="edit-color-select-lbl">' + cats[resolved].label + '</span>' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
      '</div>' +
      '<div class="edit-color-dropdown">' +
        '<div class="edit-color-list">' + options + '</div>' +
      '</div>' +
    '</div>';
  }

  function buildEditItemHtml(id, start, end, title, catKey, note){
    var dragHandle = '<div class="edit-drag-handle" title="드래그로 순서 변경">' +
      '<svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">' +
        '<circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/>' +
        '<circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/>' +
        '<circle cx="4" cy="16" r="1.5"/><circle cx="10" cy="16" r="1.5"/>' +
      '</svg>' +
    '</div>';
    return '<div class="edit-item" data-id="' + esc(id) + '">' +
      dragHandle +
      '<div class="edit-rows">' +
        '<div class="edit-r1">' +
          buildColorPicker(catKey) +
          '<div class="edit-times">' +
            '<div class="edit-time-range">' +
              '<input class="edit-time-inner" type="time" value="' + esc(start) + '" data-field="start">' +
              '<span class="edit-time-range-sep">~</span>' +
              '<input class="edit-time-inner" type="time" value="' + esc(end || '') + '" data-field="end">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="edit-r2">' +
          '<input class="edit-title" type="text" value="' + esc(title) + '" data-field="title" placeholder="제목">' +
        '</div>' +
        '<div class="edit-r3">' +
          '<input class="edit-note" type="text" value="' + esc(note || '') + '" data-field="note" placeholder="메모">' +
        '</div>' +
      '</div>' +
      '<button class="edit-del-btn" type="button" aria-label="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>' +
    '</div>';
  }

  function makeDraggable(body){
    if (body._dragAttached) return;
    body._dragAttached = true;
    var dragging = null, ghost = null, placeholder = null;
    function evY(e){ return e.touches ? e.touches[0].clientY : e.clientY; }
    function onStart(e){
      if (!e.target.closest('.edit-drag-handle')) return;
      e.preventDefault();
      dragging = e.target.closest('.edit-item');
      var rect = dragging.getBoundingClientRect();
      var dy = evY(e) - rect.top;
      placeholder = document.createElement('div');
      placeholder.className = 'edit-placeholder';
      placeholder.style.cssText = 'height:' + rect.height + 'px;';
      dragging.parentNode.insertBefore(placeholder, dragging);
      ghost = dragging.cloneNode(true);
      ghost.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;z-index:1000;opacity:0.9;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,0.18);border-radius:12px;';
      document.body.appendChild(ghost);
      dragging.style.opacity = '0';
      function onMove(e){
        e.preventDefault();
        var y = evY(e);
        ghost.style.top = (y - dy) + 'px';
        var items = Array.from(body.querySelectorAll('.edit-item'));
        var after = null;
        for (var i = 0; i < items.length; i++){
          if (items[i] === dragging) continue;
          var r = items[i].getBoundingClientRect();
          if (y < r.top + r.height / 2){ after = items[i]; break; }
        }
        if (after) body.insertBefore(placeholder, after);
        else body.appendChild(placeholder);
      }
      function onEnd(){
        placeholder.parentNode.insertBefore(dragging, placeholder);
        placeholder.remove();
        ghost.remove();
        dragging.style.opacity = '';
        dragging = ghost = placeholder = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchend', onEnd);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove, {passive:false});
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchend', onEnd);
    }
    body.addEventListener('mousedown', onStart);
    body.addEventListener('touchstart', onStart, {passive:false});
  }

  function attachEditListeners(container){
    container.querySelectorAll('.edit-del-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ btn.closest('.edit-item').remove(); });
    });
    container.querySelectorAll('.edit-time-inner').forEach(function(inp){
      inp.addEventListener('click', function(){
        if (inp.showPicker) try { inp.showPicker(); } catch(e){}
      });
    });
    container.querySelectorAll('.edit-color-select-trigger').forEach(function(trigger){
      trigger.addEventListener('click', function(e){
        e.stopPropagation();
        var sel = trigger.closest('.edit-color-select');
        var dropdown = sel.querySelector('.edit-color-dropdown');
        var isOpen = dropdown.style.display !== 'none';
        // close all others
        container.querySelectorAll('.edit-color-dropdown').forEach(function(d){ d.style.display = 'none'; });
        dropdown.style.display = isOpen ? 'none' : 'block';
      });
    });
    container.querySelectorAll('.edit-color-option').forEach(function(opt){
      opt.addEventListener('click', function(e){
        e.stopPropagation();
        var sel = opt.closest('.edit-color-select');
        sel.querySelectorAll('.edit-color-option').forEach(function(o){ o.classList.remove('edit-color-option-sel'); });
        opt.classList.add('edit-color-option-sel');
        var color = opt.getAttribute('data-color');
        sel.setAttribute('data-selected', color);
        sel.querySelector('.edit-color-select-preview').style.background = cats[color].dot;
        sel.querySelector('.edit-color-select-lbl').textContent = cats[color].label;
        sel.querySelector('.edit-color-dropdown').style.display = 'none';
      });
    });
  }

  function renderEditModal(){
    var items = schedule[editDayType];
    var html = items.map(function(b){
      return buildEditItemHtml(b.id, b.start, b.end, b.title, b.cat, b.note);
    }).join('');
    var body = document.getElementById('editBody');
    body.innerHTML = html;
    attachEditListeners(body);
    makeDraggable(body);
  }

  function addEditItem(){
    var frag = document.createElement('div');
    frag.innerHTML = buildEditItemHtml('new_' + Date.now(), '09:00', '', '', 'routine', '');
    var row = frag.firstChild;
    attachEditListeners(row);
    var body = document.getElementById('editBody');
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
  }

  function saveEdit(){
    var rows = document.querySelectorAll('#editBody .edit-item');
    var newItems = [];
    rows.forEach(function(row, i){
      var startEl  = row.querySelector('[data-field="start"]');
      var endEl    = row.querySelector('[data-field="end"]');
      var titleEl  = row.querySelector('[data-field="title"]');
      var pickerEl = row.querySelector('.edit-color-select[data-field="cat"]');
      var noteEl   = row.querySelector('[data-field="note"]');
      if (!titleEl || !titleEl.value.trim()) return;
      var item = {
        id: row.getAttribute('data-id') || (editDayType.charAt(0) + 'e' + i),
        start: startEl ? startEl.value || '00:00' : '00:00',
        cat:   pickerEl ? (pickerEl.getAttribute('data-selected') || 'slate') : 'slate',
        title: titleEl.value.trim()
      };
      if (endEl && endEl.value) item.end = endEl.value;
      if (noteEl && noteEl.value.trim()) item.note = noteEl.value.trim();
      newItems.push(item);
    });
    schedule[editDayType] = newItems;
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify({ weekday: schedule.weekday, weekend: schedule.weekend })); } catch(e){}
    pushScheduleToCloud();
    var wakeEl  = document.getElementById('presetWake');
    var sleepEl = document.getElementById('presetSleep');
    if (wakeEl && wakeEl.value)  { presets.wake  = wakeEl.value; }
    if (sleepEl && sleepEl.value){ presets.sleep = sleepEl.value; }
    savePresets();
    closeEditModal();
    render();
  }

  document.addEventListener('click', function(){
    document.querySelectorAll('.edit-color-dropdown').forEach(function(d){ d.style.display = 'none'; });
  });

  document.getElementById('editOverlay').addEventListener('click', function(e){
    if (e.target === this) closeEditModal();
  });
  document.getElementById('editClose').addEventListener('click', closeEditModal);
  document.getElementById('editCancel').addEventListener('click', closeEditModal);
  document.getElementById('editSave').addEventListener('click', saveEdit);
  document.getElementById('editAddItem').addEventListener('click', addEditItem);

  document.getElementById('routineLoadOverlay').addEventListener('click', function(e){
    if (e.target === this) closeRoutineLoadModal();
  });
  document.getElementById('routineLoadClose').addEventListener('click', closeRoutineLoadModal);

  document.getElementById('routineSaveOverlay').addEventListener('click', function(e){
    if (e.target === this) closeRoutineSaveModal();
  });
  document.getElementById('routineSaveClose').addEventListener('click', closeRoutineSaveModal);
  document.getElementById('routineSaveCancel').addEventListener('click', closeRoutineSaveModal);
  document.getElementById('routineSaveConfirm').addEventListener('click', confirmSaveRoutine);
  document.getElementById('routineNameInput').addEventListener('keydown', function(e){
    if (e.key === 'Enter') confirmSaveRoutine();
  });

  function tickClock(){
    var n = new Date();
    var h = pad2(n.getHours()), m = pad2(n.getMinutes()), s = pad2(n.getSeconds());
    var el = document.getElementById('currentTimeClock');
    if (el) el.textContent = h + ':' + m + ':' + s;
  }

  render();
  tickClock();
  setInterval(render, 60000);
  setInterval(tickClock, 1000);
})();
