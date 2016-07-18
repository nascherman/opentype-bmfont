const TextToSVG = require('text-to-svg');
const svgToImage = require('svg-to-image');
const computeLayout = require('opentype-layout');
var getContext = require('get-canvas-context');
const defaults = require('lodash.defaults');
const xtend = require('xtend');
var pack = require('bin-pack');
const parser = new DOMParser();

const WIDTH = 110;
const HEIGHT = 120;

let context = getContext('2d', {
  width: WIDTH, height: HEIGHT
});

const defaultChars = [
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v',
  'w','x','y','z', '!','@','#','$','%','^','&','*','(',')',':',';',
  '{','}','|','?','>','<','+','_','-','/','\'','~','`',
  '1','2','3','4','5','6','7','8','9','0','[',']','\"',
  ',','.','=','\\'
];

const attributes = {
  fill: 'black', 
  stroke: 'black'
};

const DEFAULT_OPTS = {
  chars: defaultChars,
  sdf: false,
  width: 512,
  height: 512,
  lineHeight: 1,
  letterSpacing: 0,
  options: {
    x: 0, 
    y: 0, 
    fontSize: 14, 
    kerning: false,
    anchor: 'top', 
    attributes: attributes
  }
};

function noop() {}

function OpenTypeBmFont(opts) {
  opts = opts || {};
  Object.assign(this, opts);
  this.svgs = [];
}

OpenTypeBmFont.prototype.createBitmap = function(fontFace, opts, callback) {
  if(fontFace === undefined) throw new Error('must defined a font face');
  callback = callback || noop;
  defaults(opts, DEFAULT_OPTS);
  let div = document.createElement('div');
  document.body.appendChild(div);
  TextToSVG.load('./demo/fonts/DejaVuSans.ttf', function(err, library) {
    if(err) console.warn(err);
    else {
      let dX = 0;
      let dY = 0;
      let glyphs = [];
      opts.chars.forEach(function(glyph, i) {
        const metrics = library.getMetrics(glyph);
        const text = glyph;
        const svg = library.getSVG(text, opts.options);
        const domSVG = parser.parseFromString(svg, "image/svg+xml");
         
        svgToImage(svg, (err, image) => {
          if (err) throw err;
          div.appendChild(domSVG.children[0]);
          const glyphPaths = document.getElementsByTagName('path');
          let width = 0; let height = 0;
          Object.keys(glyphPaths).forEach(function(key) {
            const dimensions = getGlyphDimensions(glyphPaths[key]);
            if(dimensions.width > width) width = dimensions.width;
            if(dimensions.height > height) height = dimensions.height;
          });
          
          context.drawImage(image, dX, dY);
          // uint8 for bmfont
          let imageData = context.getImageData(dX, dY, metrics.width, metrics.height);
          let clearImage = context.createImageData(metrics.width, metrics.height);
          context.putImageData(clearImage, 0, 0); // clear context by putting empty image data
          glyphs.push({
            id: i + 1,
            advance: width + 1,
            width: parseInt(width) + 2,
            height: parseInt(height) + 2,
            bitmap: imageData,
            shape: [width, height]
          });
          if(i === opts.chars.length - 1) {
            let result = pack(glyphs);
            result.items.forEach(function(item) {
               context.putImageData(item.item.bitmap, item.x, item.y);
            })
            // testing
            Object.keys(div.children).forEach(function(key) {
            //div.children.forEach(function(i) {
              div.remove(div.children[key]);
            });
         //   document.body.removeChild(div);
            document.body.appendChild(context.canvas);
          }
        });
      });
    }
  });
};

function layoutString(glyphs) {
  let rows = [];
  let chars = [];
  let string = '';
  let currRow = 0;
  glyphs.forEach((glyph) => {
    if(glyph.row > currRow) {
      currRow++;
      chars.push(string);
      rows.push(string);
      string = String.fromCharCode(glyph.data.unicode);
    } 
    else {
      string += String.fromCharCode(glyph.data.unicode);
    }
  });
  chars.push(string);
  rows.push(string);
  return chars;
}

function getGlyphDimensions(glyphPath) {
  let width = glyphPath.getBoundingClientRect().width;
  let height = glyphPath.getBoundingClientRect().height;
  return {
    width: width,
    height: height
  };
}
module.exports = OpenTypeBmFont;

