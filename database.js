// database.js - Native SQLite storage for Alertas Gómez Palacio
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(__dirname, 'alertas_gp.db');
const db = new DatabaseSync(dbPath);

// Initialize tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      address TEXT NOT NULL,
      colonia TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'Pendiente',
      admin_notes TEXT,
      reporter_name TEXT DEFAULT 'Ciudadano Anónimo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
  `);

  // Seed sample realistic reports if empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM reports').get();
  if (countRow.count === 0) {
    seedInitialReports();
  }
}

function seedInitialReports() {
  const seedReports = [
    {
      folio: 'GP-2026-001',
      category: 'baches',
      title: 'Bache profundo en carril derecho frente a Soriana',
      description: 'Hay un hoyo grande de casi 1 metro de diámetro con varillas expuestas que ya dañó la llanta de dos vehículos. Es muy peligroso en la noche por falta de visibilidad.',
      address: 'Blvd. Ejército Mexicano #1200, Col. Hamburgo',
      colonia: 'Hamburgo',
      latitude: 25.5925,
      longitude: -103.5042,
      image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
      status: 'Pendiente',
      admin_notes: '',
      reporter_name: 'Vecino de Hamburgo'
    },
    {
      folio: 'GP-2026-002',
      category: 'agua',
      title: 'Fuga constante de agua potable en banqueta',
      description: 'Lleva más de 4 días brotando agua limpia a presión. Se está desperdiciando muchísima agua y ya se formó un encharcamiento que abarca media cuadra.',
      address: 'Calle 5 de Mayo esq. Av. Victoria, Col. Centro',
      colonia: 'Centro',
      latitude: 25.5645,
      longitude: -103.4968,
      image_url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80',
      status: 'En Proceso',
      admin_notes: 'Cuadrilla de SIDEAPA asignada con folio SIDE-448. Programada atención técnica.',
      reporter_name: 'Comerciante Centro'
    },
    {
      folio: 'GP-2026-003',
      category: 'luz',
      title: 'Lámparas de alumbrado público apagadas en parque',
      description: 'El circuito completo de 6 luminarias LED del parque lineal se encuentra fuera de servicio. La plaza queda en total oscuridad a partir de las 7:30 pm.',
      address: 'Av. Filadelfia entre Calle 12 y 14, Col. Filadelfia',
      colonia: 'Filadelfia',
      latitude: 25.5785,
      longitude: -103.4912,
      image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
      status: 'Pendiente',
      admin_notes: '',
      reporter_name: 'Comité de Colonos'
    },
    {
      folio: 'GP-2026-004',
      category: 'basura',
      title: 'Tiradero clandestino de escombros y ramas secas',
      description: 'Camiones de carga han estado tirando cascajo, llantas viejas y ramas en este terreno baldío municipal. Hay riesgo de incendio y fauna nociva.',
      address: 'Calzada Carlos Herrera, Parque Industrial Lagunero',
      colonia: 'Parque Industrial',
      latitude: 25.5532,
      longitude: -103.4855,
      image_url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600&auto=format&fit=crop&q=80',
      status: 'Resuelto',
      admin_notes: 'Dirección de Servicios Públicos Municipales realizó retiro de 12 toneladas de escombro con maquinaria pesada.',
      reporter_name: 'Trabajador de Zona Industrial'
    },
    {
      folio: 'GP-2026-005',
      category: 'drenaje',
      title: 'Brote de aguas residuales en alcantarilla',
      description: 'Olor muy fétido y agua negra acumulada que impide el cruce peatonal hacia la escuela primaria cercana.',
      address: 'Av. Ingenieros esq. Calle Justo Sierra, Col. Santa Rosa',
      colonia: 'Santa Rosa',
      latitude: 25.5590,
      longitude: -103.5075,
      image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=600&auto=format&fit=crop&q=80',
      status: 'En Proceso',
      admin_notes: 'Camión vactor de SIDEAPA en ruta para desazolve de línea general.',
      reporter_name: 'Madre de familia'
    },
    {
      folio: 'GP-2026-006',
      category: 'semaforo',
      title: 'Semáforo intermitente apagado en cruce transitado',
      description: 'El semáforo del cruce quedó completamente apagado tras la lluvia, ya van dos conatos de choque.',
      address: 'Blvd. Miguel Alemán y Av. Agustín Castro, Col. Las Rosas',
      colonia: 'Las Rosas',
      latitude: 25.5510,
      longitude: -103.4980,
      image_url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?w=600&auto=format&fit=crop&q=80',
      status: 'Resuelto',
      admin_notes: 'Personal de Ingeniería Vial reemplazó relevador de potencia dañado.',
      reporter_name: 'Automovilista'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO reports (
      folio, category, title, description, address, colonia,
      latitude, longitude, image_url, status, admin_notes, reporter_name, created_at, resolved_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 days'), ?
    )
  `);

  for (const r of seedReports) {
    const resolvedAt = r.status === 'Resuelto' ? new Date().toISOString() : null;
    insert.run(
      r.folio, r.category, r.title, r.description, r.address, r.colonia,
      r.latitude, r.longitude, r.image_url, r.status, r.admin_notes, r.reporter_name, resolvedAt
    );
  }
}

// Model methods
const ReportsModel = {
  getAll: (filters = {}) => {
    let sql = 'SELECT * FROM reports WHERE 1=1';
    const params = [];

    if (filters.category && filters.category !== 'todas') {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.status && filters.status !== 'todos') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR address LIKE ? OR folio LIKE ? OR colonia LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY created_at DESC';
    return db.prepare(sql).all(...params);
  },

  getById: (id) => {
    return db.prepare('SELECT * FROM reports WHERE id = ?').get(id);
  },

  getByFolio: (folio) => {
    return db.prepare('SELECT * FROM reports WHERE folio = ?').get(folio);
  },

  create: (data) => {
    // Generate clean folio: GP-YYYY-XXXX
    const randomHex = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const folio = `GP-${year}-${randomHex}`;

    const stmt = db.prepare(`
      INSERT INTO reports (
        folio, category, title, description, address, colonia,
        latitude, longitude, image_url, status, reporter_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `);

    const result = stmt.run(
      folio,
      data.category,
      data.title,
      data.description,
      data.address,
      data.colonia || 'Gómez Palacio',
      data.latitude,
      data.longitude,
      data.image_url || null,
      data.reporter_name || 'Ciudadano Anónimo'
    );

    return ReportsModel.getById(result.lastInsertRowid);
  },

  updateStatus: (id, status, adminNotes = '') => {
    const isResolved = status === 'Resuelto';
    const resolvedAt = isResolved ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE reports 
      SET status = ?, admin_notes = ?, resolved_at = ?
      WHERE id = ?
    `).run(status, adminNotes, resolvedAt, id);

    return ReportsModel.getById(id);
  },

  delete: (id) => {
    return db.prepare('DELETE FROM reports WHERE id = ?').run(id);
  },

  getStats: () => {
    const total = db.prepare('SELECT COUNT(*) as count FROM reports').get().count;
    const pendientes = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'Pendiente'").get().count;
    const enProceso = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'En Proceso' OR status = 'En Revisión'").get().count;
    const resueltos = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'Resuelto'").get().count;

    const byCategory = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM reports 
      GROUP BY category 
      ORDER BY count DESC
    `).all();

    return {
      total,
      pendientes,
      enProceso,
      resueltos,
      byCategory
    };
  }
};

initDatabase();

module.exports = {
  db,
  ReportsModel
};

