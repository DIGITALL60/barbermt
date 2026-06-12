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

const PORT = process.env.PORT || 3000;
const API_BASE = (process.env.API_BASE || 'http://127.0.0.1:5000').replace(/\/+$/, '');

console.log(`🔧 API_BASE configurado como: ${API_BASE}`);

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const DB_PATH  = path.join(DATA_DIR, 'reservas.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('❌ Error abriendo SQLite:', err);
    else console.log('✔ Conectado a SQLite en:', DB_PATH);
});

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err); else resolve(this);
        });
    });
}
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
    });
}
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
    });
}

async function initDb() {
    try {
        await dbRun(`
            CREATE TABLE IF NOT EXISTS reservas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombreCliente TEXT, telefonoCliente TEXT, servicio TEXT,
                hora TEXT, fecha TEXT, barbero TEXT, precio INTEGER,
                duracion TEXT, estado TEXT DEFAULT 'pendiente',
                whatsappEnviado INTEGER DEFAULT 0, createdAt TEXT, updatedAt TEXT
            )
        `);
        console.log('✔ Base de datos inicializada.');
    } catch (err) {
        console.error('❌ Error inicializando DB:', err);
    }
}

function cleanPhoneNumber(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '549' + cleaned;
    else if (cleaned.length === 12 && cleaned.startsWith('54')) cleaned = '549' + cleaned.substring(2);
    return cleaned;
}

function normalizeDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try { return dateStr.split('T')[0].split(' ')[0]; } catch (_) { return dateStr; }
}

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
        days.push({ value: `${yyyy}-${mm}-${dd}`, label: `${dayNames[d.getDay()]} ${dd} ${monthNames[d.getMonth()]}` });
    }
    return days;
}

// Normaliza respuesta de API a array
function toArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    for (const key of ['data', 'items', 'barbers', 'services', 'appointments', 'results']) {
        if (Array.isArray(data[key])) return data[key];
    }
    return [];
}

const sessions = new Map();
function getSession(jid) {
    if (!sessions.has(jid)) sessions.set(jid, { step: null });
    return sessions.get(jid);
}
function clearSession(jid) {
    const s = sessions.get(jid);
    if (s) { Object.keys(s).forEach(k => delete s[k]); s.step = null; }
    else sessions.set(jid, { step: null });
}

// API HELPERS — con logs detallados
async function apiGet(endpoint) {
    const url = `${API_BASE}/api${endpoint}`;
    console.log(`🔍 API GET: ${url}`);
    try {
        const r = await fetch(url);
        console.log(`📡 Respuesta ${endpoint}: status ${r.status}`);
        if (!r.ok) throw new Error(`API ${endpoint} responded ${r.status}`);
        const data = await r.json();
        return toArray(data).length > 0 ? toArray(data) : data;
    } catch (err) {
        console.error(`❌ Error en apiGet(${endpoint}): ${err.message}`);
        throw err;
    }
}

