var fs          = 	require('fs'),
    express     = 	require('express'),
    path        =   require('path'),
    serialPort  =   require('serialport');
const index = path.join(__dirname, '../Client');

//Initialize the serial port plugin
//serialPort = serialPort.SerialPort;

// Setup listener/sender on usb port
sp = new serialPort("/dev/ttyACM0", {
    baudRate:   9600,
});

console.log(`index path: ${index}`);
  
// Create a new Express application.
var app = express();

app.use(express.static(index));

app.get('/', (req, res) => {
    res.sendFile(path.join(index, 'index.html'));
});

app.get('/tfTrain', (req, res) => {
    res.sendFile(path.join(index, 'TF Train/src/tfTrain.html'));
});

app.get('/openBox', (req, res) => {
    sp.write('5', (err) => {
        return console.log('Error on usb write: ', err.message);
    })
});

module.exports = app;