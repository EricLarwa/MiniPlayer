const { createServer } = require('http');
const { parse } = require('url');
const port = 8888;

console.log(`Starting callback server on port ${port}...`);

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  const { pathname, query } = parsedUrl;
  
  console.log(`Received request for ${pathname}`);
  
  // Handle the callback from Spotify
  if (pathname === '/callback') {
    console.log('Callback received with query:', query);
    
    if (query.code) {
      console.log('Authorization code received:', query.code);
      
      // Send a success response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 50px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              padding: 30px;
              max-width: 500px;
              margin: 0 auto;
            }
            h1 {
              color: #1DB954; /* Spotify green */
            }
            p {
              margin: 20px 0;
            }
            .button {
              background-color: #1DB954;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 24px;
              font-size: 14px;
              cursor: pointer;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Successful!</h1>
            <p>You have successfully authenticated with Spotify.</p>
            <p>You can close this window and return to the application.</p>
            <button class="button" onclick="window.close()">Close Window</button>
          </div>
          <script>
            // Try to communicate with the opener window if possible
            if (window.opener) {
              try {
                window.opener.postMessage({ type: 'spotify-auth', code: '${query.code}' }, '*');
              } catch (err) {
                console.error('Could not send message to opener:', err);
              }
            }
          </script>
        </body>
        </html>
      `);
    } else if (query.error) {
      console.log('Authentication error:', query.error);
      
      // Send an error response
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 50px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              padding: 30px;
              max-width: 500px;
              margin: 0 auto;
            }
            h1 {
              color: #e74c3c; /* Error red */
            }
            p {
              margin: 20px 0;
            }
            .button {
              background-color: #1DB954;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 24px;
              font-size: 14px;
              cursor: pointer;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Failed</h1>
            <p>There was an error authenticating with Spotify: ${query.error}</p>
            <p>Please try again.</p>
            <button class="button" onclick="window.close()">Close Window</button>
          </div>
        </body>
        </html>
      `);
    } else {
      // Send a generic response 
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <body>
          <h1>Invalid callback request</h1>
          <p>Missing required parameters.</p>
        </body>
        </html>
      `);
    }
  } else {
    // Handle other paths
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <body>
        <h1>404 Not Found</h1>
        <p>The requested URL ${pathname} was not found on this server.</p>
      </body>
      </html>
    `);
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Is the server already running?`);
  } else {
    console.error('Server error:', e);
  }
});