// admin.js - Admin Panel & Resolution Management for Gómez Palacio
const AdminApp = {
  currentReportId: null,
  allReports: [],
  filteredReports: [],

  init() {
    this.refreshData();
  },

  async refreshData() {
    try {
      const [reportsData, statsData] = await Promise.all([
        API.getReports(),
        API.getStats()
      ]);

      if (reportsData.success) {
        this.allReports = reportsData.reports;
        this.filterTable();
      }

      if (statsData.success) {
        this.renderStats(statsData.stats);
      }
    } catch (err) {
      console.error('Error al actualizar datos de admin:', err);
    }
  },

  renderStats(stats) {
    document.getElementById('admin-kpi-total').textContent = stats.total || 0;
    document.getElementById('admin-kpi-pending').textContent = stats.pendientes || 0;
    document.getElementById('admin-kpi-in-progress').textContent = stats.enProceso || 0;
    document.getElementById('admin-kpi-resolved').textContent = stats.resueltos || 0;

    const rate = stats.total > 0 ? Math.round((stats.resueltos / stats.total) * 100) : 0;
    const rateEl = document.getElementById('admin-kpi-resolution-rate');
    if (rateEl) rateEl.textContent = `${rate}% tasa de resolución`;

    // Update Header counters too
    const headPending = document.getElementById('header-pending-count');
    const headResolved = document.getElementById('header-resolved-count');
    const navBadge = document.getElementById('nav-admin-badge');

    if (headPending) headPending.textContent = stats.pendientes || 0;
    if (headResolved) headResolved.textContent = stats.resueltos || 0;
    if (navBadge) {
      if (stats.pendientes > 0) {
        navBadge.textContent = stats.pendientes;
        navBadge.classList.remove('hidden');
      } else {
        navBadge.classList.add('hidden');
      }
    }
  },

  filterTable() {
    const searchTerm = (document.getElementById('admin-search-input').value || '').toLowerCase().trim();
    const category = document.getElementById('admin-filter-category').value;
    const status = document.getElementById('admin-filter-status').value;

    this.filteredReports = this.allReports.filter(report => {
      // Category filter
      if (category !== 'todas' && report.category !== category) return false;
      
      // Status filter
      if (status !== 'todos' && report.status !== status) return false;

      // Search filter
      if (searchTerm) {
        const title = (report.title || '').toLowerCase();
        const address = (report.address || '').toLowerCase();
        const colonia = (report.colonia || '').toLowerCase();
        const folio = (report.folio || '').toLowerCase();
        const desc = (report.description || '').toLowerCase();

        return title.includes(searchTerm) || 
               address.includes(searchTerm) || 
               colonia.includes(searchTerm) || 
               folio.includes(searchTerm) ||
               desc.includes(searchTerm);
      }

      return true;
    });

    this.renderTable(this.filteredReports);
  },

  renderTable(reports) {
    const tbody = document.getElementById('admin-reports-table-body');
    const emptyState = document.getElementById('admin-empty-state');
    const countEl = document.getElementById('admin-filtered-count');

    if (countEl) countEl.textContent = reports.length;

    if (!reports || reports.length === 0) {
      tbody.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = reports.map(r => {
      const cat = CATEGORY_META[r.category] || CATEGORY_META.otro;
      const isResolved = r.status === 'Resuelto';
      
      let statusBadge = '';
      if (isResolved) {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">🟢 Resuelto</span>';
      } else if (r.status === 'En Proceso') {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">🔵 En Proceso</span>';
      } else if (r.status === 'Rechazado') {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">🔴 Rechazado</span>';
      } else {
        statusBadge = '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">🟡 Pendiente</span>';
      }

      const imgThumbnail = `
        <div class="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center relative cursor-pointer" onclick="App.openFullPhoto('${r.image_url || ''}')">
          <span class="text-sm">${cat.icon}</span>
          ${r.image_url ? `<img src="${r.image_url}" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">` : ''}
        </div>
      `;

      const formattedDate = new Date(r.created_at).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
            <div>${r.folio}</div>
            <div class="text-[10px] font-sans font-normal text-slate-400">${formattedDate}</div>
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-semibold" style="background-color: ${cat.color}15; color: ${cat.color}">
              <span>${cat.icon}</span>
              <span>${cat.label}</span>
            </span>
          </td>
          <td class="py-3 px-4 max-w-xs">
            <div class="font-bold text-slate-900 truncate" title="${r.title}">${r.title}</div>
            <div class="text-[11px] text-slate-500 truncate" title="${r.description}">${r.description}</div>
          </td>
          <td class="py-3 px-4 max-w-xs">
            <div class="text-slate-800 truncate" title="${r.address}">${r.address}</div>
            <div class="text-[11px] text-slate-400 font-medium">Col. ${r.colonia || 'Gómez Palacio'}</div>
          </td>
          <td class="py-3 px-4">
            ${imgThumbnail}
          </td>
          <td class="py-3 px-4 whitespace-nowrap">
            ${statusBadge}
          </td>
          <td class="py-3 px-4 text-right whitespace-nowrap space-x-1">
            <button onclick="AdminApp.openManageModal(${r.id})" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition-colors shadow-sm inline-flex items-center space-x-1">
              <span>Gestionar</span>
            </button>
            <button onclick="AdminApp.viewDirectOnMap(${r.latitude}, ${r.longitude})" title="Ver en el mapa" class="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors inline-flex items-center">
              📍
            </button>
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  },

  openManageModal(reportId) {
    const report = this.allReports.find(r => r.id === reportId);
    if (!report) return;

    this.currentReportId = report.id;
    const cat = CATEGORY_META[report.category] || CATEGORY_META.otro;

    document.getElementById('manage-folio').textContent = report.folio;
    document.getElementById('manage-title').textContent = report.title;
    document.getElementById('manage-badge-category').textContent = `${cat.icon} ${cat.label}`;
    document.getElementById('manage-address').textContent = report.address;
    document.getElementById('manage-colonia').textContent = `Colonia: ${report.colonia || 'Gómez Palacio'}`;
    document.getElementById('manage-description').textContent = report.description;
    document.getElementById('manage-reporter').textContent = report.reporter_name || 'Ciudadano Anónimo';
    document.getElementById('manage-date').textContent = new Date(report.created_at).toLocaleString('es-MX');
    document.getElementById('manage-coords').textContent = `Lat: ${report.latitude.toFixed(5)} | Lng: ${report.longitude.toFixed(5)}`;
    
    // Notes
    document.getElementById('manage-notes-input').value = report.admin_notes || '';

    // Photo
    const photoEl = document.getElementById('manage-photo');
    if (report.image_url) {
      photoEl.src = report.image_url;
      photoEl.classList.remove('hidden');
    } else {
      photoEl.src = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&auto=format&fit=crop&q=60';
    }

    // Set active status radio
    const radios = document.getElementsByName('admin-status-radio');
    for (const radio of radios) {
      radio.checked = (radio.value === report.status);
    }

    document.getElementById('modal-admin-manage').classList.remove('hidden');
    lucide.createIcons();
  },

  closeManageModal() {
    document.getElementById('modal-admin-manage').classList.add('hidden');
    this.currentReportId = null;
  },

  async saveStatusUpdate() {
    if (!this.currentReportId) return;

    let selectedStatus = 'Pendiente';
    const radios = document.getElementsByName('admin-status-radio');
    for (const radio of radios) {
      if (radio.checked) {
        selectedStatus = radio.value;
        break;
      }
    }

    const notes = document.getElementById('manage-notes-input').value.trim();

    try {
      const res = await API.updateReportStatus(this.currentReportId, selectedStatus, notes);
      if (res.success) {
        this.closeManageModal();
        await this.refreshData();
        await App.loadAllData(); // Update map and sidebar too
        alert(`¡Alerta actualizada a estado "${selectedStatus}" correctamente!`);
      }
    } catch (err) {
      alert(`Error al guardar actualización: ${err.message}`);
    }
  },

  async deleteReport() {
    if (!this.currentReportId) return;
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente esta alerta?')) return;

    try {
      const res = await API.deleteReport(this.currentReportId);
      if (res.success) {
        this.closeManageModal();
        await this.refreshData();
        await App.loadAllData();
        alert('Alerta eliminada');
      }
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  },

  showOnMapFromModal() {
    const report = this.allReports.find(r => r.id === this.currentReportId);
    if (!report) return;

    this.closeManageModal();
    App.switchView('map');
    MapApp.focusReport(report.latitude, report.longitude);
  },

  viewDirectOnMap(lat, lng) {
    App.switchView('map');
    MapApp.focusReport(lat, lng);
  },

  exportCSV() {
    window.location.href = '/api/export';
  }
};

