// app.js - Main Application Orchestrator for Alertas Gómez Palacio
const App = {
  currentView: 'map', // 'map' | 'admin'
  currentRole: null,  // 'ciudadano' | 'admin' | null
  reports: [],
  selectedCategory: 'baches',
  lastCreatedReport: null,
  sidebarSearchTerm: '',

  async init() {
    MapApp.init();
    await this.loadAllData();
    AdminApp.init();
    
    // Check saved session or show login portal
    const savedRole = sessionStorage.getItem('gp_user_role');
    if (savedRole === 'admin' || savedRole === 'ciudadano') {
      this.setRole(savedRole, false);
    } else {
      this.showLoginScreen();
    }

    // Auto-refresh reports every 30 seconds for live community mapping
    setInterval(() => {
      this.loadAllData(false);
      if (this.currentRole === 'admin') {
        AdminApp.refreshData();
      }
    }, 30000);
  },

  // -------------------------------------------------------------
  // AUTHENTICATION & ROLE MANAGEMENT (Ciudadano vs Admin)
  // -------------------------------------------------------------

  showLoginScreen() {
    this.currentRole = null;
    sessionStorage.removeItem('gp_user_role');
    const loginScreen = document.getElementById('view-login-screen');
    const mainApp = document.getElementById('main-app-layout');
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
    }
    if (mainApp) {
      mainApp.classList.add('hidden');
    }
    lucide.createIcons();
  },

  loginAsCitizen() {
    this.setRole('ciudadano', true);
  },

  loginAsAdmin(e) {
    if (e) e.preventDefault();
    const userIn = document.getElementById('admin-user-input');
    const passIn = document.getElementById('admin-pass-input');
    const errorEl = document.getElementById('admin-login-error');

    const username = (userIn ? userIn.value : '').trim();
    const password = (passIn ? passIn.value : '').trim();

    if (username === 'admin' && password === 'admin') {
      if (errorEl) errorEl.classList.add('hidden');
      this.setRole('admin', true);
    } else {
      if (errorEl) {
        errorEl.classList.remove('hidden');
        lucide.createIcons();
      }
    }
  },

  setRole(role, saveSession = true) {
    this.currentRole = role;
    if (saveSession) {
      sessionStorage.setItem('gp_user_role', role);
    }

    // Hide portal login screen, show main app
    const loginScreen = document.getElementById('view-login-screen');
    const mainApp = document.getElementById('main-app-layout');
    if (loginScreen) {
      loginScreen.classList.add('hidden');
    }
    if (mainApp) {
      mainApp.classList.remove('hidden');
    }

    const roleBadge = document.getElementById('header-role-badge');
    const btnAdminDesktop = document.getElementById('nav-btn-admin');
    const btnAdminMobile = document.getElementById('m-nav-admin');

    if (role === 'ciudadano') {
      // Citizen Mode: Only sees the community map and report creation
      if (roleBadge) {
        roleBadge.textContent = 'Ciudadano';
        roleBadge.className = 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full';
      }
      // Hide admin tabs
      if (btnAdminDesktop) btnAdminDesktop.classList.add('hidden');
      if (btnAdminMobile) btnAdminMobile.classList.add('hidden');

      // Make sure view is on map
      this.switchView('map');

    } else if (role === 'admin') {
      // Admin Mode: Full access to map AND administrative resolution portal
      if (roleBadge) {
        roleBadge.textContent = 'Admin Municipal';
        roleBadge.className = 'bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full';
      }
      // Show admin tabs
      if (btnAdminDesktop) btnAdminDesktop.classList.remove('hidden');
      if (btnAdminMobile) btnAdminMobile.classList.remove('hidden');

      AdminApp.refreshData();
    }

    // Resize map cleanly
    setTimeout(() => {
      if (MapApp.map) MapApp.map.invalidateSize();
    }, 150);

    lucide.createIcons();
  },

  logout() {
    const userIn = document.getElementById('admin-user-input');
    const passIn = document.getElementById('admin-pass-input');
    const errEl = document.getElementById('admin-login-error');
    if (userIn) userIn.value = '';
    if (passIn) passIn.value = '';
    if (errEl) errEl.classList.add('hidden');

    this.showLoginScreen();
    this.switchView('map');
  },

  async loadAllData(showLoader = true) {
    try {
      const data = await API.getReports();
      if (data.success) {
        this.reports = data.reports;
        MapApp.renderReports(this.reports);
        this.renderSidebarReports();
      }
    } catch (err) {
      console.error('Error cargando reportes:', err);
    }
  },

  // View Switcher (Desktop and Mobile)
  switchView(viewName) {
    // Prevent non-admin users from accessing admin view
    if (viewName === 'admin' && this.currentRole !== 'admin') {
      alert('Se requieren permisos de Administrador para acceder a esta sección.');
      return;
    }

    this.currentView = viewName;
    const mapContainer = document.getElementById('view-map-container');
    const adminContainer = document.getElementById('view-admin-container');
    
    const btnMap = document.getElementById('nav-btn-map');
    const btnAdmin = document.getElementById('nav-btn-admin');
    
    // Mobile nav buttons
    const mNavMap = document.getElementById('m-nav-map');
    const mNavAdmin = document.getElementById('m-nav-admin');

    if (viewName === 'map') {
      mapContainer.classList.remove('hidden');
      adminContainer.classList.add('hidden');

      btnMap.classList.add('active-tab', 'text-white');
      btnMap.classList.remove('text-rose-100');
      btnAdmin.classList.remove('active-tab');
      btnAdmin.classList.add('text-rose-100');

      if (mNavMap) {
        mNavMap.classList.add('text-gp-primary');
        mNavMap.classList.remove('text-slate-500');
      }
      if (mNavAdmin) {
        mNavAdmin.classList.add('text-slate-500');
        mNavAdmin.classList.remove('text-gp-primary');
      }

      // Invalidate Leaflet map size when becoming visible
      setTimeout(() => {
        if (MapApp.map) MapApp.map.invalidateSize();
      }, 100);

    } else if (viewName === 'admin') {
      mapContainer.classList.add('hidden');
      adminContainer.classList.remove('hidden');

      btnAdmin.classList.add('active-tab', 'text-white');
      btnAdmin.classList.remove('text-rose-100');
      btnMap.classList.remove('active-tab');
      btnMap.classList.add('text-rose-100');

      if (mNavAdmin) {
        mNavAdmin.classList.add('text-gp-primary');
        mNavAdmin.classList.remove('text-slate-500');
      }
      if (mNavMap) {
        mNavMap.classList.add('text-slate-500');
        mNavMap.classList.remove('text-gp-primary');
      }

      AdminApp.refreshData();
    }
  },

  // Toggle Sidebar Drawer (Mobile & Desktop)
  toggleSidebar(forceState) {
    const sidebar = document.getElementById('reports-sidebar');
    if (forceState !== undefined) {
      if (forceState) {
        sidebar.classList.remove('translate-x-full');
      } else {
        sidebar.classList.add('translate-x-full');
      }
    } else {
      sidebar.classList.toggle('translate-x-full');
    }
  },

  // Render Sidebar List
  renderSidebarReports() {
    const listEl = document.getElementById('sidebar-reports-list');
    if (!listEl) return;

    let filtered = this.reports.filter(r => {
      // Category filter match
      if (MapApp.currentCategoryFilter !== 'todas' && r.category !== MapApp.currentCategoryFilter) {
        return false;
      }
      // Resolved filter match
      if (!MapApp.showResolved && r.status === 'Resuelto') {
        return false;
      }
      // Search term
      if (this.sidebarSearchTerm) {
        const text = `${r.title} ${r.description} ${r.address} ${r.colonia || ''} ${r.folio}`.toLowerCase();
        if (!text.includes(this.sidebarSearchTerm)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="py-10 text-center text-slate-400 text-xs">
          <i data-lucide="map-pin-off" class="w-8 h-8 mx-auto text-slate-300 mb-2"></i>
          <p class="font-medium">No hay alertas en esta categoría</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    listEl.innerHTML = filtered.map(r => {
      const cat = CATEGORY_META[r.category] || CATEGORY_META.otro;
      const isResolved = r.status === 'Resuelto';

      const statusBadge = isResolved
        ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">🟢 Resuelto</span>'
        : (r.status === 'En Proceso'
          ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">🔵 En Proceso</span>'
          : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">🟡 Pendiente</span>');

      const imgHtml = `
        <div class="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200 flex items-center justify-center relative shadow-inner">
          <span class="text-xl">${cat.icon}</span>
          ${r.image_url ? `<img src="${r.image_url}" alt="" class="absolute inset-0 w-full h-full object-cover" onerror="this.remove()">` : ''}
        </div>
      `;

      const timeAgo = this.formatTimeAgo(r.created_at);

      return `
        <div onclick="App.focusOnReportFromSidebar(${r.latitude}, ${r.longitude})" class="p-3 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl cursor-pointer transition-all shadow-sm hover:shadow group flex space-x-3">
          ${imgHtml}
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] font-mono font-bold text-slate-400">${r.folio}</span>
              ${statusBadge}
            </div>
            
            <h4 class="font-bold text-xs text-slate-900 group-hover:text-gp-primary truncate transition-colors">
              ${r.title}
            </h4>

            <p class="text-[11px] text-slate-500 truncate mt-0.5">
              📍 ${r.address}
            </p>

            <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
              <span class="font-semibold text-slate-600">${cat.icon} ${cat.label}</span>
              <span>${timeAgo}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  },

  onSearchInput(val) {
    this.sidebarSearchTerm = (val || '').toLowerCase().trim();
    this.renderSidebarReports();
  },

  focusOnReportFromSidebar(lat, lng) {
    // If mobile, close drawer so user sees map
    if (window.innerWidth < 768) {
      this.toggleSidebar(false);
    }
    MapApp.focusReport(lat, lng);
  },

  formatTimeAgo(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Hace unos momentos';
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  },

  // ==============================================================
  // NEW REPORT MODAL (MODO ABIERTO - SIN REGISTRO)
  // ==============================================================

  openNewReportModal() {
    document.getElementById('modal-new-report').classList.remove('hidden');
    
    // Invalidate size on picker mini map once visible
    setTimeout(() => {
      if (MapApp.pickerMap) {
        MapApp.pickerMap.invalidateSize();
        // Default to Gómez Palacio Centro or current map center
        const center = MapApp.map.getCenter();
        MapApp.setPickerLocation(center.lat, center.lng);
      }
    }, 150);

    lucide.createIcons();
  },

  closeNewReportModal() {
    document.getElementById('modal-new-report').classList.add('hidden');
  },

  selectCategory(cat, btnEl) {
    this.selectedCategory = cat;
    document.getElementById('report-category').value = cat;

    // Update active UI
    document.querySelectorAll('#category-selector-grid .cat-card').forEach(b => {
      b.classList.remove('active-cat');
    });
    if (btnEl) btnEl.classList.add('active-cat');
  },

  getGPSForReport() {
    if (!navigator.geolocation) {
      alert('Geolocalización no disponible en este dispositivo');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!MapApp.isWithinGomezPalacio(latitude, longitude)) {
          alert('Tu ubicación GPS actual está fuera de Gómez Palacio, Durango. Por favor coloca el pin manualmente dentro del municipio.');
          MapApp.setPickerLocation(GOMEZ_PALACIO_CENTER[0], GOMEZ_PALACIO_CENTER[1], 15);
          return;
        }
        MapApp.setPickerLocation(latitude, longitude, 17);
      },
      (err) => {
        alert('No se pudo obtener la ubicación GPS actual. Puedes mover el pin manualmente en el mapa.');
      },
      { enableHighAccuracy: true }
    );
  },

  // Image Selection & Client-Side Compression
  handleImageSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress and resize image client-side to max 1280px width/height for fast mobile uploads
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Get compressed base64 JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);

        // Set hidden input
        document.getElementById('report-image-base64').value = compressedBase64;

        // Show preview
        document.getElementById('preview-img').src = compressedBase64;
        document.getElementById('dropzone-prompt').classList.add('hidden');
        document.getElementById('dropzone-preview').classList.remove('hidden');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  clearSelectedImage(event) {
    if (event) event.stopPropagation();
    document.getElementById('report-image-input').value = '';
    document.getElementById('report-image-base64').value = '';
    document.getElementById('preview-img').src = '';
    document.getElementById('dropzone-prompt').classList.remove('hidden');
    document.getElementById('dropzone-preview').classList.add('hidden');
  },

  // Form Submission
  async submitReport(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('btn-submit-report');
    const originalText = submitBtn.innerHTML;

    // Validate image
    const imageBase64 = document.getElementById('report-image-base64').value;
    if (!imageBase64) {
      alert('Por favor agrega una fotografía o evidencia del problema');
      return;
    }

    const payload = {
      category: document.getElementById('report-category').value,
      title: document.getElementById('report-title').value.trim(),
      description: document.getElementById('report-description').value.trim(),
      address: document.getElementById('report-address').value.trim(),
      colonia: document.getElementById('report-colonia').value.trim(),
      latitude: parseFloat(document.getElementById('report-lat').value),
      longitude: parseFloat(document.getElementById('report-lng').value),
      image: imageBase64,
      reporter_name: document.getElementById('report-reporter').value.trim() || 'Ciudadano Anónimo'
    };

    // Check municipality boundary
    if (!MapApp.isWithinGomezPalacio(payload.latitude, payload.longitude)) {
      alert('⚠️ Ubicación inválida: La alerta debe estar dentro del municipio de Gómez Palacio, Durango.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>
        <span>Publicando alerta en Gómez Palacio...</span>
      `;
      lucide.createIcons();

      const res = await API.createReport(payload);

      if (res.success) {
        this.lastCreatedReport = res.report;

        // Reset form
        document.getElementById('form-new-report').reset();
        this.clearSelectedImage();

        // Close form modal
        this.closeNewReportModal();

        // Refresh data
        await this.loadAllData();
        AdminApp.refreshData();

        // Trigger confetti celebration!
        this.triggerConfetti();

        // Show Success Modal with Folio
        document.getElementById('success-folio-display').textContent = res.report.folio;
        document.getElementById('modal-success').classList.remove('hidden');
        lucide.createIcons();
      }

    } catch (err) {
      alert(`Error al registrar alerta: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      lucide.createIcons();
    }
  },

  triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  },

  copyFolio() {
    if (!this.lastCreatedReport) return;
    navigator.clipboard.writeText(this.lastCreatedReport.folio).then(() => {
      alert(`Folio ${this.lastCreatedReport.folio} copiado al portapapeles`);
    });
  },

  closeSuccessModal() {
    document.getElementById('modal-success').classList.add('hidden');
  },

  viewCreatedOnMap() {
    this.closeSuccessModal();
    if (this.lastCreatedReport) {
      this.switchView('map');
      MapApp.focusReport(this.lastCreatedReport.latitude, this.lastCreatedReport.longitude, 17);
    }
  },

  // Photo Viewer Modal
  openFullPhoto(imgSrc) {
    if (!imgSrc) return;
    document.getElementById('photo-viewer-img').src = imgSrc;
    document.getElementById('modal-photo-viewer').classList.remove('hidden');
  }
};

