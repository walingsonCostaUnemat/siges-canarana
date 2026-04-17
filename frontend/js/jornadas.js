/**
 * jornadas.js — Cadastro e listagem de jornadas extraordinárias
 */
const Jornadas = (() => {
  let filtroAno = new Date().getFullYear();
  let filtroMes = new Date().getMonth() + 1;
  let filtroMilitar = '';
  let filtroTipo = '';

  // Estado do formulário multi-militar
  let _militaresSelecionados = []; // [{militarId, horas, valor}]

  function render() {
    const jornadas = _filtradas();
    const militares = DB.getMilitares(true);
    const totalHoras = jornadas.reduce((s, j) => s + (j.horas || 0), 0);
    const totalValor = jornadas.reduce((s, j) => s + (j.valor || 0), 0);

    document.getElementById('section-jornadas').innerHTML = `
      <div class="page-header">
        <h2>Jornadas Extraordinárias</h2>
        <button class="btn btn-primary" onclick="Jornadas.abrirFormulario()">+ Nova Jornada</button>
      </div>
      <div class="filtros">
        <select onchange="Jornadas.setFiltro('ano', this.value)">
          ${[2024,2025,2026,2027].map(a => `<option ${a===filtroAno?'selected':''}>${a}</option>`).join('')}
        </select>
        <select onchange="Jornadas.setFiltro('mes', this.value)">
          ${Array.from({length:12},(_,i)=>{
            const n = String(i+1).padStart(2,'0');
            const nome = new Date(2000,i,1).toLocaleDateString('pt-BR',{month:'long'});
            return `<option value="${i+1}" ${i+1===filtroMes?'selected':''}>${n} - ${nome.charAt(0).toUpperCase()+nome.slice(1)}</option>`;
          }).join('')}
        </select>
        <select onchange="Jornadas.setFiltro('militar', this.value)">
          <option value="">Todos os Militares</option>
          ${militares.map(m => `<option value="${m.id}" ${m.id===filtroMilitar?'selected':''}>${m.nome}</option>`).join('')}
        </select>
        <select onchange="Jornadas.setFiltro('tipo', this.value)">
          <option value="">Todos os Tipos</option>
          <option value="Estadual" ${filtroTipo==='Estadual'?'selected':''}>Estadual</option>
          <option value="Municipal" ${filtroTipo==='Municipal'?'selected':''}>Municipal</option>
        </select>
      </div>
      <div class="total-bar">
        <span>${jornadas.length} jornada(s)</span>
        <span>Horas: <strong>${totalHoras.toFixed(1)}h</strong></span>
        <span>Total: <strong>R$ ${totalValor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></span>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Militar</th><th>Posto</th><th>Horário</th><th>Horas</th><th>Tipo</th><th>Local</th><th>Valor</th><th></th></tr>
            </thead>
            <tbody>
              ${jornadas.length === 0
                ? '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:24px">Nenhuma jornada encontrada</td></tr>'
                : jornadas.sort((a,b)=>b.data.localeCompare(a.data)).map(j => {
                    const mil = DB.getMilitares().find(m => m.id === j.militarId);
                    const data = new Date(j.data+'T00:00:00').toLocaleDateString('pt-BR');
                    return `<tr>
                      <td>${data}</td>
                      <td>${mil?.nome||'—'}</td>
                      <td><span class="badge badge-blue">${mil?.posto||'—'}</span></td>
                      <td>${j.horaInicio} → ${j.horaFim}</td>
                      <td>${(j.horas||0).toFixed(1)}h</td>
                      <td><span class="badge ${j.tipo==='Municipal'?'badge-green':'badge-blue'}">${j.tipo}</span></td>
                      <td>${j.local||'—'}</td>
                      <td><strong>R$ ${(j.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
                      <td>
                        <button class="btn btn-sm btn-secondary" onclick="Jornadas.abrirEdicao('${j.id}')">✏</button>
                        <button class="btn btn-sm btn-danger" onclick="Jornadas.excluir('${j.id}')">🗑</button>
                      </td>
                    </tr>`;
                  }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function _filtradas() {
    return DB.getJornadas().filter(j => {
      const d = new Date(j.data+'T00:00:00');
      if (d.getFullYear() !== filtroAno) return false;
      if (d.getMonth()+1 !== filtroMes) return false;
      if (filtroMilitar && j.militarId !== filtroMilitar) return false;
      if (filtroTipo && j.tipo !== filtroTipo) return false;
      return true;
    });
  }

  function setFiltro(campo, valor) {
    if (campo === 'ano') filtroAno = +valor;
    if (campo === 'mes') filtroMes = +valor;
    if (campo === 'militar') filtroMilitar = valor;
    if (campo === 'tipo') filtroTipo = valor;
    render();
  }

  // ---- FORMULÁRIO MULTI-MILITAR ----

  function abrirFormulario() {
    _militaresSelecionados = [];
    const hoje = new Date().toISOString().slice(0,10);

    App.abrirModal('Nova Jornada Extraordinária', _htmlFormulario(hoje, '07:00', '13:00', 'Estadual', '', 'Canarana', '', ''), 'modal-largo');

    _bindEventos();
    _recalcularTodos();
  }

  function _htmlFormulario(data, hi, hf, tipo, local, municipio, os, descricao) {
    const militares = DB.getMilitares(true);
    return `
      <div id="form-jornada-wrap">
        <!-- Campos gerais da jornada -->
        <div style="background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px">
          <div style="font-weight:600;margin-bottom:12px;color:var(--bm-red)">📋 Dados da Jornada</div>
          <div class="form-row cols-3">
            <div class="form-group" style="margin-bottom:8px">
              <label>Data *</label>
              <input id="j-data" type="date" value="${data}" required>
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label>Hora de Início *</label>
              <input id="j-hi" type="time" value="${hi}" required oninput="Jornadas._recalcularTodos()">
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label>Hora de Término *</label>
              <input id="j-hf" type="time" value="${hf}" required oninput="Jornadas._recalcularTodos()">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group" style="margin-bottom:8px">
              <label>Tipo de Verba *</label>
              <select id="j-tipo" onchange="Jornadas._recalcularTodos()">
                <option value="Estadual" ${tipo==='Estadual'?'selected':''}>Estadual</option>
                <option value="Municipal" ${tipo==='Municipal'?'selected':''}>Municipal</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:8px">
              <label>Local</label>
              <input id="j-local" type="text" value="${local}" placeholder="Ex: GB Central, Rodovia MT-020">
            </div>
          </div>
          <div class="form-row cols-2">
            <div class="form-group" style="margin-bottom:0">
              <label>Município</label>
              <input id="j-municipio" type="text" value="${municipio}" placeholder="Canarana">
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>Nº O.S. / Descrição</label>
              <input id="j-os" type="text" value="${os}" placeholder="Nº da O.S. ou tipo de serviço">
            </div>
          </div>
        </div>

        <!-- Alerta de saldo -->
        <div id="alerta-saldo"></div>

        <!-- Seleção de militares -->
        <div style="font-weight:600;margin-bottom:10px;color:var(--bm-red)">👥 Militares Participantes</div>

        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <select id="sel-militar" style="flex:1;min-width:200px;padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px">
            <option value="">Selecione o militar para adicionar...</option>
            ${militares.map(m => `<option value="${m.id}">${m.posto} — ${m.nome}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-primary" onclick="Jornadas._adicionarMilitar()">+ Adicionar</button>
          <button type="button" class="btn btn-secondary" onclick="Jornadas._adicionarTodos()">+ Todos</button>
        </div>

        <!-- Lista dinâmica de militares adicionados -->
        <div id="lista-militares-jornada">
          <div style="text-align:center;padding:20px;color:var(--text-muted);border:2px dashed var(--border);border-radius:var(--radius)">
            Nenhum militar adicionado. Use o seletor acima.
          </div>
        </div>

        <!-- Totais -->
        <div id="resumo-jornada" style="display:none;background:var(--bm-dark);color:white;border-radius:var(--radius);padding:12px 16px;margin-top:12px;display:flex;gap:24px;font-size:14px">
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button type="button" class="btn btn-secondary" onclick="App.fecharModal()">Cancelar</button>
          <button type="button" class="btn btn-primary" onclick="Jornadas._salvarMultiplos()">💾 Salvar Jornadas</button>
        </div>
      </div>`;
  }

  function _bindEventos() {
    // Enter no seletor adiciona o militar
    document.getElementById('sel-militar')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); _adicionarMilitar(); }
    });
  }

  function _adicionarMilitar() {
    const sel = document.getElementById('sel-militar');
    const id = sel.value;
    if (!id) return;
    if (_militaresSelecionados.find(m => m.militarId === id)) {
      sel.value = '';
      return;
    }
    _militaresSelecionados.push({ militarId: id });
    sel.value = '';
    _recalcularTodos();
  }

  function _adicionarTodos() {
    DB.getMilitares(true).forEach(m => {
      if (!_militaresSelecionados.find(s => s.militarId === m.id)) {
        _militaresSelecionados.push({ militarId: m.id });
      }
    });
    _recalcularTodos();
  }

  function _removerMilitar(id) {
    _militaresSelecionados = _militaresSelecionados.filter(m => m.militarId !== id);
    _recalcularTodos();
  }

  function _recalcularTodos() {
    const hi   = document.getElementById('j-hi')?.value || '07:00';
    const hf   = document.getElementById('j-hf')?.value || '13:00';
    const tipo = document.getElementById('j-tipo')?.value || 'Estadual';

    // Calcula horas
    const [hhi, mhi] = hi.split(':').map(Number);
    const [hhf, mhf] = hf.split(':').map(Number);
    let minutos = (hhf*60+mhf) - (hhi*60+mhi);
    if (minutos <= 0) minutos += 1440;
    const horas = Math.round((minutos/60)*100)/100;

    // Recalcula cada militar
    _militaresSelecionados.forEach(s => {
      const mil = DB.getMilitares().find(m => m.id === s.militarId);
      const valorHora = DB.getValorHora(mil?.posto||'', tipo);
      s.horas = horas;
      s.valor = Math.round(horas * valorHora * 100) / 100;
      s.posto = mil?.posto || '';
      s.nome  = mil?.nome  || '';
    });

    _renderLista(horas, tipo);
    _verificarSaldo(tipo);
  }

  function _verificarSaldo(tipo) {
    const el = document.getElementById('alerta-saldo');
    if (!el) return;

    const resumo = DB.getResumoOrcamentario();
    const r = resumo[tipo];
    const totalJornada = _militaresSelecionados.reduce((s, m) => s + (m.valor||0), 0);

    el.innerHTML = '';
    if (r.destinado === 0) {
      el.innerHTML = `<div class="alerta-jornada alerta-warn">
        ⚠ Nenhum aporte de verba <strong>${tipo}</strong> cadastrado. Cadastre recursos antes de salvar jornadas.
        <a href="#" onclick="App.fecharModal();App.navegar('recursos');return false">Ir para Recursos</a>
      </div>`;
    } else if (totalJornada > r.saldo) {
      const falta = totalJornada - r.saldo;
      el.innerHTML = `<div class="alerta-jornada alerta-danger">
        🚨 Saldo <strong>${tipo}</strong> insuficiente! Saldo atual: <strong>R$ ${r.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
        · Esta jornada custa <strong>R$ ${totalJornada.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
        · Deficit: <strong>R$ ${falta.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
      </div>`;
    } else if (r.pct >= 80 || (r.saldo - totalJornada) < r.destinado * 0.15) {
      el.innerHTML = `<div class="alerta-jornada alerta-warn">
        ⚠ Saldo <strong>${tipo}</strong> baixo: <strong>R$ ${r.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong> disponíveis.
        Após esta jornada restarão <strong>R$ ${(r.saldo - totalJornada).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>.
      </div>`;
    }
  }

  function _renderLista(horas, tipo) {
    const container = document.getElementById('lista-militares-jornada');
    const resumo    = document.getElementById('resumo-jornada');
    if (!container) return;

    if (_militaresSelecionados.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);border:2px dashed var(--border);border-radius:var(--radius)">
        Nenhum militar adicionado. Use o seletor acima.</div>`;
      if (resumo) resumo.style.display = 'none';
      return;
    }

    const totalValor = _militaresSelecionados.reduce((s,m)=>s+(m.valor||0),0);

    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:var(--bm-dark);color:white">
            <th style="padding:8px 10px;text-align:left">Posto</th>
            <th style="padding:8px 10px;text-align:left">Militar</th>
            <th style="padding:8px 10px;text-align:center">Horas</th>
            <th style="padding:8px 10px;text-align:right">Valor/Hora</th>
            <th style="padding:8px 10px;text-align:right">Total</th>
            <th style="padding:8px 10px"></th>
          </tr>
        </thead>
        <tbody>
          ${_militaresSelecionados.map(s => {
            const valorHora = DB.getValorHora(s.posto, tipo);
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:8px 10px"><span class="badge badge-blue">${s.posto}</span></td>
              <td style="padding:8px 10px">${s.nome}</td>
              <td style="padding:8px 10px;text-align:center"><strong>${(s.horas||0).toFixed(1)}h</strong></td>
              <td style="padding:8px 10px;text-align:right">R$ ${valorHora.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              <td style="padding:8px 10px;text-align:right"><strong style="color:var(--success)">R$ ${(s.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
              <td style="padding:8px 10px;text-align:center">
                <button class="btn btn-sm btn-danger" onclick="Jornadas._removerMilitar('${s.militarId}')">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    if (resumo) {
      resumo.style.display = 'flex';
      resumo.innerHTML = `
        <span>${_militaresSelecionados.length} militar(es)</span>
        <span>•</span>
        <span>${horas.toFixed(1)}h por militar</span>
        <span>•</span>
        <span>Total a pagar: <strong style="color:#fcd34d">R$ ${totalValor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></span>`;
    }
  }

  function _salvarMultiplos() {
    if (_militaresSelecionados.length === 0) {
      alert('Adicione pelo menos um militar.');
      return;
    }
    const data      = document.getElementById('j-data')?.value;
    const horaInicio = document.getElementById('j-hi')?.value;
    const horaFim   = document.getElementById('j-hf')?.value;
    const tipo      = document.getElementById('j-tipo')?.value;
    const local     = document.getElementById('j-local')?.value || '';
    const municipio = document.getElementById('j-municipio')?.value || '';
    const os        = document.getElementById('j-os')?.value || '';

    if (!data || !horaInicio || !horaFim) {
      alert('Preencha data, hora de início e hora de término.');
      return;
    }

    _militaresSelecionados.forEach(s => {
      DB.salvarJornada({ id: null, militarId: s.militarId, data, horaInicio, horaFim, tipo, local, municipio, os, descricao: os });
    });

    App.fecharModal();
    render();
    Dashboard.render();
    Calendario.render();
  }

  // ---- EDIÇÃO DE JORNADA INDIVIDUAL ----

  function abrirEdicao(id) {
    const j = DB.getJornadas().find(x => x.id === id);
    if (!j) return;
    const militares = DB.getMilitares(true);

    App.abrirModal('Editar Jornada', `
      <form id="form-editar-jornada">
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Militar *</label>
            <select name="militarId" required>
              ${militares.map(m => `<option value="${m.id}" ${j.militarId===m.id?'selected':''}>${m.posto} — ${m.nome}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Data *</label>
            <input type="date" name="data" value="${j.data}" required>
          </div>
        </div>
        <div class="form-row cols-3">
          <div class="form-group">
            <label>Hora de Início *</label>
            <input type="time" name="horaInicio" value="${j.horaInicio}" required>
          </div>
          <div class="form-group">
            <label>Hora de Término *</label>
            <input type="time" name="horaFim" value="${j.horaFim}" required>
          </div>
          <div class="form-group">
            <label>Tipo de Verba *</label>
            <select name="tipo">
              <option value="Estadual" ${j.tipo==='Estadual'?'selected':''}>Estadual</option>
              <option value="Municipal" ${j.tipo==='Municipal'?'selected':''}>Municipal</option>
            </select>
          </div>
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Local</label>
            <input type="text" name="local" value="${j.local||''}">
          </div>
          <div class="form-group">
            <label>Município</label>
            <input type="text" name="municipio" value="${j.municipio||'Canarana'}">
          </div>
        </div>
        <div class="form-group">
          <label>Nº O.S. / Descrição</label>
          <input type="text" name="os" value="${j.os||''}">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="App.fecharModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('form-editar-jornada').onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      DB.salvarJornada({ id, militarId: fd.get('militarId'), data: fd.get('data'), horaInicio: fd.get('horaInicio'), horaFim: fd.get('horaFim'), tipo: fd.get('tipo'), local: fd.get('local'), municipio: fd.get('municipio'), os: fd.get('os'), descricao: fd.get('os') });
      App.fecharModal();
      render();
      Dashboard.render();
    };
  }

  function excluir(id) {
    if (!confirm('Excluir esta jornada?')) return;
    DB.excluirJornada(id);
    render();
    Dashboard.render();
  }

  return { render, abrirFormulario, abrirEdicao, excluir, setFiltro, _adicionarMilitar, _adicionarTodos, _removerMilitar, _recalcularTodos, _salvarMultiplos };
})();
