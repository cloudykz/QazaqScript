(function () {
  var LABELS = { home: 'Басты', playground: 'Жазба алаңы', examples: 'Мысалдар', lessons: 'Сабақтар' };
  var HREFS = { home: 'index.html', playground: 'playground.html', examples: 'examples.html', lessons: 'lessons.html' };

  function renderNav(el) {
    var active = el.dataset.active || 'home';
    var links = Object.keys(LABELS).map(function (key) {
      var isActive = key === active;
      var cls = isActive
        ? 'text-accent font-semibold border-b-2 border-accent pb-0.5'
        : 'text-ink-muted hover:text-ink transition-colors';
      return '<a href="' + HREFS[key] + '" class="' + cls + '">' + LABELS[key] + '</a>';
    }).join('');
    el.innerHTML =
      '<div class="max-w-site mx-auto px-4 sm:px-6 py-4 flex flex-wrap justify-between items-center gap-4">' +
        '<a href="index.html" class="font-serif text-xl font-bold text-ink tracking-tight hover:text-accent transition-colors">' +
          'Qazaq<span class="text-accent">Script</span>' +
        '</a>' +
        '<div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">' + links + '</div>' +
      '</div>';
  }

  function renderFooter() {
    var footer = document.getElementById('site-footer');
    if (!footer) return;
    footer.innerHTML =
      '<div class="max-w-site mx-auto px-4 sm:px-6 py-12">' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-8">' +
          '<div>' +
            '<p class="font-serif text-xl font-bold text-ink">Qazaq<span class="text-accent">Script</span></p>' +
            '<p class="mt-2 text-sm text-ink-muted max-w-sm leading-relaxed">' +
              'Бағдарламалауды қазақ тілінде үйрену платформасы. Ашық код, тегін, бүкіл әлемге арналған.' +
            '</p>' +
          '</div>' +
          '<div>' +
            '<p class="text-xs font-mono uppercase tracking-widest text-ink-faint mb-3">Платформа</p>' +
            '<ul class="space-y-2 text-sm">' +
              '<li><a href="playground.html" class="text-ink-muted hover:text-accent transition-colors">Жазба алаңы</a></li>' +
              '<li><a href="lessons.html" class="text-ink-muted hover:text-accent transition-colors">Сабақтар</a></li>' +
              '<li><a href="examples.html" class="text-ink-muted hover:text-accent transition-colors">Мысалдар</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<p class="text-xs font-mono uppercase tracking-widest text-ink-faint mb-3">Анықтама</p>' +
            '<ul class="space-y-2 text-sm">' +
              '<li><a href="README.md" class="text-ink-muted hover:text-accent transition-colors">Нұсқаулық</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="mt-10 pt-6 border-t border-surface-border flex flex-wrap justify-between gap-3 text-xs text-ink-faint">' +
          '<span>Ашық лицензия — еркін пайдаланыңыз</span>' +
          '<span>Қазақ тілінде код жазыңыз</span>' +
        '</div>' +
      '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('nav');
    if (nav) renderNav(nav);
    renderFooter();
  });
})();
