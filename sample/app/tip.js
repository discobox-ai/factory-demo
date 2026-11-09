// The arithmetic behind the page, kept apart from it so it can be tested
// without a browser. Loaded by index.html as a global, and by the tests as a
// CommonJS module.
(function (root) {
  // A number typed into a field: "$1,234.50" → 1234.5. Empty is 0.
  function parseAmount(text) {
    const n = Number(String(text).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  // Split a bill: the tip on it, the total, and each person's share.
  function split(bill, tipPercent, people) {
    const tip = (bill * tipPercent) / 100;
    const total = bill + tip;
    return { tip, total, each: total / people };
  }

  // An amount as the page shows it.
  function money(n) {
    return '$' + n;
  }

  const api = { parseAmount, split, money };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tip = api;
})(this);
