/**
 * relatorio.js — Relatório mensal para impressão/PDF
 */
const Relatorio = (() => {
  let ano = new Date().getFullYear();
  let mes = new Date().getMonth() + 1;

  function render() {
    document.getElementById('section-relatorio').innerHTML = `
      <div class="page-header">
        <h2>Relatório Mensal</h2>
        <div style="display:flex;gap:8px">
          <select id="rel-mes" onchange="Relatorio.atualizar()">
            ${Array.from({length:12},(_,i)=>{
              const nome = new Date(2000,i,1).toLocaleDateString('pt-BR',{month:'long'});
              return `<option value="${i+1}" ${i+1===mes?'selected':''}>${String(i+1).padStart(2,'0')} - ${nome.charAt(0).toUpperCase()+nome.slice(1)}</option>`;
            }).join('')}
          </select>
          <select id="rel-ano" onchange="Relatorio.atualizar()">
            ${[2024,2025,2026,2027].map(a=>`<option ${a===ano?'selected':''}>${a}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="window.print()">🖨 Imprimir / PDF</button>
        </div>
      </div>
      <div id="relatorio-conteudo"></div>`;
    _renderConteudo();
  }

  function atualizar() {
    mes = +document.getElementById('rel-mes').value;
    ano = +document.getElementById('rel-ano').value;
    _renderConteudo();
  }

  function _renderConteudo() {
    const jornadas = DB.getJornadasPorMes(ano, mes);
    const militares = DB.getMilitares();
    const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Agrupar por militar
    const porMilitar = {};
    jornadas.forEach(j => {
      if (!porMilitar[j.militarId]) porMilitar[j.militarId] = { estadual: 0, municipal: 0, horas: 0, count: 0, jornadas: [] };
      const v = porMilitar[j.militarId];
      v.horas += j.horas || 0;
      v.count++;
      v.jornadas.push(j);
      if (j.tipo === 'Estadual') v.estadual += j.valor || 0;
      else v.municipal += j.valor || 0;
    });

    const linhas = Object.entries(porMilitar)
      .map(([id, v]) => ({ mil: militares.find(m => m.id === id), ...v }))
      .filter(r => r.mil)
      .sort((a, b) => {
        const ord = DB.GRADUACOES;
        return ord.indexOf(a.mil.posto) - ord.indexOf(b.mil.posto);
      });

    const totalEstadual = linhas.reduce((s, r) => s + r.estadual, 0);
    const totalMunicipal = linhas.reduce((s, r) => s + r.municipal, 0);
    const totalGeral = totalEstadual + totalMunicipal;

    document.getElementById('relatorio-conteudo').innerHTML = `
      <div class="card">
        <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid var(--bm-red);padding-bottom:16px">
          <div style="font-size:13px;color:var(--text-muted)">ESTADO DE MATO GROSSO · CORPO DE BOMBEIROS MILITAR</div>
          <div style="font-size:18px;font-weight:700;margin:4px 0">NÚCLEO DE CANARANA</div>
          <div style="font-size:15px;font-weight:600">RELATÓRIO DE JORNADAS EXTRAORDINÁRIAS</div>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px;text-transform:capitalize">${nomeMes}</div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Posto/Grad</th>
                <th>Nome Completo</th>
                <th>Matrícula</th>
                <th>Nº Jornadas</th>
                <th>Total de Horas</th>
                <th>Estadual (R$)</th>
                <th>Municipal (R$)</th>
                <th>Total a Receber (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${linhas.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted)">Nenhuma jornada registrada neste período</td></tr>' :
                linhas.map(r => `
                <tr>
                  <td>${r.mil.posto}</td>
                  <td>${r.mil.nome}</td>
                  <td>${r.mil.matricula}</td>
                  <td style="text-align:center">${r.count}</td>
                  <td style="text-align:center">${r.horas.toFixed(1)}h</td>
                  <td>${r.estadual > 0 ? 'R$ ' + r.estadual.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}</td>
                  <td>${r.municipal > 0 ? 'R$ ' + r.municipal.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—'}</td>
                  <td><strong>R$ ${(r.estadual + r.municipal).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
                </tr>`).join('')}
            </tbody>
            ${linhas.length > 0 ? `
            <tfoot>
              <tr style="background:var(--bm-dark);color:white;font-weight:600">
                <td colspan="3">TOTAL GERAL</td>
                <td style="text-align:center">${jornadas.length}</td>
                <td style="text-align:center">${jornadas.reduce((s,j)=>s+(j.horas||0),0).toFixed(1)}h</td>
                <td>R$ ${totalEstadual.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                <td>R$ ${totalMunicipal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                <td>R$ ${totalGeral.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              </tr>
            </tfoot>` : ''}
          </table>
        </div>

        ${linhas.length > 0 ? `
        <div style="margin-top:32px">
          <div style="font-weight:600;margin-bottom:12px">Detalhamento por Militar</div>
          ${linhas.map(r => _detalhesMilitar(r, militares)).join('')}
        </div>` : ''}

        <div style="margin-top:48px;display:grid;grid-template-columns:1fr 1fr;gap:32px">
          <div style="text-align:center;border-top:1px solid #333;padding-top:8px">
            <div style="font-size:12px">Responsável pelo Núcleo</div>
          </div>
          <div style="text-align:center;border-top:1px solid #333;padding-top:8px">
            <div style="font-size:12px">Conferido por</div>
          </div>
        </div>
      </div>`;
  }

  function _detalhesMilitar(r, militares) {
    const jornadas = r.jornadas.sort((a, b) => a.data.localeCompare(b.data));
    return `
      <div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">
        <div style="background:var(--bm-navy);color:white;padding:8px 12px;font-weight:600">
          ${r.mil.posto} ${r.mil.nome} — Matrícula: ${r.mil.matricula}
        </div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <thead><tr style="background:#f3f4f6">
            <th style="padding:6px 10px;text-align:left">Data</th>
            <th style="padding:6px 10px;text-align:left">Horário</th>
            <th style="padding:6px 10px;text-align:left">Horas</th>
            <th style="padding:6px 10px;text-align:left">Tipo</th>
            <th style="padding:6px 10px;text-align:left">Local</th>
            <th style="padding:6px 10px;text-align:right">Valor (R$)</th>
          </tr></thead>
          <tbody>
            ${jornadas.map(j => `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:5px 10px">${new Date(j.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
              <td style="padding:5px 10px">${j.horaInicio} - ${j.horaFim}</td>
              <td style="padding:5px 10px">${(j.horas||0).toFixed(1)}h</td>
              <td style="padding:5px 10px">${j.tipo}</td>
              <td style="padding:5px 10px">${j.local || '—'}</td>
              <td style="padding:5px 10px;text-align:right">R$ ${(j.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return { render, atualizar };
})();
