const test = require('node:test');
const assert = require('node:assert');
const { parseAmount, split } = require('../tip.js');

test('parseAmount reads what people type', () => {
  assert.strictEqual(parseAmount('50'), 50);
  assert.strictEqual(parseAmount('$1,234.50'), 1234.5);
  assert.strictEqual(parseAmount(''), 0);
});

test('split adds the tip and shares the total', () => {
  assert.deepStrictEqual(split(100, 10, 2), { tip: 10, total: 110, each: 55 });
  assert.deepStrictEqual(split(80, 25, 4), { tip: 20, total: 100, each: 25 });
});
