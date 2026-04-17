/**
 * recursos.js — Controle de recursos orçamentários (aportes municipais e estaduais)
 */
const Recursos = (() => {
  let filtroTipo = '';

  function render() {
    const lista = DB.getRecursos().sort((a,b) => b.mes.localeCompare(a.mes));
    const resumo = DB.getResumoOrcamentario();

    document.getElementById('section-recursos').innerHTML = `
      <div class="page-header">
        <h2>Recursos Orçamentários</h2>
        <button class="btn btn-primary" onclick="Recursos.abrirFormulario()">+ Novo Aporte</button>
      </div>

      <!-- Cards de saldo -->
      <div class="grid-2" style="margin-bottom:20px">
        ${['Estadual','Municipal'].map(tipo => {
          const r = resumo[tipo];
          const cor = tipo === 'Estadual' ? 'var(--info)' : 'var(--success)';
          const alerta = r.saldo < 0 ? 'var(--danger)' : r.pct >= 90 ? 'var(--warning)' : cor;
          return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
              <div>
                <div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:1px">Verba ${tipo}</div>
                <div style="font-size:28px;font-weight:700;color:${alerta};margin-top:4px">
                  R$ ${r.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}
                </div>
                <div style="font-size:12px;color:var(--text-muted)">Saldo disponível</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:13px;color:var(--text-muted)">Aportado</div>
                <div style="font-weight:600">R$ ${r.destinado.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:6px">Gasto</div>
                <div style="font-weight:600;color:var(--danger)">R$ ${r.gasto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
              </div>
            </div>
            <div style="background:#f3f4f6;border-radius:20px;height:10px;overflow:hidden">
              <div style="height:100%;width:${r.pct}%;background:${alerta};border-radius:20px;transition:width 0.5s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--text-muted)">
              <span>${r.pct}% utilizado</span>
              ${r.saldo < 0 ? '<span style="color:var(--danger);font-weight:600">⚠ Saldo negativo!</span>' : ''}
              ${r.pct >= 90 && r.saldo >= 0 ? '<span style="color:var(--warning);font-weight:600">⚠ Quase esgotado</span>' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Filtro e tabela -->
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="card-title" style="margin-bottom:0">Histórico de Aportes</div>
          <select onchange="Recursos.setFiltro(this.value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px">
            <option value="">Todos os Tipos</option>
            <option value="Estadual" ${filtroTipo==='Estadual'?'selected':''}>Estadual</option>
            <option value="Municipal" ${filtroTipo==='Municipal'?'selected':''}>Municipal</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Mês de Referência</th><th>Tipo</th><th>Valor Aportado</th><th>Gasto no Mês</th><th>Saldo do Mês</th><th>Descrição</th><th></th></tr>
            </thead>
            <tbody>
              ${lista.length === 0
                ? '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Nenhum aporte registrado</td></tr>'
                : _linhasTabela(lista)}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function _linhasTabela(lista) {
    const filtrado = filtroTipo ? lista.filter(r => r.tipo === filtroTipo) : lista;
    return filtrado.map(r => {
      const resumoMes = DB.getResumoOrcamentario(r.mes);
      const rm = resumoMes[r.tipo];
      const [ano, m] = r.mes.split('-').map(Number);
      const nomeMes = new Date(ano, m-1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const corSaldo = rm.saldo < 0 ? 'color:var(--danger)' : 'color:var(--success)';
      return `<tr>
        <td style="text-transform:capitalize">${nomeMes}</td>
        <td><span class="badge ${r.tipo==='Estadual'?'badge-blue':'badge-green'}">${r.tipo}</span></td>
        <td><strong>R$ ${(+r.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
        <td style="color:var(--danger)">R$ ${rm.gasto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="${corSaldo};font-weight:600">R$ ${rm.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="color:var(--text-muted)">${r.descricao||'—'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="Recursos.abrirFormulario('${r.id}')">✏</button>
          <button class="btn btn-sm btn-danger" onclick="Recursos.excluir('${r.id}')">🗑</button>
        </td>
      </tr>`;
    }).join('');
  }

  function abrirFormulario(id) {
    const r = id ? DB.getRecursos().find(x => x.id === id) : null;
    const mesAtual = new Date().toISOString().slice(0,7);

    App.abrirModal(r ? 'Editar Aporte' : 'Novo Aporte de Recursos', `
      <form id="form-recurso">
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Mês de Referência *</label>
            <input type="month" name="mes" value="${r?.mes||mesAtual}" required>
          </div>
          <div class="form-group">
            <label>Tipo de Verba *</label>
            <select name="tipo" required>
              <option value="Estadual" ${r?.tipo==='Estadual'||!r?'selected':''}>Estadual</option>
              <option value="Municipal" ${r?.tipo==='Municipal'?'selected':''}>Municipal</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Valor do Aporte (R$) *</label>
          <input type="number" name="valor" step="0.01" min="0.01" value="${r?.valor||''}" required placeholder="Ex: 5000.00">
          <small style="color:var(--text-muted);font-size:12px">Este valor será somado ao saldo existente do tipo e mês selecionados.</small>
        </div>
        <div class="form-group">
          <label>Descrição / Origem</label>
          <input type="text" name="descricao" value="${r?.descricao||''}" placeholder="Ex: Transferência Prefeitura Municipal, Verba estadual março...">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="App.fecharModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('form-recurso').onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      DB.salvarRecurso({ id: id||null, mes: fd.get('mes'), tipo: fd.get('tipo'), valor: +fd.get('valor'), descricao: fd.get('descricao') });
      App.fecharModal();
      render();
      Dashboard.render();
    };
  }

  function excluir(id) {
    if (!confirm('Excluir este aporte?')) return;
    DB.excluirRecurso(id);
    render();
    Dashboard.render();
  }

  function setFiltro(tipo) {
    filtroTipo = tipo;
    render();
  }

  return { render, abrirFormulario, excluir, setFiltro };
})();
