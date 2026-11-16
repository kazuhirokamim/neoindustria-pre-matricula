/**
 * ============================================================================
 * Mobile Web Form Handler — Projeto Neoindústria (SENAI)
 * Funciona nos navegadores de smartphone após escanear o QR Code.
 * Implementa REQ-07, REQ-08, REQ-14, REQ-15 · Issue #2 (Retrabalho T7)
 *
 * Código com manipulação segura do DOM, sem injeção de HTML.
 * ============================================================================
 */

var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwIFSKAWR3siUtFTBcZuhOKhPGOSW_tNu2Xxo0LtFRZGVG-x2NA7zu0r-cKHbhkm4tQ/exec";

// Cursos carregados via mobile-web/js/cursos.js (fonte da verdade gerada)
function obterListaCursos() {
  if (typeof CURSOS !== "undefined") {
    return CURSOS;
  }
  if (typeof window !== "undefined" && window.CURSOS) {
    return window.CURSOS;
  }
  try {
    return require("./cursos.js");
  } catch (e) {
    return [];
  }
}

// Mapa de compatibilidade para testes unitários legados
var CURSOS_MAP = {};
var listaInicial = obterListaCursos();
for (var i = 0; i < listaInicial.length; i++) {
  CURSOS_MAP[listaInicial[i].id] = listaInicial[i].titulo;
}

// ----------------------------------------------------------------------------
// Validações Puras e Formatadores
// ----------------------------------------------------------------------------

function obterParametrosUrl(queryString) {
  var search = queryString != null ? queryString : (typeof window !== "undefined" ? window.location.search : "");
  var params = new URLSearchParams(search);

  // v2: lê somente 'c' (curso_id do cursos.json). Não existe mais sid.
  var cParam = params.get("c");

  var cursoValidoResultado = null;
  if (cParam) {
    var cursos = obterListaCursos();
    for (var i = 0; i < cursos.length; i++) {
      if (cursos[i].id === cParam.trim()) {
        cursoValidoResultado = cursos[i];
        break;
      }
    }
  }

  return {
    c: cursoValidoResultado ? cursoValidoResultado.id : null,
    cursoObjeto: cursoValidoResultado
  };
}

function validarCPF(cpf) {
  if (!cpf) return false;
  var num = String(cpf).replace(/\D/g, "");
  if (num.length !== 11 || /^(\d)\1{10}$/.test(num)) return false;

  var soma = 0;
  for (var i = 0; i < 9; i++) {
    soma += parseInt(num.charAt(i), 10) * (10 - i);
  }
  var resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(num.charAt(9), 10)) return false;

  soma = 0;
  for (var j = 0; j < 10; j++) {
    soma += parseInt(num.charAt(j), 10) * (11 - j);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(num.charAt(10), 10);
}

var DDDS_VALIDOS = [
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
];

// v2: celular com DDD real do Brasil + 9 dígitos começando por 9 (11 dígitos no total)
function validarWhatsApp(tel) {
  if (!tel) return false;
  var num = String(tel).replace(/\D/g, "");
  if (num.length !== 11) return false;
  if (DDDS_VALIDOS.indexOf(parseInt(num.substring(0, 2), 10)) === -1) return false;
  return num.charAt(2) === "9";
}

function mascararCPF(valor) {
  var v = String(valor || "").replace(/\D/g, "").substring(0, 11);
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return v;
}

function mascararWhatsApp(valor) {
  var v = String(valor || "").replace(/\D/g, "").substring(0, 11);
  if (v.length > 10) {
    // 11 dígitos: (00) 00000-0000
    v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 6) {
    // 10 dígitos: (00) 0000-0000
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d+)/, "($1) $2");
  }
  return v;
}

// Monta o corpo enviado ao Apps Script (contrato v2, seção 2.2 do plano)
function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function montarPayload(dados) {
  var d = dados || {};
  return {
    cpf: somenteDigitos(d.cpf),
    whatsapp: somenteDigitos(d.whatsapp),
    curso_id: String(d.curso_id || "").trim(),
    aviso_versao: "v2.0",
    declaracao_idade: true,
    aceite: true,
    origem: "celular",
    website: ""
  };
}

function montarUrlEnvio() {
  return APPS_SCRIPT_URL + "?action=lead";
}

// ----------------------------------------------------------------------------
// Inicialização da Interface
// ----------------------------------------------------------------------------