async function apiPost(endpoint, body) {
    const url = `${API_BASE}/api${endpoint}`;
    console.log(`🔍 API POST: ${url}`);
    const r = await fetch(url, {
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

async function getBotSettings() {
    try {
        const r = await fetch(`${API_BASE}/api/bot-settings`);
        if (r.ok) return await r.json();
    } catch (e) {
        console.error('Error fetching bot settings:', e.message);
    }
    return null;
}

let sock = null;
let connectionAttempts = 0;
let botStatus = 'desconectado';
let currentQR = null;

async function sendWhatsAppMessage(to, text) {
    if (!sock || !sock.user) { console.warn('⚠️ Bot no conectado.'); return false; }
    try {
        const cleanedPhone = cleanPhoneNumber(to);
        if (!cleanedPhone) return false;
        const jid = `${cleanedPhone}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text });
        console.log(`📱 WhatsApp enviado a ${cleanedPhone}`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando WhatsApp a ${to}:`, error.message);
        return false;
    }
}

async function connectToWhatsApp() {
    console.log('⏳ Inicializando WhatsApp con Baileys...');
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`Usando WhatsApp v${version.join('.')}`);
    const logger = pino({ level: 'silent' });

    sock = makeWASocket({
        auth: state, printQRInTerminal: false, logger, version,
        browser: Browsers.macOS('Desktop'),
        markOnlineOnConnect: false, syncFullHistory: false, generateHighQualityLinkPreview: false
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            botStatus = 'esperando_qr';
            currentQR = qr;
            console.log('\n==================================================');
            console.log('📢 ESCANEA EL CÓDIGO QR CON TU WHATSAPP');
            console.log('==================================================\n');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode ?? 0;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Conexión cerrada. Código: ${statusCode}. Reconectando: ${shouldReconnect}`);
            if (shouldReconnect) {
                connectionAttempts++;
                const delayMs = Math.min(10000, 2000 * connectionAttempts);
                console.log(`⏳ Reconectando en ${delayMs / 1000}s (Intento ${connectionAttempts})...`);
                setTimeout(connectToWhatsApp, delayMs);
            } else {
                console.error('❌ Sesión cerrada permanentemente.');
                botStatus = 'desconectado';
                currentQR = null;
                sock = null;
                // Borrar carpeta auth para permitir escanear de nuevo
                try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
                setTimeout(connectToWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            connectionAttempts = 0;
            botStatus = 'conectado';
            currentQR = null;
            console.log('✅ ¡WhatsApp conectado!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            if (!msg.key.fromMe && msg.message) {
                try { await handleIncomingMessage(msg); }
                catch (err) { console.error('❌ Error procesando mensaje:', err.message); }
            }
        }
    });
}

async function handleIncomingMessage(msg) {
    const jid = msg.key.remoteJid;
    if (!jid || jid.endsWith('@g.us')) return;

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

    let textContent = '';
    if (msg.message.conversation) textContent = msg.message.conversation;
    else if (msg.message.extendedTextMessage?.text) textContent = msg.message.extendedTextMessage.text;
    else if (msg.message.imageMessage?.caption) textContent = msg.message.imageMessage.caption;

    const text = textContent.trim();
    const command = text.toUpperCase();
    if (!command) return;

    console.log(`📨 Mensaje de ${phone}: "${text}"`);
    const session = getSession(jid);

    if (command === 'HOLA' || command === 'AYUDA') {
        clearSession(jid);
        let serviciosList = '';
        try {
            const servicios = toArray(await apiGet('/services'));
            const activos = servicios.filter(s => s.active !== false);
            if (activos.length > 0) {
                serviciosList = '\n\n✂️ *Servicios y precios*\n' + activos.map(s =>
                    `• ${s.name}: $${Number(s.price).toLocaleString('es-AR')}`
                ).join('\n');
            }
        } catch (_) {}
        const settings = await getBotSettings();
        const defaultWelcome = `💈 *BARBER M.T* 💈\n\n¡Bienvenido!\nSoy el asistente de reservas de BARBER M.T.\n\n📅 *RESERVAR* → Solicitar un turno\n❌ *CANCELAR* → Cancelar una reserva\n👀 *MIS TURNOS* → Consultar tus turnos\n\n📍Gracias por elegir BARBER M.T.`;
        const welcomeText = settings?.welcomeMessage || defaultWelcome;
        await reply(`${welcomeText}${serviciosList ? '\n' + serviciosList : ''}`);
        return;
    }

    if (command === 'CANCELAR') {
        clearSession(jid);
        try {
            const appts = toArray(await apiGet('/appointments'));
            const userAppts = appts.filter(a =>
                cleanPhoneNumber(a.clientPhone) === phone && a.status !== 'cancelled'
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (userAppts.length > 0) {
                const last = userAppts[0];
                const r = await fetch(`${API_BASE}/api/appointments/${last.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'cancelled' })
                });
                if (r.ok) {
                    const settings = await getBotSettings();
                    let cancelText = settings?.cancellationMessage || `✅ Tu turno del *{fecha}* a las *{hora}* fue cancelado.`;
                    cancelText = cancelText.replace('{fecha}', last.date).replace('{hora}', last.timeSlot);
                    await reply(cancelText);
                }
                else throw new Error('API error');
            } else {
                await reply(`❌ No tenés turnos activos para cancelar. Escribí *RESERVAR* para agendar uno nuevo.`);
            }
        } catch (err) {
            console.error('Error cancelando:', err.message);
            await reply('❌ Hubo un error al cancelar. Intentá de nuevo.');
        }
        return;
    }

    if (command === 'MIS TURNOS') {
        clearSession(jid);
        try {
            const appts = toArray(await apiGet('/appointments'));
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
                await reply(`❌ No tenés turnos registrados. Escribí *RESERVAR* para agendar uno nuevo.`);
            }
        } catch (err) {
            console.error('Error consultando turnos:', err.message);
            await reply('❌ Error al consultar turnos. Intentá de nuevo.');
        }
        return;
    }

    if (command === 'RESERVAR') {
        clearSession(jid);
        session.step = 'barber';
        try {
            const barbers = toArray(await apiGet('/barbers'));
            const activos = barbers.filter(b => b.active !== false);
            if (activos.length === 0) {
                await reply('❌ No hay barberos disponibles. Intentá más tarde.');
                clearSession(jid);
                return;
            }
            session.barbers = activos;
            let msgText = '✂️ *ELEGÍ TU BARBERO:*\n\n';
            activos.forEach((b, i) => { msgText += `*${i + 1}.* ${b.name}\n`; });
            msgText += '\nRespondé con el *número* de tu opción.';
            await reply(msgText);
        } catch (err) {
            console.error('Error cargando barberos:', err.message);
            await reply('❌ No pude cargar los barberos. Intentá de nuevo.');
            clearSession(jid);
        }
        return;
    }

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
        days.forEach((d, i) => { msgText += `*${i + 1}.* ${d.label}\n`; });
        msgText += '\nRespondé con el *número* del día.';
        await reply(msgText);
        return;
    }

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
            const availData = Array.isArray(avail) ? avail[0] : avail;
            if (availData?.dayDisabled) {
                await reply(`❌ Ese día no trabajamos. Escribí *RESERVAR* para elegir otro día.`);
                clearSession(jid);
                return;
            }
            const freeSlots = (availData?.slots || []).filter(s => s.available);
            if (freeSlots.length === 0) {
                await reply(`❌ No hay horarios disponibles para ese día. Escribí *RESERVAR* para elegir otro día.`);
                clearSession(jid);
                return;
            }
            session.slots = freeSlots;
            let msgText = `⏰ *ELEGÍ EL HORARIO para ${dateObj.label}:*\n\n`;
            freeSlots.forEach((s, i) => {
                msgText += `*${i + 1}.* ${s.time}  `;
                if ((i + 1) % 4 === 0) msgText += '\n';
            });
            msgText += `\n\nRespondé con el *número* del horario.`;
            await reply(msgText);
        } catch (err) {
            console.error('Error cargando horarios:', err.message);
            await reply('❌ No pude cargar los horarios. Intentá de nuevo.');
            clearSession(jid);
        }
        return;
    }

    if (session.step === 'time') {
        const idx = parseInt(text) - 1;
        if (isNaN(idx) || idx < 0 || idx >= (session.slots || []).length) {
            await reply(`Por favor respondé con un número del 1 al ${(session.slots || []).length}.`);
            return;
        }
        session.timeSlot = session.slots[idx].time;
        session.step = 'service';
        try {
            const services = toArray(await apiGet('/services'));
            const activos = services.filter(s => s.active !== false);
            if (activos.length === 0) {
                await reply('❌ No hay servicios disponibles. Contactate con la barbería.');
                clearSession(jid);
                return;
            }
            session.services = activos;
            let msgText = `💈 *ELEGÍ EL SERVICIO:*\n\n`;
            activos.forEach((s, i) => { msgText += `*${i + 1}.* ${s.name} - $${Number(s.price).toLocaleString('es-AR')}\n`; });
            msgText += '\nRespondé con el *número* del servicio.';
            await reply(msgText);
        } catch (err) {
            console.error('Error cargando servicios:', err.message);
            await reply('❌ No pude cargar los servicios. Intentá de nuevo.');
            clearSession(jid);
        }
        return;
    }

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

    if (session.step === 'name') {
        const clientName = text;
        if (clientName.length < 2) { await reply(`Por favor ingresá tu nombre completo.`); return; }
        session.step = null;
        try {
            await apiPost('/appointments', {
                barberId: session.barberId,
                serviceId: session.serviceId,
                clientName,
                clientPhone: phone,
                date: session.date,
                timeSlot: session.timeSlot,
                notes: 'Reservado vía WhatsApp'
            });
            const settings = await getBotSettings();
            let confirmText = settings?.confirmationMessage || `✅ *¡TURNO CONFIRMADO - BARBER M.T!*\n\n👤 Cliente: {cliente}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n💈 Servicio: {servicio}\n👨‍💼 Barbero: {barbero}\n💵 Precio: ${precio}\n\n¡Te esperamos! Para cambios escribinos nuevamente. 💈`;
            confirmText = confirmText.replace('{cliente}', clientName)
                                     .replace('{fecha}', session.date)
                                     .replace('{hora}', session.timeSlot)
                                     .replace('{servicio}', session.serviceName)
                                     .replace('{barbero}', session.barberName)
                                     .replace('{precio}', Number(session.servicePrice).toLocaleString('es-AR'));
            await reply(confirmText);
            console.log(`✅ Turno creado para ${clientName} (${phone}) - ${session.date} ${session.timeSlot}`);
        } catch (err) {
            console.error('Error creando turno:', err.message);
            if (err.message.includes('409') || err.message.includes('ocupado')) {
                await reply(`❌ Ese horario acaba de ser tomado. Escribí *RESERVAR* para elegir otro.`);
            } else {
                await reply(`❌ Error al confirmar el turno. Escribí *RESERVAR* e intentá de nuevo.`);
            }
        }
        clearSession(jid);
        return;
    }

    await reply(`🤖 No entendí ese mensaje. Escribí *HOLA* para ver el menú.`);
}

