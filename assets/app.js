/* global QazaqScript, EXAMPLES, LESSONS */

const DEFAULT_CODE = `"Сәлем, QazaqScript!" жаз.

аты "Айгүл" болсын.
аты жаз.
`;

function runCode(source) {
  const result = QazaqScript.compile(source);
  if (result.errors.length) return { js: '', logs: [], errors: result.errors };

  const logs = [];
  try {
    const fn = new Function('console', '"use strict";\n' + result.js);
    fn({
      log: function () {
        logs.push(Array.from(arguments).join(' '));
      },
    });
    return { js: result.js, logs: logs, errors: [] };
  } catch (e) {
    return { js: result.js, logs: logs, errors: [{ message: e.message, line: 0, column: 0 }] };
  }
}

function renderConsole(el, logs, errors) {
  el.innerHTML = '';
  errors.forEach(function (e) {
    const div = document.createElement('div');
    div.className = 'text-red-400';
    div.textContent = e.line ? '[' + e.line + ':' + e.column + '] ' + e.message : e.message;
    el.appendChild(div);
  });
  if (!errors.length && !logs.length) {
    const div = document.createElement('div');
    div.className = 'text-slate-500 italic';
    div.textContent = '(шығыс жоқ)';
    el.appendChild(div);
  }
  logs.forEach(function (line) {
    const div = document.createElement('div');
    div.className = 'text-emerald-400';
    div.textContent = line;
    el.appendChild(div);
  });
}

function isFileProtocol() {
  return location.protocol === 'file:';
}

function storeCode(key, code) {
  try { sessionStorage.setItem('qs:' + key, code); } catch (e) { /* ignore */ }
}

function loadStoredCode(key) {
  try { return sessionStorage.getItem('qs:' + key); } catch (e) { return null; }
}

function buildPlaygroundUrl(code) {
  // file:// — қысқа сілтеме sessionStorage арқылы (?code= ұзын болса Chrome-да бұзылады)
  if (isFileProtocol() || code.length > 1500) {
    var key = 's' + Date.now().toString(36);
    storeCode(key, code);
    return 'playground.html?key=' + key;
  }
  return 'playground.html?code=' + encodeURIComponent(code);
}

function copyText(text) {
  if (navigator.clipboard && location.protocol !== 'file:') {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve, reject) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
    } catch (e) { reject(e); }
    document.body.removeChild(ta);
  });
}

function initPlayground(opts) {
  opts = opts || {};
  var qsEl = document.getElementById('qs-code');
  var jsEl = document.getElementById('js-code');
  var consoleEl = document.getElementById('console');
  if (!qsEl || !consoleEl) return { run: function () {}, getCode: function () { return ''; } };

  var params = new URLSearchParams(location.search);
  var stored = params.get('key') ? loadStoredCode(params.get('key')) : null;

  if (stored) {
    qsEl.value = stored;
  } else if (params.get('code')) {
    qsEl.value = decodeURIComponent(params.get('code'));
  } else if (opts.initialCode) {
    qsEl.value = opts.initialCode;
  } else {
    qsEl.value = DEFAULT_CODE;
  }

  function doRun() {
    var r = runCode(qsEl.value);
    if (jsEl) jsEl.value = r.js;
    renderConsole(consoleEl, r.logs, r.errors);
    return r;
  }

  var runBtn = document.getElementById('btn-run');
  if (runBtn) runBtn.addEventListener('click', doRun);

  var shareBtn = document.getElementById('btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var url = new URL(buildPlaygroundUrl(qsEl.value), location.href).href;
      copyText(url).then(function () {
        var st = document.getElementById('share-status');
        if (st) { st.textContent = 'Сілтеме көшірілді!'; st.className = 'text-sm text-emerald-600 font-medium'; }
      }).catch(function () {
        var st = document.getElementById('share-status');
        if (st) { st.textContent = url; st.className = 'text-sm text-ink-faint'; }
        window.prompt('Сілтемені көшіріңіз:', url);
      });
    });
  }

  return { run: doRun, getCode: function () { return qsEl.value; } };
}

function parseCheck(check) {
  if (check.indexOf('contains:') === 0) return { type: 'contains', value: check.slice(9) };
  if (check.indexOf('output:') === 0) return { type: 'output', value: check.slice(7) };
  return { type: 'runs', value: check };
}

