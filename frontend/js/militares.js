/**
 * militares.js — Cadastro de militares do Núcleo
 */
const Militares = (() => {
  function render() {
    const lista = DB.getMilitares();
    document.getElementById('section-militares').innerHTML = `
      <div class="page-header">
        <h2>Militares Cadastrados</h2>
        <button class="btn btn-primary" onclick="Militares.abrirFormulario()">+ Novo Militar</button>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Posto/Grad</th><th>Nome Completo</th><th>Matrícula</th><th>Status</th><th>Ações</th></tr>
            </thead>
            <tbody>
              ${lista.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">Nenhum militar cadastrado</td></tr>' :
                lista.sort((a,b)=>DB.GRADUACOES.indexOf(a.posto)-DB.GRADUACOES.indexOf(b.posto)).map(m => `
                <tr>
                  <td><span class="badge badge-blue">${m.posto}</span></td>
                  <td>${m.nome}</td>
                  <td>${m.matricula}</td>
                  <td><span class="badge ${m.status==='ATIVO'?'badge-green':'badge-red'}">${m.status}</span></td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="Militares.abrirFormulario('${m.id}')">✏ Editar</button>
                    <button class="btn btn-sm btn-danger" onclick="Militares.excluir('${m.id}')">🗑</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function abrirFormulario(id) {
    const m = id ? DB.getMilitares().find(x => x.id === id) : null;
    App.abrirModal(m ? 'Editar Militar' : 'Novo Militar', `
      <form id="form-militar">
        <div class="form-group">
          <label>Nome Completo *</label>
          <input type="text" name="nome" value="${m?.nome||''}" required placeholder="Nome completo conforme documento">
        </div>
        <div class="form-row cols-2">
          <div class="form-group">
            <label>Posto/Graduação *</label>
            <select name="posto" required>
              ${DB.GRADUACOES.map(g => `<option ${m?.posto===g?'selected':''}>${g}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Matrícula</label>
            <input type="text" name="matricula" value="${m?.matricula||''}" placeholder="Nº de matrícula">
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="ATIVO" ${m?.status==='ATIVO'||!m?'selected':''}>Ativo</option>
            <option value="INATIVO" ${m?.status==='INATIVO'?'selected':''}>Inativo</option>
            <option value="AFASTADO" ${m?.status==='AFASTADO'?'selected':''}>Afastado</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
          <button type="button" class="btn btn-secondary" onclick="App.fecharModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);

    document.getElementById('form-militar').onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      DB.salvarMilitar({ id: id || null, nome: fd.get('nome'), posto: fd.get('posto'), matricula: fd.get('matricula'), status: fd.get('status') });
      App.fecharModal();
      render();
    };
  }

  function excluir(id) {
    const jornadas = DB.getJornadas().filter(j => j.militarId === id);
    if (jornadas.length > 0) {
      alert(`Este militar possui ${jornadas.length} jornada(s) registrada(s). Exclua as jornadas antes de remover o militar.`);
      return;
    }
    if (!confirm('Excluir este militar?')) return;
    DB.excluirMilitar(id);
    render();
  }

  return { render, abrirFormulario, excluir };
})();
