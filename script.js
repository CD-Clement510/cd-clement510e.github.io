/* ============================================
   SCRIPT PRINCIPAL - VERSIÓN PRODUCCIÓN
   CORREGIDO PARA FUNCIONAR CON RENDER
   ============================================ */

// ============================================
// ✅ CONFIGURACIÓN CORRECTA - APUNTA A RENDER
// ============================================
// Esta es la URL de tu servidor en Render (NO GitHub Pages)
const SERVER_URL = 'https://cd-clement510e-github-io.onrender.com';

// Si quieres probar localmente, cambia a:
// const SERVER_URL = 'http://localhost:3000';

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const btnConfirmarUbicacion = document.getElementById('btnConfirmarUbicacion');
const btnUbicacionTexto = document.getElementById('btnUbicacionTexto');
const btnUbicacionSpinner = document.getElementById('btnUbicacionSpinner');
const estadoUbicacion = document.getElementById('estadoUbicacion');
const infoUbicacion = document.getElementById('infoUbicacion');
const mostrarLatitud = document.getElementById('mostrarLatitud');
const mostrarLongitud = document.getElementById('mostrarLongitud');
const mostrarDireccion = document.getElementById('mostrarDireccion');
const mostrarPrecision = document.getElementById('mostrarPrecision');
const mostrarTiempo = document.getElementById('mostrarTiempo');
const mostrarTiempoConfirmacion = document.getElementById('mostrarTiempoConfirmacion');
const btnRecargarUbicacion = document.getElementById('btnRecargarUbicacion');
const pasoUbicacion = document.getElementById('pasoUbicacion');
const pasoEncuesta = document.getElementById('pasoEncuesta');
const btnEnviarUbicacion = document.getElementById('btnEnviarUbicacion');
const statusEnvio = document.getElementById('statusEnvio');
const textoContador = document.getElementById('textoContador');
const googleForm = document.getElementById('googleForm');

// ============================================
// ESTADO GLOBAL
// ============================================
let ubicacionConfirmada = false;
let datosUbicacion = {
    latitud: null,
    longitud: null,
    direccion: null,
    precision: null,
    timestamp: null,
    timestampISO: null
};
let numeroEncuesta = null;

// ============================================
// UTILIDADES
// ============================================
function mostrarEstadoUbicacion(mensaje, tipo) {
    estadoUbicacion.textContent = mensaje;
    estadoUbicacion.className = `estado-ubicacion ${tipo}`;
    estadoUbicacion.style.display = 'block';
}

function ocultarEstadoUbicacion() {
    estadoUbicacion.style.display = 'none';
}

function mostrarEstadoEnvio(mensaje, tipo) {
    statusEnvio.textContent = mensaje;
    statusEnvio.className = `status-message ${tipo}`;
    statusEnvio.style.display = 'block';
}

function ocultarEstadoEnvio() {
    statusEnvio.style.display = 'none';
}

function setLoadingUbicacion(loading) {
    if (loading) {
        btnConfirmarUbicacion.disabled = true;
        btnUbicacionTexto.textContent = 'Obteniendo ubicación...';
        btnUbicacionSpinner.style.display = 'inline-block';
    } else {
        btnConfirmarUbicacion.disabled = false;
        btnUbicacionTexto.textContent = '📍 Confirmar Ubicación';
        btnUbicacionSpinner.style.display = 'none';
    }
}

function setLoadingEnvio(loading) {
    if (loading) {
        btnEnviarUbicacion.disabled = true;
        btnEnviarUbicacion.textContent = '⏳ Enviando...';
    } else {
        btnEnviarUbicacion.disabled = false;
        btnEnviarUbicacion.textContent = '📤 Enviar ubicación con encuesta';
    }
}

function getCurrentTimestamp() {
    const now = new Date();
    return {
        display: now.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }),
        iso: now.toISOString(),
        unix: now.getTime()
    };
}