var cursoAtivo = null;
var camposComErro = {};

function initMobileApp() {
  if (typeof document === "undefined") return;

  var dadosUrl = obterParametrosUrl();

  // 1. Montagem dos cursos na grade de fallback
  montarGradeCursos();

  // 2. Verificação do Curso (se ausente, mostra a grade de escolha)
  if (dadosUrl.cursoObjeto) {
    selecionarCurso(dadosUrl.cursoObjeto);
  } else {
    exibirGradeCursos();
  }

  // 3. Configuração de eventos e validações inline
  configurarEventosFormulario();
}

function exibirGradeCursos() {
  var gradeCursos = document.getElementById("grade-cursos");
  var cursoBox = document.getElementById("curso-box");
  if (gradeCursos) gradeCursos.hidden = false;
  if (cursoBox) cursoBox.hidden = true;
}

function selecionarCurso(curso) {
  cursoAtivo = curso;
  var campoCursoEl = document.getElementById("campo-curso");
  if (campoCursoEl) campoCursoEl.value = curso.id;

  var cursoBox = document.getElementById("curso-box");
  var cursoTitulo = document.getElementById("curso-titulo");
  var cursoMeta = document.getElementById("curso-meta");
  var gradeCursos = document.getElementById("grade-cursos");

  if (cursoTitulo) cursoTitulo.textContent = curso.titulo;
  if (cursoMeta) cursoMeta.textContent = curso.carga_horaria + " · " + curso.modalidade;

  if (cursoBox) cursoBox.hidden = false;
  if (gradeCursos) gradeCursos.hidden = true;

  // Atualiza rádios da grade
  var radios = document.getElementsByName("radio_curso");
  for (var i = 0; i < radios.length; i++) {
    var radioCard = radios[i].parentElement;
    if (radios[i].value === curso.id) {
      radios[i].checked = true;
      if (radioCard) radioCard.className = "radio-cartao radio-cartao--selecionado";
    } else {
      radios[i].checked = false;
      if (radioCard) radioCard.className = "radio-cartao";
    }
  }
}

function montarGradeCursos() {
  var container = document.getElementById("grade-opcoes");
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  var cursos = obterListaCursos();
  for (var i = 0; i < cursos.length; i++) {
    (function (c) {
      var label = document.createElement("label");
      label.className = "radio-cartao";

      var input = document.createElement("input");
      input.type = "radio";
      input.name = "radio_curso";
      input.value = c.id;
      input.className = "radio-input";

      input.addEventListener("change", function () {
        if (input.checked) {
          selecionarCurso(c);
        }
      });

      var conteudo = document.createElement("div");
      conteudo.className = "radio-conteudo";

      var titulo = document.createElement("span");
      titulo.className = "radio-titulo";
      titulo.textContent = c.titulo;

      var meta = document.createElement("span");
      meta.className = "radio-meta";
      meta.textContent = c.carga_horaria + " · " + c.modalidade;

      conteudo.appendChild(titulo);
      conteudo.appendChild(meta);

      label.appendChild(input);
      label.appendChild(conteudo);
      container.appendChild(label);
    })(cursos[i]);
  }
}

// ----------------------------------------------------------------------------
// Validação Inline e Feedback Acessível
// ----------------------------------------------------------------------------

function configurarCampo(id, validadorFn, mensagemErro) {
  var input = document.getElementById(id);
  var erroEl = document.getElementById("erro-" + id);
  var okIcon = document.getElementById("ok-" + id);
  if (!input || !erroEl) return;

  function validar(revalidando) {
    var valido = validadorFn(input.value);

    if (valido) {
      input.className = "campo-input campo-input--valido";
      input.removeAttribute("aria-invalid");
      erroEl.textContent = "";
      if (okIcon) okIcon.hidden = false;
      delete camposComErro[id];
      return true;
    } else {
      input.className = "campo-input campo-input--invalido";
      input.setAttribute("aria-invalid", "true");
      erroEl.textContent = mensagemErro;
      if (okIcon) okIcon.hidden = true;
      camposComErro[id] = true;
      return false;
    }
  }

  input.addEventListener("blur", function () {
    validar(false);
  });

  input.addEventListener("input", function () {
    if (camposComErro[id]) {
      validar(true);
    }
  });

  return validar;
}

var validarCpfFn = null;
var validarWhatsFn = null;

