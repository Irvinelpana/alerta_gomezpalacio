// map.js - Leaflet Map Engine for Gómez Palacio
const isMobileDevice = () => window.innerWidth < 768;
const GOMEZ_PALACIO_CENTER = [25.5677, -103.4988];
const getInitialZoom = () => (isMobileDevice() ? 12.8 : 13.5);

// Geographic limits for Gómez Palacio, Durango
const GOMEZ_PALACIO_BOUNDS = [
  [25.4600, -103.6500], // Suroeste
  [25.7700, -103.3500]  // Noreste
];

const CATEGORY_META = {
  agua: { label: 'Agua / Fuga', icon: '💧', class: 'pin-cat-agua', color: '#0284c7' },
  luz: { label: 'Sin Luz', icon: '💡', class: 'pin-cat-luz', color: '#f59e0b' },
  baches: { label: 'Bache / Vialidad', icon: '🕳️', class: 'pin-cat-baches', color: '#ea580c' },
  basura: { label: 'Basura / Escombro', icon: '🗑️', class: 'pin-cat-basura', color: '#16a34a' },
  drenaje: { label: 'Drenaje Tapado', icon: '🚽', class: 'pin-cat-drenaje', color: '#9333ea' },
  semaforo: { label: 'Semáforo', icon: '🚦', class: 'pin-cat-semaforo', color: '#4f46e5' },
  parques: { label: 'Parques y Árboles', icon: '🌳', class: 'pin-cat-parques', color: '#0d9488' },
  otro: { label: 'Otro Reporte', icon: '⚠️', class: 'pin-cat-otro', color: '#64748b' }
};

