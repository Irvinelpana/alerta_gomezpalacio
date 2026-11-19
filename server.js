// server.js - Native Node.js Server & REST API for Alertas Gómez Palacio
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { ReportsModel } = require('./database.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads folder exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { success: false, error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // 15MB limit for photos
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

// Save base64 image data to uploads folder
function saveBase64Image(base64String) {
  if (!base64String || typeof base64String !== 'string') return null;
  
  // Format check: data:image/jpeg;base64,...
  const matches = base64String.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    // If it's already a URL or path, keep it
    if (base64String.startsWith('http') || base64String.startsWith('/uploads/')) {
      return base64String;
    }
    return null;
  }

  const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const filename = `alerta-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  fs.writeFileSync(filepath, buffer);
  return `/uploads/${filename}`;
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // GET /api/stats - Dashboard metrics
  if (req.method === 'GET' && pathname === '/api/stats') {
    try {
      const stats = ReportsModel.getStats();
      return sendJson(res, 200, { success: true, stats });
    } catch (err) {
      console.error('Error getting stats:', err);
      return sendError(res, 500, 'Error del servidor al obtener estadísticas');
    }
  }

  // GET /api/reports - List all reports with filters
  if (req.method === 'GET' && pathname === '/api/reports') {
    try {
      const category = parsedUrl.searchParams.get('category');
      const status = parsedUrl.searchParams.get('status');
      const search = parsedUrl.searchParams.get('search');

      const reports = ReportsModel.getAll({ category, status, search });
      return sendJson(res, 200, { success: true, reports });
    } catch (err) {
      console.error('Error fetching reports:', err);
      return sendError(res, 500, 'Error al consultar las alertas');
    }
  }

  // GET /api/reports/:id - Single report details
  const singleReportMatch = pathname.match(/^\/api\/reports\/(\d+)$/);
  if (req.method === 'GET' && singleReportMatch) {
    try {
      const id = parseInt(singleReportMatch[1], 10);
      const report = ReportsModel.getById(id);
      if (!report) return sendError(res, 404, 'Alerta no encontrada');
      return sendJson(res, 200, { success: true, report });
    } catch (err) {
      return sendError(res, 500, 'Error al consultar alerta');
    }
  }

  // POST /api/reports - Public open mode: create citizen report
  if (req.method === 'POST' && pathname === '/api/reports') {
    try {
      const body = await parseBody(req);

      // Validate required fields
      if (!body.category || !body.title || !body.description || !body.address) {
        return sendError(res, 400, 'Faltan campos obligatorios: categoría, descripción clave (título), descripción detallada y dirección');
      }

      const lat = parseFloat(body.latitude);
      const lng = parseFloat(body.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return sendError(res, 400, 'Coordenadas de ubicación inválidas en el mapa');
      }

      // Validate boundary of Gómez Palacio, Durango
      if (lat < 25.46 || lat > 25.77 || lng < -103.65 || lng > -103.35) {
        return sendError(res, 400, 'La alerta debe estar ubicada dentro del municipio de Gómez Palacio, Durango.');
      }

      // Handle image upload if provided as base64
      let imageUrl = null;
      if (body.image) {
        imageUrl = saveBase64Image(body.image);
      } else if (body.image_url) {
        imageUrl = body.image_url;
      }

      const newReport = ReportsModel.create({
        category: body.category.toLowerCase().trim(),
        title: body.title.trim(),
        description: body.description.trim(),
        address: body.address.trim(),
        colonia: body.colonia ? body.colonia.trim() : 'Gómez Palacio',
        latitude: lat,
        longitude: lng,
        image_url: imageUrl,
        reporter_name: body.reporter_name ? body.reporter_name.trim() : 'Ciudadano Anónimo'
      });

      return sendJson(res, 201, {
        success: true,
        message: '¡Alerta ciudadana registrada con éxito!',
        report: newReport
      });
    } catch (err) {
      console.error('Error creating report:', err);
      return sendError(res, 500, err.message || 'Error al guardar la alerta');
    }
  }

  // PATCH /api/reports/:id/status - Admin mode: update status & notes
  const statusMatch = pathname.match(/^\/api\/reports\/(\d+)\/status$/);
  if ((req.method === 'PATCH' || req.method === 'PUT') && statusMatch) {
    try {
      const id = parseInt(statusMatch[1], 10);
      const body = await parseBody(req);

      if (!body.status) {
        return sendError(res, 400, 'El estado es requerido (Pendiente, En Revisión, En Proceso, Resuelto, Rechazado)');
      }

      const updated = ReportsModel.updateStatus(id, body.status, body.admin_notes || '');
      if (!updated) {
        return sendError(res, 404, 'Alerta no encontrada');
      }

      return sendJson(res, 200, {
        success: true,
        message: `Estado actualizado a "${body.status}"`,
        report: updated
      });
    } catch (err) {
      console.error('Error updating status:', err);
      return sendError(res, 500, 'Error al actualizar el estado de la alerta');
    }
  }

  // DELETE /api/reports/:id - Admin mode: delete report
  if (req.method === 'DELETE' && singleReportMatch) {
    try {
      const id = parseInt(singleReportMatch[1], 10);
      ReportsModel.delete(id);
      return sendJson(res, 200, { success: true, message: 'Alerta eliminada correctamente' });
    } catch (err) {
      return sendError(res, 500, 'Error al eliminar alerta');
    }
  }

  // GET /api/export - Export all reports as CSV
  if (req.method === 'GET' && pathname === '/api/export') {
    try {
      const reports = ReportsModel.getAll();
      let csv = 'Folio,Fecha,Categoria,Titulo_Clave,Direccion,Colonia,Estado,Latitud,Longitud,Notas_Municipio\n';
      for (const r of reports) {
        const cleanTitle = (r.title || '').replace(/"/g, '""');
        const cleanAddr = (r.address || '').replace(/"/g, '""');
        const cleanNotes = (r.admin_notes || '').replace(/"/g, '""');
        csv += `"${r.folio}","${r.created_at}","${r.category}","${cleanTitle}","${cleanAddr}","${r.colonia || ''}","${r.status}",${r.latitude},${r.longitude},"${cleanNotes}"\n`;
      }
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="alertas_gomez_palacio.csv"'
      });
      res.end('\uFEFF' + csv); // Include BOM for Excel Spanish characters
      return;
    } catch (err) {
      return sendError(res, 500, 'Error generando CSV');
    }
  }

  // -------------------------------------------------------------
  // STATIC FILES (Uploads & Public UI)
  // -------------------------------------------------------------

  // Serve uploaded images: /uploads/...
  if (pathname.startsWith('/uploads/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Imagen no encontrada');
    }
  }

  // Serve Frontend files: / -> index.html, /css/..., /js/..., etc.
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  let filePath = path.join(PUBLIC_DIR, safePath);

  // If path is a directory, append index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Fallback to index.html for SPA routes
  const fallbackIndex = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(fallbackIndex)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(fallbackIndex).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor Alertas Gómez Palacio corriendo en:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Red:     http://0.0.0.0:${PORT}`);
  console.log(`=======================================================`);
});

