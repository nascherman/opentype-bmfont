const TextToSVG = require('text-to-svg');
const svgToImage = require('svg-to-image');
const computeLayout = require('opentype-layout');
var getContext = require('get-canvas-context');
const defaults = require('lodash.defaults');
const xtend = require('xtend');
var pack = require('bin-pack');
var ndarrayPack = require('ndarray-bin-pack');
var getPixels = require('get-image-pixels')
var ndarray = require('ndarray');
var pixmap = require('ndarray-bitmap-to-rgba').opaque;
var imageSdf = require('image-sdf');
var fromImage = require('ndarray-from-image');
var distanceTransform = require('distance-transform');

const parser = new DOMParser();
var texture;

const WIDTH = 450;
const HEIGHT = 450;
const PADDING = 5;

let context = getContext('2d', {
  width: WIDTH, height: HEIGHT
});
let sdfContext = getContext('2d', {
  width: WIDTH, height: HEIGHT
});

let defaultChars = [
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v',
  'w','x','y','z', '!','@','#','$','%','^','&','*','(',')',':',';',
  '{','}','|','?','>','<','+','_','-','/','\'','~','`',
  '1','2','3','4','5','6','7','8','9','0','[',']','\"',
  ',','.','=','\\'
];
// defaultChars = ['f', '}', 'j'];
const attributes = {
  fill: 'white', 
  stroke: 'white',
};

const DEFAULT_OPTS = {
  chars: defaultChars,
  sdf: false,
  width: WIDTH,
  height: HEIGHT,
  lineHeight: 40,
  base: 30,
  letterSpacing: 0,
  options: {
    x: 0, 
    y: 0, 
    fontSize: 48, 
    kerning: false,
    anchor: 'left top', 
    attributes: attributes
  }
};

function noop() {}

function OpenTypeBmFont(opts) {
  opts = opts || {};
  Object.assign(this, opts);
  this.svgs = [];
  this.JSON = {};
}

OpenTypeBmFont.prototype.createBitmap = function(fontFace, opts, callback) {
  if(fontFace === undefined) throw new Error('must defined a font face');
  callback = callback || noop;
  defaults(opts, DEFAULT_OPTS);
  let _this = this;
  let div = document.createElement('div');
  document.body.appendChild(div);
  TextToSVG.load(fontFace, function(err, library) {
    if(err) console.warn(err);
    else {
      let dX = 0;
      let dY = 0;
      let glyphs = [];
      let sdfGlyphs = [];
      opts.chars.forEach(function(glyph, i) {
        const metrics = library.getMetrics(glyph);
        const text = glyph;
        let svg = library.getSVG(text, opts.options);
        let domSVG = parser.parseFromString(svg, "image/svg+xml");
        let svgDom = domSVG.children[0];
        svgDom.style['background-color'] = 'black';
        svg = domSVG.children[0].outerHTML;
        
        svgToImage(svg, function(err, image) {
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
          let sdfBitmap = context.getImageData(dX, dY, metrics.width, metrics.height);
          // TODO use distance transforms
          // sdfBitmap.data.set(context.getImageData(dX, dY, metrics.width, metrics.height));
          // let ndArr = ndarray(sdfBitmap.data, [metrics.width, metrics.height]);
          // var img = document.createElement('img');
          // img.src = context.canvas.toDataURL('image/png');
          // let ndArr = fromImage(img, 'float64');
          // let disRes = distanceTransform(ndArr, 1);
          // sdfBitmap.data.set(disRes);
          // clear context by putting empty image data
          let clearImage = context.createImageData(metrics.width + PADDING, metrics.height + PADDING);
          context.putImageData(clearImage, 0, 0); 
          glyphs.push({
            id: glyph.charCodeAt(),
            xadvance: metrics.width + PADDING,
            width: parseInt(width + PADDING),
            height: parseInt(height + PADDING),
            bitmap: imageData,
            // sdfBitmap: sdfBitmap,
            shape: [parseInt(width), parseInt(height), 1],
            page: 0,
            xoffset: width + PADDING,
            yoffset: height + PADDING,
            chnl: 0
          });
          if(i === opts.chars.length - 1) {
            let result = pack(glyphs);
            result.items.forEach(function(item) {
               item.yOffset = item.y + PADDING; 
               context.putImageData(item.item.bitmap, item.x, item.y);
               // sdfContext.putImageData(item.item.sdfBitmap, item.x, item.y);
            })

            Object.keys(div.children).forEach(function(key) {
              div.remove(div.children[key]);
            });
            
              // TEMP for testing
             var imgData = new ImageData(WIDTH, HEIGHT);
             imgData.data.set(context.getImageData(0,0, WIDTH, HEIGHT).data);
             var array = ndarray(imgData.data, [WIDTH, HEIGHT * 4]);
             var res = imageSdf(array, { spread: 32, downscale: 1 });
             imgData = new ImageData(WIDTH, HEIGHT);
             imgData.data.set(res.data);
             sdfContext.putImageData(imgData, 0, 0);
            // document.body.appendChild(context.canvas);
            // document.body.appendChild(sdfContext.canvas);
            // 
            _this.createJSON(result, sdfContext, library.font, opts);
            if(callback) callback(undefined, _this);
          }
        });
      });
    }
  });
};

OpenTypeBmFont.prototype.createJSON = function(glyphs, context, font, opts) {
  let _this = this;
  this.JSON.chars = [];
  this.JSON.pages = [];
  glyphs.items.forEach(function(char) {
    char.item.x = char.x;
    char.item.y = char.y;
    _this.JSON.chars.push(char.item);
  });
  opts.scaleH = opts.height;
  opts.scaleW = opts.width;
  this.JSON.common = opts;
  this.JSON.info = font;
  // this.JSON.kernings = font.kerningPairs;

  // document.body.appendChild(context.canvas);
  let page = context.getImageData(0, 0, opts.width, opts.height);
  // document.body.removeChild(context.canvas);
  this.JSON.pages.push(page);
  // console.log(this.JSON);
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

