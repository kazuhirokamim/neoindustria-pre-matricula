const test = require('node:test');
const assert = require('node:assert/strict');
const { obterParametrosUrl } = require('../js/app.js');

const SID_VALIDO = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('T7 — Leitura Estrita de Parâmetros de URL do Mobile (s e c)', async (t) => {
  await t.test('Cenário 1 (Feliz): ?s=<32hex>&c=mecatronica define curso e sid', () => {
    const res = obterParametrosUrl(`?s=${SID_VALIDO}&c=mecatronica`);
    assert.strictEqual(res.s, SID_VALIDO);
    assert.strictEqual(res.c, 'mecatronica');
    assert.ok(res.cursoObjeto);
    assert.strictEqual(res.cursoObjeto.titulo, 'Técnico em Mecatrônica');
  });

  await t.test('Cenário 2 (Borda): c ausente ou inválido exibe grade de escolha (c = null)', () => {
    // c ausente
    const res1 = obterParametrosUrl(`?s=${SID_VALIDO}`);
    assert.strictEqual(res1.s, SID_VALIDO);
    assert.strictEqual(res1.c, null);
    assert.strictEqual(res1.cursoObjeto, null);

    // c com slug inválido
    const res2 = obterParametrosUrl(`?s=${SID_VALIDO}&c=curso-inexistente`);
    assert.strictEqual(res2.s, SID_VALIDO);
    assert.strictEqual(res2.c, null);
    assert.strictEqual(res2.cursoObjeto, null);
  });

  await t.test('Cenário 3 (Erro / Segurança): s inválido ou ausente bloqueia o formulário (s = null)', () => {
    // s ausente
    const res1 = obterParametrosUrl('?c=mecatronica');
    assert.strictEqual(res1.s, null);

    // s com maiúsculas
    const res2 = obterParametrosUrl(`?s=${SID_VALIDO.toUpperCase()}&c=mecatronica`);
    assert.strictEqual(res2.s, null);

    // s com 31 caracteres
    const res3 = obterParametrosUrl(`?s=${SID_VALIDO.substring(0, 31)}&c=mecatronica`);
    assert.strictEqual(res3.s, null);

    // s com caracteres não hexadecimais
    const res4 = obterParametrosUrl(`?s=${'z'.repeat(32)}&c=mecatronica`);
    assert.strictEqual(res4.s, null);
  });

  await t.test('Cenário 4 (Rejeição de parâmetros antigos): ?sid= e ?curso= são ignorados', () => {
    // Tenta passar sid= e curso= em vez de s= e c=
    const res = obterParametrosUrl(`?sid=${SID_VALIDO}&curso=mecatronica`);
    assert.strictEqual(res.s, null, 'Parâmetro sid= não deve ser aceito');
    assert.strictEqual(res.c, null, 'Parâmetro curso= não deve ser aceito');
  });
});
