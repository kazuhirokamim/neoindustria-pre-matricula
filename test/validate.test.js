const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validarCPF,
  validarWhatsApp,
  validarNome,
  mascararCPF,
  mascararWhatsApp,
  CURSOS_MAP
} = require('../js/app.js');

test('REQ-07 / REQ-15 / T7 — Validações da Aplicação Mobile do Celular', async (t) => {
  await t.test('Cenário 1 (Feliz): CPF válido e mapeamento correto dos 4 cursos do SENAI', () => {
    assert.strictEqual(validarCPF('11144477735'), true);
    assert.strictEqual(validarCPF('111.444.777-35'), true);

    const ids = Object.keys(CURSOS_MAP);
    assert.strictEqual(ids.length, 4);
    assert.ok(CURSOS_MAP['mecatronica']);
    assert.ok(CURSOS_MAP['eletrotecnica']);
    assert.ok(CURSOS_MAP['automacao-industrial']);
    assert.ok(CURSOS_MAP['desenvolvimento-sistemas']);
  });

  await t.test('Cenário 2 (Borda): CPFs com pontuação ou espaços em branco', () => {
    assert.strictEqual(validarCPF('  11144477735  '), true);
    assert.strictEqual(validarCPF('111 444 777 35'), true);
  });

  await t.test('Cenário 3 (Erro): CPFs matematicamente inválidos, repetidos ou vazios', () => {
    assert.strictEqual(validarCPF('00000000000'), false);
    assert.strictEqual(validarCPF('111.111.111-11'), false);
    assert.strictEqual(validarCPF('12345678900'), false); // dígito errado
    assert.strictEqual(validarCPF('11144477734'), false); // dígito errado
    assert.strictEqual(validarCPF('123'), false);
    assert.strictEqual(validarCPF(''), false);
    assert.strictEqual(validarCPF(null), false);
    assert.strictEqual(validarCPF('1114447773a'), false); // com letras
  });

  await t.test('Cenário 4 (WhatsApp): 11 dígitos com 9, sem 9, 10 dígitos e DDD 00', () => {
    // Válidos
    assert.strictEqual(validarWhatsApp('11912345678'), true); // 11 com 9
    assert.strictEqual(validarWhatsApp('(11) 91234-5678'), true);
    assert.strictEqual(validarWhatsApp('1133334444'), true); // 10 dígitos (fixo)
    assert.strictEqual(validarWhatsApp('(19) 3232-4455'), true);

    // Inválidos
    assert.strictEqual(validarWhatsApp('11812345678'), false); // 11 sem 9 na 3ª posição
    assert.strictEqual(validarWhatsApp('00912345678'), false); // DDD 00
    assert.strictEqual(validarWhatsApp('09912345678'), false); // DDD < 11
    assert.strictEqual(validarWhatsApp('12345'), false); // curto
    assert.strictEqual(validarWhatsApp(''), false);
    assert.strictEqual(validarWhatsApp(null), false);
  });

  await t.test('Cenário 5 (Nome): Nome e sobrenome, tamanho entre 3 e 150 caracteres', () => {
    assert.strictEqual(validarNome('Maria da Silva'), true);
    assert.strictEqual(validarNome('João Silva'), true);
    assert.strictEqual(validarNome('Ana B'), true);

    // Inválidos
    assert.strictEqual(validarNome('Maria'), false); // só uma palavra
    assert.strictEqual(validarNome('   '), false);
    assert.strictEqual(validarNome('Ab'), false); // menor que 3
    assert.strictEqual(validarNome('A'.repeat(151) + ' Silva'), false); // maior que 150
    assert.strictEqual(validarNome(null), false);
  });

  await t.test('Cenário 6 (Máscaras): Formatação de CPF e WhatsApp', () => {
    assert.strictEqual(mascararCPF('11144477735'), '111.444.777-35');
    assert.strictEqual(mascararWhatsApp('11912345678'), '(11) 91234-5678');
    assert.strictEqual(mascararWhatsApp('1133334444'), '(11) 3333-4444');
  });
});
