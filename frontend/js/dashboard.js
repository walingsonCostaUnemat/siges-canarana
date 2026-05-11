/**
 * dashboard.js — Resumo mensal com gráficos de orçamento
 */
const Dashboard = (() => {
  function render() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth() + 1;
    const mesAtual = `${ano}-${String(mes).padStart(2,'0')}`;
    const jornadas = DB.getJornadasPorMes(ano, mes);
    const militares = DB.getMilitares(true);
    const resumo = DB.getResumoOrcamentario(mesAtual);
    const historico = DB.getHistoricoMensal(6);

    const totalHoras    = jornadas.reduce((s,j) => s+(j.horas||0), 0);
    const totalValor    = jornadas.reduce((s,j) => s+(j.valor||0), 0);
    const totalEstadual = jornadas.filter(j=>j.tipo==='Estadual').reduce((s,j)=>s+(j.valor||0),0);
    const totalMunicipal= jornadas.filter(j=>j.tipo==='Municipal').reduce((s,j)=>s+(j.valor||0),0);
    const nomeMes = hoje.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

    const porMilitar = {};
    jornadas.forEach(j => {
      if (!porMilitar[j.militarId]) porMilitar[j.militarId] = {horas:0,valor:0,count:0};
      porMilitar[j.militarId].horas  += j.horas||0;
      porMilitar[j.militarId].valor  += j.valor||0;
      porMilitar[j.militarId].count++;
    });
    const ranking = Object.entries(porMilitar)
      .map(([id,v]) => ({mil: militares.find(m=>m.id===id), ...v}))
      .filter(r=>r.mil).sort((a,b)=>b.horas-a.horas);

    document.getElementById('section-dashboard').innerHTML = `
      <div class="page-header">
        <h2>Dashboard — ${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</h2>
        <button class="btn btn-primary" onclick="Jornadas.abrirFormulario()">+ Nova Jornada</button>
      </div>

      <div class="grid-4" style="margin-bottom:20px">
        <div class="card stat-card">
          <div class="stat-value">${jornadas.length}</div>
          <div class="stat-label">Jornadas no Mês</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value">${totalHoras.toFixed(1)}h</div>
          <div class="stat-label">Total de Horas</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" style="color:var(--info)">R$ ${totalEstadual.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
          <div class="stat-label">Gasto Estadual</div>
        </div>
        <div class="card stat-card">
          <div class="stat-value" style="color:var(--success)">R$ ${totalMunicipal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
          <div class="stat-label">Gasto Municipal</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:20px">
        ${['Estadual','Municipal'].map(t => _cardOrcamento(t, resumo[t])).join('')}
      </div>

      <!-- Gráficos responsivos -->
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-title">Evolução de Gastos — Últimos 6 Meses</div>
          <div class="chart-legenda">
            <span class="leg-item"><span class="leg-cor" style="background:#3b82f6"></span>Estadual</span>
            <span class="leg-item"><span class="leg-cor" style="background:#16a34a"></span>Municipal</span>
          </div>
          <div class="chart-wrap"><canvas id="chart-historico"></canvas></div>
        </div>
        <div class="card">
          <div class="card-title">Distribuição Orçamentária</div>
          <div class="chart-wrap chart-pizza-wrap">
            <canvas id="chart-pizza"></canvas>
            <div id="chart-pizza-legenda" class="pizza-legenda"></div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Jornadas por Militar — ${nomeMes.charAt(0).toUpperCase()+nomeMes.slice(1)}</div>
          ${ranking.length === 0
            ? '<p style="color:var(--text-muted);text-align:center;padding:20px">Nenhuma jornada registrada</p>'
            : `<div class="table-wrap"><table>
                <thead><tr><th>Militar</th><th>Posto</th><th>Jornadas</th><th>Horas</th><th>Valor</th></tr></thead>
                <tbody>${ranking.map(r=>`<tr>
                  <td>${r.mil.nome}</td>
                  <td><span class="badge badge-blue">${r.mil.posto}</span></td>
                  <td style="text-align:center">${r.count}</td>
                  <td>${r.horas.toFixed(1)}h</td>
                  <td><strong>R$ ${r.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong></td>
                </tr>`).join('')}</tbody>
              </table></div>`}
        </div>
        <div class="card">
          <div class="card-title">Resumo Geral do Mês</div>
          <div>${[
            ['Jornadas',jornadas.length],
            ['Total de Horas',totalHoras.toFixed(1)+'h'],
            ['Gasto Estadual','R$ '+totalEstadual.toLocaleString('pt-BR',{minimumFractionDigits:2})],
            ['Saldo Estadual','R$ '+resumo.Estadual.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})],
            ['Gasto Municipal','R$ '+totalMunicipal.toLocaleString('pt-BR',{minimumFractionDigits:2})],
            ['Saldo Municipal','R$ '+resumo.Municipal.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})],
            ['Total Gasto','R$ '+totalValor.toLocaleString('pt-BR',{minimumFractionDigits:2})],
          ].map(([k,v],i)=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)${i===6?';font-weight:700':''}">
            <span style="color:var(--text-muted)">${k}</span><strong>${v}</strong>
          </div>`).join('')}</div>
        </div>
      </div>`;

    // Aguarda DOM renderizar para calcular larguras corretas
    requestAnimationFrame(() => {
      _desenharHistorico(historico);
      _desenharPizza(resumo);
    });
  }

  function _cardOrcamento(tipo, r) {
    const cor    = tipo === 'Estadual' ? 'var(--info)' : 'var(--success)';
    const alerta = r.saldo < 0 ? 'var(--danger)' : r.pct >= 90 ? 'var(--warning)' : cor;
    return `
      <div class="card" style="border-left:4px solid ${alerta}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">Verba ${tipo}</div>
            <div style="font-size:26px;font-weight:700;color:${alerta};margin:4px 0">
              R$ ${r.saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}
            </div>
            <div style="font-size:12px;color:var(--text-muted)">Saldo disponível (acumulado)</div>
          </div>
          <button class="btn btn-sm btn-secondary no-print" onclick="App.navegar('recursos')">Gerenciar</button>
        </div>
        ${r.destinado === 0
          ? `<div style="margin-top:10px;font-size:12px;color:var(--warning)">⚠ Nenhum aporte cadastrado. <a href="#" onclick="Recursos.abrirFormulario();return false">Adicionar verba</a></div>`
          : `<div style="margin-top:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:4px">
                <span>Aportado: R$ ${r.destinado.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                <span>Gasto: R$ ${r.gasto.toLocaleString('pt-BR',{minimumFractionDigits:2})} (${r.pct}%)</span>
              </div>
              <div style="background:#f3f4f6;border-radius:20px;height:8px;overflow:hidden">
                <div style="height:100%;width:${r.pct}%;background:${alerta};border-radius:20px;transition:width .5s"></div>
              </div>
            </div>`}
      </div>`;
  }

  function _formatarEixo(val) {
    if (val >= 1000) return 'R$'+(val/1000).toFixed(1)+'k';
    return 'R$'+val.toFixed(0);
  }

  function _desenharHistorico(historico) {
    const canvas = document.getElementById('chart-historico');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Tamanho real do container
    const W = canvas.parentElement.clientWidth || 400;
    const H = Math.max(180, Math.round(W * 0.45));
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const pad = { t: 16, r: 16, b: 36, l: 54 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;
    const n = historico.length;
    const maxVal = Math.max(...historico.map(d => d.estadual + d.municipal), 100);

    // arredonda maxVal para número bonito
    const teto = Math.ceil(maxVal / 500) * 500 || 1000;
    const passos = 4;

    ctx.clearRect(0, 0, W, H);

    // Linhas de grade e eixo Y
    ctx.font = `${Math.max(9, W*0.022)}px sans-serif`;
    for (let i = 0; i <= passos; i++) {
      const y = pad.t + ch - (ch * i / passos);
      const val = teto * i / passos;
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
      ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'right';
      ctx.fillText(_formatarEixo(val), pad.l - 6, y + 4);
    }

    // Barras
    const slotW = cw / n;
    const barW = Math.max(6, slotW * 0.28);

    historico.forEach((d, i) => {
      const slotX = pad.l + slotW * i;
      const cx = slotX + slotW / 2;

      const hE = (d.estadual / teto) * ch;
      const hM = (d.municipal / teto) * ch;

      // Estadual
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(cx - barW - 1, pad.t + ch - hE, barW, Math.max(hE, 1));

      // Municipal
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(cx + 1, pad.t + ch - hM, barW, Math.max(hM, 1));

      // Label mês no eixo X
      ctx.fillStyle = '#6b7280'; ctx.textAlign = 'center';
      ctx.fillText(d.label, cx, H - pad.b + 14);
    });

    // Linha base
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t + ch); ctx.lineTo(pad.l + cw, pad.t + ch); ctx.stroke();
  }

  function _desenharPizza(resumo) {
    const canvas = document.getElementById('chart-pizza');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    const W = container.clientWidth || 340;
    // Em mobile, pizza ocupa largura total; em desktop, metade reservada para legenda
    const pizza_r_area = Math.min(W, 200);
    const H = pizza_r_area;

    canvas.style.width  = pizza_r_area + 'px';
    canvas.style.height = H + 'px';
    canvas.width  = pizza_r_area * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const cx = pizza_r_area / 2;
    const cy = H / 2;
    const r  = Math.min(cx, cy) - 12;

    const segmentos = [
      { label: 'Gasto Estadual',  valor: resumo.Estadual.gasto,              cor: '#3b82f6' },
      { label: 'Saldo Estadual',  valor: Math.max(0, resumo.Estadual.saldo),  cor: '#93c5fd' },
      { label: 'Gasto Municipal', valor: resumo.Municipal.gasto,              cor: '#16a34a' },
      { label: 'Saldo Municipal', valor: Math.max(0, resumo.Municipal.saldo), cor: '#86efac' },
    ].filter(s => s.valor > 0);

    const total = segmentos.reduce((s,x) => s + x.valor, 0);

    const legEl = document.getElementById('chart-pizza-legenda');

    if (total === 0) {
      ctx.fillStyle = '#9ca3af'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Sem dados', cx, cy);
      if (legEl) legEl.innerHTML = '';
      return;
    }

    let angulo = -Math.PI / 2;
    segmentos.forEach(s => {
      const fatia = (s.valor / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angulo, angulo + fatia);
      ctx.closePath();
      ctx.fillStyle = s.cor; ctx.fill();
      ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
      angulo += fatia;
    });

    // Legenda via HTML (responsiva)
    if (legEl) {
      legEl.innerHTML = segmentos.map(s => `
        <div class="pizza-leg-item">
          <span class="leg-cor" style="background:${s.cor}"></span>
          <span>${s.label}</span>
          <strong>R$ ${s.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
        </div>`).join('');
    }
  }

  return { render };
})();
