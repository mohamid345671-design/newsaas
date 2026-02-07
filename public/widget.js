(function() {
    console.log("🚀 Wssel Widget Initializing...");

    // 1. قراءة المعرف (ID) من الكود اللي حط الكليان
    // هاد السطر هو اللي كيمشي يقلب على السكريبت ويجبد منو data-id
    const scriptTag = document.currentScript || document.querySelector("script[src*='widget.js']");
    const CLIENT_ID = scriptTag ? scriptTag.getAttribute("data-id") : null;

    // باش نعرفو السيرفر فين كاين (localhost ولا ngrok)
    // كنستعملو origin ديال السكريبت نيت
    const SERVER_URL = new URL(scriptTag.src).origin;

    if (!CLIENT_ID) {
        console.error("❌ Error: Wssel Bot ID is missing!");
        return;
    }

    // 2. شارجيمون ديال Socket.io بلا ما يعيق الكليان
    if (!window.io) {
        const socketScript = document.createElement('script');
        socketScript.src = `${SERVER_URL}/socket.io/socket.io.js`; // كنجيبوه من السيرفر ديالنا نيت
        socketScript.onload = initWidget;
        document.head.appendChild(socketScript);
    } else {
        initWidget();
    }

    function initWidget() {
        console.log(`🔌 Connecting to ${SERVER_URL} with ID: ${CLIENT_ID}`);
        const socket = io(SERVER_URL);

        // --- CSS (الديزاين) ---
        const style = document.createElement('style');
        style.innerHTML = `
        #wssel-bubble { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #075e54; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer; z-index: 999999; display: flex; align-items: center; justify-content: center; transition: transform 0.3s; }
        #wssel-bubble:hover { transform: scale(1.1); }
        #wssel-bubble svg { width: 32px; height: 32px; fill: white; }

        #wssel-container { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; max-height: 80vh; background: #efe7dd; border-radius: 15px; box-shadow: 0 5px 30px rgba(0,0,0,0.2); z-index: 999999; display: none; flex-direction: column; overflow: hidden; font-family: sans-serif; animation: slideUp 0.3s ease; }
        .wssel-header { background: #075e54; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; }
        .wssel-body { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background-color: #e5ddd5; }
        .wssel-footer { padding: 10px; background: #f0f0f0; display: flex; gap: 10px; border-top: 1px solid #ddd; }
        .wssel-input { flex: 1; padding: 12px; border: none; border-radius: 20px; outline: none; }
        .wssel-send { background: #075e54; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 14px; line-height: 1.4; word-wrap: break-word; }
        .msg-bot { background: white; align-self: flex-start; border-top-left-radius: 0; }
        .msg-user { background: #dcf8c6; align-self: flex-end; border-top-right-radius: 0; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        `;
        document.head.appendChild(style);

        // --- HTML (الهيكل) ---
        const widgetHTML = `
        <div id="wssel-bubble"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></div>
        <div id="wssel-container">
        <div class="wssel-header">
        <span style="font-weight:bold">Mosa3id (Online)</span>
        <span id="wssel-close" style="cursor:pointer; font-size:24px">&times;</span>
        </div>
        <div class="wssel-body" id="wssel-messages">
        <div class="msg msg-bot">مرحباً! 👋 كيفاش نقدر نعاونك؟</div>
        </div>
        <div class="wssel-footer">
        <input type="text" class="wssel-input" id="wssel-input" placeholder="كتب الميساج..." />
        <button class="wssel-send" id="wssel-btn">➤</button>
        </div>
        </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = widgetHTML;
        document.body.appendChild(div);

        // --- Logic (التفاعل) ---
        const bubble = document.getElementById('wssel-bubble');
        const container = document.getElementById('wssel-container');
        const closeBtn = document.getElementById('wssel-close');
        const input = document.getElementById('wssel-input');
        const sendBtn = document.getElementById('wssel-btn');
        const messages = document.getElementById('wssel-messages');

        function toggleChat() {
            const isHidden = container.style.display === 'none';
            container.style.display = isHidden ? 'flex' : 'none';
            if(isHidden) input.focus();
        }
        bubble.onclick = toggleChat;
        closeBtn.onclick = toggleChat;

        function addMessage(text, sender) {
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg ${sender === 'user' ? 'msg-user' : 'msg-bot'}`;
            msgDiv.innerText = text;
            messages.appendChild(msgDiv);
            messages.scrollTop = messages.scrollHeight;
        }

        function sendMessage() {
            const text = input.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            input.value = '';

            // ⚠️ الأهم: كنصيفطو الـ ID للسيرفر
            socket.emit('web_message', {
                clientId: CLIENT_ID,
                text: text
            });
        }

        sendBtn.onclick = sendMessage;
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

        socket.on('bot_reply', (reply) => {
            addMessage(reply, 'bot');
        });
    }
})();