// ============================================
// 1. OBTENER UBICACIÓN
// ============================================
function obtenerUbicacion() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            mostrarEstadoUbicacion('❌ Tu navegador no soporta geolocalización', 'error');
            resolve(false);
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            async function(position) {
                const timestamp = getCurrentTimestamp();
                
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const precision = position.coords.accuracy;

                datosUbicacion.latitud = lat;
                datosUbicacion.longitud = lng;
                datosUbicacion.precision = precision;
                datosUbicacion.timestamp = timestamp.display;
                datosUbicacion.timestampISO = timestamp.iso;

                mostrarLatitud.textContent = lat.toFixed(6);
                mostrarLongitud.textContent = lng.toFixed(6);
                mostrarPrecision.textContent = Math.round(precision);
                mostrarTiempo.textContent = timestamp.display;

                try {
                    mostrarEstadoUbicacion('🌍 Obteniendo dirección...', 'cargando');
                    
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        {
                            headers: {
                                'User-Agent': 'Encuesta-Geolocalizacion/1.0'
                            }
                        }
                    );
                    const data = await response.json();
                    
                    if (data.display_name) {
                        datosUbicacion.direccion = data.display_name;
                        mostrarDireccion.textContent = data.display_name;
                    } else {
                        datosUbicacion.direccion = 'Dirección no encontrada';
                        mostrarDireccion.textContent = 'Dirección no encontrada';
                    }
                } catch (error) {
                    console.error('Error al obtener dirección:', error);
                    datosUbicacion.direccion = 'Error al obtener dirección';
                    mostrarDireccion.textContent = 'Error al obtener dirección';
                }

                ubicacionConfirmada = true;
                infoUbicacion.style.display = 'block';
                ocultarEstadoUbicacion();
                
                await actualizarContador();
                mostrarEncuesta();
                
                console.log('✅ Ubicación confirmada:', datosUbicacion);
                resolve(true);
            },
            function(error) {
                console.warn('Error de geolocalización:', error.message);
                let mensajeError = 'No se pudo obtener tu ubicación. ';

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        mensajeError += 'Permiso denegado por el usuario. Por favor, permite el acceso a la ubicación.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        mensajeError += 'La ubicación no está disponible. Intenta con otro dispositivo o red.';
                        break;
                    case error.TIMEOUT:
                        mensajeError += 'Tiempo de espera agotado. Verifica tu conexión e intenta de nuevo.';
                        break;
                    default:
                        mensajeError += 'Error desconocido. Intenta de nuevo.';
                }

                mostrarEstadoUbicacion('❌ ' + mensajeError, 'error');
                resolve(false);
            },
            options
        );
    });
}

// ============================================
// 2. MOSTRAR ENCUESTA
// ============================================
function mostrarEncuesta() {
    pasoUbicacion.style.display = 'none';
    pasoEncuesta.style.display = 'block';
    
    if (datosUbicacion.timestamp) {
        mostrarTiempoConfirmacion.textContent = datosUbicacion.timestamp;
    }
    
    const src = googleForm.src;
    googleForm.src = '';
    setTimeout(() => {
        googleForm.src = src;
    }, 100);
}

// ============================================
// 3. ACTUALIZAR CONTADOR
// ============================================
async function actualizarContador() {
    try {
        const response = await fetch(`${SERVER_URL}/api/estado`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.result === 'estado') {
            textoContador.textContent = `📊 ${data.total} encuestas registradas`;
        }
    } catch (error) {
        console.error('Error al actualizar contador:', error);
        textoContador.textContent = '⚠️ No se pudo obtener el estado';
    }
}

