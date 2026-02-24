import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { 
  insertRequest, 
  getRequestsByApp, 
  clearRequestsByApp, 
  deleteRequestById, 
  RequestRecord 
} from './db';

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware
app.use(cors());
// Parse raw body to string instead of auto-parsing JSON to keep exactly what was sent
app.use(express.text({ type: '*/*', limit: '10mb' }));

// Set up server-sent events for live UI updates
const clients: { [appSlug: string]: Set<Response> } = {};

const sendSseEvent = (appSlug: string, eventName: string, data: any) => {
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
app.get('/manage/:appSlug', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API: List requests for an app
app.get('/api/:appSlug/requests', (req: Request, res: Response) => {
  try {
    const requests = getRequestsByApp.all(req.params.appSlug as string);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// API: SSE Stream for live updates
app.get('/api/:appSlug/stream', (req: Request, res: Response) => {
  const appSlug = req.params.appSlug as string;

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
app.delete('/api/:appSlug/requests', (req: Request, res: Response) => {
  try {
    clearRequestsByApp.run(req.params.appSlug as string);
    sendSseEvent(req.params.appSlug as string, 'clear', {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear requests' });
  }
});

// API: Delete specific request
app.delete('/api/:appSlug/requests/:requestId', (req: Request, res: Response) => {
  try {
    deleteRequestById.run(req.params.requestId, req.params.appSlug as string);
    sendSseEvent(req.params.appSlug as string, 'delete', { id: req.params.requestId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

// ------------------------------------------------------------------
// Capture Endpoint (Catch-All)
// ------------------------------------------------------------------
app.use((req: Request, res: Response) => {
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
      id: crypto.randomUUID(),
      app_slug: appSlug,
      method: req.method,
      url: req.originalUrl,
      headers: JSON.stringify(req.headers),
      query_params: JSON.stringify(req.query),
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      ip: req.ip || req.socket.remoteAddress || null
    };

    insertRequest.run(requestData);
    
    // Broadcast newly captured request
    sendSseEvent(appSlug, 'new_request', {
      ...requestData,
      created_at: new Date().toISOString()
    });

    res.status(200).send('Captured successfully.\n');
  } catch (error) {
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
