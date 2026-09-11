/**
 * Maatlaadi Bill - Main Application Controller & Router
 * Orchestrates navigation, bottom tabs, confirmation flow, and toast alerts
 */

class Application {
  constructor() {
    this.currentView = 'home';
    this.viewContainer = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.viewContainer = document.getElementById('app-view-container');
      this.setupNavigation();
      this.handleInitialRoute();
    });
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        this.navigateTo(targetView);
      });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        this.renderView(e.state.view, e.state.params);
      } else {
        this.renderView('home');
      }
    });
  }

  handleInitialRoute() {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      this.navigateTo(hash, {}, false);
    } else {
      this.navigateTo('home', {}, false);
    }
  }

  navigateTo(viewName, params = {}, pushState = true) {
    this.currentView = viewName;

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      const v = item.getAttribute('data-view');
      if (v === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (pushState) {
      history.pushState({ view: viewName, params }, '', `#${viewName}`);
    }

    this.renderView(viewName, params);
  }

  renderView(viewName, params = {}) {
    if (!this.viewContainer) return;
    window.scrollTo(0, 0);

    switch (viewName) {
      case 'home':
        window.HomeView.render(this.viewContainer);
        break;
      case 'products':
        window.ProductsView.render(this.viewContainer);
        break;
      case 'customers':
        window.CustomersView.render(this.viewContainer);
        break;
      case 'documents':
        window.DocumentsView.render(this.viewContainer);
        break;
      case 'dashboard':
        window.DashboardView.render(this.viewContainer);
        break;
      case 'settings':
        window.SettingsView.render(this.viewContainer);
        break;
      case 'confirm':
        window.ConfirmView.render(this.viewContainer, params.transaction, params.meta);
        break;
      case 'document':
        window.DocumentView.render(this.viewContainer, params.id, params.type);
        break;
      default:
        window.HomeView.render(this.viewContainer);
    }
  }

  showConfirmation(transaction, meta = {}) {
    this.navigateTo('confirm', { transaction, meta });
  }

  viewDocument(id, type = 'invoice') {
    this.navigateTo('document', { id, type });
  }

  duplicateDocument(id, type = 'invoice') {
    const original = type === 'invoice'
      ? window.Store.getInvoiceById(id)
      : window.Store.getQuotationById(id);

    if (original) {
      const dup = JSON.parse(JSON.stringify(original));
      delete dup.id;
      delete dup.invoice_number;
      delete dup.quotation_number;
      dup.date = new Date().toISOString().split('T')[0];

      this.showConfirmation(dup, {
        transcript: 'డూప్లికేట్ పత్రం (Duplicate Document)',
        confidence: 1.0
      });
      this.showToast('డాక్యుమెంట్ కాపీ చేయబడింది. మార్పులు చేసి కొత్త బిల్లును సేవ్ చేయండి.', 'info');
    }
  }

  /**
   * Floating Toast Notifications
   */
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'all 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Instantiate global app
window.App = new Application();
