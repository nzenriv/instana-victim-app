require('@instana/collector')(); // Siempre en la línea 1

const express = require('express');
const app = express();
const PORT = 3000;

// --- CORRECCIÓN: Desactivar Caché para forzar 200 OK siempre ---
app.set('etag', false); // Desactiva el "304 Not Modified"
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

let isBroken = false;
const APP_VERSION = process.env.VERSION || "1.0.0 (Stable)";

app.use(express.static('public'));

// --- API ENDPOINTS ---

app.get('/api/transaction', async (req, res) => {
    if (isBroken) {
        // ESCENARIO DE FALLO
        await new Promise(r => setTimeout(r, 3000));
        console.error("CRITICAL: Database Connection Failed"); 
        return res.status(500).json({ error: "DB_TIMEOUT", severity: "HIGH" });
    }
    
    // ESCENARIO NORMAL (Forzamos status 200 explícito)
    res.status(200).json({ status: "success", data: "Transaction processed", timestamp: Date.now() });
});

app.get('/toggle-chaos', (req, res) => {
    isBroken = !isBroken;
    console.log(`Chaos Mode is now: ${isBroken}`);
    res.redirect('/'); 
});

// --- FRONTEND ---
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Demo Observabilidad</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; transition: background 0.5s; }
            .container { text-align: center; padding: 40px; border-radius: 20px; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 400px; }
            h1 { color: #333; }
            .status-indicator { font-size: 80px; margin: 20px 0; }
            .btn { padding: 15px 30px; font-size: 18px; cursor: pointer; border: none; border-radius: 8px; color: white; font-weight: bold; transition: transform 0.2s; }
            .btn-chaos { background-color: #e74c3c; }
            .btn-chaos:hover { background-color: #c0392b; }
            .btn-fix { background-color: #2ecc71; }
            .meta { color: #777; margin-top: 20px; font-size: 14px; }
            body.critical { background-color: #ffebee; }
            .critical .container { border: 2px solid #e74c3c; }
            body.healthy { background-color: #e8f5e9; }
            .healthy .container { border: 2px solid #2ecc71; }
        </style>
    </head>
    <body class="loading">
        <div class="container">
            <h1>App Financiera</h1>
            <div id="status-icon" class="status-indicator">🔄</div>
            <h2 id="status-text">Cargando...</h2>
            <p class="meta">Versión: <strong>${APP_VERSION}</strong></p>
            <p class="meta">Latencia: <strong id="latency">--</strong> ms</p>
            <hr>
            <p>Panel de Control de Demo:</p>
            <a href="/toggle-chaos">
                <button class="btn ${isBroken ? 'btn-fix' : 'btn-chaos'}">
                    ${isBroken ? 'REPARAR MANUALMENTE' : '💥 PROVOCAR CAOS'}
                </button>
            </a>
        </div>
        <script>
            async function checkHealth() {
                const start = Date.now();
                try {
                    // Agregamos un timestamp a la URL para evitar caché del lado del navegador también
                    const response = await fetch('/api/transaction?t=' + Date.now());
                    const duration = Date.now() - start;
                    document.getElementById('latency').innerText = duration;

                    if (response.status === 200) {
                        setHealthy();
                    } else {
                        setCritical();
                    }
                } catch (e) {
                    setCritical();
                }
            }

            function setHealthy() {
                document.body.className = 'healthy';
                document.getElementById('status-icon').innerText = '✅';
                document.getElementById('status-text').innerText = 'Sistema Operativo';
                document.getElementById('status-text').style.color = '#2ecc71';
            }

            function setCritical() {
                document.body.className = 'critical';
                document.getElementById('status-icon').innerText = '🔥';
                document.getElementById('status-text').innerText = 'FALLO CRÍTICO';
                document.getElementById('status-text').style.color = '#e74c3c';
            }

            setInterval(checkHealth, 2000);
            checkHealth();
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Demo App running on port ${PORT}`);
});
