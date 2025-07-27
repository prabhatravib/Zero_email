export class ZeroAgent {
    constructor(state: any, env: any) {}

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        
        // Handle WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') {
            const webSocketPair = new WebSocketPair();
            const [client, server] = Object.values(webSocketPair);
            
            // Accept the WebSocket connection
            server.accept();
            
            // Set up WebSocket event handlers
            server.addEventListener('message', (event) => {
                console.log('🔍 ZeroAgent - WebSocket message received:', event.data);
                
                // Echo the message back for now
                server.send(JSON.stringify({
                    type: 'response',
                    data: event.data,
                    timestamp: new Date().toISOString()
                }));
            });
            
            server.addEventListener('close', () => {
                console.log('🔍 ZeroAgent - WebSocket connection closed');
            });
            
            server.addEventListener('error', (error) => {
                console.error('🔍 ZeroAgent - WebSocket error:', error);
            });
            
            // Send initial connection message
            server.send(JSON.stringify({
                type: 'connected',
                message: 'WebSocket connection established',
                timestamp: new Date().toISOString()
            }));
            
            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        }
        
        // Handle regular HTTP requests
        return new Response(JSON.stringify({
            message: 'ZeroAgent is running',
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 