const MapApp = {
  map: null,
  pickerMap: null,
  pickerMarker: null,
  markersLayer: null,
  userLocationMarker: null,
  allReports: [],
  currentCategoryFilter: 'todas',
  showResolved: true,
  currentTileType: 'streets', // 'streets' | 'satellite'
  streetLayer: null,
  satelliteLayer: null,

  // Boundary checker
  isWithinGomezPalacio(lat, lng) {
    const minLat = 25.4600;
    const maxLat = 25.7700;
    const minLng = -103.6500;
    const maxLng = -103.3500;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  },

  init() {
    this.initMainMap();
    this.initPickerMap();
  },

  // Initialize primary city map
  initMainMap() {
    this.map = L.map('gomez-map', {
      zoomControl: false,
      attributionControl: true,
      maxBounds: GOMEZ_PALACIO_BOUNDS,
      maxBoundsViscosity: 1.0, // Rebounds smoothly if user attempts to pan outside Gomez Palacio
      minZoom: 12,              // Keeps user inside Gomez Palacio scale
      maxZoom: 19
    }).setView(GOMEZ_PALACIO_CENTER, getInitialZoom());

    // Free OpenStreetMap Standard Tiles (No API key needed, detailed Gomez Palacio streets)
    this.streetLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Free Esri Satellite Tiles (No API key needed)
    this.satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    });

    // Zoom control at bottom left
    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    // Map click allows quick reporting at exact coordinate
    this.map.on('contextmenu', (e) => {
      this.openReportAtLatLng(e.latlng.lat, e.latlng.lng);
    });
  },

  openReportAtLatLng(lat, lng) {
    if (!this.isWithinGomezPalacio(lat, lng)) {
      alert('⚠️ Solo se pueden registrar alertas dentro del municipio de Gómez Palacio, Durango.');
      return;
    }
    if (typeof App !== 'undefined' && App.openNewReportModal) {
      App.openNewReportModal();
      this.setPickerLocation(lat, lng);
    }
  },

  // Toggle between Street map and Satellite map
  toggleMapLayer() {
    if (this.currentTileType === 'streets') {
      this.map.removeLayer(this.streetLayer);
      this.map.addLayer(this.satelliteLayer);
      this.currentTileType = 'satellite';
      const btn = document.getElementById('btn-map-layer-toggle');
      if (btn) btn.innerHTML = '<span>🗺️ Modo Calles</span>';
    } else {
      this.map.removeLayer(this.satelliteLayer);
      this.map.addLayer(this.streetLayer);
      this.currentTileType = 'streets';
      const btn = document.getElementById('btn-map-layer-toggle');
      if (btn) btn.innerHTML = '<span>🛰️ Satélite</span>';
    }
  },

  // Initialize mini picker map inside the New Report modal
  initPickerMap() {
    this.pickerMap = L.map('picker-map', {
      zoomControl: false,
      attributionControl: false,
      maxBounds: GOMEZ_PALACIO_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 12,
      maxZoom: 19
    }).setView(GOMEZ_PALACIO_CENTER, 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.pickerMap);

    const pickerIcon = L.divIcon({
      className: 'custom-picker-pin',
      html: `
        <div style="background-color: #851b2d; color: white; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid white;">
          <span style="transform: rotate(45deg); font-size: 15px;">📍</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });

    this.pickerMarker = L.marker(GOMEZ_PALACIO_CENTER, {
      draggable: true,
      icon: pickerIcon
    }).addTo(this.pickerMap);

    // Update coordinates on drag
    this.pickerMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      this.updatePickerCoords(pos.lat, pos.lng);
    });

    // Update coordinates on click
    this.pickerMap.on('click', (e) => {
      this.pickerMarker.setLatLng(e.latlng);
      this.updatePickerCoords(e.latlng.lat, e.latlng.lng);
    });
  },

  updatePickerCoords(lat, lng) {
    const latFixed = Number(lat).toFixed(5);
    const lngFixed = Number(lng).toFixed(5);
    
    document.getElementById('report-lat').value = latFixed;
    document.getElementById('report-lng').value = lngFixed;
    document.getElementById('picker-lat-text').textContent = latFixed;
    document.getElementById('picker-lng-text').textContent = lngFixed;

    const isValid = this.isWithinGomezPalacio(Number(lat), Number(lng));
    const warningEl = document.getElementById('picker-boundary-warning');
    const badgeEl = document.getElementById('picker-status-badge');
    const submitBtn = document.getElementById('btn-submit-report');

    if (isValid) {
      if (warningEl) warningEl.classList.add('hidden');
      if (badgeEl) {
        badgeEl.className = 'text-emerald-600 font-semibold flex items-center space-x-1';
        badgeEl.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i><span>Gómez Palacio</span>';
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    } else {
      if (warningEl) warningEl.classList.remove('hidden');
      if (badgeEl) {
        badgeEl.className = 'text-rose-600 font-semibold flex items-center space-x-1';
        badgeEl.innerHTML = '<i data-lucide="x" class="w-3 h-3"></i><span>Fuera de Gómez Palacio</span>';
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  },

  setPickerLocation(lat, lng, zoom = 16) {
    this.pickerMarker.setLatLng([lat, lng]);
    this.pickerMap.setView([lat, lng], zoom);
    this.updatePickerCoords(lat, lng);
  },

  // Refresh and plot reports on the map
  renderReports(reports) {
    this.allReports = reports;
    this.markersLayer.clearLayers();

    let visibleCount = 0;

    reports.forEach(report => {
      // Category filter check
      if (this.currentCategoryFilter !== 'todas' && report.category !== this.currentCategoryFilter) {
        return;
      }

      // Resolved filter check
      const isResolved = report.status === 'Resuelto';
      if (!this.showResolved && isResolved) {
        return;
      }

      visibleCount++;
      const cat = CATEGORY_META[report.category] || CATEGORY_META.otro;
      const isPending = report.status === 'Pendiente';

      // Pin HTML
      const pinClass = isResolved ? 'pin-cat-resolved' : cat.class;
      const resolvedBadge = isResolved ? '<div class="pin-badge-resolved">✓</div>' : '';
      const pulseRing = isPending ? '<div class="pulse-ring"></div>' : '';

      const iconHtml = `
        <div class="custom-map-pin">
          ${pulseRing}
          <div class="pin-bubble ${pinClass}">
            <div class="pin-bubble-content">${cat.icon}</div>
          </div>
          ${resolvedBadge}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: iconHtml,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
      });

      const marker = L.marker([report.latitude, report.longitude], { icon: customIcon });

      // Generate rich popup content
      const popupHtml = this.createPopupHtml(report, cat);
      marker.bindPopup(popupHtml, { maxWidth: 300 });

      this.markersLayer.addLayer(marker);
    });

    // Update count in UI
    const countEl = document.getElementById('chip-count-todas');
    if (countEl) countEl.textContent = `(${this.allReports.length})`;
  },

  createPopupHtml(report, cat) {
    const isResolved = report.status === 'Resuelto';
    const statusBadge = isResolved 
      ? '<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🟢 Resuelto</span>'
      : (report.status === 'En Proceso'
        ? '<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🔵 En Proceso</span>'
        : '<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">🟡 Pendiente</span>');

    const imageHtml = report.image_url 
      ? `<div class="h-32 w-full overflow-hidden bg-slate-100 cursor-pointer relative" onclick="App.openFullPhoto('${report.image_url}')">
           <img src="${report.image_url}" alt="" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" onerror="this.parentElement.style.display='none'">
         </div>`
      : '';

    const notesHtml = report.admin_notes
      ? `<div class="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-[11px] text-emerald-800">
           <strong>Respuesta oficial:</strong> ${report.admin_notes}
         </div>`
      : '';

    return `
      <div class="popup-card text-xs">
        ${imageHtml}
        <div class="p-3">
          <div class="flex items-center justify-between mb-1">
            <span class="font-mono text-[10px] text-slate-400 font-bold">${report.folio}</span>
            ${statusBadge}
          </div>
          
          <h4 class="font-bold text-slate-900 text-sm mb-1 leading-snug">${report.title}</h4>
          
          <div class="text-[11px] text-slate-500 mb-2 flex items-start space-x-1">
            <span>📍</span>
            <span>${report.address}${report.colonia ? `, Col. ${report.colonia}` : ''}</span>
          </div>

          <p class="text-slate-600 text-[11px] line-clamp-3 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
            ${report.description}
          </p>

          ${notesHtml}

          <div class="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Reportado: ${new Date(report.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
            <span class="font-medium text-gp-primary">${cat.label}</span>
          </div>
        </div>
      </div>
    `;
  },

  // Category filter
  setCategoryFilter(category) {
    this.currentCategoryFilter = category;
    
    // Update chip UI
    document.querySelectorAll('.category-chip').forEach(btn => {
      if (btn.dataset.cat === category) {
        btn.classList.add('active', 'bg-slate-900', 'text-white');
        btn.classList.remove('text-slate-700', 'hover:bg-slate-100');
      } else {
        btn.classList.remove('active', 'bg-slate-900', 'text-white');
        btn.classList.add('text-slate-700', 'hover:bg-slate-100');
      }
    });

    this.renderReports(this.allReports);
    App.renderSidebarReports();
  },

  // Toggle resolved markers
  toggleResolvedMarkers() {
    this.showResolved = document.getElementById('toggle-show-resolved').checked;
    this.renderReports(this.allReports);
    App.renderSidebarReports();
  },

  // Center on Gómez Palacio
  centerGomezPalacio() {
    this.map.flyTo(GOMEZ_PALACIO_CENTER, getInitialZoom(), { duration: 1.2 });
  },

  // Center on specific report
  focusReport(lat, lng, zoom = (isMobileDevice() ? 15.5 : 17)) {
    this.map.flyTo([lat, lng], zoom, { duration: 1.2 });
  },

  // Geolocation
  locateUser() {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        
        if (!this.isWithinGomezPalacio(latitude, longitude)) {
          alert('Tu ubicación actual está fuera del municipio de Gómez Palacio, Durango. Te hemos centrado en la ciudad.');
          this.centerGomezPalacio();
          return;
        }

        if (this.userLocationMarker) {
          this.userLocationMarker.setLatLng([latitude, longitude]);
        } else {
          const userIcon = L.divIcon({
            className: 'user-gps-marker',
            html: `
              <div style="width: 20px; height: 20px; border-radius: 50%; background-color: #2563eb; border: 3px solid white; box-shadow: 0 0 0 6px rgba(37,99,235,0.3);"></div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          this.userLocationMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(this.map);
        }

        this.map.flyTo([latitude, longitude], 16, { duration: 1.2 });
      },
      (err) => {
        alert('No se pudo obtener tu ubicación GPS. Asegúrate de permitir los permisos de ubicación en tu navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
};

