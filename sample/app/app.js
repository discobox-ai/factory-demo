// Wires the page to tip.js. Initial values can come from the query string
// (?bill=50&tip=18&people=3), which is how scripts/screenshot shows a state.
(function () {
  const $ = (id) => document.getElementById(id);
  const bill = $('bill');
  const people = $('people');
  const custom = $('custom');
  let tipPercent = 15;

  function render() {
    const r = Tip.split(Tip.parseAmount(bill.value), tipPercent, Number(people.value));
    $('tip').textContent = Tip.money(r.tip);
    $('total').textContent = Tip.money(r.total);
    $('each').textContent = Tip.money(r.each);
    document.querySelectorAll('[data-tip]').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.tip) === tipPercent);
    });
  }

  document.querySelectorAll('[data-tip]').forEach((b) => {
    b.addEventListener('click', () => {
      tipPercent = Number(b.dataset.tip);
      custom.value = '';
      render();
    });
  });
  custom.addEventListener('input', () => {
    tipPercent = Tip.parseAmount(custom.value);
    render();
  });
  bill.addEventListener('input', render);

  const q = new URLSearchParams(location.search);
  if (q.has('bill')) bill.value = q.get('bill');
  if (q.has('people')) people.value = q.get('people');
  if (q.has('tip')) tipPercent = Number(q.get('tip'));
  render();
})();
