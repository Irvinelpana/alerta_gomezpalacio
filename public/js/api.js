// api.js - Client API communication
const API = {
  // Fetch all reports with optional filters
  async getReports(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'todas') params.append('category', filters.category);
    if (filters.status && filters.status !== 'todos') params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);

    const url = `/api/reports${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar reportes');
    return await res.json();
  },

  // Fetch dashboard stats
  async getStats() {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Error al cargar estadísticas');
    return await res.json();
  },

  // Create citizen report (Modo abierto - sin registro)
  async createReport(reportData) {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al guardar el reporte');
    }
    return data;
  },

  // Update report status (Admin)
  async updateReportStatus(id, status, adminNotes = '') {
    const res = await fetch(`/api/reports/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, admin_notes: adminNotes })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al actualizar estado');
    }
    return data;
  },

  // Delete report (Admin)
  async deleteReport(id) {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al eliminar reporte');
    }
    return data;
  }
};

