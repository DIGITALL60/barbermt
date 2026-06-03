/**
 * BARBER M.T - WhatsApp Bot & REST API System
 * Single-File Server (server.js)
 *
 * Features:
 * - Express REST API on port 3000
 * - SQLite Database in data/reservas.db (auto-created)
 * - Baileys WhatsApp integration with auto-reconnect
 * - Full conversational booking flow via WhatsApp:
 *   RESERVAR → barber → date → time → service → name → confirm
 * - Commands: HOLA, AYUDA, RESERVAR, CANCELAR, MIS TURNOS
 */

'use strict';

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion,
    delay
} = require('@whiskeysockets/baileys');

// ==========================================
// 1. CONFIGURATION & DIRECTORY SETUP
// ==========================================
const PORT = process.env.PORT || 3000;
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:5000/api';

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const DB_PATH  = path.join(DATA_DIR, 'reservas.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// ==========================================
// 2. SQLITE DATABASE SETUP
// ==========================================
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error abriendo la base de datos SQLite:', err);
    } else {
        console.log('✔ Conectado a la base de datos SQLite en:', DB_PATH);
    }
});

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function initDb() {
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS reservas (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                nombreCliente   TEXT,
                telefonoCliente TEXT,
                servicio        TEXT,
                hora            TEXT,
                fecha           TEXT,
                barbero         TEXT,
                precio          INTEGER,
                duracion        TEXT,
                estado          TEXT DEFAULT 'pendiente',
                whatsappEnviado INTEGER DEFAULT 0,
                createdAt       TEXT,
                updatedAt       TEXT
            )
        `);
        console.log('✔ Estructura de base de datos inicializada correctamente.');
    } catch (err) {
        console.error('❌ Error inicializando base de datos:', err);
    }
}

// ==========================================
// 3. UTILITIES
// ==========================================
function cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        cleaned = '549' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('54')) {
        cleaned = '549' + cleaned.substring(2);
    }
    return cleaned;
}

function normalizeDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
        return dateStr.split('T')[0].split(' ')[0];
    } catch (_) {
        return dateStr;
    }
}

/** Returns the next N days (YYYY-MM-DD strings) starting from tomorrow */
function getNextDays(count = 7) {
    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const today = new Date();
    for (let i = 1; i <= count; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push({
            value: `${yyyy}-${mm}-${dd}`,
            label: `${dayNames[d.getDay()]} ${dd} ${monthNames[d.getMonth()]}`
        });
    }
    return days;
}

// ==========================================
// 4. CONVERSATION STATE MANAGEMENT
// ==========================================
// Map<jid, state>
const sessions = new Map();

function getSession(jid) {
    if (!sessions.has(jid)) sessions.set(jid, { step: null });
    return sessions.get(jid);
}

// Clear in-place so any existing 'session' reference stays valid
function clearSession(jid) {
    const s = sessions.get(jid);
    if (s) {
        Object.keys(s).forEach(k => delete s[k]);
        s.step = null;
    } else {
        sessions.set(jid, { step: null });
    }
}

// ==========================================
// 5. API HELPERS
// ==========================================
async function apiGet(endpoint) {
    const r = await fetch(`${API_BASE}${endpoint}`);
    if (!r.ok) throw new Error(`API ${endpoint} responded ${r.status}`);
    return r.json();
}

async function apiPost(endpoint, body) {
    const r = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!r.ok) {
        const txt = await r.text();
        throw new Error(`API POST ${endpoint} responded ${r.status}: ${txt}`);
    }
    return r.json();
}

// ==========================================
// 6. WHATSAPP CONNECTION & BOT LOGIC
// ==========================================
let sock = null;
let connectionAttempts = 0;

async function sendWhatsAppMessage(to, text) {
    if (!sock || !sock.user) {
        console.warn('⚠️ No se pudo enviar WhatsApp: bot no conectado.');
        return false;
    }
    try {
        const cleanedPhone = cleanPhoneNumber(to);
        if (!cleanedPhone) return false;
        const jid = `${cleanedPhone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        console.log(`📱 WhatsApp enviado a ${cleanedPhone}`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando mensaje WhatsApp a ${to}:`, error.message);
        return false;
    }
}

async function connectToWhatsApp() {
    console.log('⏳ Inicializando socket de WhatsApp con Baileys...');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Usando versión de WhatsApp v${version.join('.')}`);

    const logger = pino({ level: 'silent' });

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,
        version,
        browser: Browsers.macOS('Desktop'),
        markOnlineOnConnect: false,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n==================================================');
            console.log('📢 ESCANEA EL CÓDIGO QR CON TU WHATSAPP');
            console.log('==================================================\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output
                ? lastDisconnect.error.output.statusCode
                : 0;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Conexión cerrada. Código: ${statusCode}. Reconectando: ${shouldReconnect}`);

            if (shouldReconnect) {
                connectionAttempts++;
                const delayMs = Math.min(10000, 2000 * connectionAttempts);
                console.log(`⏳ Reconectando en ${delayMs / 1000}s (Intento ${connectionAttempts})...`);
                setTimeout(connectToWhatsApp, delayMs);
            } else {
                console.error('❌ Sesión cerrada permanentemente. Borra "auth_info_baileys" y reinicia.');
            }
        } else if (connection === 'open') {
            connectionAttempts = 0;
            console.log('✅ ¡Conexión de WhatsApp establecida con éxito y activa!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                try {
                    await handleIncomingMessage(msg);
                } catch (err) {
                    console.error('❌ Error procesando mensaje:', err.message);
                }
            }
        }
    });
}

// ==========================================
// 7. CONVERSATION HANDLER
// ==========================================
async function handleIncomingMessage(msg) {
    const jid = msg.key.remoteJid;
    if (!jid || jid.endsWith('@g.us')) return; // Ignorar grupos

    const rawPhone = jid.split('@')[0];
    const phone = cleanPhoneNumber(rawPhone);

    const reply = async (text) => {
        if (!sock) return;
        try {
            await sock.sendPresenceUpdate('composing', jid);
            await delay(600);
            await sock.sendPresenceUpdate('paused', jid);
            await sock.sendMessage(jid, { text }, { quoted: msg });
            console.log(`✅ Respuesta enviada a ${jid}`);
        } catch (err) {
            console.error(`❌ Error respondiendo a ${jid}:`, err.message);
        }
    };

    // Extract text safely
    let textContent = '';
    if (msg.message.conversation) {
        textContent = msg.message.conversation;
    } else if (msg.message.extendedTextMessage?.text) {
        textContent = msg.message.extendedTextMessage.text;
    } else if (msg.message.imageMessage?.caption) {
        textContent = msg.message.imageMessage.caption;
    }

    const text = textContent.trim();
    const command = text.toUpperCase();
    if (!command) return;

    console.log(`📨 Mensaje de ${phone}: "${text}"`);

    const session = getSession(jid);

    // ── GLOBAL COMMANDS (reset flow) ──────────────────────────────────────
    if (command === 'HOLA' || command === 'AYUDA') {
        clearSession(jid);
        let serviciosList = '';
        try {
            const servicios = await apiGet('/services');
            const activos = servicios.filter(s => s.active !== false);
            if (activos.length > 0) {
                serviciosList = '\n\n✂️ *Servicios y precios*\n' + activos.map(s =>
                    `• ${s.name}: $${Number(s.price).toLocaleString('es-AR')}`
                ).join('\n');
            }
        } catch (_) {}

        await reply(
`💈 *BARBER M.T* 💈

¡Bienvenido!
Soy el asistente de reservas de BARBER M.T.

📅 *RESERVAR* → Solicitar un turno
❌ *CANCELAR* → Cancelar una reserva
👀 *MIS TURNOS* → Consultar tus turnos${serviciosList}

📍Gracias por elegir BARBER M.T.`
        );
        return;
    }

    if (command === 'CANCELAR') {
        clearSession(jid);
        try {
            // Cancel in main system first
            const appts = await apiGet('/appointments');
            const userAppts = appts.filter(a =>
                cleanPhoneNumber(a.clientPhone) === phone &&
                a.status !== 'cancelled'
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (userAppts.length > 0) {
                const last = userAppts[0];
                const r = await fetch(`${API_BASE}/appointments/${last.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' })
                });
                if (r.ok) {
                    await reply(`✅ Tu turno del *${last.date}* a las *${last.timeSlot}* fue cancelado exitosamente.`);
                } else {
                    throw new Error('API error');
                }
            } else {
                await reply(`❌ No tienes turnos activos para cancelar. Escribe *RESERVAR* para agendar uno nuevo.`);
            }
        } catch (err) {
            console.error('Error cancelando:', err.message);
            await reply('❌ Hubo un error al cancelar tu turno. Por favor intentá de nuevo.');
        }
        return;
    }

    if (command === 'MIS TURNOS') {
        clearSession(jid);
        try {
            const appts = await apiGet('/appointments');
            const userAppts = appts.filter(a =>
                cleanPhoneNumber(a.clientPhone) === phone
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

            if (userAppts.length > 0) {
                const statusEmoji = (s) => s === 'confirmed' ? '✅' : s === 'cancelled' ? '❌' : s === 'completed' ? '🏁' : '⏳';
                const statusLabel = (s) => s === 'confirmed' ? 'CONFIRMADO' : s === 'cancelled' ? 'CANCELADO' : s === 'completed' ? 'COMPLETADO' : 'PENDIENTE';
                let responseText = `👀 *TUS ÚLTIMOS TURNOS:*\n\n`;
                userAppts.forEach((a, i) => {
                    responseText += `*${i + 1}.* 📅 ${a.date} - ⏰ ${a.timeSlot}\n`;
                    responseText += `   💈 ${a.serviceName || 'Servicio'}\n`;
                    responseText += `   👤 ${a.barberName || 'Barbero'}\n`;
                    responseText += `   ${statusEmoji(a.status)} ${statusLabel(a.status)}\n\n`;
                });
                await reply(responseText.trim());
            } else {
                await reply(`❌ No tienes turnos registrados. Escribe *RESERVAR* para agendar uno nuevo.`);
            }
        } catch (err) {
            console.error('Error consultando turnos:', err.message);
            await reply('❌ Hubo un error al consultar tus turnos. Por favor intentá de nuevo.');
        }
        return;
    }

    // ── BOOKING FLOW ──────────────────────────────────────────────────────
    if (command === 'RESERVAR') {
        clearSession(jid);
        session.step = 'barber';
        try {
            const barbers = await apiGet('/barbers');
            const activos = barbers.filter(b => b.active !== false);
            if (activos.length === 0) {
                await reply('❌ No hay barberos disponibles en este momento. Intentá más tarde.');
                clearSession(jid);
                return;
            }
            session.barbers = activos;
            let msg = '✂️ *ELEGÍ TU BARBERO:*\n\n';
            activos.forEach((b, i) => {
                msg += `*${i + 1}.* ${b.name}\n`;
            });
            msg += '\nRespondé con el *número* de tu opción.';
            await reply(msg);
        } catch (err) {
            console.error('Error cargando barberos:', err.message);
            await reply('❌ No pude cargar los barberos. Por favor intentá de nuevo.');
            clearSession(jid);
        }
        return;
    }

    // ── STEP: Barber selection ────────────────────────────────────────────
    if (session.step === 'barber') {
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= (session.barbers || []).length) {
            await reply(`Por favor respondé con un número del 1 al ${(session.barbers || []).length}.`);
            return;
        }
        const barber = session.barbers[idx];
        session.barberId = barber.id;
        session.barberName = barber.name;
        session.step = 'date';

        const days = getNextDays(7);
        session.dates = days;
        let msgText = `📅 *ELEGÍ EL DÍA:*\n\n`;
        days.forEach((d, i) => {
            msgText += `*${i + 1}.* ${d.label}\n`;
        });
        msgText += '\nRespondé con el *número* del día.';
        await reply(msgText);
        return;
    }

    // ── STEP: Date selection ──────────────────────────────────────────────
    if (session.step === 'date') {
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= (session.dates || []).length) {
            await reply(`Por favor respondé con un número del 1 al ${(session.dates || []).length}.`);
            return;
        }
        const dateObj = session.dates[idx];
        session.date = dateObj.value;
        session.step = 'time';

        try {
            const avail = await apiGet(`/availability?barberId=${session.barberId}&date=${session.date}`);
            if (avail.dayDisabled) {
                await reply(`❌ Ese día no trabajamos. Por favor elegí otro día.\n\nEscribí *RESERVAR* para volver a empezar.`);
                clearSession(jid);
                return;
            }
            const freeSlots = (avail.slots || []).filter(s => s.available);
            if (freeSlots.length === 0) {
                await reply(`❌ No hay horarios disponibles para ese día. Por favor elegí otro día.\n\nEscribí *RESERVAR* para volver a empezar.`);
                clearSession(jid);
                return;
            }
            session.slots = freeSlots;

            // Show slots in groups of 6 per line for readability
            let msgText = `⏰ *ELEGÍ EL HORARIO para ${dateObj.label}:*\n\n`;
            freeSlots.forEach((s, i) => {
                msgText += `*${i + 1}.* ${s.time}  `;
                if ((i + 1) % 4 === 0) msgText += '\n';
            });
            msgText += `\n\nRespondé con el *número* del horario.`;
            await reply(msgText);
        } catch (err) {
            console.error('Error cargando horarios:', err.message);
            await reply('❌ No pude cargar los horarios disponibles. Intentá de nuevo.');
            clearSession(jid);
        }
        return;
    }

    // ── STEP: Time slot selection ─────────────────────────────────────────
    if (session.step === 'time') {
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= (session.slots || []).length) {
            await reply(`Por favor respondé con un número del 1 al ${(session.slots || []).length}.`);
            return;
        }
        session.timeSlot = session.slots[idx].time;
        session.step = 'service';

        try {
            const services = await apiGet('/services');
            const activos = services.filter(s => s.active !== false);
            if (activos.length === 0) {
                await reply('❌ No hay servicios disponibles. Contactate con la barbería.');
                clearSession(jid);
                return;
            }
            session.services = activos;
            let msgText = `💈 *ELEGÍ EL SERVICIO:*\n\n`;
            activos.forEach((s, i) => {
                msgText += `*${i + 1}.* ${s.name} - $${Number(s.price).toLocaleString('es-AR')}\n`;
            });
            msgText += '\nRespondé con el *número* del servicio.';
            await reply(msgText);
        } catch (err) {
            console.error('Error cargando servicios:', err.message);
            await reply('❌ No pude cargar los servicios. Intentá de nuevo.');
            clearSession(jid);
        }
        return;
    }

    // ── STEP: Service selection ───────────────────────────────────────────
    if (session.step === 'service') {
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= (session.services || []).length) {
            await reply(`Por favor respondé con un número del 1 al ${(session.services || []).length}.`);
            return;
        }
        const service = session.services[idx];
        session.serviceId = service.id;
        session.serviceName = service.name;
        session.servicePrice = service.price;
        session.step = 'name';

        await reply(`👤 *¿CUÁL ES TU NOMBRE?*\n\nEscribí tu nombre y apellido para confirmar la reserva.`);
        return;
    }

    // ── STEP: Name & Final Confirmation ──────────────────────────────────
    if (session.step === 'name') {
        const clientName = text;
        if (clientName.length < 2) {
            await reply(`Por favor ingresá tu nombre completo.`);
            return;
        }

        session.step = null; // Prevent duplicate submissions
        try {
            const appointment = await apiPost('/appointments', {
                barberId: session.barberId,
                serviceId: session.serviceId,
                clientName,
                clientPhone: phone,
                date: session.date,
                timeSlot: session.timeSlot,
                notes: 'Reservado vía WhatsApp'
            });

            const confirmText =
`✅ *¡TURNO CONFIRMADO - BARBER M.T!*

👤 Cliente: ${clientName}
📅 Fecha: ${session.date}
⏰ Hora: ${session.timeSlot}
💈 Servicio: ${session.serviceName}
👨‍💼 Barbero: ${session.barberName}
💵 Precio: $${Number(session.servicePrice).toLocaleString('es-AR')}

¡Te esperamos! Para cambios escribinos nuevamente. 💈`;

            await reply(confirmText);
            console.log(`✅ Turno creado para ${clientName} (${phone}) - ${session.date} ${session.timeSlot}`);
        } catch (err) {
            console.error('Error creando turno:', err.message);
            if (err.message.includes('409') || err.message.includes('ocupado')) {
                await reply(`❌ Ese horario acaba de ser tomado por otro cliente. Escribí *RESERVAR* para elegir otro horario.`);
            } else {
                await reply(`❌ Hubo un error al confirmar tu turno. Por favor escribí *RESERVAR* e intentá de nuevo.`);
            }
        }
        clearSession(jid);
        return;
    }

    // ── FALLBACK ──────────────────────────────────────────────────────────
    await reply(`🤖 No entendí ese mensaje. Escribí *HOLA* para ver el menú de opciones.`);
}