const app = express();
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/', (req, res) => {
    res.json({ success: true, sistema: 'BARBER M.T - WhatsApp Bot', botStatus, apiBase: API_BASE });
});

app.get('/api/status', (req, res) => {
    res.json({ success: true, status: botStatus, qr: currentQR });
});

app.post('/api/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout().catch(() => {});
        }
    } catch (e) {}
    botStatus = 'desconectado';
    currentQR = null;
    sock = null;
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
    setTimeout(connectToWhatsApp, 1500);
    return res.json({ success: true, message: 'Bot reiniciando para nuevo QR...' });
});

app.post('/api/notify', async (req, res) => {
    try {
        const { telefono, mensaje } = req.body;
        if (!telefono || !mensaje) return res.status(400).json({ success: false, mensaje: 'Se requiere telefono y mensaje.' });
        const sent = await sendWhatsAppMessage(telefono, mensaje);
        return res.json({ success: sent, mensaje: sent ? 'Mensaje enviado.' : 'Bot no conectado.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/reservas/:telefono', async (req, res) => {
    try {
        const phone = cleanPhoneNumber(req.params.telefono);
        const rows = await dbAll(`SELECT * FROM reservas WHERE telefonoCliente = ? ORDER BY id DESC`, [phone]);
        return res.json({ success: true, cantidad: rows.length, reservas: rows });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

async function startServer() {
    await initDb();
    app.listen(PORT, () => console.log(`🚀 Servidor en puerto: ${PORT}`));
    await connectToWhatsApp();
}

startServer().catch((err) => console.error('❌ Error fatal:', err));
