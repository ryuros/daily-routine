(function(){
  "use strict";

  var STORAGE_KEY = 't_plan_v2';
  var RING = 'oklch(0.64 0.05 200)';
  var VIEWS = ['1a', '1b', '1c'];

  var cats = {
    routine:  { label: '일상·휴식',   dot: 'oklch(0.74 0.018 70)',  soft: 'oklch(0.965 0.006 78)' },
    exercise: { label: '운동',        dot: 'oklch(0.66 0.055 150)', soft: 'oklch(0.965 0.02 150)' },
    study:    { label: '한국사 공부', dot: 'oklch(0.62 0.06 245)',  soft: 'oklch(0.965 0.018 245)' },
    career:   { label: '이직 준비',   dot: 'oklch(0.64 0.07 45)',   soft: 'oklch(0.965 0.022 55)' },
    hobby:    { label: '취미·창작',   dot: 'oklch(0.62 0.06 305)',  soft: 'oklch(0.965 0.02 305)' },
    free:     { label: '자유시간',    dot: 'oklch(0.80 0.05 95)',   soft: 'oklch(0.97 0.022 95)' }
  };

  var schedule = {
    weekday: [
      { id:'wd1',  start:'06:00', end:'06:30', cat:'routine',  title:'기상 · 물 한 잔 · 스트레칭', fixed:true },
      { id:'wd2',  start:'06:30', end:'07:30', cat:'exercise', title:'아침 산책 / 러닝 5km', note:'가볍게 40분' },
      { id:'wd3',  start:'07:30', end:'08:30', cat:'routine',  title:'샤워 · 아침 식사' },
      { id:'wd4',  start:'08:30', end:'10:30', cat:'study',    title:'한국사 집중 공부', fixed:true, note:'8월 1급 대비' },
      { id:'wd5',  start:'10:30', end:'11:00', cat:'routine',  title:'휴식 · 커피' },
      { id:'wd6',  start:'11:00', end:'12:00', cat:'exercise', title:'운동 (PT / 근력+유산소)', note:'주 2회 PT' },
      { id:'wd7',  start:'12:00', end:'13:30', cat:'routine',  title:'점심 · 충분한 휴식' },
      { id:'wd8',  start:'13:30', end:'15:30', cat:'career',   title:'이직 준비', note:'이력서·포폴·블렌더·앱·AI' },
      { id:'wd9',  start:'15:30', end:'17:00', cat:'free',     title:'자유시간', note:'독서·낮잠·산책' },
      { id:'wd10', start:'17:00', end:'18:00', cat:'hobby',    title:'기타 연습', note:'주 2~3회 50분' },
      { id:'wd11', start:'18:00', end:'19:30', cat:'routine',  title:'저녁 · 휴식' },
      { id:'wd12', start:'19:30', end:'21:00', cat:'free',     title:'자유시간', note:'취미·창작·여가' },
      { id:'wd13', start:'21:00', end:'22:00', cat:'study',    title:'한국사 복습 · 독서' },
      { id:'wd14', start:'22:00', end:'23:00', cat:'routine',  title:'하루 정리 · 내일 계획' },
      { id:'wd15', start:'23:00', cat:'routine', title:'취침', fixed:true }
    ],
    weekend: [
      { id:'we1',  start:'07:00', end:'08:00', cat:'routine',  title:'여유로운 기상 · 스트레칭', fixed:true },
      { id:'we2',  start:'08:00', end:'09:30', cat:'exercise', title:'느긋한 아침 · 산책', note:'1시간 산책' },
      { id:'we3',  start:'09:30', end:'11:00', cat:'study',    title:'한국사 공부 (감 유지)', note:'가볍게 1.5h' },
      { id:'we4',  start:'11:00', end:'12:00', cat:'exercise', title:'자유 운동 / 러닝 또는 휴식' },
      { id:'we5',  start:'12:00', end:'14:00', cat:'routine',  title:'점심 · 여유' },
      { id:'we6',  start:'14:00', end:'16:00', cat:'hobby',    title:'취미 · 창작', note:'기타·블렌더·만들기' },
      { id:'we7',  start:'16:00', end:'19:00', cat:'free',     title:'자유시간', note:'외출·약속·문화생활' },
      { id:'we8',  start:'19:00', end:'20:30', cat:'routine',  title:'저녁' },
      { id:'we9',  start:'20:30', end:'22:30', cat:'free',     title:'자유시간 · 독서 · 다음 주 계획' },
      { id:'we10', start:'22:30', end:'23:00', cat:'routine',  title:'취침 준비' },
      { id:'we11', start:'23:00', cat:'routine', title:'취침', fixed:true }
    ]
  };

  function loadChecks(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e){ return {}; }
  }
  function saveChecks(checks){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checks)); } catch(e){}
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
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + days[d.getDay()] + '요일';
  }

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
    saveChecks(state.checks);
    render();
  }

  function resetOpt(opt){
    var k = dateKey(state.selectedDate);
    if (state.checks[k]) delete state.checks[k][opt];
    saveChecks(state.checks);
    render();
  }

  function doPrint(opt){
    document.body.setAttribute('data-print', opt);
    setTimeout(function(){ window.print(); }, 40);
  }
  window.addEventListener('afterprint', function(){ document.body.removeAttribute('data-print'); });

  function box(sz, checked, dot){
    return 'width:' + sz + 'px;height:' + sz + 'px;border-radius:' + (sz > 22 ? 8 : 7) + 'px;' +
      'display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer;' +
      'font-size:' + (sz > 22 ? 14 : 12) + 'px;color:#fff;line-height:1;transition:all .15s;' +
      'border:1.5px solid ' + (checked ? dot : 'oklch(0.86 0.01 78)') + ';' +
      'background:' + (checked ? dot : '#fff') + ';';
  }

  function enrich(b, opt, nowMin, isToday){
    var c = cats[b.cat];
    var checked = isChecked(opt, b.id);
    var startM = toMin(b.start);
    var endM = b.end ? toMin(b.end) : startM + 30;
    var isNow = isToday && nowMin >= startM && nowMin < endM;
    var titleStyle = checked
      ? 'text-decoration:line-through; color:oklch(0.68 0.01 70); opacity:0.7;'
      : 'color:oklch(0.28 0.012 70);';
    return {
      id: b.id, start: b.start, end: b.end, cat: b.cat, title: b.title, fixed: !!b.fixed,
      checked: checked, dot: c.dot, soft: c.soft, catLabel: c.label,
      meta: c.label + (b.note ? ' · ' + b.note : ''),
      range: b.end ? b.start + '–' + b.end : b.start,
      durLabel: durLabel(b),
      isNow: isNow, titleStyle: titleStyle,
      boxStyle: box(26, checked, c.dot), boxStyleSm: box(22, checked, c.dot),
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
      (b.checked ? '<span>✓</span>' : '') + '</button>';
  }

  function renderBlocksA(arr){
    var html = arr.map(function(b){
      return '' +
      '<div style="display:flex; gap:16px; align-items:stretch;">' +
        '<div style="width:54px; flex:none; text-align:left; padding-top:9px;">' +
          '<div style="font-family:\'Gowun Batang\',serif; font-size:15px; color:oklch(0.34 0.012 70);">' + esc(b.start) + '</div>' +
          '<div style="font-size:10.5px; color:oklch(0.66 0.012 70); margin-top:1px;">' + esc(b.durLabel) + '</div>' +
        '</div>' +
        '<div style="width:16px; flex:none; display:flex; flex-direction:column; align-items:center;">' +
          '<span style="width:11px; height:11px; border-radius:50%; margin-top:13px; background:' + b.dot + '; box-shadow:0 0 0 4px ' + b.soft + ';"></span>' +
          '<span style="flex:1; width:2px; background:oklch(0.93 0.006 78); margin:4px 0;"></span>' +
        '</div>' +
        '<div style="flex:1; padding:9px 0 18px; min-width:0;">' +
          '<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">' +
            '<span style="font-size:15.5px; font-weight:550; ' + b.titleStyle + '">' + esc(b.title) + '</span>' +
            (b.fixed ? '<span style="font-size:10.5px; padding:2px 7px; background:oklch(0.93 0.012 70); color:oklch(0.46 0.012 70); border-radius:6px;">고정 루틴</span>' : '') +
            (b.isNow ? '<span style="font-size:10.5px; padding:2px 7px; background:oklch(0.55 0.12 25); color:#fff; border-radius:6px;">지금</span>' : '') +
          '</div>' +
          '<div style="font-size:12.5px; color:oklch(0.56 0.012 70); margin-top:3px;">' + esc(b.meta) + '</div>' +
        '</div>' +
        checkBtn('1a', b, false) +
      '</div>';
    }).join('');
    document.getElementById('blocksA').innerHTML = html;
  }

  function renderBlocksBCol(containerId, arr){
    var html = arr.map(function(b){
      return '' +
      '<div style="display:flex; gap:12px; align-items:flex-start; padding:13px 14px; border:1px solid oklch(0.93 0.006 78); border-radius:14px; background:' + b.soft + ';">' +
        checkBtn('1b', b, false) +
        '<div style="flex:1; min-width:0;">' +
          '<div style="font-size:11.5px; color:oklch(0.52 0.012 70); margin-bottom:2px;">' + esc(b.range) + '</div>' +
          '<div style="font-size:14.5px; font-weight:550; ' + b.titleStyle + '">' + esc(b.title) + '</div>' +
          '<div style="font-size:11.5px; color:oklch(0.56 0.012 70); margin-top:3px; display:flex; align-items:center; gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:' + b.dot + ';flex:none;"></span>' + esc(b.meta) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    document.getElementById(containerId).innerHTML = html;
  }

  function renderBlocksC(arr){
    var html = arr.map(function(b){
      return '' +
      '<div style="display:flex; gap:12px; align-items:center; padding:9px 12px; border-radius:11px; background:' + b.rowBg + ';">' +
        checkBtn('1c', b, true) +
        '<span style="width:9px; height:9px; border-radius:50%; background:' + b.dot + '; flex:none;"></span>' +
        '<span style="font-family:\'Gowun Batang\',serif; font-size:13px; color:oklch(0.44 0.012 70); width:46px; flex:none;">' + esc(b.start) + '</span>' +
        '<span style="font-size:13.5px; flex:1; min-width:0; ' + b.titleStyle + '">' + esc(b.title) + '</span>' +
        (b.isNow ? '<span style="font-size:10px; padding:2px 6px; background:oklch(0.55 0.12 25); color:#fff; border-radius:5px;">지금</span>' : '') +
      '</div>';
    }).join('');
    document.getElementById('blocksC').innerHTML = html;
  }

  function buildClockSvg(items, nowMin, isToday){
    var R = 140, cx = 160, cy = 160, hole = 84;
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
      parts.push('<path d="' + d + '" fill="' + (b.checked ? b.dot : b.soft) + '" stroke="#fff" stroke-width="1.5"></path>');
    });
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + hole + '" fill="#fff"></circle>');
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + hole + '" fill="none" stroke="oklch(0.93 0.006 78)" stroke-width="1"></circle>');
    [0, 6, 12, 18].forEach(function(h){
      var a = h / 24 * 360;
      var t = pol(R + 13, a);
      parts.push('<text x="' + t[0] + '" y="' + t[1] + '" font-size="11" fill="oklch(0.6 0.012 70)" text-anchor="middle" dominant-baseline="central" font-family="IBM Plex Sans KR">' + h + '시</text>');
    });
    if (isToday){
      var a = nowMin / 1440 * 360;
      var hp = pol(R - 4, a);
      parts.push('<line x1="' + cx + '" y1="' + cy + '" x2="' + hp[0] + '" y2="' + hp[1] + '" stroke="oklch(0.42 0.02 70)" stroke-width="2.5" stroke-linecap="round"></line>');
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

  function applyTabStyles(){
    var on = 'padding:9px 22px;border:none;border-radius:999px;font-family:inherit;font-size:14px;cursor:pointer;background:oklch(0.32 0.012 70);color:#fff;transition:all .15s;';
    var off = 'padding:9px 22px;border:none;border-radius:999px;font-family:inherit;font-size:14px;cursor:pointer;background:transparent;color:oklch(0.48 0.012 70);transition:all .15s;';
    document.getElementById('btnViewA').setAttribute('style', state.activeView === '1a' ? on : off);
    document.getElementById('btnViewB').setAttribute('style', state.activeView === '1b' ? on : off);
    document.getElementById('btnViewC').setAttribute('style', state.activeView === '1c' ? on : off);
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

    var blocksA = raw.map(function(b){ return enrich(b, '1a', nowMin, isToday); });
    var ebB = raw.map(function(b){ return enrich(b, '1b', nowMin, isToday); });
    var blocksC = raw.map(function(b){ return enrich(b, '1c', nowMin, isToday); });
    var blocksB = {
      morning: ebB.filter(function(x){ return x.start < '12:00'; }),
      afternoon: ebB.filter(function(x){ return x.start >= '12:00' && x.start < '18:00'; }),
      evening: ebB.filter(function(x){ return x.start >= '18:00'; })
    };

    document.getElementById('todayLabelDate').textContent = formatDateLabel(state.selectedDate);
    document.getElementById('dayLabelShort').textContent = (day === 'weekday' ? '평일' : '주말') + ' 진행률';
    document.getElementById('datePicker').value = dateKey(state.selectedDate);

    applyTabStyles();

    renderBlocksA(blocksA);
    renderBlocksBCol('blocksB-morning', blocksB.morning);
    renderBlocksBCol('blocksB-afternoon', blocksB.afternoon);
    renderBlocksBCol('blocksB-evening', blocksB.evening);
    renderBlocksC(blocksC);
    document.getElementById('clockSvg').innerHTML = buildClockSvg(blocksC, nowMin, isToday);

    var pA = prog(blocksA), pB = prog(ebB), pC = prog(blocksC);
    document.getElementById('ringA').style.background = pA.ring;
    document.getElementById('pctA').textContent = pA.pct + '%';
    document.getElementById('countA').textContent = pA.done + '/' + pA.total + ' 완료';
    document.getElementById('ringB').style.background = pB.ring;
    document.getElementById('pctB').textContent = pB.pct + '%';
    document.getElementById('countB').textContent = pB.done + '/' + pB.total + ' 완료';
    document.getElementById('pctC').textContent = pC.pct + '%';
    document.getElementById('countC').textContent = pC.done + '/' + pC.total + ' 완료';
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
    if (e.target.id === 'btnViewC'){ state.activeView = '1c'; applyTabStyles(); return; }
    if (e.target.id === 'printA'){ doPrint('1a'); return; }
    if (e.target.id === 'printB'){ doPrint('1b'); return; }
    if (e.target.id === 'printC'){ doPrint('1c'); return; }
    if (e.target.id === 'resetA'){ resetOpt('1a'); return; }
    if (e.target.id === 'resetB'){ resetOpt('1b'); return; }
    if (e.target.id === 'resetC'){ resetOpt('1c'); return; }
  });

  document.getElementById('datePicker').addEventListener('change', function(e){
    var p = e.target.value.split('-');
    if (p.length === 3){
      state.selectedDate = new Date(+p[0], +p[1] - 1, +p[2]);
      render();
    }
  });

  render();
  setInterval(render, 60000);
})();
