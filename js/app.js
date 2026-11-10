/**
 * ============================================================================
 * Mobile Web Form Handler — Projeto Neoindústria (SENAI)
 * Funciona nos navegadores de smartphone após escanear o QR Code.
 * Implementa REQ-07, REQ-08, REQ-14, REQ-15 · Issue #2 (Retrabalho T7)
 *
 * Código com manipulação segura do DOM, sem injeção de HTML.
 * ============================================================================
 */

var APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxaAc5355AzT58EvznKW9JdjY0-quUb3b6EvI2Jl4mrOohQEPqR0rgKpo45-fok4TMg/exec";

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

function validarSid(sid) {
  if (!sid || typeof sid !== "string") return false;
  return /^[0-9a-f]{32}$/.test(sid.trim());
}

function obterParametrosUrl(queryString) {
  var search = queryString != null ? queryString : (typeof window !== "undefined" ? window.location.search : "");
  var params = new URLSearchParams(search);

  // Lê estritamente 's' e 'c' (ignora 'sid' e 'curso')
  var sParam = params.get("s");
  var cParam = params.get("c");

  var sidValidoResultado = validarSid(sParam) ? sParam.trim() : null;

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
    s: sidValidoResultado,
    c: cursoValidoResultado ? cursoValidoResultado.id : null,
    cursoObjeto: cursoValidoResultado
  };
}

function validarNome(nome) {
  if (!nome || typeof nome !== "string") return false;
  var limpo = nome.trim();
  if (limpo.length < 3 || limpo.length > 150) return false;
  var partes = limpo.split(/\s+/);
  return partes.length >= 2 && partes[0].length > 0 && partes[1].length > 0;
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

function validarWhatsApp(tel) {
  if (!tel) return false;
  var num = String(tel).replace(/\D/g, "");
  if (num.length !== 10 && num.length !== 11) return false;

  var ddd = parseInt(num.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;

  // Celulares com 11 dígitos no Brasil exigem o dígito 9 na 3ª posição
  if (num.length === 11 && num.charAt(2) !== "9") {
    return false;
  }

  return true;
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

// ----------------------------------------------------------------------------
// Inicialização da Interface
// ----------------------------------------------------------------------------

var cursoAtivo = null;
var camposComErro = {};

function initMobileApp() {
  if (typeof document === "undefined") return;

  var dadosUrl = obterParametrosUrl();

  // 1. Verificação do SID (bloqueia se inválido ou ausente)
  if (!dadosUrl.s) {
    exibirTelaBloqueada();
    return;
  }

  var campoSidEl = document.getElementById("campo-sid");
  if (campoSidEl) campoSidEl.value = dadosUrl.s;

  // 2. Montagem dos cursos na grade de fallback
  montarGradeCursos();

  // 3. Verificação do Curso (se ausente, mostra a grade de escolha)
  if (dadosUrl.cursoObjeto) {
    selecionarCurso(dadosUrl.cursoObjeto);
  } else {
    exibirGradeCursos();
  }

  // 4. Configuração de eventos e validações inline
  configurarEventosFormulario();
}

function exibirTelaBloqueada() {
  var telaBloqueada = document.getElementById("tela-bloqueada");
  var formMatricula = document.getElementById("form-matricula");
  var cursoBox = document.getElementById("curso-box");
  var gradeCursos = document.getElementById("grade-cursos");

  if (telaBloqueada) telaBloqueada.hidden = false;
  if (formMatricula) formMatricula.hidden = true;
  if (cursoBox) cursoBox.hidden = true;
  if (gradeCursos) gradeCursos.hidden = true;
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

var validarNomeFn = null;
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

  validarNomeFn = configurarCampo("nome", validarNome, "Digite seu nome e sobrenome.");
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

  var nomeOk = validarNomeFn ? validarNomeFn(false) : false;
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
  if (!nomeOk || !cpfOk || !whatsOk || !idadeOk || !consentOk) {
    if (!nomeOk) { document.getElementById("nome").focus(); return; }
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

  var nomeVal = document.getElementById("nome").value.trim();
  var cpfVal = document.getElementById("cpf").value.trim();
  var whatsVal = document.getElementById("whatsapp").value.trim();
  var sidVal = document.getElementById("campo-sid").value.trim();

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

  var payload = {
    nome: nomeVal,
    cpf: cpfVal,
    whatsapp: whatsVal,
    curso: cursoEscolhidoId,
    sid: sidVal,
    website: "",
    declaracao_idade: true,
    consentimento: true,
    versao_aviso: "v1.0"
  };

  var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  var signal = controller ? controller.signal : null;
  var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 15000) : null;

  fetch(APPS_SCRIPT_URL, {
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
      tratarRespostaEnvio(data, nomeVal, cursoAtivo);
    })
    .catch(function () {
      if (timeoutId) clearTimeout(timeoutId);
      if (statusEnvio) {
        statusEnvio.textContent = "Não conseguimos enviar. Verifique sua conexão e tente de novo.";
        statusEnvio.hidden = false;
      }
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Tentar de novo";
      }
    });
}

function tratarRespostaEnvio(data, nomeCompleto, curso) {
  var btnEnviar = document.getElementById("btn-enviar");
  var statusEnvio = document.getElementById("status-envio");

  if (data && data.status === "success") {
    mostrarSucesso(nomeCompleto, curso);
  } else if (data && data.status === "manutencao") {
    if (statusEnvio) {
      statusEnvio.textContent = "O cadastro está em manutenção. Tente novamente em alguns minutos.";
      statusEnvio.hidden = false;
    }
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = "Tentar de novo";
    }
  } else if (data && data.status === "error") {
    if (statusEnvio) {
      statusEnvio.textContent = data.message || "Falha na validação dos dados.";
      statusEnvio.hidden = false;
    }
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = "Tentar de novo";
    }
  } else {
    if (statusEnvio) {
      statusEnvio.textContent = "Não conseguimos enviar. Verifique sua conexão e tente de novo.";
      statusEnvio.hidden = false;
    }
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.textContent = "Tentar de novo";
    }
  }
}

function mostrarSucesso(nomeCompleto, curso) {
  var formMatricula = document.getElementById("form-matricula");
  var cursoBox = document.getElementById("curso-box");
  var gradeCursos = document.getElementById("grade-cursos");
  var telaSucesso = document.getElementById("tela-sucesso");

  if (formMatricula) formMatricula.hidden = true;
  if (cursoBox) cursoBox.hidden = true;
  if (gradeCursos) gradeCursos.hidden = true;

  if (telaSucesso) {
    telaSucesso.hidden = false;

    var primeiroNome = String(nomeCompleto || "").trim().split(/\s+/)[0] || "visitante";
    var tituloCurso = (curso && curso.titulo) ? curso.titulo : "seu curso";

    var tituloSucesso = document.getElementById("sucesso-titulo");
    var msgSucesso = document.getElementById("sucesso-msg");

    if (tituloSucesso) {
      tituloSucesso.textContent = "Obrigado, " + primeiroNome + "!";
      tituloSucesso.focus();
    }
    if (msgSucesso) {
      msgSucesso.textContent = "Sua pré-matrícula em " + tituloCurso + " foi enviada. O SENAI vai entrar em contato pelo WhatsApp.";
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
    validarNome: validarNome,
    validarSid: validarSid,
    mascararCPF: mascararCPF,
    mascararWhatsApp: mascararWhatsApp,
    obterParametrosUrl: obterParametrosUrl,
    tratarRespostaEnvio: tratarRespostaEnvio,
    APPS_SCRIPT_URL: APPS_SCRIPT_URL,
    CURSOS_MAP: CURSOS_MAP
  };
}
