var fs      = 	require('fs'),
    express = 	require('express'),
    path    =   require('path');
const index = path.join(__dirname, '../Client');

console.log(`index path: ${index}`);
  
// Create a new Express application.
var app = express();

app.use(express.static(index));

app.get('/', (req, res) => {
    res.sendFile(path.join(index, 'index.html'));
});

app.get('/tfTrain', (req, res) => {
    res.sendFile(path.join(index, 'TF Train/src/tfTrain.html'));
})

module.exports = app;