function verifyStep(code, check) {
  const rule = parseCheck(check);
  if (rule.type === 'contains') {
    const ok = code.toLocaleLowerCase('kk-KZ').indexOf(rule.value.toLocaleLowerCase('kk-KZ')) !== -1;
    return ok ? { ok: true, message: 'Дұрыс!' } : { ok: false, message: 'Кодта «' + rule.value + '» болуы керек' };
  }
  const r = runCode(code);
  if (r.errors.length) return { ok: false, message: r.errors[0].message };
  if (rule.type === 'output') {
    const out = r.logs.join('\n');
    return out.indexOf(rule.value) !== -1
      ? { ok: true, message: 'Дұрыс!' }
      : { ok: false, message: 'Шығыста «' + rule.value + '» болуы керек' };
  }
  return { ok: true, message: 'Дұрыс!' };
}

var CAT_COLORS = {
  негіздер: 'bg-blue-50 text-blue-700',
  математика: 'bg-violet-50 text-violet-700',
  ойындар: 'bg-amber-50 text-amber-700',
  қолданбалар: 'bg-emerald-50 text-emerald-700',
};

function renderExamples() {
  const grid = document.getElementById('examples-grid');
  if (!grid) return;
  EXAMPLES.forEach(function (ex) {
    const a = document.createElement('a');
    a.className = 'group block bg-surface border border-surface-border rounded-xl p-5 shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all duration-200';
    a.href = buildPlaygroundUrl(ex.code);
    var catCls = CAT_COLORS[ex.category] || 'bg-surface-warm text-ink-muted';
    a.innerHTML =
      '<span class="inline-block text-[0.65rem] font-mono uppercase tracking-widest px-2 py-0.5 rounded ' + catCls + '">' + ex.category + '</span>' +
      '<h3 class="mt-3 font-serif text-lg font-semibold text-ink group-hover:text-accent transition-colors">' + ex.title + '</h3>' +
      '<p class="mt-1.5 text-sm text-ink-muted leading-relaxed">' + ex.description + '</p>' +
      '<span class="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">Ашу →</span>';
    grid.appendChild(a);
  });
}

function renderLessonList() {
  const list = document.getElementById('lesson-list');
  if (!list) return;
  LESSONS.forEach(function (lesson) {
    const a = document.createElement('a');
    a.className = 'group flex gap-4 items-center p-4 sm:p-5 bg-surface border border-surface-border rounded-xl shadow-card hover:shadow-card-hover hover:border-accent/30 transition-all duration-200';
    a.href = 'lessons.html?lesson=' + lesson.slug;
    a.innerHTML =
      '<span class="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-white font-mono text-sm font-bold flex items-center justify-center">' + lesson.id + '</span>' +
      '<div class="min-w-0">' +
        '<strong class="block font-serif text-lg text-ink group-hover:text-accent transition-colors">' + lesson.title + '</strong>' +
        '<span class="block mt-0.5 text-sm text-ink-muted">' + lesson.goal + '</span>' +
      '</div>' +
      '<span class="ml-auto hidden sm:block text-ink-faint group-hover:text-accent transition-colors" aria-hidden="true">→</span>';
    list.appendChild(a);
  });
}