// ============================================
// 4. ENVIAR UBICACIÓN AL SERVIDOR
// ============================================
async function enviarUbicacion() {
    if (!ubicacionConfirmada) {
        mostrarEstadoEnvio('❌ Primero debes confirmar tu ubicación', 'error');
        return;
    }

    setLoadingEnvio(true);
    ocultarEstadoEnvio();

    try {
        const timestampEnvio = getCurrentTimestamp();
        
        const data = {
            latitud: datosUbicacion.latitud,
            longitud: datosUbicacion.longitud,
            direccion: datosUbicacion.direccion,
            precision: datosUbicacion.precision,
            timestamp_captura: datosUbicacion.timestampISO,
            timestamp_envio: timestampEnvio.iso,
            timestamp_display: timestampEnvio.display,
            userAgent: navigator.userAgent,
        };

        console.log('📤 Enviando al servidor:', SERVER_URL);
        console.log('📦 Datos:', data);

        const response = await fetch(`${SERVER_URL}/api/encuesta`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.result === 'success') {
            numeroEncuesta = result.numeroEncuesta;
            mostrarEstadoEnvio(
                `✅ ¡Envío exitoso! Número de encuesta: #${numeroEncuesta}\n📅 Enviado: ${timestampEnvio.display}`,
                'success'
            );
            
            await actualizarContador();
            
            btnEnviarUbicacion.disabled = true;
            btnEnviarUbicacion.textContent = '✅ Enviado';
            
            console.log(`✅ Encuesta #${numeroEncuesta} registrada`);
        } else {
            mostrarEstadoEnvio(`❌ Error: ${result.mensaje || 'Error desconocido'}`, 'error');
        }
    } catch (error) {
        console.error('❌ Error al enviar:', error);
        mostrarEstadoEnvio(
            `❌ Error de conexión.\n` +
            `Servidor: ${SERVER_URL}\n` +
            `Error: ${error.message}`,
            'error'
        );
    } finally {
        setLoadingEnvio(false);
    }
}

// ============================================
// 5. RECARGAR UBICACIÓN
// ============================================
async function recargarUbicacion() {
    ubicacionConfirmada = false;
    infoUbicacion.style.display = 'none';
    pasoEncuesta.style.display = 'none';
    pasoUbicacion.style.display = 'block';
    
    mostrarEstadoUbicacion('🔄 Obteniendo nueva ubicación...', 'cargando');
    await obtenerUbicacion();
}

// ============================================
// 6. EVENTOS
// ============================================

btnConfirmarUbicacion.addEventListener('click', async function() {
    setLoadingUbicacion(true);
    mostrarEstadoUbicacion('📍 Obteniendo tu ubicación...', 'cargando');
    await obtenerUbicacion();
    setLoadingUbicacion(false);
});

btnRecargarUbicacion.addEventListener('click', recargarUbicacion);

btnEnviarUbicacion.addEventListener('click', enviarUbicacion);

// ============================================
// 7. INICIALIZACIÓN
// ============================================
window.onload = async function() {
    console.log('🚀 Iniciando encuesta');
    console.log(`📡 Servidor: ${SERVER_URL}`);
    
    // Verificar conexión con el servidor
    try {
        const response = await fetch(`${SERVER_URL}/api/estado`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Conexión con el servidor establecida');
            console.log(`📊 Total de encuestas: ${data.total || 0}`);
        } else {
            console.warn('⚠️ El servidor respondió con error:', response.status);
        }
    } catch (error) {
        console.error('❌ No se pudo conectar al servidor');
        console.log('💡 Verifica que el servidor en Render esté activo:');
        console.log(`   ${SERVER_URL}`);
    }
    
    mostrarEstadoUbicacion('📍 Solicitando acceso a tu ubicación...', 'cargando');
    
    setTimeout(async () => {
        await obtenerUbicacion();
    }, 500);
};

// ============================================
// 8. ESCUCHAR EVENTOS DEL IFRAME
// ============================================
window.addEventListener('message', function(event) {
    if (event.data && typeof event.data === 'string') {
        if (event.data.includes('google.forms')) {
            console.log('📨 Formulario de Google detectado');
        }
    }
});

let lastSrc = googleForm.src;
setInterval(() => {
    if (googleForm.src !== lastSrc) {
        lastSrc = googleForm.src;
        console.log('🔄 El iframe cambió de URL');
    }
}, 1000);

console.log('✅ Aplicación lista.');
