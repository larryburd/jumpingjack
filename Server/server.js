// This will be our application entry. We'll setup our server here.
const https = require('http');

// The express app we created
const app = require('./app'); 

const port = parseInt(process.env.PORT, 10) || 3500;
app.set('port', port);

const server = https.createServer(app).listen(port, function() {
	console.log('Server listening on port: ' + port);
});