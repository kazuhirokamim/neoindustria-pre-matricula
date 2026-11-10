const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML_PATH = path.resolve(__dirname, '../index.html');

test('REQ-14 / T7 — Auditoria da Página Mobile (Banner de Demonstração e Headers de Segurança)', async (t) => {
  assert.ok(fs.existsSync(HTML_PATH), 'index.html deve existir em mobile-web/');
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  await t.test('Cenário 1 (Feliz): Banner de advertência de ambiente de demonstração visível', () => {
    assert.match(html, /id="banner-demonstracao"/i);
    assert.match(html, /AMBIENTE DE DEMONSTRAÇÃO/i);
    assert.match(html, /use apenas dados fictícios/i);
  });

  await t.test('Cenário 2 (Borda): Meta tag referrer configurada estritamente como no-referrer', () => {
    assert.match(html, /<meta\s+name=["']referrer["']\s+content=["']no-referrer["']\s*\/?>/i);
  });

  await t.test('Cenário 3 (Erro / Controle): Content-Security-Policy presente restringindo scripts e conexões', () => {
    assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
    assert.match(html, /script-src\s+'self'/i);
  });
});
