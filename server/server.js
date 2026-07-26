/* ============================================
   SERVIDOR LOCAL - GUARDA UBICACIONES EN CSV
   ============================================ */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CORS PARA LOCAL
// ============================================
app.use(cors({
    origin: '*', // Permitir todas las conexiones en local
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// RUTA AL ARCHIVO CSV
// ============================================
const CSV_PATH = path.join(__dirname, 'datos', 'encuestas.csv');

// ============================================
// FUNCIONES DE ARCHIVO CSV
// ============================================

function ensureDataDirectory() {
    const dir = path.dirname(CSV_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Directorio creado: ${dir}`);
    }
}

function initCSV() {
    ensureDataDirectory();
    
    if (!fs.existsSync(CSV_PATH)) {
        const headers = [
            'NumeroEncuesta',
            'Timestamp_Captura',
            'Timestamp_Envio',
            'Timestamp_Display',
            'Latitud',
            'Longitud',
            'Direccion',
            'Precision',
            'UserAgent',
            'IP'
        ].join(',');
        
        fs.writeFileSync(CSV_PATH, headers + '\n', 'utf8');
        console.log(`📄 Archivo CSV creado: ${CSV_PATH}`);
        console.log(`📋 Encabezados: ${headers}`);
    } else {
        console.log(`📄 Archivo CSV existente: ${CSV_PATH}`);
    }
}

function readEncuestas() {
    try {
        if (!fs.existsSync(CSV_PATH)) {
            return [];
        }
        
        const content = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length <= 1) {
            return [];
        }
        
        const headers = lines[0].split(',');
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const row = {};
            headers.forEach((header, index) => {
                row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            data.push(row);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Error al leer CSV:', error);
        return [];
    }
}

function addEncuestaToCSV(encuestaData) {
    try {
        ensureDataDirectory();
        
        const encuestas = readEncuestas();
        const numeroEncuesta = encuestas.length + 1;
        
        const fields = [
            'NumeroEncuesta',
            'Timestamp_Captura',
            'Timestamp_Envio',
            'Timestamp_Display',
            'Latitud',
            'Longitud',
            'Direccion',
            'Precision',
            'UserAgent',
            'IP'
        ];
        
        const values = [
            numeroEncuesta,
            encuestaData.timestamp_captura || new Date().toISOString(),
            encuestaData.timestamp_envio || new Date().toISOString(),
            encuestaData.timestamp_display || new Date().toLocaleString('es-ES'),
            encuestaData.latitud || '',
            encuestaData.longitud || '',
            encuestaData.direccion || '',
            encuestaData.precision || '',
            encuestaData.userAgent || '',
            encuestaData.ip || 'desconocida'
        ];
        
        const row = values.map(value => {
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        
        const csvLine = row.join(',') + '\n';
        
        const fileExists = fs.existsSync(CSV_PATH);
        
        if (!fileExists) {
            const headers = fields.join(',') + '\n';
            fs.writeFileSync(CSV_PATH, headers + csvLine, 'utf8');
        } else {
            fs.appendFileSync(CSV_PATH, csvLine, 'utf8');
        }
        
        console.log(`✅ Encuesta #${numeroEncuesta} guardada en CSV`);
        return numeroEncuesta;
        
    } catch (error) {
        console.error('❌ Error al guardar en CSV:', error);
        throw error;
    }
}

// ============================================
// RUTAS DE LA API
// ============================================

// Ruta: Verificar estado
app.get('/api/estado', (req, res) => {
    try {
        const encuestas = readEncuestas();
        const total = encuestas.length;
        
        res.json({
            result: 'estado',
            total: total,
            servidor: 'online'
        });
    } catch (error) {
        res.status(500).json({
            result: 'error',
            error: error.message
        });
    }
});

// Ruta: Guardar nueva encuesta
app.post('/api/encuesta', (req, res) => {
    try {
        const data = req.body;
        
        console.log('📥 Recibiendo datos:', {
            lat: data.latitud,
            lng: data.longitud,
            timestamp: data.timestamp_display
        });
        
        // Validar datos mínimos
        if (!data.latitud || !data.longitud) {
            return res.status(400).json({
                result: 'error',
                mensaje: 'Se requieren latitud y longitud'
            });
        }
        
        // Agregar IP del cliente
        data.ip = req.ip || req.connection.remoteAddress || 'desconocida';
        
        // Guardar en CSV
        const numeroEncuesta = addEncuestaToCSV(data);
        
        // Obtener total actualizado
        const encuestas = readEncuestas();
        
        res.json({
            result: 'success',
            mensaje: 'Ubicación registrada correctamente',
            numeroEncuesta: numeroEncuesta,
            totalRespuestas: encuestas.length
        });
        
    } catch (error) {
        console.error('❌ Error al procesar encuesta:', error);
        res.status(500).json({
            result: 'error',
            error: error.message
        });
    }
});

// Ruta: Descargar CSV
app.get('/api/descargar', (req, res) => {
    try {
        if (!fs.existsSync(CSV_PATH)) {
            return res.status(404).json({
                result: 'error',
                mensaje: 'No hay datos disponibles'
            });
        }
        
        res.download(CSV_PATH, `encuestas_${Date.now()}.csv`);
    } catch (error) {
        res.status(500).json({
            result: 'error',
            error: error.message
        });
    }
});

// Ruta: Obtener todas las encuestas
app.get('/api/todas', (req, res) => {
    try {
        const encuestas = readEncuestas();
        res.json({
            result: 'success',
            total: encuestas.length,
            data: encuestas
        });
    } catch (error) {
        res.status(500).json({
            result: 'error',
            error: error.message
        });
    }
});

// Ruta: Ver estructura del CSV
app.get('/api/estructura', (req, res) => {
    res.json({
        result: 'success',
        campos: [
            'NumeroEncuesta',
            'Timestamp_Captura',
            'Timestamp_Envio',
            'Timestamp_Display',
            'Latitud',
            'Longitud',
            'Direccion',
            'Precision',
            'UserAgent',
            'IP'
        ]
    });
});

// ============================================
// RUTA PRINCIPAL
// ============================================

app.get('/', (req, res) => {
    res.json({
        nombre: 'API Encuestas Geolocalización',
        version: '2.1.0',
        estado: 'online',
        endpoints: {
            estado: '/api/estado',
            encuesta: '/api/encuesta (POST)',
            todas: '/api/todas',
            descargar: '/api/descargar',
            estructura: '/api/estructura'
        }
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

initCSV();

app.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 Servidor LOCAL iniciado`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`📊 CSV: ${CSV_PATH}`);
    console.log(`🌐 CORS: Permitido para todos (local)`);
    console.log('========================================');
    console.log('📋 Endpoints disponibles:');
    console.log(`   GET  / - Información del servidor`);
    console.log(`   GET  /api/estado - Ver estado`);
    console.log(`   POST /api/encuesta - Guardar encuesta`);
    console.log(`   GET  /api/todas - Ver todas las encuestas`);
    console.log(`   GET  /api/descargar - Descargar CSV`);
    console.log(`   GET  /api/estructura - Ver estructura del CSV`);
    console.log('========================================');
});

process.on('SIGTERM', () => {
    console.log('🛑 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Cerrando servidor...');
    process.exit(0);
});