/**
 * db.js — Camada de dados com sincronização servidor (JSON) + localStorage (cache)
 * Fluxo: init() carrega do servidor → operações leem/gravam localStorage → save() envia ao servidor
 */
const DB = (() => {
  const KEYS = { militares: 'siges_militares', valores: 'siges_valores', jornadas: 'siges_jornadas', recursos: 'siges_recursos' };

  // URL base da API
  const API_BASE = (window.SIGES_CONFIG && window.SIGES_CONFIG.apiBase) || '/api';

  const GRADUACOES = ['OF', 'CAP BM', 'TEN BM', 'ST BM', 'SGT BM', 'CB BM', 'SD BM'];

  const VALORES_PADRAO = [
    { posto: 'OF',     estadual: 91.72, municipal: 91.72 },
    { posto: 'CAP BM', estadual: 59.32, municipal: 59.32 },
    { posto: 'TEN BM', estadual: 59.32, municipal: 59.32 },
    { posto: 'ST BM',  estadual: 59.32, municipal: 59.32 },
    { posto: 'SGT BM', estadual: 59.32, municipal: 59.32 },
    { posto: 'CB BM',  estadual: 43.35, municipal: 50.00 },
    { posto: 'SD BM',  estadual: 43.35, municipal: 50.00 },
  ];

  const MILITARES_PADRAO = [];

  function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  }

  // ---- Sincronização com o servidor ----
  // Cada operação CRUD chama diretamente o endpoint específico (PUT/DELETE).
  // Snapshot completo (POST /dados) é usado apenas por import Excel e push-back do init().
  let _importing = false;

  function _emitStatus(s) {
    document.dispatchEvent(new CustomEvent('db-sync-status', { detail: s }));
  }

  function _snapshot() {
    return {
      militares: load(KEYS.militares) || [],
      valores:   load(KEYS.valores)   || [],
      jornadas:  load(KEYS.jornadas)  || [],
      recursos:  load(KEYS.recursos)  || [],
    };
  }

  // Chamada per-record — fire-and-forget, sem debounce.
  function _api(method, path, body) {
    if (_importing) return; // import em andamento — snapshot no final
    _emitStatus('syncing');
    const opts = { method, headers: { 'Content-Type': 'application/json' }, keepalive: true };
    if (body !== undefined) opts.body = JSON.stringify(body);
    fetch(API_BASE + path, opts)
      .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); _emitStatus('ok'); })
      .catch(() => _emitStatus('error'));
  }

  // Snapshot completo — import Excel e push-back do init().
  async function _syncSnapshot(useKeepalive) {
    _emitStatus('syncing');
    try {
      const res = await fetch(API_BASE + '/dados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: _snapshot() }),
        keepalive: !!useKeepalive,
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _emitStatus('ok');
    } catch (_e) {
      _emitStatus('error');
    }
  }

  function _saveLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // União por id — o servidor ganha em conflito, local adiciona o que faltar.
  function _mergeById(server, local) {
    const m = new Map();
    (server || []).forEach(x => { if (x && x.id) m.set(x.id, x); });
    (local  || []).forEach(x => { if (x && x.id && !m.has(x.id)) m.set(x.id, x); });
    return [...m.values()];
  }

  // União por chave de negócio (posto, matrícula) — evita duplicar defaults.
  function _mergeByKey(server, local, key) {
    const m = new Map();
    (server || []).forEach(x => { if (x && x[key] != null) m.set(x[key], x); });
    (local  || []).forEach(x => { if (x && x[key] != null && !m.has(x[key])) m.set(x[key], x); });
    return [...m.values()];
  }

  // Carrega do servidor e FAZ MERGE com localStorage (nunca destrói dados locais).
  // Se o localStorage tiver jornadas/recursos que o servidor ainda não tem
  // (ex.: salvas offline ou que nunca chegaram ao servidor por causa do bug antigo),
  // elas são empurradas de volta ao servidor.
  async function init() {
    _emitStatus('syncing');
    let servidor = null;
    try {
      const res = await fetch(API_BASE + '/dados');
      if (res.ok) servidor = await res.json();
    } catch (_e) { /* offline */ }

    const local = _snapshot();

    if (servidor) {
      const mJor = _mergeById(servidor.jornadas, local.jornadas);
      const mRec = _mergeById(servidor.recursos, local.recursos);
      const mMil = _mergeByKey(servidor.militares, local.militares, 'matricula');
      const mVal = _mergeByKey(servidor.valores,   local.valores,   'posto');

      localStorage.setItem(KEYS.militares, JSON.stringify(mMil.length ? mMil : MILITARES_PADRAO));
      localStorage.setItem(KEYS.valores,   JSON.stringify(mVal.length ? mVal : VALORES_PADRAO));
      localStorage.setItem(KEYS.jornadas,  JSON.stringify(mJor));
      localStorage.setItem(KEYS.recursos,  JSON.stringify(mRec));

      const localMaior =
        mJor.length > (servidor.jornadas?.length || 0) ||
        mRec.length > (servidor.recursos?.length || 0) ||
        mMil.length > (servidor.militares?.length || 0) ||
        mVal.length > (servidor.valores?.length   || 0);
      if (localMaior) _syncSnapshot(false);
      else _emitStatus('ok');
    } else {
      if (!load(KEYS.militares)) localStorage.setItem(KEYS.militares, JSON.stringify(MILITARES_PADRAO));
      if (!load(KEYS.valores))   localStorage.setItem(KEYS.valores,   JSON.stringify(VALORES_PADRAO));
      if (!load(KEYS.jornadas))  localStorage.setItem(KEYS.jornadas,  '[]');
      if (!load(KEYS.recursos))  localStorage.setItem(KEYS.recursos,  '[]');
      _emitStatus('error');
    }

    _installStatusBadge();
  }

  function _installStatusBadge() {
    if (document.getElementById('db-sync-badge')) return;
    const b = document.createElement('div');
    b.id = 'db-sync-badge';
    b.style.cssText = 'position:fixed;bottom:14px;right:14px;padding:6px 12px;border-radius:999px;font:12px system-ui,sans-serif;color:#fff;background:#6b7280;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:background .2s;pointer-events:none;user-select:none';
    b.textContent = '● Pronto';
    document.body.appendChild(b);
    const map = {
      syncing: { bg: '#f59e0b', txt: '⟳ Salvando…' },
      ok:      { bg: '#10b981', txt: '✓ Salvo no servidor' },
      error:   { bg: '#ef4444', txt: '✗ Falha ao salvar — verifique a conexão' },
    };
    document.addEventListener('db-sync-status', ev => {
      const c = map[ev.detail];
      if (!c) return;
      b.style.background = c.bg;
      b.textContent = c.txt;
      if (ev.detail === 'ok') {
        setTimeout(() => {
          if (b.textContent === c.txt) { b.style.background = '#6b7280'; b.textContent = '● Pronto'; }
        }, 2500);
      }
    });
  }

  // ---- MILITARES ----
  function getMilitares(apenasAtivos = false) {
    const lista = load(KEYS.militares) || [];
    return apenasAtivos ? lista.filter(m => m.status === 'ATIVO') : lista;
  }

  function salvarMilitar(dados) {
    const lista = getMilitares();
    if (!dados.id) dados = { ...dados, id: uid() };
    const idx = lista.findIndex(m => m.id === dados.id);
    if (idx >= 0) lista[idx] = dados; else lista.push(dados);
    _saveLocal(KEYS.militares, lista);
    _api('PUT', '/militares/' + encodeURIComponent(dados.id), dados);
  }

  function excluirMilitar(id) {
    _saveLocal(KEYS.militares, getMilitares().filter(m => m.id !== id));
    _api('DELETE', '/militares/' + encodeURIComponent(id));
  }

  // ---- VALORES ----
  function getValores() {
    return load(KEYS.valores) || VALORES_PADRAO;
  }

  function salvarValor(posto, estadual, municipal) {
    const lista = getValores();
    const val = { posto, estadual: +estadual, municipal: +municipal };
    const idx = lista.findIndex(v => v.posto === posto);
    if (idx >= 0) lista[idx] = val; else lista.push(val);
    _saveLocal(KEYS.valores, lista);
    _api('PUT', '/valores/' + encodeURIComponent(posto), val);
  }

  function getValorHora(posto, tipo) {
    const v = getValores().find(v => v.posto === posto);
    if (!v) return 0;
    return tipo === 'Municipal' ? v.municipal : v.estadual;
  }

  // ---- JORNADAS ----
  function getJornadas() {
    return load(KEYS.jornadas) || [];
  }

  function calcularJornada(horaInicio, horaFim, posto, tipo) {
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFim.split(':').map(Number);
    let minutos = (hf * 60 + mf) - (hi * 60 + mi);
    if (minutos <= 0) minutos += 24 * 60;
    const horas = Math.round((minutos / 60) * 100) / 100;
    const valorHora = getValorHora(posto, tipo);
    const valor = Math.round(horas * valorHora * 100) / 100;
    return { horas, valor };
  }

  function salvarJornada(dados) {
    const lista = getJornadas();
    const mil = getMilitares().find(m => m.id === dados.militarId);
    const { horas, valor } = calcularJornada(dados.horaInicio, dados.horaFim, mil?.posto || '', dados.tipo);
    dados.horas = horas;
    dados.valor = valor;
    if (!dados.id) dados = { ...dados, id: uid() };
    const idx = lista.findIndex(j => j.id === dados.id);
    if (idx >= 0) lista[idx] = dados; else lista.push(dados);
    _saveLocal(KEYS.jornadas, lista);
    _api('PUT', '/jornadas/' + encodeURIComponent(dados.id), dados);
  }

  function excluirJornada(id) {
    _saveLocal(KEYS.jornadas, getJornadas().filter(j => j.id !== id));
    _api('DELETE', '/jornadas/' + encodeURIComponent(id));
  }

  function getJornadasPorMes(ano, mes) {
    return getJornadas().filter(j => {
      const d = new Date(j.data + 'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    });
  }

  // ---- RECURSOS ORÇAMENTÁRIOS ----
  // Cada aporte: { id, tipo: 'Estadual'|'Municipal', valor, mes: 'YYYY-MM', descricao }
  // O saldo é calculado dinamicamente: sum(aportes filtrados) - sum(jornadas filtradas)

  function getRecursos() {
    return load(KEYS.recursos) || [];
  }

  function salvarRecurso(dados) {
    const lista = getRecursos();
    if (!dados.id) dados = { ...dados, id: uid() };
    const idx = lista.findIndex(r => r.id === dados.id);
    if (idx >= 0) lista[idx] = dados; else lista.push(dados);
    _saveLocal(KEYS.recursos, lista);
    _api('PUT', '/recursos/' + encodeURIComponent(dados.id), dados);
  }

  function excluirRecurso(id) {
    _saveLocal(KEYS.recursos, getRecursos().filter(r => r.id !== id));
    _api('DELETE', '/recursos/' + encodeURIComponent(id));
  }

  /**
   * Resumo orçamentário por tipo, opcionalmente filtrado por mes ('YYYY-MM').
   * Saldo = aportes - gasto (jornadas). Aportes acumulam globalmente (sem filtro de mês)
   * quando mes=null, ou filtrado quando mes fornecido.
   */
  function getResumoOrcamentario(mes = null) {
    const recursos = getRecursos();
    const jornadas = getJornadas();

    const resumo = {};
    ['Estadual', 'Municipal'].forEach(tipo => {
      // Aportes: filtra por tipo e, se informado, pelo mês
      const aportesFiltrados = recursos.filter(r =>
        r.tipo === tipo && (!mes || r.mes === mes)
      );
      const destinado = aportesFiltrados.reduce((s, r) => s + (+r.valor || 0), 0);

      // Gasto: jornadas do tipo, filtradas pelo mês se informado
      const jornadasFiltradas = jornadas.filter(j => {
        if (j.tipo !== tipo) return false;
        if (mes) {
          const d = new Date(j.data + 'T00:00:00');
          const jMes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
          return jMes === mes;
        }
        return true;
      });
      const gasto = jornadasFiltradas.reduce((s, j) => s + (+j.valor || 0), 0);

      resumo[tipo] = {
        destinado: Math.round(destinado * 100) / 100,
        gasto: Math.round(gasto * 100) / 100,
        saldo: Math.round((destinado - gasto) * 100) / 100,
        pct: destinado > 0 ? Math.min(100, Math.round((gasto / destinado) * 100)) : 0,
      };
    });
    return resumo;
  }

  // Histórico mensal de gastos (últimos N meses) para gráficos
  function getHistoricoMensal(nMeses = 6) {
    const meses = [];
    const hoje = new Date();
    for (let i = nMeses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const jornadas = getJornadas();
    return meses.map(mes => {
      const [ano, m] = mes.split('-').map(Number);
      const jorMes = jornadas.filter(j => {
        const d = new Date(j.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth()+1 === m;
      });
      return {
        mes,
        label: new Date(ano, m-1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        estadual: Math.round(jorMes.filter(j=>j.tipo==='Estadual').reduce((s,j)=>s+(j.valor||0),0)*100)/100,
        municipal: Math.round(jorMes.filter(j=>j.tipo==='Municipal').reduce((s,j)=>s+(j.valor||0),0)*100)/100,
      };
    });
  }

  // ---- EXPORT / IMPORT EXCEL ----
  function exportarExcel() {
    const wb = XLSX.utils.book_new();

    const milData = [['Nome Completo', 'Posto/Grad', 'Matrícula', 'Status']];
    getMilitares().forEach(m => milData.push([m.nome, m.posto, m.matricula, m.status]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(milData), 'Militares');

    const valData = [['Posto/Grad', 'Valor/Hora Estadual', 'Valor/Hora Municipal']];
    getValores().forEach(v => valData.push([v.posto, v.estadual, v.municipal]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(valData), 'Tabela_Valores');

    const jorData = [['Data', 'Militar', 'Posto', 'Hora Início', 'Hora Fim', 'Tipo', 'Local', 'Município', 'Nº O.S.', 'Descrição', 'Total Horas', 'Valor Total (R$)']];
    getJornadas().sort((a, b) => a.data.localeCompare(b.data)).forEach(j => {
      const mil = getMilitares().find(m => m.id === j.militarId);
      jorData.push([j.data, mil?.nome||'', mil?.posto||'', j.horaInicio, j.horaFim, j.tipo, j.local||'', j.municipio||'', j.os||'', j.descricao||'', j.horas, j.valor]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(jorData), 'Jornadas');

    const recData = [['Mês', 'Tipo', 'Valor Aportado (R$)', 'Descrição']];
    getRecursos().sort((a,b)=>a.mes.localeCompare(b.mes)).forEach(r => recData.push([r.mes, r.tipo, r.valor, r.descricao||'']));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recData), 'Recursos');

    XLSX.writeFile(wb, `SIGES_Canarana_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function importarExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          _importing = true; // suprime chamadas individuais — snapshot no final
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
          let importados = { militares: 0, jornadas: 0, recursos: 0 };

          const wsMil = wb.Sheets['Militares'] || wb.Sheets['Cadastro_Militares'];
          if (wsMil) {
            const rows = XLSX.utils.sheet_to_json(wsMil, { header: 1 }).slice(1);
            const lista = getMilitares();
            rows.filter(r => r[0]).forEach(r => {
              const nome = String(r[0]||'').trim();
              if (!lista.find(m => m.nome === nome)) {
                lista.push({ id: uid(), nome, posto: String(r[1]||'').trim(), matricula: String(r[2]||'').trim(), status: String(r[4]||r[3]||'ATIVO').trim() });
                importados.militares++;
              }
            });
            _saveLocal(KEYS.militares, lista);
          }

          const wsVal = wb.Sheets['Tabela_Valores'];
          if (wsVal) {
            XLSX.utils.sheet_to_json(wsVal, { header: 1 }).slice(1).filter(r=>r[0]).forEach(r => {
              salvarValor(String(r[0]).trim(), r[1]||0, r[2]||0);
            });
          }

          const wsJor = wb.Sheets['Jornadas'] || wb.Sheets['Respostas ao formulário 1'];
          if (wsJor) {
            const lista = getJornadas();
            XLSX.utils.sheet_to_json(wsJor, { header: 1 }).slice(1).filter(r=>r[0]||r[1]).forEach(r => {
              const dataRaw = r[0];
              let data = '';
              if (dataRaw instanceof Date) data = dataRaw.toISOString().slice(0,10);
              else if (typeof dataRaw === 'string') data = dataRaw.slice(0,10);
              const mil = getMilitares().find(m => m.nome === String(r[1]||'').trim());
              if (!data || !mil) return;
              lista.push({ id: uid(), militarId: mil.id, data, horaInicio: String(r[3]||'07:00'), horaFim: String(r[4]||'13:00'), tipo: String(r[5]||'Estadual'), local: String(r[6]||''), municipio: String(r[7]||''), os: String(r[8]||''), descricao: String(r[9]||''), horas: +r[10]||0, valor: +r[11]||0 });
              importados.jornadas++;
            });
            _saveLocal(KEYS.jornadas, lista);
          }

          const wsRec = wb.Sheets['Recursos'];
          if (wsRec) {
            XLSX.utils.sheet_to_json(wsRec, { header: 1 }).slice(1).filter(r=>r[0]).forEach(r => {
              salvarRecurso({ mes: String(r[0]).trim(), tipo: String(r[1]).trim(), valor: +r[2]||0, descricao: String(r[3]||'') });
              importados.recursos++;
            });
          }

          _importing = false;
          await _syncSnapshot(false); // envia tudo de uma vez
          resolve(importados);
        } catch (err) { _importing = false; reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  return { init, uid, GRADUACOES, getMilitares, salvarMilitar, excluirMilitar, getValores, salvarValor, getValorHora, getJornadas, salvarJornada, excluirJornada, getJornadasPorMes, calcularJornada, getRecursos, salvarRecurso, excluirRecurso, getResumoOrcamentario, getHistoricoMensal, exportarExcel, importarExcel };
})();
