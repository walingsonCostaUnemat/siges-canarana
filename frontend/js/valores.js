/**
 * valores.js — Tabela de valores por hora (estadual/municipal)
 */
const Valores = (() => {
  function render() {
    const lista = DB.getValores();
    document.getElementById('section-valores').innerHTML = `
      <div class="page-header">
        <h2>Tabela de Valores por Hora</h2>
        <button class="btn btn-primary" onclick="Valores.abrirFormulario()">+ Novo Posto/Grad</button>
      </div>
      <div class="card">
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">
          Valores de remuneração por hora trabalhada conforme tabela vigente.
          O valor total de cada jornada é calculado automaticamente: <strong>Horas × Valor/Hora</strong>.
        </p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Posto/Graduação</th><th>Valor/Hora Estadual (R$)</th><th>Valor/Hora Municipal (R$)</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${lista.sort((a,b)=>DB.GRADUACOES.indexOf(a.posto)-DB.GRADUACOES.indexOf(b.posto)).map(v => `
              <tr>
                <td><span class="badge badge-blue">${v.posto}</span></td>
                <td>R$ ${v.estadual.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                <td>R$ ${v.municipal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                <td>
                  <button class="btn btn-sm btn-secondary" onclick="Valores.abrirFormulario('${v.posto}')">✏ Editar</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function abrirFormulario(posto) {
    const v = posto ? DB.getValores().find(x => x.posto === posto) : null;
    App.abrirModal(v ? `Editar Valores — ${posto}` : 'Novo Posto/Graduação', `
      <form id="form-valor">
        <div class="form-group">
          <label>Posto/Graduação *</label>
          ${v ? `<input type="text" value="${v.posto}" disabled style="background:#f3f4f6">
                 <input type="hidden" name="posto" value="${v.posto}">` :
                `<select name="posto" required>
                   <option value="">Selecione...</option>
                   ${DB.GRADUACOES.map(g=>`<option>${g}</option>`).join('')}
                 </select>`}
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Valor/Hora Estadual (R$) *</label>
            <input type="number" name="estadual" step="0.01" min="0" value="${v?.estadual||''}" required placeholder="Ex: 43.35">
          </div>
          <div class="form-group">
            <label>Valor/Hora Municipal (R$) *</label>
            <input type="number" name="municipal" step="0.01" min="0" value="${v?.municipal||''}" required placeholder="Ex: 50.00">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="App.fecharModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('form-valor').onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      DB.salvarValor(fd.get('posto'), fd.get('estadual'), fd.get('municipal'));
      App.fecharModal();
      render();
    };
  }

  return { render, abrirFormulario };
})();
