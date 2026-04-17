/**
 * app.js — Controlador principal: navegação, modal, import/export
 */
const App = (() => {
  const MODULOS = {
    dashboard: Dashboard,
    jornadas: Jornadas,
    calendario: Calendario,
    relatorio: Relatorio,
    militares: Militares,
    recursos: Recursos,
    valores: Valores,
  };

  async function init() {
    // Mostra indicador de carregamento
    document.querySelector('main').innerHTML =
      '<div style="text-align:center;padding:60px;color:#6b7280"><div style="font-size:32px;margin-bottom:12px">⏳</div>Carregando dados do servidor...</div>';

    await DB.init();

    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => navegar(btn.dataset.section));
    });

    // Restaura seções e renderiza
    document.querySelector('main').innerHTML = `
      <div id="section-dashboard" class="section active"></div>
      <div id="section-jornadas" class="section"></div>
      <div id="section-calendario" class="section"></div>
      <div id="section-relatorio" class="section"></div>
      <div id="section-militares" class="section"></div>
      <div id="section-recursos" class="section"></div>
      <div id="section-valores" class="section"></div>`;

    Object.values(MODULOS).forEach(m => m.render());
    Tutorial.init();
  }

  function navegar(secao) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.section === secao));
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `section-${secao}`));
    MODULOS[secao]?.render();
  }

  function abrirModal(titulo, html, classe = '') {
    document.getElementById('modal-title').textContent = titulo;
    document.getElementById('modal-body').innerHTML = html;
    const modal = document.querySelector('.modal');
    modal.className = 'modal' + (classe ? ' ' + classe : '');
    document.getElementById('modal-overlay').classList.add('open');
  }

  function fecharModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  async function importarExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const res = await DB.importarExcel(file);
      alert(`Importação concluída!\n• ${res.militares} novo(s) militar(es)\n• ${res.jornadas} jornada(s) importada(s)`);
      Object.values(MODULOS).forEach(m => m.render());
    } catch (err) {
      alert('Erro ao importar: ' + err.message);
    }
    event.target.value = '';
  }

  function exportarExcel() {
    DB.exportarExcel();
  }

  // Aplica configuracao do quartel (config.js)
  function _aplicarConfig() {
    const cfg = window.SIGES_CONFIG || {};
    const q = cfg.quartel || '';
    document.title = 'SIGES-BM' + (q ? ' - ' + q : '');
    const sub = document.getElementById('header-subtitulo');
    if (sub) sub.textContent = cfg.subtitulo || ('Corpo de Bombeiros Militar' + (q ? ' - Nucleo de ' + q : ''));
    const foot = document.getElementById('footer-quartel');
    if (foot) foot.textContent = cfg.rodape || ('Estado de Mato Grosso - Corpo de Bombeiros Militar' + (q ? ' - Nucleo de ' + q : ''));
    const rodape = document.getElementById('rodape-quartel');
    if (rodape) rodape.textContent = q ? ('NUCLEO DE ' + q.toUpperCase()) : '';
  }

  // Preenche data do rodape de impressao
  document.getElementById('rodape-data').textContent =
    new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  document.addEventListener('DOMContentLoaded', () => { _aplicarConfig(); init(); });

  return { navegar, abrirModal, fecharModal, importarExcel, exportarExcel };
})();
