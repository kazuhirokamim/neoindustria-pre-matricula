const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tratarRespostaEnvio, APPS_SCRIPT_URL } = require('../js/app.js');

const APP_JS_PATH = path.resolve(__dirname, '../js/app.js');

test('T7 — Tratamento de Respostas de Envio e Segurança do Mobile', async (t) => {
  await t.test('Cenário 1 (Guarda de Segurança): app.js não contém innerHTML nem no-cors', () => {
    assert.ok(fs.existsSync(APP_JS_PATH));
    const code = fs.readFileSync(APP_JS_PATH, 'utf-8');

    assert.doesNotMatch(code, /\binnerHTML\b/, 'Proibido innerHTML em mobile-web/js/app.js');
    assert.doesNotMatch(code, /\bno-cors\b/, 'Proibido modo no-cors em fetch (deve ler a resposta JSON)');
    assert.doesNotMatch(code, /\bdocument\.write\b/, 'Proibido document.write');
  });

  await t.test('Cenário 2 (Proteção de Configuração): URL de produção configurada sem marcador SEU_ID', () => {
    assert.match(APPS_SCRIPT_URL, /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/, 'URL de produção válida configurada');
    assert.ok(!APPS_SCRIPT_URL.includes('SEU_ID'), 'Marcador SEU_ID substituído pela URL real');
  });

  await t.test('Cenário 3 (Tratamento de Resposta JSON): Sucesso, manutenção, erro e falha', () => {
    // Mock do DOM
    const elementos = {
      'form-matricula': { hidden: false },
      'curso-box': { hidden: false },
      'grade-cursos': { hidden: false },
      'tela-sucesso': { hidden: true },
      'sucesso-titulo': { textContent: '', focus: () => {} },
      'sucesso-msg': { textContent: '' },
      'status-envio': { textContent: '', hidden: true },
      'btn-enviar': { disabled: true, textContent: 'Enviando…' }
    };

    global.document = {
      getElementById: (id) => elementos[id] || null
    };

    const curso = { id: 'mecatronica', titulo: 'Técnico em Mecatrônica' };

    // 1. Resposta de Sucesso
    tratarRespostaEnvio({ status: 'success' }, 'Maria Silva', curso);
    assert.strictEqual(elementos['tela-sucesso'].hidden, false, 'Tela de sucesso deve estar visível');
    assert.strictEqual(elementos['form-matricula'].hidden, true, 'Formulário deve estar oculto');
    assert.match(elementos['sucesso-titulo'].textContent, /Obrigado, Maria!/);
    assert.match(elementos['sucesso-msg'].textContent, /Técnico em Mecatrônica/);

    // Reset
    elementos['tela-sucesso'].hidden = true;
    elementos['form-matricula'].hidden = false;

    // 2. Resposta de Manutenção
    tratarRespostaEnvio({ status: 'manutencao' }, 'Maria Silva', curso);
    assert.strictEqual(elementos['tela-sucesso'].hidden, true, 'Manutenção NUNCA pode mostrar sucesso');
    assert.strictEqual(elementos['status-envio'].hidden, false);
    assert.match(elementos['status-envio'].textContent, /manutenção/);
    assert.strictEqual(elementos['btn-enviar'].disabled, false);
    assert.strictEqual(elementos['btn-enviar'].textContent, 'Tentar de novo');

    // 3. Resposta de Erro do Servidor
    tratarRespostaEnvio({ status: 'error', message: 'CPF já cadastrado.' }, 'Maria Silva', curso);
    assert.strictEqual(elementos['tela-sucesso'].hidden, true, 'Erro NUNCA pode mostrar sucesso');
    assert.strictEqual(elementos['status-envio'].textContent, 'CPF já cadastrado.');
    assert.strictEqual(elementos['btn-enviar'].disabled, false);

    // 4. Resposta Nula / Falha de Rede
    tratarRespostaEnvio(null, 'Maria Silva', curso);
    assert.strictEqual(elementos['tela-sucesso'].hidden, true, 'Falha NUNCA pode mostrar sucesso');
    assert.match(elementos['status-envio'].textContent, /Não conseguimos enviar/);
    assert.strictEqual(elementos['btn-enviar'].disabled, false);
  });
});