function configurarEventosFormulario() {
  var btnTrocar = document.getElementById("btn-trocar-curso");
  if (btnTrocar) {
    btnTrocar.addEventListener("click", function () {
      exibirGradeCursos();
    });
  }

  // Máscaras em tempo real
  var inputCpf = document.getElementById("cpf");
  if (inputCpf) {
    inputCpf.addEventListener("input", function () {
      inputCpf.value = mascararCPF(inputCpf.value);
    });
  }

  var inputWhats = document.getElementById("whatsapp");
  if (inputWhats) {
    inputWhats.addEventListener("input", function () {
      inputWhats.value = mascararWhatsApp(inputWhats.value);
    });
  }

  validarCpfFn = configurarCampo("cpf", validarCPF, "CPF inválido. Confira os 11 números.");
  validarWhatsFn = configurarCampo("whatsapp", validarWhatsApp, "Digite o DDD e o número, por exemplo (11) 91234-5678.");

  // Checkboxes
  var chkIdade = document.getElementById("declaracao-idade");
  var erroIdade = document.getElementById("erro-idade");
  if (chkIdade && erroIdade) {
    chkIdade.addEventListener("change", function () {
      if (chkIdade.checked) {
        erroIdade.textContent = "";
      } else {
        erroIdade.textContent = "Para continuar, confirme a declaração de idade.";
      }
    });
  }

  var chkConsent = document.getElementById("consentimento");
  var erroConsent = document.getElementById("erro-consentimento");
  if (chkConsent && erroConsent) {
    chkConsent.addEventListener("change", function () {
      if (chkConsent.checked) {
        erroConsent.textContent = "";
      } else {
        erroConsent.textContent = "Para continuar, aceite o aviso de privacidade.";
      }
    });
  }

  var form = document.getElementById("form-matricula");
  if (form) {
    form.addEventListener("submit", submeterFormulario);
  }
}

// ----------------------------------------------------------------------------
// Submissão Segura
// ----------------------------------------------------------------------------

function submeterFormulario(e) {
  if (e && e.preventDefault) e.preventDefault();

  var isca = document.getElementById("website");
  if (isca && isca.value.trim().length > 0) {
    // Spam bot detectado: encerra silenciosamente
    return;
  }

  var cpfOk = validarCpfFn ? validarCpfFn(false) : false;
  var whatsOk = validarWhatsFn ? validarWhatsFn(false) : false;

  var chkIdade = document.getElementById("declaracao-idade");
  var erroIdade = document.getElementById("erro-idade");
  var idadeOk = chkIdade && chkIdade.checked;
  if (!idadeOk && erroIdade) {
    erroIdade.textContent = "Para continuar, confirme a declaração de idade.";
  }

  var chkConsent = document.getElementById("consentimento");
  var erroConsent = document.getElementById("erro-consentimento");
  var consentOk = chkConsent && chkConsent.checked;
  if (!consentOk && erroConsent) {
    erroConsent.textContent = "Para continuar, aceite o aviso de privacidade.";
  }

  var campoCurso = document.getElementById("campo-curso");
  var cursoEscolhidoId = campoCurso ? campoCurso.value : "";
  if (!cursoEscolhidoId) {
    exibirGradeCursos();
    return;
  }

  // Se houver erro, foca o primeiro campo inválido
  if (!cpfOk || !whatsOk || !idadeOk || !consentOk) {
    if (!cpfOk) { document.getElementById("cpf").focus(); return; }
    if (!whatsOk) { document.getElementById("whatsapp").focus(); return; }
    if (!idadeOk) { chkIdade.focus(); return; }
    if (!consentOk) { chkConsent.focus(); return; }
    return;
  }

  var btnEnviar = document.getElementById("btn-enviar");
  var statusEnvio = document.getElementById("status-envio");
  if (statusEnvio) statusEnvio.hidden = true;

  // Bloqueio do botão para evitar envios duplicados
  if (btnEnviar) {
    btnEnviar.disabled = true;
    btnEnviar.textContent = "Enviando…";
  }

  var cpfVal = document.getElementById("cpf").value.trim();
  var whatsVal = document.getElementById("whatsapp").value.trim();

  // Verificação de segurança: não enviar com marcador SEU_ID
  if (APPS_SCRIPT_URL.indexOf("SEU_ID") !== -1) {
    if (statusEnvio) {
      statusEnvio.textContent = "Erro de configuração: o endereço do servidor ainda não foi configurado.";
      statusEnvio.hidden = false;
    }
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = "Tentar de novo";
    }
    return;
  }

  var payload = montarPayload({
    cpf: cpfVal,
    whatsapp: whatsVal,
    curso_id: cursoEscolhidoId
  });

  var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  var signal = controller ? controller.signal : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

  fetch(montarUrlEnvio(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    signal: signal
  })
    .then(function (response) {
      if (timeoutId) clearTimeout(timeoutId);
      return response.json();
    })
    .then(function (data) {
      tratarRespostaEnvio(data, cursoAtivo);
    })
    .catch(function () {
      if (timeoutId) clearTimeout(timeoutId);
      tratarRespostaEnvio(null, cursoAtivo);
    });
}

