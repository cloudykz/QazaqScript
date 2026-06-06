/**
 * QazaqScript — қазақ тіліндегі бағдарламалау тілі компиляторы.
 */
(function (global) {
  'use strict';

  var KEYWORD_ALIASES = {
    болсын: 'болсын', bolsin: 'болсын',
    жаз: 'жаз', zhaz: 'жаз',
    болса: 'болса', bolsa: 'болса',
    соңы: 'соңы', songy: 'соңы', sony: 'соңы',
    әйтпесе: 'әйтпесе', aitpese: 'әйтпесе',
    егер: 'егер', eger: 'егер',
    қабылда: 'қабылда', kabylda: 'қабылда',
    қайтар: 'қайтар', kaytar: 'қайтар', kaytary: 'қайтар',
    функциясы: 'функциясы', funkciyasy: 'функциясы', funkciyasi: 'функциясы',
    функция: 'функция', funkciya: 'функция',
    ішінде: 'ішінде', ishinde: 'ішінде',
    әрбір: 'әрбір', arbir: 'әрбір', harbir: 'әрбір',
    әзірге: 'әзірге', azirge: 'әзірге',
    шын: 'шын', shyn: 'шын',
    жалған: 'жалған', zhalgan: 'жалған',
    үлкен: 'үлкен', ulken: 'үлкен',
    кіші: 'кіші', kishi: 'кіші',
    тең: 'тең', ten: 'тең',
  };

  var SUFFIXES = ['-ден', '-ге', '-ға', '-ке', '-den', '-ge', '-ga', '-ke'];

  function compileError(message, line, column) {
    return { message: message, line: line, column: column };
  }

  function normalizeKeyword(word) {
    return word.toLocaleLowerCase('kk-KZ');
  }

  function isKeyword(word) {
    return !!KEYWORD_ALIASES[normalizeKeyword(word)];
  }

  function isIdentStart(ch) {
    return /[a-zA-Zа-яА-ЯәғқңөұүһіӘҒҚҢӨҰҮҺІ_]/.test(ch);
  }

  function isIdentPart(ch) {
    return /[a-zA-Z0-9а-яА-ЯәғқңөұүһіӘҒҚҢӨҰҮҺІ_]/.test(ch);
  }

  function tokenize(source) {
    var tokens = [];
    var errors = [];
    var line = 1;
    var column = 1;
    var i = 0;

    function peek() { return source[i] || ''; }

    function advance() {
      var ch = source[i++] || '';
      if (ch === '\n') { line++; column = 1; } else { column++; }
      return ch;
    }

    function add(type, value, extra) {
      var t = { type: type, value: value, line: line, column: column - (value ? value.length : 0) };
      if (extra) Object.assign(t, extra);
      tokens.push(t);
    }

    while (i < source.length) {
      var startCol = column;
      var ch = peek();

      if (/[\s\r\n\t]/.test(ch)) { advance(); continue; }

      if (ch === '/' && source[i + 1] === '/') {
        advance(); advance();
        while (i < source.length && peek() !== '\n') advance();
        continue;
      }

      if (ch === '"') {
        advance();
        var str = '';
        while (i < source.length && peek() !== '"') {
          if (peek() === '\\') {
            advance();
            var esc = advance();
            if (esc === 'n') str += '\n';
            else if (esc === 't') str += '\t';
            else str += esc;
          } else {
            str += advance();
          }
        }
        if (peek() !== '"') {
          errors.push(compileError('Жабылмаған жол тіркесімі', line, startCol));
          break;
        }
        advance();
        add('STRING', str);
        continue;
      }

      if (/[0-9]/.test(ch)) {
        var num = '';
        while (/[0-9]/.test(peek())) num += advance();
        if (peek() === '.' && /[0-9]/.test(source[i + 1] || '')) {
          num += advance();
          while (/[0-9]/.test(peek())) num += advance();
        }
        var suffix = '';
        for (var si = 0; si < SUFFIXES.length; si++) {
          var suf = SUFFIXES[si];
          if (source.slice(i, i + suf.length) === suf) {
            suffix = suf;
            for (var sj = 0; sj < suf.length; sj++) advance();
            break;
          }
        }
        add('NUMBER', num, suffix ? { suffix: suffix } : null);
        continue;
      }

      if ('()[],'.indexOf(ch) !== -1) {
        var map = { '(': 'LPAREN', ')': 'RPAREN', '[': 'LBRACK', ']': 'RBRACK', ',': 'COMMA' };
        advance();
        add(map[ch], ch);
        continue;
      }

      if (ch === '.' && (i === 0 || !/[0-9]/.test(source[i - 1]))) {
        advance();
        add('DOT', '.');
        continue;
      }

      if ('+-*/%'.indexOf(ch) !== -1) {
        advance();
        add('OPERATOR', ch);
        continue;
      }

      if (isIdentStart(ch)) {
        var word = '';
        while (isIdentPart(peek())) word += advance();
        var norm = normalizeKeyword(word);
        var kw = KEYWORD_ALIASES[norm];
        if (kw) {
          if (kw === 'шын' || kw === 'жалған') {
            add('BOOLEAN', kw === 'шын' ? 'true' : 'false', { keyword: kw });
          } else {
            add('KEYWORD', kw, { keyword: kw });
          }
        } else {
          var idSuffix = '';
          for (var sk = 0; sk < SUFFIXES.length; sk++) {
            var sx = SUFFIXES[sk];
            if (source.slice(i, i + sx.length) === sx) {
              idSuffix = sx;
              for (var sxj = 0; sxj < sx.length; sxj++) advance();
              break;
            }
          }
          add('IDENTIFIER', word, idSuffix ? { suffix: idSuffix } : null);
        }
        continue;
      }

      errors.push(compileError('Белгісіз таңба: ' + ch, line, startCol));
      advance();
    }

    tokens.push({ type: 'EOF', value: '', line: line, column: column });
    return { tokens: tokens, errors: errors };
  }

  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.errors = [];
    this.declared = {};
  }

  Parser.prototype.current = function () {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  };

  Parser.prototype.peek = function (n) {
    return this.tokens[this.pos + (n || 1)] || this.current();
  };

  Parser.prototype.isAtEnd = function () {
    return this.current().type === 'EOF';
  };

  Parser.prototype.advance = function () {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  };

  Parser.prototype.error = function (msg) {
    var t = this.current();
    this.errors.push(compileError(msg, t.line, t.column));
  };

  Parser.prototype.checkKw = function (kw) {
    return this.current().type === 'KEYWORD' && this.current().keyword === kw;
  };

  Parser.prototype.eatKw = function (kw) {
    if (this.checkKw(kw)) { this.advance(); return true; }
    this.error('Күтілді: ' + kw);
    return false;
  };

  Parser.prototype.eatDot = function () {
    if (this.current().type === 'DOT') { this.advance(); return true; }
    this.error('Күтілді: .');
    return false;
  };

  Parser.prototype.parse = function () {
    var body = [];
    while (!this.isAtEnd()) {
      var s = this.parseStatement();
      if (s) body.push(s);
      else if (!this.isAtEnd()) this.advance();
    }
    return {
      program: this.errors.length ? null : { kind: 'Program', body: body },
      errors: this.errors,
    };
  };

  Parser.prototype.parseBlock = function (allowElse) {
    var body = [];
    while (!this.isAtEnd() && !this.checkKw('соңы') && !(allowElse && this.checkKw('әйтпесе'))) {
      var s = this.parseStatement();
      if (s) body.push(s);
      else break;
    }
    if (!allowElse || !this.checkKw('әйтпесе')) {
      this.eatKw('соңы');
      this.eatDot();
    }
    return { kind: 'BlockStatement', body: body };
  };

  Parser.prototype.parseIf = function () {
    this.advance();
    var cond = this.parseCondition();
    if (!cond) return null;
    if (!this.eatKw('болса')) return null;
    this.eatDot();
    var consequent = this.parseBlock(true);
    var alternate = null;
    if (this.checkKw('әйтпесе')) {
      this.advance();
      this.eatDot();
      alternate = this.parseBlock(false);
    }
    return { kind: 'IfStatement', condition: cond, consequent: consequent, alternate: alternate };
  };

  Parser.prototype.parseWhile = function () {
    this.advance();
    var cond = this.parseCondition();
    if (!cond) return null;
    if (!this.eatKw('болса')) return null;
    this.eatDot();
    var body = this.parseBlock();
    return { kind: 'WhileStatement', condition: cond, body: body };
  };

  Parser.prototype.parseForEach = function () {
    this.advance();
    if (this.current().type !== 'IDENTIFIER') { this.error('Айнымалы күтілді'); return null; }
    var item = this.advance().value;
    if (!this.eatKw('ішінде')) return null;
    var collection = this.parseExpression();
    if (!collection) return null;
    this.eatDot();
    var body = this.parseBlock();
    return { kind: 'ForEachStatement', item: item, collection: collection, body: body };
  };

  Parser.prototype.parseFunction = function () {
    var name = this.advance().value;
    this.eatKw('функциясы');
    this.eatDot();
    var params = [];
    while (this.current().type === 'IDENTIFIER' && this.peek().type === 'KEYWORD' && this.peek().keyword === 'қабылда') {
      params.push(this.advance().value);
      this.eatKw('қабылда');
      this.eatDot();
    }
    var body = [];
    while (!this.isAtEnd() && !this.checkKw('соңы')) {
      var s = this.parseStatement();
      if (s) body.push(s);
      else break;
    }
    this.eatKw('соңы');
    this.eatDot();
    return { kind: 'FunctionDeclaration', name: name, params: params, body: { kind: 'BlockStatement', body: body } };
  };

  Parser.prototype.parseFunctionAlt = function () {
    this.advance();
    if (this.current().type !== 'IDENTIFIER') { this.error('Функция аты күтілді'); return null; }
    var name = this.advance().value;
    this.eatDot();
    var params = [];
    while (this.current().type === 'IDENTIFIER' && this.peek().type === 'KEYWORD' && this.peek().keyword === 'қабылда') {
      params.push(this.advance().value);
      this.eatKw('қабылда');
      this.eatDot();
    }
    var body = [];
    while (!this.isAtEnd() && !this.checkKw('соңы')) {
      var s = this.parseStatement();
      if (s) body.push(s);
      else break;
    }
    this.eatKw('соңы');
    this.eatDot();
    return { kind: 'FunctionDeclaration', name: name, params: params, body: { kind: 'BlockStatement', body: body } };
  };

  Parser.prototype.parseCondition = function () {
    // жасы 18-ден үлкен  |  a b-ден үлкен  |  болжам жасырын-ға тең
    if (this.current().type === 'IDENTIFIER' && (this.peek().type === 'NUMBER' || this.peek().type === 'IDENTIFIER')) {
      var left = { kind: 'Identifier', name: this.advance().value };
      var right;
      if (this.current().type === 'NUMBER') {
        var numTok = this.advance();
        right = { kind: 'NumberLiteral', value: Number(numTok.value) };
      } else {
        var idTok = this.advance();
        right = { kind: 'Identifier', name: idTok.value };
      }
      if (this.current().type === 'KEYWORD' && (this.current().keyword === 'үлкен' || this.current().keyword === 'кіші' || this.current().keyword === 'тең')) {
        var comp = this.advance().keyword;
        var op = comp === 'үлкен' ? '>' : comp === 'кіші' ? '<' : '==';
        return { kind: 'BinaryExpression', operator: op, left: left, right: right };
      }
    }
    // орындалды шын
    if (this.current().type === 'IDENTIFIER' && (this.peek().type === 'BOOLEAN' || (this.peek().type === 'KEYWORD' && (this.peek().keyword === 'шын' || this.peek().keyword === 'жалған')))) {
      var id = { kind: 'Identifier', name: this.advance().value };
      var lit;
      if (this.current().type === 'BOOLEAN') {
        lit = { kind: 'BooleanLiteral', value: this.advance().value === 'true' };
      } else {
        lit = { kind: 'BooleanLiteral', value: this.advance().keyword === 'шын' };
      }
      return { kind: 'BinaryExpression', operator: '==', left: id, right: lit };
    }
    return this.parseExpression();
  };

  Parser.prototype.parseExpression = function () { return this.parseAdditive(); };

  Parser.prototype.parseAdditive = function () {
    var left = this.parseMultiplicative();
    if (!left) return null;
    while (this.current().type === 'OPERATOR' && (this.current().value === '+' || this.current().value === '-')) {
      var op = this.advance().value;
      var right = this.parseMultiplicative();
      if (!right) break;
      left = { kind: 'BinaryExpression', operator: op, left: left, right: right };
    }
    return left;
  };

  Parser.prototype.parseMultiplicative = function () {
    var left = this.parsePrimary();
    if (!left) return null;
    while (this.current().type === 'OPERATOR' && '*/%'.indexOf(this.current().value) !== -1) {
      var op = this.advance().value;
      var right = this.parsePrimary();
      if (!right) break;
      left = { kind: 'BinaryExpression', operator: op, left: left, right: right };
    }
    return left;
  };

  Parser.prototype.parsePrimary = function () {
    var t = this.current();
    if (t.type === 'NUMBER') {
      this.advance();
      return { kind: 'NumberLiteral', value: Number(t.value) };
    }
    if (t.type === 'STRING') {
      this.advance();
      return { kind: 'StringLiteral', value: t.value };
    }
    if (t.type === 'BOOLEAN') {
      this.advance();
      return { kind: 'BooleanLiteral', value: t.value === 'true' };
    }
    if (t.type === 'LBRACK') {
      this.advance();
      var items = [];
      if (this.current().type !== 'RBRACK') {
        var el = this.parseExpression();
        if (el) items.push(el);
        while (this.current().type === 'COMMA') {
          this.advance();
          var e2 = this.parseExpression();
          if (e2) items.push(e2);
        }
      }
      if (this.current().type !== 'RBRACK') { this.error('Күтілді: ]'); return null; }
      this.advance();
      return { kind: 'ArrayLiteral', items: items };
    }
    if (t.type === 'IDENTIFIER') {
      var name = this.advance().value;
      var node = { kind: 'Identifier', name: name };
      if (this.current().type === 'LPAREN') {
        this.advance();
        var args = [];
        if (this.current().type !== 'RPAREN') {
          var a = this.parseExpression();
          if (a) args.push(a);
          while (this.current().type === 'COMMA') {
            this.advance();
            var a2 = this.parseExpression();
            if (a2) args.push(a2);
          }
        }
        if (this.current().type !== 'RPAREN') { this.error('Күтілді: )'); return node; }
        this.advance();
        return { kind: 'CallExpression', callee: node, args: args };
      }
      return node;
    }
    this.error('Күтілді: мән');
    return null;
  };

  Parser.prototype.parseStatement = function () {
    if (this.checkKw('егер')) return this.parseIf();
    if (this.checkKw('әрбір')) return this.parseForEach();
    if (this.checkKw('әзірге')) return this.parseWhile();
    if (this.current().type === 'IDENTIFIER' && this.peek().type === 'KEYWORD' && this.peek().keyword === 'функциясы') {
      return this.parseFunction();
    }
    if (this.checkKw('функция')) return this.parseFunctionAlt();

    if (this.current().type === 'IDENTIFIER') {
      var pk = this.peek();
      var isExprStmt = pk.type === 'KEYWORD' && (pk.keyword === 'жаз' || pk.keyword === 'қайтар')
        || pk.type === 'LPAREN';
      var canVar = pk.type === 'STRING' || pk.type === 'NUMBER' || pk.type === 'LBRACK'
        || pk.type === 'BOOLEAN' || (pk.type === 'IDENTIFIER');
      if (!isExprStmt && canVar) {
        var saved = this.pos;
        var nameTok = this.advance();
        var init = this.parseExpression();
        if (init && this.checkKw('болсын')) {
          this.advance();
          this.eatDot();
          var n = nameTok.value;
          if (this.declared[n]) {
            return { kind: 'Assignment', name: n, value: init };
          }
          this.declared[n] = true;
          return { kind: 'VarDeclaration', name: n, initializer: init };
        }
        this.pos = saved;
      }
    }

    var expr = this.parseExpression();
    if (!expr) return null;

    if (this.checkKw('жаз')) {
      this.advance();
      this.eatDot();
      return { kind: 'ExpressionStatement', expression: { kind: 'CallExpression', callee: { kind: 'Identifier', name: '__print__' }, args: [expr] } };
    }

    if (this.checkKw('қайтар')) {
      this.advance();
      this.eatDot();
      return { kind: 'ReturnStatement', value: expr };
    }

    if (this.current().type === 'DOT') {
      this.advance();
      return { kind: 'ExpressionStatement', expression: expr };
    }

    this.error('Күтілді: жаз, болсын, қайтар немесе .');
    return null;
  };

  function parse(tokens) {
    return new Parser(tokens).parse();
  }

  function genExpr(expr) {
    switch (expr.kind) {
      case 'NumberLiteral': return String(expr.value);
      case 'StringLiteral': return JSON.stringify(expr.value);
      case 'BooleanLiteral': return expr.value ? 'true' : 'false';
      case 'Identifier': return expr.name;
      case 'ArrayLiteral':
        return '[' + expr.items.map(genExpr).join(', ') + ']';
      case 'UnaryExpression':
        return '(' + expr.operator + genExpr(expr.argument) + ')';
      case 'BinaryExpression':
        return '(' + genExpr(expr.left) + ' ' + expr.operator + ' ' + genExpr(expr.right) + ')';
      case 'CallExpression':
        if (expr.callee.kind === 'Identifier' && expr.callee.name === '__print__') {
          return 'console.log(' + expr.args.map(genExpr).join(', ') + ')';
        }
        return genExpr(expr.callee) + '(' + expr.args.map(genExpr).join(', ') + ')';
      default: return 'undefined';
    }
  }

  function genBlock(block, indent) {
    var pad = '  '.repeat(indent);
    var inner = block.body.map(function (s) { return genStmt(s, indent + 1); }).filter(Boolean).join('\n');
    return '{\n' + inner + '\n' + pad + '}';
  }

  function genStmt(stmt, indent) {
    var pad = '  '.repeat(indent);
    switch (stmt.kind) {
      case 'VarDeclaration':
        return pad + 'let ' + stmt.name + ' = ' + genExpr(stmt.initializer) + ';';
      case 'Assignment':
        return pad + stmt.name + ' = ' + genExpr(stmt.value) + ';';
      case 'ExpressionStatement':
        return pad + genExpr(stmt.expression) + ';';
      case 'IfStatement':
        var r = pad + 'if (' + genExpr(stmt.condition) + ') ' + genBlock(stmt.consequent, indent);
        if (stmt.alternate) r += ' else ' + genBlock(stmt.alternate, indent);
        return r;
      case 'WhileStatement':
        return pad + 'while (' + genExpr(stmt.condition) + ') ' + genBlock(stmt.body, indent);
      case 'ForEachStatement':
        return pad + 'for (const ' + stmt.item + ' of ' + genExpr(stmt.collection) + ') ' + genBlock(stmt.body, indent);
      case 'FunctionDeclaration':
        var params = stmt.params.join(', ');
        var body = stmt.body.body.map(function (s) { return genStmt(s, indent + 1); }).filter(Boolean).join('\n');
        return pad + 'function ' + stmt.name + '(' + params + ') {\n' + body + '\n' + pad + '}';
      case 'ReturnStatement':
        return stmt.value ? pad + 'return ' + genExpr(stmt.value) + ';' : pad + 'return;';
      case 'BlockStatement':
        return genBlock(stmt, indent);
      default: return '';
    }
  }

  function generate(program) {
    return program.body.map(function (s) { return genStmt(s, 0); }).filter(Boolean).join('\n');
  }

  function compile(source) {
    var lex = tokenize(source);
    if (lex.errors.length) return { js: '', errors: lex.errors };
    var parsed = parse(lex.tokens);
    if (parsed.errors.length) return { js: '', errors: parsed.errors };
    if (!parsed.program) return { js: '', errors: [{ message: 'Бағдарлама талданбады', line: 1, column: 1 }] };
    return { js: generate(parsed.program), errors: [] };
  }

  global.QazaqScript = { compile: compile, tokenize: tokenize, parse: parse, generate: generate };
})(typeof window !== 'undefined' ? window : globalThis);
