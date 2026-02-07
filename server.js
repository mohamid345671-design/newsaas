require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const Groq = require('groq-sdk');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ✅ التعديل المهم 1: البور ديناميك باش يخدم فـ Render
const PORT = process.env.PORT || 3000;

const io = new Server(server, { cors: { origin: "*" } });

// ✅ ضروري: باش السيرفر يفهم المعلومات اللي جاية من الداشبورد
app.use(express.json());
app.use(express.static('public'));
app.use(cors());

// API Key
const GROQ_API_KEY = "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";
const groq = new Groq({ apiKey: GROQ_API_KEY });

// === 📦 الذاكرة (Storage) ===
const webBots = new Map(); // هنا كنخزنو بوتات السيت
const userPrompts = new Map(); // هنا كنخزنو بوتات واتساب

app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// ✅ API لصناعة بوت جديد
app.post('/create-web-bot', (req, res) => {
    const { prompt } = req.body;
    const botId = 'bot_' + Date.now(); // نصاوبو ID جديد
    webBots.set(botId, prompt); // نخزنوه فالذاكرة

    console.log(`🎉 New Web Bot Created! ID: ${botId}`);
    res.json({ botId: botId }); // نجاوبو الداشبورد
});

// === 🔌 Socket.io Logic ===
io.on('connection', (socket) => {
    console.log('👤 New connection:', socket.id);

    // 1️⃣ واتساب
    socket.on('start_bot', async (prompt) => {
        console.log("📝 WhatsApp Prompt received");
        userPrompts.set(socket.id, prompt);

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: socket.id }),
                                  puppeteer: { headless: true, args: ['--no-sandbox'] }
        });

        client.on('qr', (qr) => {
            qrcode.toDataURL(qr, (err, url) => {
                socket.emit('qr_code', url);
            });
        });

        client.on('ready', () => {
            socket.emit('bot_ready');
            console.log("✅ WhatsApp Ready!");
        });

        client.on('message', async msg => {
            if (msg.from.includes('status')) return;
            try {
                const myPrompt = userPrompts.get(socket.id) || "Helpful assistant";
                const completion = await groq.chat.completions.create({
                    messages: [{ role: "system", content: myPrompt }, { role: "user", content: msg.body }],
                    // ✅ التعديل المهم 2: الموديل الصحيح
                    model: "openai/gpt-oss-120b",
                });
                await client.sendMessage(msg.from, completion.choices[0]?.message?.content || "Error");
            } catch (e) { console.error(e); }
        });
        client.initialize();
    });

    // 2️⃣ بوت الموقع (Web Widget)
    socket.on('web_message', async (data) => {
        try {
            // كنجيبو البرومبت بـ ID
            const systemPrompt = webBots.get(data.clientId) || "You are a helpful assistant.";

            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: data.text }
                ],
                // ✅ التعديل المهم 3: الموديل الصحيح
                model: "openai/gpt-oss-120b",
            });
            socket.emit('bot_reply', completion.choices[0]?.message?.content || "Error");
        } catch (error) {
            console.error(error);
            socket.emit('bot_reply', "Error processing request");
        }
    });
});

// ✅ التعديل المهم 4: الاستماع للبور الديناميك
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
