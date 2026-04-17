/**
 * calendario.js — Visão de calendário mensal das jornadas
 */
const Calendario = (() => {
  let ano = new Date().getFullYear();
  let mes = new Date().getMonth() + 1;

  function render() {
    const jornadas = DB.getJornadasPorMes(ano, mes);
    const militares = DB.getMilitares();

    // Agrupar jornadas por dia
    const porDia = {};
    jornadas.forEach(j => {
      const dia = parseInt(j.data.slice(8));
      if (!porDia[dia]) porDia[dia] = [];
      const mil = militares.find(m => m.id === j.militarId);
      porDia[dia].push({ ...j, nomeGuerra: mil?.nome.split(' ')[0] || '?' });
    });

    const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const primeiroDia = new Date(ano, mes - 1, 1).getDay(); // 0=dom
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const hoje = new Date();

    // Dias anteriores para preencher grade
    const diasAntes = primeiroDia;
    const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();

    let diasHtml = '';

    // Cabeçalho dias da semana
    const semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const cabHtml = semana.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    // Dias do mês anterior
    for (let i = diasAntes - 1; i >= 0; i--) {
      diasHtml += `<div class="cal-day outro-mes"><div class="cal-day-num" style="color:#ccc">${ultimoDiaMesAnterior - i}</div></div>`;
    }

    // Dias do mês atual
    for (let d = 1; d <= diasNoMes; d++) {
      const isHoje = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes && hoje.getDate() === d;
      const eventos = porDia[d] || [];
      const eventoHtml = eventos.map(e =>
        `<div class="cal-event ${e.tipo === 'Municipal' ? 'municipal' : ''}" title="${e.nomeGuerra} — ${e.horaInicio}-${e.horaFim} (${e.horas}h)">${e.nomeGuerra}</div>`
      ).join('');
      diasHtml += `<div class="cal-day${isHoje ? ' hoje' : ''}"><div class="cal-day-num">${d}</div>${eventoHtml}</div>`;
    }

    // Completar última semana
    const totalCelulas = diasAntes + diasNoMes;
    const resto = totalCelulas % 7 === 0 ? 0 : 7 - (totalCelulas % 7);
    for (let i = 1; i <= resto; i++) {
      diasHtml += `<div class="cal-day outro-mes"><div class="cal-day-num" style="color:#ccc">${i}</div></div>`;
    }

    document.getElementById('section-calendario').innerHTML = `
      <div class="page-header">
        <h2>Calendário de Jornadas</h2>
        <button class="btn btn-primary" onclick="Jornadas.abrirFormulario()">+ Nova Jornada</button>
      </div>

      <div class="card">
        <div class="cal-header">
          <button class="btn btn-secondary" onclick="Calendario.navegar(-1)">‹ Anterior</button>
          <h3 style="font-size:18px;font-weight:700;text-transform:capitalize">${nomeMes}</h3>
          <button class="btn btn-secondary" onclick="Calendario.navegar(1)">Próximo ›</button>
        </div>

        <div style="display:flex;gap:16px;margin-bottom:12px;font-size:13px">
          <span><span style="display:inline-block;width:12px;height:12px;background:var(--bm-red);border-radius:2px;margin-right:4px"></span>Estadual</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:var(--info);border-radius:2px;margin-right:4px"></span>Municipal</span>
        </div>

        <div class="cal-grid">${cabHtml}${diasHtml}</div>

        ${jornadas.length > 0 ? `
        <div style="margin-top:16px">
          <div style="font-weight:600;margin-bottom:8px">Resumo do mês</div>
          <div class="total-bar">
            <span>${jornadas.length} jornada(s)</span>
            <span>Horas: <strong>${jornadas.reduce((s,j)=>s+(j.horas||0),0).toFixed(1)}h</strong></span>
            <span>Total: <strong>R$ ${jornadas.reduce((s,j)=>s+(j.valor||0),0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></span>
          </div>
        </div>` : ''}
      </div>`;
  }

  function navegar(dir) {
    mes += dir;
    if (mes > 12) { mes = 1; ano++; }
    if (mes < 1)  { mes = 12; ano--; }
    render();
  }

  return { render, navegar };
})();
