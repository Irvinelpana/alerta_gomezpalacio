# 🇲🇽 Alerta Gómez Palacio - Mapeo Ciudadano y Gestión de Alertas

Plataforma web escalable para **escritorio y dispositivos móviles** diseñada específicamente para el municipio de **Gómez Palacio, Durango**. Permite a la ciudadanía reportar problemas urbanos (baches, falta de agua, luminarias apagadas, basura, drenaje, etc.) directamente en un mapa interactivo sin necesidad de registrarse, y cuenta con un panel administrativo para que las autoridades municipales gestionen y marquen los reportes como resueltos.

---

## 🚀 Características Principales

### 1. 🗺️ Mapeo Interactivo de Gómez Palacio
- Mapa centrado en la ciudad con pines temáticos y diferenciados por color e icono (Agua, Luz, Baches, Basura, Drenaje, Semáforos, Parques).
- **Filtro dinámico por categorías** en la parte superior del mapa.
- **Filtro de estado**: Activos vs. Resueltos (con distintivo verde de atención completada).
- **Popups interactivos** con foto, dirección, colonia, fecha relativa, descripción y respuesta oficial del municipio.
- **Geolocalización GPS**: Botón para ubicar la posición actual del usuario.

### 2. 📝 Modo Abierto (Público - Sin Registro)
- Cualquier habitante puede enviar su alerta de forma inmediata sin crear cuenta:
  - **Categoría visual** con iconos táctiles.
  - **Descripción Clave / Título del Problema**: Campo destacado para resumir el reporte (ej. *"Mega bache carril derecho frente a Soriana Hamburgo"*).
  - **Descripción Detallada**: Explicación a fondo del problema.
  - **Dirección exacta y Colonia** (ej. Hamburgo, Filadelfia, Centro, Las Rosas, etc.).
  - **Ubicación en el Mapa**: Mini-mapa interactivo para colocar el pin exacto o botón "Usar mi GPS".
  - **Evidencia Fotográfica**: Subida de fotos desde la cámara del celular o computadora con compresión automática en el navegador.
  - **Nombre o Alias opcional** (o "Ciudadano Anónimo").
- Generación de **Folio único de seguimiento** (ej. `GP-2026-4819`) con opción de copia en 1 clic y confeti de confirmación.

### 3. 🛡️ Panel de Administración Municipal
- **Métricas e Indicadores Clave (KPIs)** en tiempo real:
  - Total de reportes
  - Pendientes de atención
  - En proceso (con cuadrilla asignada)
  - Resueltos y porcentaje de efectividad municipal
- **Tabla de Gestión Completa**:
  - Buscador predictivo por folio, calle o colonia.
  - Filtros combinados por estado y categoría.
  - Modal de gestión para cambiar estado: **🟡 Pendiente**, **🔵 En Proceso**, **🟢 Resuelto**, **🔴 Rechazado**.
  - Campo para escribir la **Respuesta Oficial / Notas de Cuadrilla** (ej. *"Se envió brigada de SIDEAPA unidad #14 el día 05/Nov"*).
  - Botón para exportar la base de datos a formato **Excel / CSV** para reportes oficiales.
  - Enlace directo "Ver en mapa" para centrar la alerta en la vista satelital/callejera.

### 4. 📱 100% Adaptable (Mobile-First & Desktop)
- **En Móvil**: Barra de navegación inferior táctil, botón flotante de reporte rápido, drawer deslizable y soporte para captura con cámara.
- **En Escritorio**: Barra lateral con feed en vivo de alertas ciudadanas, mapa en pantalla completa y panel de administración ampliado.

---

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js nativo con `node:sqlite` (SQLite integrado, cero dependencias complejas, rápido y ligero).
- **Frontend**: HTML5, Tailwind CSS, JavaScript Vanilla modular (ES6+), Leaflet.js para mapas geoespaciales, Lucide Icons, Canvas Confetti.
- **Almacenamiento**: Base de datos SQLite local (`alertas_gp.db`) y directorio de fotos `/uploads`.

---

## 💻 Cómo Ejecutar el Proyecto

1. Abre una terminal en la carpeta del proyecto:
   ```bash
   cd c:\Users\Irvin\OneDrive\Desktop\proyectodoctor
   ```

2. Inicia el servidor:
   ```bash
   npm start
   ```
   *(o también: `node server.js`)*

3. Abre tu navegador web en:
   ```
   http://localhost:3000
   ```

4. Para abrirlo desde tu celular en la misma red Wi-Fi:
   - Revisa tu dirección IP local (ej. `ipconfig` -> `192.168.1.X`)
   - Entra desde el navegador de tu teléfono a: `http://192.168.1.X:3000`