// ==========================================
// 8. EXPRESS REST API
// ==========================================
const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

function sendResponse(res, statusCode, data) {
    return res.status(statusCode).json(data);
}

app.get('/', (req, res) => {
    sendResponse(res, 200, {
        success: true,
        sistema: 'BARBER M.T - WhatsApp Bot & REST API',
        botStatus: sock ? 'Activo' : 'No inicializado',
        endpoints: {
            'POST /api/notify':    'Enviar mensaje WhatsApp',
            'GET  /api/reservas/:tel': 'Ver reservas por teléfono',
        }
    });
});

// POST /api/notify
app.post('/api/notify', async (req, res) => {
    try {
        const { telefono, mensaje } = req.body;
        if (!telefono || !mensaje) {
            return sendResponse(res, 400, { success: false, mensaje: 'Se requiere telefono y mensaje.' });
        }
        const sent = await sendWhatsAppMessage(telefono, mensaje);
        return sendResponse(res, 200, { success: sent, mensaje: sent ? 'Mensaje enviado.' : 'Bot no conectado.' });
    } catch (err) {
        console.error('Error en /api/notify:', err);
        return sendResponse(res, 500, { success: false, mensaje: 'Error interno', error: err.message });
    }
});

// POST /api/reservas - Legacy endpoint (still usable)
app.post('/api/reservas', async (req, res) => {
    try {
        const { nombre, telefono, servicio, hora, barbero, precio, duracion, fecha } = req.body;
        if (!nombre || !telefono || !servicio || !hora || !barbero || !precio) {
            return sendResponse(res, 400, { success: false, mensaje: 'Faltan campos obligatorios.' });
        }
        const cleanPhone = cleanPhoneNumber(telefono);
        const fechaFinal = normalizeDate(fecha);
        const nowStr = new Date().toISOString();
        const result = await dbRun(
            `INSERT INTO reservas (nombreCliente, telefonoCliente, servicio, hora, fecha, barbero, precio, duracion, estado, whatsappEnviado, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', 0, ?, ?)`,
            [nombre, cleanPhone, servicio, hora, fechaFinal, barbero, precio, duracion || '30min', nowStr, nowStr]
        );
        const newReservation = await dbGet(`SELECT * FROM reservas WHERE id = ?`, [result.lastID]);
        const confirmText =
`✅ *TURNO CONFIRMADO - BARBER M.T*

👤 Cliente: ${nombre}
📅 Fecha: ${fechaFinal}
⏰ Hora: ${hora}
💈 Servicio: ${servicio}
👨‍💼 Barbero: ${barbero}
💵 Precio: $${precio}

¡Te esperamos! 💈`;
        const waSent = await sendWhatsAppMessage(cleanPhone, confirmText);
        if (waSent) {
            await dbRun(`UPDATE reservas SET whatsappEnviado = 1 WHERE id = ?`, [result.lastID]);
        }
        return sendResponse(res, 201, {
            success: true, mensaje: 'Reserva creada', whatsappEnviado: waSent, reserva: newReservation
        });
    } catch (err) {
        console.error('Error creando reserva:', err);
        return sendResponse(res, 500, { success: false, mensaje: 'Error interno', error: err.message });
    }
});

// GET /api/reservas/:telefono
app.get('/api/reservas/:telefono', async (req, res) => {
    try {
        const phone = cleanPhoneNumber(req.params.telefono);
        const rows = await dbAll(`SELECT * FROM reservas WHERE telefonoCliente = ? ORDER BY id DESC`, [phone]);
        return sendResponse(res, 200, { success: true, cantidad: rows.length, reservas: rows });
    } catch (err) {
        return sendResponse(res, 500, { success: false, error: err.message });
    }
});

// ==========================================
// 9. SERVER BOOTSTRAP
// ==========================================
async function startServer() {
    await initDb();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor Express iniciado en el puerto: ${PORT}`);
    });
    await connectToWhatsApp();
}

startServer().catch((err) => {
    console.error('❌ Error fatal iniciando el servidor:', err);
});