function renderLessonView(slug) {
  const lesson = LESSONS.find(function (l) { return l.slug === slug; });
  const main = document.getElementById('lessons-main');
  if (!lesson || !main) { renderLessonList(); return; }

  var stepIndex = 0;

  main.innerHTML =
    '<p class="mb-6"><a href="lessons.html" class="text-sm text-ink-muted hover:text-accent transition-colors">← Барлық сабақтар</a></p>' +
    '<header class="mb-8 max-w-prose">' +
      '<p class="text-xs font-mono uppercase tracking-widest text-accent mb-2">Сабақ ' + lesson.id + '</p>' +
      '<h1 class="font-serif text-2xl sm:text-3xl font-bold text-ink">' + lesson.title + '</h1>' +
      '<p class="mt-2 text-ink-muted">' + lesson.goal + '</p>' +
    '</header>' +
    '<div class="grid grid-cols-1 lg:grid-cols-2 gap-5 min-h-[500px]">' +
      '<div class="bg-surface border border-surface-border rounded-xl p-5 sm:p-6 shadow-card">' +
        '<div id="step-indicator" class="text-xs font-mono uppercase tracking-wider text-ink-faint"></div>' +
        '<p id="step-text" class="mt-4 text-lg leading-relaxed text-ink"></p>' +
        '<div id="step-hint" class="hidden mt-4 p-4 bg-accent-light border border-accent/20 rounded-lg text-sm text-ink-muted"></div>' +
        '<div id="step-result" class="mt-4 text-sm font-medium"></div>' +
        '<div class="mt-6 flex flex-wrap gap-2">' +
          '<button class="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors" id="btn-check">Тексеру</button>' +
          '<button class="px-4 py-2 rounded-md border border-surface-border bg-surface text-sm font-medium hover:bg-surface-warm transition-colors" id="btn-hint">Көмек</button>' +
          '<button class="hidden px-4 py-2 rounded-md bg-ink text-white text-sm font-medium hover:bg-ink/90 transition-colors" id="btn-next">Келесі</button>' +
        '</div>' +
      '</div>' +
      '<div class="flex flex-col border border-surface-border rounded-xl overflow-hidden shadow-card min-h-[400px]">' +
        '<div class="px-4 py-2 bg-surface-warm border-b border-surface-border flex items-center justify-between">' +
          '<span class="text-xs font-mono font-medium uppercase tracking-wider text-ink-muted">Бағдарлама</span>' +
          '<button class="px-2.5 py-1 rounded border border-surface-border bg-surface text-xs font-medium hover:bg-surface-warm transition-colors" id="btn-lesson-run">Іске қосу</button>' +
        '</div>' +
        '<textarea class="code flex-1 w-full p-4 bg-surface font-mono text-sm leading-relaxed text-ink resize-none border-none min-h-[200px]" id="qs-code" spellcheck="false"></textarea>' +
        '<div class="px-4 py-2 bg-slate-800 border-t border-slate-700">' +
          '<span class="text-xs font-mono font-medium uppercase tracking-wider text-slate-400">Шығыс</span>' +
        '</div>' +
        '<div class="console min-h-[6rem] max-h-40 overflow-auto p-4 bg-slate-900 font-mono text-sm text-slate-300" id="console"></div>' +
        '<textarea id="js-code" class="hidden"></textarea>' +
      '</div>' +
    '</div>';

  var pg = initPlayground({ initialCode: lesson.starterCode });

  function showStep() {
    var step = lesson.steps[stepIndex];
    document.getElementById('step-indicator').textContent = 'Қадам ' + (stepIndex + 1) + ' / ' + lesson.steps.length;
    document.getElementById('step-text').textContent = step.text;
    document.getElementById('step-hint').classList.add('hidden');
    var resultEl = document.getElementById('step-result');
    resultEl.textContent = '';
    resultEl.className = 'mt-4 text-sm font-medium';
    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('btn-next').classList.remove('inline-flex');
  }

  showStep();

  document.getElementById('btn-hint').addEventListener('click', function () {
    var hint = document.getElementById('step-hint');
    hint.textContent = lesson.steps[stepIndex].hint;
    hint.classList.remove('hidden');
  });

  document.getElementById('btn-lesson-run').addEventListener('click', function () { pg.run(); });

  document.getElementById('btn-check').addEventListener('click', function () {
    var result = verifyStep(pg.getCode(), lesson.steps[stepIndex].check);
    var el = document.getElementById('step-result');
    el.textContent = result.message;
    el.className = 'mt-4 text-sm font-medium ' + (result.ok ? 'text-emerald-600' : 'text-red-600');
    if (result.ok) {
      var next = document.getElementById('btn-next');
      next.classList.remove('hidden');
      next.classList.add('inline-flex');
    }
    pg.run();
  });

  document.getElementById('btn-next').addEventListener('click', function () {
    if (stepIndex < lesson.steps.length - 1) {
      stepIndex++;
      showStep();
    } else {
      document.getElementById('step-result').textContent = 'Сабақ аяқталды!';
      document.getElementById('step-result').className = 'mt-4 text-sm font-medium text-emerald-600';
      document.getElementById('btn-next').classList.add('hidden');
      document.getElementById('btn-next').classList.remove('inline-flex');
    }
  });
}

function showFileProtocolHint() {
  if (!isFileProtocol()) return;
  var bar = document.createElement('div');
  bar.className = 'bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 text-center';
  bar.textContent = 'file:// режимі: кейбір функциялар шектелген. Ұсынылады: python -m http.server 8000';
  document.body.insertBefore(bar, document.body.firstChild);
}

function initPage() {
  showFileProtocolHint();
  var page = document.body.dataset.page;
  if (page === 'playground') initPlayground();
  if (page === 'examples') renderExamples();
  if (page === 'lessons') {
    var slug = new URLSearchParams(location.search).get('lesson');
    if (slug) renderLessonView(slug);
    else renderLessonList();
  }
}

document.addEventListener('DOMContentLoaded', initPage);
