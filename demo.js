const OpenTypeBmFont = require('./');
let BmFont = new OpenTypeBmFont();

require('domready')(function() { 
  demo();
});

function demo() {
  BmFont.createBitmap('./demo/fonts/DejaVuSans.ttf', {});  
}