var MSG_TENTE_DEPOIS = "Tente novamente em instantes.";
var MSG_DUPLICADO = "Você já se inscreveu neste curso.";
var MSG_INVALIDO = "Confira o CPF e o WhatsApp e tente de novo.";

function mostrarErroEnvio(mensagem, textoBotao) {
  var btnEnviar = document.getElementById("btn-enviar");
  var statusEnvio = document.getElementById("status-envio");
  if (statusEnvio) {
    statusEnvio.textContent = mensagem;
    statusEnvio.hidden = false;
  }
  if (btnEnviar) {
    btnEnviar.disabled = false;
    btnEnviar.textContent = textoBotao;
  }
}

function marcarCampoInvalido(id, mensagem) {
  var input = document.getElementById(id);
  var erroEl = document.getElementById("erro-" + id);
  if (input) {
    input.className = "campo-input campo-input--invalido";
    input.setAttribute("aria-invalid", "true");
  }
  if (erroEl) erroEl.textContent = mensagem;
  camposComErro[id] = true;
}

// Só o estado "ok" agradece. Qualquer outra resposta (ou nenhuma) nunca mostra sucesso.
function tratarRespostaEnvio(data, curso) {
  var estado = data && typeof data.estado === "string" ? data.estado : "";

  if (estado === "ok") {
    mostrarSucesso(curso);
  } else if (estado === "duplicado") {
    mostrarErroEnvio(MSG_DUPLICADO, "Confirmar pré-matrícula");
  } else if (estado === "invalido") {
    marcarCampoInvalido("cpf", "CPF inválido. Confira os 11 números.");
    marcarCampoInvalido("whatsapp", "Digite o DDD e o número, por exemplo (11) 91234-5678.");
    mostrarErroEnvio(MSG_INVALIDO, "Confirmar pré-matrícula");
  } else {
    mostrarErroEnvio(MSG_TENTE_DEPOIS, "Tentar de novo");
  }
}

function mostrarSucesso(curso) {
  var formMatricula = document.getElementById("form-matricula");
  var cursoBox = document.getElementById("curso-box");
  var gradeCursos = document.getElementById("grade-cursos");
  var telaSucesso = document.getElementById("tela-sucesso");

  if (formMatricula) formMatricula.hidden = true;
  if (cursoBox) cursoBox.hidden = true;
  if (gradeCursos) gradeCursos.hidden = true;

  if (telaSucesso) {
    telaSucesso.hidden = false;

    var tituloCurso = (curso && curso.titulo) ? curso.titulo : "seu curso";

    var tituloSucesso = document.getElementById("sucesso-titulo");
    var msgSucesso = document.getElementById("sucesso-msg");

    if (tituloSucesso) {
      tituloSucesso.textContent = "Pré-matrícula enviada!";
      tituloSucesso.focus();
    }
    if (msgSucesso) {
      msgSucesso.textContent = "Recebemos seu interesse em " + tituloCurso + ". O SENAI vai entrar em contato pelo WhatsApp.";
    }
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initMobileApp);
}

// ----------------------------------------------------------------------------
// Exportações Puras para Testes Unitários Node.js (node --test)
// ----------------------------------------------------------------------------
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    validarCPF: validarCPF,
    validarWhatsApp: validarWhatsApp,
    montarPayload: montarPayload,
    montarUrlEnvio: montarUrlEnvio,
    mascararCPF: mascararCPF,
    mascararWhatsApp: mascararWhatsApp,
    obterParametrosUrl: obterParametrosUrl,
    tratarRespostaEnvio: tratarRespostaEnvio,
    APPS_SCRIPT_URL: APPS_SCRIPT_URL,
    CURSOS_MAP: CURSOS_MAP
  };
}