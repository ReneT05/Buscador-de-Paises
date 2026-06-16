const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname);

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

function sendResponse(res, statusCode, data, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(data);
}

function fetchCountry(countryName, redirectCount = 0) {
  const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`;
  return fetchUrl(url, redirectCount);
}

function fetchUrl(url, redirectCount) {
  return new Promise((resolve, reject) => {
    https.get(url, (apiRes) => {
      if ([301, 302, 303, 307, 308].includes(apiRes.statusCode)) {
        if (redirectCount >= 5 || !apiRes.headers.location) {
          const error = new Error('Too many redirects or missing location header');
          error.status = apiRes.statusCode;
          reject(error);
          return;
        }

        const nextUrl = new URL(apiRes.headers.location, url).toString();
        resolve(fetchUrl(nextUrl, redirectCount + 1));
        return;
      }

      let body = '';
      apiRes.on('data', (chunk) => { body += chunk; });
      apiRes.on('end', () => {
        if (apiRes.statusCode !== 200) {
          const error = new Error('Country not found');
          error.status = apiRes.statusCode;
          reject(error);
          return;
        }
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (parseError) {
          reject(parseError);
        }
      });
    }).on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/country') {
    const name = url.searchParams.get('name');
    if (!name) {
      sendResponse(res, 400, JSON.stringify({ error: 'El parámetro name es obligatorio.' }), 'application/json');
      return;
    }

    try {
      const data = await fetchCountry(name);
      sendResponse(res, 200, JSON.stringify(data), 'application/json');
    } catch (error) {
      if (error.status === 404) {
        sendResponse(res, 404, JSON.stringify({ error: 'País no encontrado' }), 'application/json');
      } else {
        sendResponse(res, 500, JSON.stringify({ error: 'Error al consultar la API externa' }), 'application/json');
      }
    }
    return;
  }

  let filePath = path.join(publicDir, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) {
    filePath += '.html';
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendResponse(res, 404, 'Archivo no encontrado', 'text/plain');
      } else {
        sendResponse(res, 500, 'Error interno del servidor', 'text/plain');
      }
      return;
    }
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    sendResponse(res, 200, content, contentType);
  });
});

server.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});
