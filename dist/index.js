"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5555;
// Middleware
app.use((0, cors_1.default)());
// Parse raw body to string instead of auto-parsing JSON to keep exactly what was sent
app.use(express_1.default.text({ type: '*/*', limit: '10mb' }));
// Set up server-sent events for live UI updates
const clients = {};
const sendSseEvent = (appSlug, eventName, data) => {
    const appClients = clients[appSlug];
    if (appClients) {
        appClients.forEach(client => {
            client.write(`event: ${eventName}\n`);
            client.write(`data: ${JSON.stringify(data)}\n\n`);
        });
    }
};
// ------------------------------------------------------------------
// Capture Endpoint / General Middleware
// ------------------------------------------------------------------
// ------------------------------------------------------------------
// UI & Management Endpoints
// ------------------------------------------------------------------
// Serve the management UI
app.get('/manage/:appSlug', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html'));
});
// API: List requests for an app
app.get('/api/:appSlug/requests', (req, res) => {
    try {
        const requests = db_1.getRequestsByApp.all(req.params.appSlug);
        res.json(requests);
    }
    catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});
// API: SSE Stream for live updates
app.get('/api/:appSlug/stream', (req, res) => {
    const appSlug = req.params.appSlug;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (!clients[appSlug]) {
        clients[appSlug] = new Set();
    }
    clients[appSlug].add(res);
    req.on('close', () => {
        clients[appSlug]?.delete(res);
        if (clients[appSlug]?.size === 0) {
            delete clients[appSlug];
        }
    });
});
// API: Clear all requests for an app
app.delete('/api/:appSlug/requests', (req, res) => {
    try {
        db_1.clearRequestsByApp.run(req.params.appSlug);
        sendSseEvent(req.params.appSlug, 'clear', {});
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to clear requests' });
    }
});
// API: Delete specific request
app.delete('/api/:appSlug/requests/:requestId', (req, res) => {
    try {
        db_1.deleteRequestById.run(req.params.requestId, req.params.appSlug);
        sendSseEvent(req.params.appSlug, 'delete', { id: req.params.requestId });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete request' });
    }
});
// ------------------------------------------------------------------
// Capture Endpoint (Catch-All)
// ------------------------------------------------------------------
app.use((req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/manage/')) {
        res.status(404).end();
        return;
    }
    // Path format is usually /appSlug/...
    const pathParts = req.path.split('/').filter(Boolean);
    const appSlug = pathParts[0];
    if (!appSlug) {
        res.status(404).end();
        return;
    }
    try {
        const requestData = {
            id: crypto_1.default.randomUUID(),
            app_slug: appSlug,
            method: req.method,
            url: req.originalUrl,
            headers: JSON.stringify(req.headers),
            query_params: JSON.stringify(req.query),
            body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
            ip: req.ip || req.socket.remoteAddress || null
        };
        db_1.insertRequest.run(requestData);
        // Broadcast newly captured request
        sendSseEvent(appSlug, 'new_request', {
            ...requestData,
            created_at: new Date().toISOString()
        });
        res.status(200).send('Captured successfully.\n');
    }
    catch (error) {
        console.error('Error capturing request:', error);
        res.status(500).send('Internal Server Error\n');
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Postbin server running on port ${PORT}`);
    console.log(`📁 Data stored in sqlite3 database`);
    console.log(`\nUsage examples:`);
    console.log(`   POST http://localhost:${PORT}/myapp`);
    console.log(`   GET  http://localhost:${PORT}/manage/myapp`);
});
//# sourceMappingURL=index.js.map