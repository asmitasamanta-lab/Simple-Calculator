// Scientific calculator with history and degrees/radians toggle
(function(){
  const exprEl = document.getElementById('expr');
  const resultEl = document.getElementById('result');
  const keys = document.querySelectorAll('.key');
  const degToggle = document.getElementById('degToggle');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');

  let expression = '';
  let displayExpr = '';

  const HISTORY_KEY = 'calc_history_v1';
  const MAX_HISTORY = 50;

  // Load history from localStorage
  function loadHistory(){
    const raw = localStorage.getItem(HISTORY_KEY);
    try{
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      return [];
    }
  }
  function saveHistory(arr){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, MAX_HISTORY)));
  }

  function renderHistory(){
    const arr = loadHistory();
    historyList.innerHTML = '';
    if (arr.length === 0){
      const li = document.createElement('li');
      li.textContent = 'No history yet';
      li.style.color = 'var(--muted)';
      historyList.appendChild(li);
      return;
    }
    arr.forEach((it, idx) => {
      const li = document.createElement('li');
      const left = document.createElement('div');
      left.className = 'expr';
      left.textContent = it.expr;
      const right = document.createElement('div');
      right.className = 'res';
      right.textContent = it.res;
      li.appendChild(left);
      li.appendChild(right);
      li.title = 'Click to load';
      li.addEventListener('click', () => {
        expression = it.res.toString();
        displayExpr = it.res.toString();
        updateDisplay();
      });
      historyList.appendChild(li);
    });
  }

  function pushHistory(expr, res){
    if (res === 'Error' || res === '') return;
    const arr = loadHistory();
    arr.unshift({expr, res, time:Date.now()});
    saveHistory(arr);
    renderHistory();
  }

  function updateDisplay(){
    exprEl.textContent = displayExpr;
    const preview = expression === '' ? '0' : tryEval(expression);
    resultEl.textContent = preview === '' ? '0' : preview;
  }

  // Safe evaluation: expose helper functions and restrict chars
  function tryEval(expr){
    if (expr.trim() === '') return '0';
    // Allow digits, operators, parentheses, decimal point, percent, comma, letters, spaces
    if (!/^[0-9+\-*/().%,\sA-Za-z]+$/.test(expr)) return 'Error';
    try{
      // Replace occurrences like '50%' with '(50/100)'
      let safeExpr = expr.replace(/([0-9.]+)%/g, "($1/100)");
      // prepare helper functions. `deg` is boolean controlling degree/radian.
      const deg = !!degToggle.checked;
      // Define helper functions as text that will be in the evaluation scope.
      const prelude = `
        const degMode = ${deg};
        const toRad = v => (degMode ? v * Math.PI / 180 : v);
        const sin = v => Math.sin(toRad(v));
        const cos = v => Math.cos(toRad(v));
        const tan = v => Math.tan(toRad(v));
        const asin = v => (degMode ? Math.asin(v) * 180 / Math.PI : Math.asin(v));
        const acos = v => (degMode ? Math.acos(v) * 180 / Math.PI : Math.acos(v));
        const atan = v => (degMode ? Math.atan(v) * 180 / Math.PI : Math.atan(v));
        const sqrt = v => Math.sqrt(v);
        const ln = v => Math.log(v);
        const log10 = v => Math.log10 ? Math.log10(v) : Math.log(v)/Math.LN10;
        const pow = (a,b) => Math.pow(a,b);
        const abs = v => Math.abs(v);
      `;
      // Evaluate with Function and the prelude in-scope.
      const value = Function('"use strict";' + prelude + ' return (' + safeExpr + ')')();
      if (value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return 'Error';
      // Round small floating imprecision and trim trailing zeros
      const rounded = Math.round(value * 1e12) / 1e12;
      return rounded.toString();
    }catch(e){
      return 'Error';
    }
  }

  function appendValue(val){
    // For function shortcuts (sin( etc.) we append directly.
    // Prevent two operators in a row (except '-' for negative)
    const last = expression.slice(-1);
    const isOp = /^[+\-*/]$/.test(val);
    if (isOp){
      if (expression === '' && val !== '-') return;
      if (/^[+\-*/]$/.test(last)) {
        expression = expression.slice(0, -1) + val;
        displayExpr = displayExpr.slice(0, -1) + val;
        updateDisplay();
        return;
      }
    }
    expression += val;
    displayExpr += val;
    updateDisplay();
  }

  function clearAll(){
    expression = '';
    displayExpr = '';
    updateDisplay();
  }

  function backspace(){
    expression = expression.slice(0, -1);
    displayExpr = displayExpr.slice(0, -1);
    updateDisplay();
  }

  function calculate(){
    const res = tryEval(expression);
    if (res === 'Error' || res === '') {
      resultEl.textContent = 'Error';
    } else {
      pushHistory(displayExpr || expression, res);
      expression = res.toString();
      displayExpr = res.toString();
      updateDisplay();
    }
  }

  keys.forEach(k => {
    k.addEventListener('click', () => {
      const v = k.getAttribute('data-value');
      const action = k.getAttribute('data-action');
      if (action === 'clear') return clearAll();
      if (action === 'back') return backspace();
      if (action === 'equals') return calculate();
      if (v) return appendValue(v);
    });
  });

  // keyboard support
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey) return;
    const key = e.key;
    if ((/^[0-9]$/).test(key)) appendValue(key);
    else if (key === '.' ) appendValue('.');
    else if (key === '+' || key === '-' || key === '*' || key === '/') appendValue(key);
    else if (key === 'Enter' || key === '=') { e.preventDefault(); calculate(); }
    else if (key === 'Backspace') backspace();
    else if (key === 'Escape') clearAll();
    else if (key === '%') appendValue('%');
    // quick function shortcuts (lowercase)
    else if (key === 's') appendValue('sin(');
    else if (key === 'c') appendValue('cos(');
    else if (key === 'r') appendValue('sqrt(');
    else if (key === 'l') appendValue('ln(');
    else if (key === 'p') appendValue('pow(');
  });

  // History controls
  clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });

  // Initialize
  renderHistory();
  updateDisplay();
})();