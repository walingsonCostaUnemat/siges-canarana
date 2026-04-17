/**
 * tutorial.js — Tour guiado + Central de Ajuda + Tooltips contextuais
 */
const Tutorial = (() => {

  // ---- PASSOS DO TOUR ----
  const PASSOS = [
    {
      titulo: 'Bem-vindo ao SIGES-BM!',
      texto: 'Este sistema controla as <strong>jornadas extraordinárias</strong> do Núcleo de Canarana. Vamos fazer um tour rápido para você aprender tudo em menos de 2 minutos.',
      destaque: null,
      posicao: 'centro',
    },
    {
      titulo: 'Navegação Principal',
      texto: 'Aqui estão as seções do sistema. Clique em cada aba para acessar: <strong>Dashboard</strong> (resumo), <strong>Jornadas</strong> (cadastro), <strong>Calendário</strong> (visão mensal), <strong>Relatório</strong> (impressão), <strong>Recursos</strong> (verbas) e configurações.',
      destaque: 'nav',
      posicao: 'baixo',
    },
    {
      titulo: '1. Cadastre os Militares',
      texto: 'Antes de tudo, acesse <strong>Militares</strong> e verifique se todos os militares do núcleo estão cadastrados. Cada militar precisa ter nome, posto e matrícula corretos para que os cálculos de horas e valores sejam precisos.',
      destaque: null,
      posicao: 'centro',
      acao: () => App.navegar('militares'),
    },
    {
      titulo: '2. Configure a Tabela de Valores',
      texto: 'Em <strong>Tabela de Valores</strong> ficam os valores de remuneração por hora de cada posto/graduação, separados por verba estadual e municipal. Atualize sempre que houver reajuste nas tabelas do CBM.',
      destaque: null,
      posicao: 'centro',
      acao: () => App.navegar('valores'),
    },
    {
      titulo: '3. Registre os Recursos (Verbas)',
      texto: 'Em <strong>Recursos</strong> você informa quanto dinheiro foi disponibilizado por mês, separado por tipo (Estadual/Municipal). Novos aportes somam ao saldo existente. O sistema debita automaticamente a cada jornada salva.',
      destaque: null,
      posicao: 'centro',
      acao: () => App.navegar('recursos'),
    },
    {
      titulo: '4. Registre as Jornadas',
      texto: 'Em <strong>Jornadas</strong>, clique em <em>"+ Nova Jornada"</em>. Preencha data, horário e tipo de verba — o sistema calcula automaticamente as horas e o valor para cada militar. Você pode adicionar vários militares de uma vez na mesma jornada.',
      destaque: null,
      posicao: 'centro',
      acao: () => App.navegar('jornadas'),
    },
    {
      titulo: '5. Acompanhe no Dashboard',
      texto: 'O <strong>Dashboard</strong> mostra o resumo do mês: gastos, saldo disponível de cada verba e gráficos de evolução. Se o saldo estiver abaixo de 15%, o card fica amarelo. Se negativo, fica vermelho.',
      destaque: null,
      posicao: 'centro',
      acao: () => App.navegar('dashboard'),
    },
    {
      titulo: '6. Emita o Relatório Mensal',
      texto: 'Em <strong>Relatório</strong>, selecione o mês e clique em <em>"🖨 Imprimir / PDF"</em>. O relatório oficial sai formatado com cabeçalho do CBM-MT e detalhamento de cada militar. Desligue "Cabeçalhos e rodapés" no navegador antes de imprimir.',
      destaque: null,
      posicao: 'centro',
      acao: () => App.navegar('relatorio'),
    },
    {
      titulo: '7. Salve e Exporte os Dados',
      texto: 'Os dados ficam salvos no navegador automaticamente. Use <strong>"⬇ Exportar Excel"</strong> no topo para fazer backup ou compartilhar. Use <strong>"⬆ Importar Excel"</strong> para restaurar dados em outro computador.',
      destaque: 'header-actions',
      posicao: 'baixo',
    },
    {
      titulo: 'Pronto! 🎉',
      texto: 'Você já sabe usar o sistema. Para rever este tutorial a qualquer momento, clique no botão <strong>❓ Ajuda</strong> no canto inferior direito da tela. Lá você também encontra o guia de cada seção.',
      destaque: null,
      posicao: 'centro',
    },
  ];

  // ---- AJUDA POR SEÇÃO ----
  const AJUDA = {
    dashboard: {
      titulo: 'Dashboard',
      topicos: [
        { q: 'O que são os cards coloridos de saldo?', r: 'Mostram o saldo acumulado de cada verba. <span class="tip-verde">Verde/Azul</span> = saldo ok. <span class="tip-amarelo">Amarelo</span> = abaixo de 90% do limite. <span class="tip-vermelho">Vermelho</span> = saldo negativo (gastou mais do que foi aportado).' },
        { q: 'Como funcionam os gráficos?', r: 'O gráfico de barras mostra os gastos dos últimos 6 meses separados por verba estadual e municipal. O gráfico de pizza mostra a distribuição entre gasto e saldo acumulado.' },
        { q: 'Os dados do dashboard são do mês atual?', r: 'Sim. Os gastos exibidos nos cards e no ranking são sempre do mês corrente. Os gráficos mostram os últimos 6 meses para comparação.' },
      ],
    },
    jornadas: {
      titulo: 'Jornadas Extraordinárias',
      topicos: [
        { q: 'Como cadastrar uma jornada com vários militares?', r: 'Clique em "+ Nova Jornada", preencha os dados gerais (data, horário, tipo de verba) e depois adicione os militares no campo abaixo. Use "+ Todos" para adicionar todos de uma vez. O valor de cada militar é calculado automaticamente.' },
        { q: 'Como o valor é calculado?', r: 'O sistema calcula: <strong>Horas trabalhadas × Valor/Hora do posto</strong>. Os valores por posto estão na aba "Tabela de Valores" e podem variar entre verba estadual e municipal.' },
        { q: 'O que significa o alerta vermelho ao salvar?', r: 'Significa que o saldo da verba selecionada é insuficiente para cobrir o custo total desta jornada. Você pode salvar mesmo assim, mas o saldo ficará negativo. Adicione recursos em "Recursos" para resolver.' },
        { q: 'Posso editar ou excluir uma jornada?', r: 'Sim. Na lista de jornadas, clique no ícone ✏ para editar ou 🗑 para excluir. Ao excluir, o valor é automaticamente devolvido ao saldo da verba correspondente.' },
        { q: 'Como filtrar as jornadas?', r: 'Use os filtros de ano, mês, militar e tipo de verba no topo da lista de jornadas.' },
      ],
    },
    calendario: {
      titulo: 'Calendário',
      topicos: [
        { q: 'O que as cores no calendário significam?', r: '<span style="color:#8b0000">Azul escuro</span> = jornada estadual. <span style="color:#2563eb">Verde</span> = jornada municipal. Cada evento mostra o primeiro nome do militar.' },
        { q: 'Posso cadastrar jornadas pelo calendário?', r: 'Sim. Clique em "+ Nova Jornada" no topo do calendário para abrir o formulário de cadastro.' },
        { q: 'Como navegar entre meses?', r: 'Use os botões "‹ Anterior" e "Próximo ›" para navegar entre os meses.' },
      ],
    },
    relatorio: {
      titulo: 'Relatório Mensal',
      topicos: [
        { q: 'Como imprimir o relatório?', r: 'Selecione o mês desejado, clique em "🖨 Imprimir / PDF". Na janela de impressão do navegador, vá em <strong>Mais configurações</strong> e desmarque "Cabeçalhos e rodapés" para evitar que o URL apareça no rodapé.' },
        { q: 'O relatório inclui todos os militares?', r: 'Apenas os militares que tiveram jornadas no mês selecionado aparecem no relatório. Militares sem jornadas no período são omitidos.' },
        { q: 'Tem detalhamento por militar?', r: 'Sim. Abaixo da tabela resumo há um detalhamento individual com cada jornada, horário, local e valor.' },
      ],
    },
    recursos: {
      titulo: 'Recursos Orçamentários',
      topicos: [
        { q: 'Como adicionar um novo aporte?', r: 'Clique em "+ Novo Aporte", informe o mês de referência, tipo (Estadual ou Municipal), valor e uma descrição opcional. O valor é somado ao saldo existente daquele tipo e mês.' },
        { q: 'Por que o saldo pode ser diferente do que eu aportei?', r: 'O saldo é calculado assim: <strong>Total aportado − Total gasto em jornadas</strong>. Se houver jornadas salvas, o saldo já reflete os descontos automáticos.' },
        { q: 'Posso aportar mais de uma vez no mesmo mês?', r: 'Sim. Cada aporte fica registrado separadamente, e o saldo é a soma de todos os aportes menos os gastos.' },
        { q: 'O que acontece quando o saldo fica negativo?', r: 'O card fica vermelho no Dashboard e nos Recursos. Isso indica que as jornadas ultrapassaram o valor disponibilizado. Adicione um novo aporte para regularizar.' },
      ],
    },
    militares: {
      titulo: 'Cadastro de Militares',
      topicos: [
        { q: 'Quais dados são obrigatórios?', r: 'Nome completo e Posto/Graduação são obrigatórios. A matrícula é recomendada para identificação no relatório oficial.' },
        { q: 'Posso inativar um militar sem excluí-lo?', r: 'Sim. Altere o status para "Inativo" ou "Afastado". O militar não aparece mais no seletor de jornadas, mas seu histórico é preservado.' },
        { q: 'Posso excluir um militar?', r: 'Somente se ele não tiver jornadas registradas. Caso tenha, o sistema bloqueia a exclusão para preservar o histórico.' },
      ],
    },
    valores: {
      titulo: 'Tabela de Valores',
      topicos: [
        { q: 'Os valores são por hora ou por jornada?', r: 'São <strong>por hora</strong>. O valor total da jornada é calculado multiplicando as horas trabalhadas pelo valor/hora do posto do militar.' },
        { q: 'Estadual e Municipal têm valores diferentes?', r: 'Sim, e por isso a tabela tem duas colunas. CB BM e SD BM recebem R$ 43,35/h estadual mas R$ 50,00/h municipal, por exemplo.' },
        { q: 'Como atualizo os valores quando houver reajuste?', r: 'Acesse "Tabela de Valores", clique em ✏ ao lado do posto e informe os novos valores. As jornadas já cadastradas não são afetadas — apenas as novas.' },
      ],
    },
  };

  let passoAtual = 0;

  // ---- TOUR ----
  function iniciarTour() {
    passoAtual = 0;
    _criarOverlayTour();
    _renderPasso();
  }

  function _criarOverlayTour() {
    let el = document.getElementById('tour-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tour-overlay';
      el.className = 'tour-overlay';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  }

  function _renderPasso() {
    const passo = PASSOS[passoAtual];
    if (passo.acao) passo.acao();

    const overlay = document.getElementById('tour-overlay');
    overlay.innerHTML = `
      <div class="tour-card">
        <div class="tour-header">
          <span class="tour-passo">${passoAtual + 1} / ${PASSOS.length}</span>
          <button class="tour-fechar" onclick="Tutorial.fecharTour()">✕</button>
        </div>
        <h3 class="tour-titulo">${passo.titulo}</h3>
        <p class="tour-texto">${passo.texto}</p>
        <div class="tour-dots">
          ${PASSOS.map((_,i) => `<span class="tour-dot ${i===passoAtual?'ativo':''}"></span>`).join('')}
        </div>
        <div class="tour-acoes">
          ${passoAtual > 0 ? `<button class="btn btn-secondary" onclick="Tutorial.irPasso(${passoAtual-1})">← Anterior</button>` : '<span></span>'}
          ${passoAtual < PASSOS.length - 1
            ? `<button class="btn btn-primary" onclick="Tutorial.irPasso(${passoAtual+1})">Próximo →</button>`
            : `<button class="btn btn-success" onclick="Tutorial.fecharTour()">✔ Concluir</button>`}
        </div>
      </div>`;
  }

  function irPasso(n) {
    passoAtual = n;
    _renderPasso();
  }

  function fecharTour() {
    const el = document.getElementById('tour-overlay');
    if (el) el.style.display = 'none';
    localStorage.setItem('cnr_tour_visto', '1');
  }

  // ---- CENTRAL DE AJUDA ----
  function abrirAjuda(secao) {
    const secaoAtual = secao || _secaoAtiva();
    const ajuda = AJUDA[secaoAtual] || AJUDA.dashboard;

    const menuItens = Object.entries(AJUDA).map(([k, v]) =>
      `<button class="ajuda-menu-item ${k === secaoAtual ? 'ativo' : ''}" onclick="Tutorial.abrirAjuda('${k}')">${v.titulo}</button>`
    ).join('');

    App.abrirModal('Central de Ajuda', `
      <div class="ajuda-wrap">
        <div class="ajuda-menu">${menuItens}</div>
        <div class="ajuda-conteudo">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="color:var(--bm-red)">${ajuda.titulo}</h3>
            <button class="btn btn-primary btn-sm" onclick="Tutorial.fecharAjudaIniciarTour()">▶ Iniciar Tour</button>
          </div>
          ${ajuda.topicos.map((t, i) => `
            <div class="ajuda-topico" onclick="this.classList.toggle('aberto')">
              <div class="ajuda-q"><span>❓</span> ${t.q} <span class="ajuda-seta">›</span></div>
              <div class="ajuda-r">${t.r}</div>
            </div>`).join('')}
          <div style="margin-top:20px;padding:12px;background:#f8fafc;border-radius:var(--radius);font-size:12px;color:var(--text-muted)">
            💡 <strong>Dica:</strong> Você pode acessar esta ajuda a qualquer momento clicando no botão <strong>❓</strong> no canto inferior direito da tela.
          </div>
        </div>
      </div>
    `, 'modal-largo');
  }

  function fecharAjudaIniciarTour() {
    App.fecharModal();
    setTimeout(iniciarTour, 200);
  }

  function _secaoAtiva() {
    const el = document.querySelector('.nav-btn.active');
    return el?.dataset.section || 'dashboard';
  }

  // ---- BOTÃO FLUTUANTE ----
  function _criarBotaoAjuda() {
    const btn = document.createElement('button');
    btn.id = 'btn-ajuda-flutuante';
    btn.className = 'btn-ajuda-flutuante';
    btn.innerHTML = '❓';
    btn.title = 'Ajuda / Tutorial';
    btn.onclick = () => abrirAjuda();
    document.body.appendChild(btn);
  }

  // ---- INIT ----
  function init() {
    _criarBotaoAjuda();
    // Mostra tour automaticamente na primeira visita
    if (!localStorage.getItem('cnr_tour_visto')) {
      setTimeout(iniciarTour, 800);
    }
  }

  return { init, iniciarTour, irPasso, fecharTour, abrirAjuda, fecharAjudaIniciarTour };
})();
