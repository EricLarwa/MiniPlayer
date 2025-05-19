const http = require('http');
const url = require('url');

class AuthServer {
  constructor(port = 8888) {
    this.port = port;
    this.server = null;
    this.authCallback = null;
  }
  
  start(callback) {
    if (this.server) {
      return; // Already running
    }
    
    this.authCallback = callback;
    
    this.server = http.createServer((req, res) => {
      // Set CORS headers to allow Spotify to redirect here
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Request-Method', '*');
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
      res.setHeader('Access-Control-Allow-Headers', '*');
      
      // Parse the URL
      const parsedUrl = url.parse(req.url, true);
      const pathname = parsedUrl.pathname;
      
      console.log(`[AuthServer] Received request: ${pathname}`);
      
      // Handle the callback from Spotify
      if (pathname === '/callback') {
        const code = parsedUrl.query.code;
        const error = parsedUrl.query.error;
        
        if (code) {
          console.log('[AuthServer] Received auth code');
          
          // Send success HTML
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
                    padding-top: 50px;
                    background-color: #121212;
                    color: white;
                  }
                  .success { 
                    color: #1DB954; 
                    font-size: 48px;
                  }
                  .message {
                    margin: 20px;
                    font-size: 16px;
                  }
                  .container {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #282828;
                    border-radius: 8px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">✓</div>
                  <h1>Authentication Successful!</h1>
                  <p class="message">You can close this window and return to the application.</p>
                </div>
                <script>
                  // Close this window after 3 seconds if it was opened by the app
                  setTimeout(() => {
                    window.close();
                  }, 3000);
                </script>
              </body>
            </html>
          `);
          
          // Pass the code to the callback
          if (this.authCallback) {
            this.authCallback(code);
          }
        } else if (error) {
          console.error('[AuthServer] Authentication error:', error);
          
          // Send error HTML
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
                    padding-top: 50px;
                    background-color: #121212;
                    color: white;
                  }
                  .error { 
                    color: #e22134; 
                    font-size: 48px;
                  }
                  .message {
                    margin: 20px;
                    font-size: 16px;
                  }
                  .container {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #282828;
                    border-radius: 8px;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="error">✗</div>
                  <h1>Authentication Failed</h1>
                  <p class="message">Error: ${error}</p>
                  <p>Please close this window and try again.</p>
                </div>
              </body>
            </html>
          `);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid request');
        }
      } else {
        // Send a basic response for other endpoints
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Spotify Auth Server is running');
      }
    });
    
    this.server.listen(this.port, () => {
      console.log(`[AuthServer] Server running at http://127.0.0.1:${this.port}/`);
    });
    
    this.server.on('error', (err) => {
      console.error('[AuthServer] Server error:', err);
    });
  }
  
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[AuthServer] Server stopped');
    }
  }
  
  getRedirectUri() {
    return `http://127.0.0.1:${this.port}/callback`;
  }
}

module.exports = { AuthServer };