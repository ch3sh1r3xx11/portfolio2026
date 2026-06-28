const http = require('http');
const fs = require('fs');
const path = require('path');

const rewrites = [
    { source: /^\/projektownik-test\/(.*)/, destination: '/apps/projektownik-test/$1' },
    { source: /^\/projektownik-test\/?$/, destination: '/apps/projektownik-test/index.html' },
    { source: /^\/projektownik\/(.*)/, destination: '/apps/projektownik/$1' },
    { source: /^\/projektownik\/?$/, destination: '/apps/projektownik/index.html' },
    { source: /^\/creator\/(.*)/, destination: '/apps/creator/$1' },
    { source: /^\/creator\/?$/, destination: '/apps/creator/index.html' },
    { source: /^\/packages\/(.*)/, destination: '/packages/$1' },
    { source: /^\/(.*)/, destination: '/apps/portfolio/$1' }
];

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    
    // Apply rewrites
    for (const rule of rewrites) {
        if (rule.source.test(urlPath)) {
            urlPath = urlPath.replace(rule.source, rule.destination);
            break;
        }
    }
    
    if (urlPath.endsWith('/')) {
        urlPath += 'index.html';
    }

    const filePath = path.join(__dirname, urlPath);
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' });
            res.end('404 Not Found');
        } else {
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(3000, () => {
    console.log('DEV SERVER STARTED ON http://localhost:3000');
    console.log('Projektownik (Test): http://localhost:3000/projektownik-test');
    console.log('Projektownik: http://localhost:3000/projektownik');
    console.log('Kreator: http://localhost:3000/creator');
});
