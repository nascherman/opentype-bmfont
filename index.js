var TextToSVG = require('text-to-svg');
var svgToImage = require('svg-to-image');
var computeLayout = require('opentype-layout');
var defaults = require('lodash.defaults');
var xtend = require('xtend');
var pack = require('bin-pack');
var ndarrayPack = require('ndarray-bin-pack');
var ndarray = require('ndarray');
var imageSdf = require('image-sdf');
// var fromImage = require('ndarray-from-image');
// var distanceTransform = require('distance-transform');

var parser = new DOMParser();
var texture;

var WIDTH = 1000;
var HEIGHT = 1000;
var PADDING = 5;

var canvas = document.createElement('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
var context = canvas.getContext('2d');

var sdfCanvas = document.createElement('canvas');
sdfCanvas.width = WIDTH;
sdfCanvas.height = HEIGHT;
var sdfContext = canvas.getContext('2d');

let defaultChars = [
  'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v',
  'w','x','y','z', '!','@','#','$','%','^','&','*','(',')',':',';',
  '{','}','|','?','>','<','+','_','-','/','\'','~','`',
  '1','2','3','4','5','6','7','8','9','0','[',']','\"',
  ',','.','=','\\', ' ', 'A','B','C','D','E','F','G','H','I','J','K','L','N','M','O'
  ,'P','Q','R','S','T','U','V','W','X','Y','Z'
];

const attributes = {
  fill: 'white', 
  //stroke: 'white',
};

const DEFAULT_OPTS = {
  chars: defaultChars,
  sdf: false,
  width: WIDTH,
  height: HEIGHT,
  lineHeight: 72,
  base: 30,
  letterSpacing: 0,
  options: {
    x: 0, 
    y: 0, 
    fontSize: 72, 
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

OpenTypeBmFont.prototype._svgToImage = function(svg, glyph, dX, dY) {
  return new Promise((resolve, reject) => {
    svgToImage(svg, function(err, image) {
      if (err != null) {
        reject(err);
        return null;
      }
      const glyphPaths = document.getElementsByTagName('path');
      let width = image.naturalWidth; let height = image.naturalHeight;
      context.drawImage(image, dX, dY);
      // uint8 for bmfont
      let imageData = context.getImageData(dX, dY, width, height);
      let sdfBitmap = context.getImageData(dX, dY, width, height);
      // TODO use distance transforms
      // sdfBitmap.data.set(context.getImageData(dX, dY, metrics.width, metrics.height));
      // let ndArr = ndarray(sdfBitmap.data, [metrics.width, metrics.height]);
      // var img = document.createElement('img');
      // img.src = context.canvas.toDataURL('image/png');
      // let ndArr = fromImage(img, 'float64');
      // let disRes = distanceTransform(ndArr, 1);
      // sdfBitmap.data.set(disRes);
      // clear context by putting empty image data
      let clearImage = context.createImageData(WIDTH, HEIGHT);
      context.putImageData(clearImage, 0, 0); 
      const glyphImage = {
        id: glyph.charCodeAt(),
        xadvance: width,
        yadvance: height,
        width: parseInt(width),
        height: parseInt(height),
        bitmap: imageData,
        // sdfBitmap: sdfBitmap,
        shape: [parseInt(width), parseInt(height), 1],
        page: 0,
        xoffset: PADDING,
        yoffset: 0,
        chnl: 0
      };
      resolve(glyphImage);
    });
  });
};

OpenTypeBmFont.prototype.createBitmap = async function(fontFace, opts, callback) {
  if(fontFace === undefined) throw new Error('must defined a font face');
  callback = callback || noop;
  defaults(opts, DEFAULT_OPTS);
  let _this = this;
  return await TextToSVG.load(fontFace, async function(err, library) {
    if(err) {
      console.warn(err);
      if(callback) callback(err, _this);
      return;
    }

    let dX = 0;
    let dY = 0;
    let glyphs = [];
    let sdfGlyphs = [];
    for(let i = 0; i < opts.chars.length; i++){
      let glyph = opts.chars[i];
      const metrics = library.getMetrics(glyph);
      const text = glyph;
      let svg = library.getSVG(text, opts.options);
      let domSVG = parser.parseFromString(svg, "image/svg+xml");
      let svgDom = domSVG.children[0];
      svgDom.style['background-color'] = 'black';
      svg = domSVG.children[0].outerHTML;

      glyphs.push({svg, glyph, dX, dY});
    }

    return await Promise.all(glyphs.map(async glyphSVG => {
      try {
        return await this._svgToImage(glyphSVG.svg, glyphSVG.glyph, glyphSVG.dX, glyphSVG.dY);
      } catch (error) {
        // log and return invalid
        console.error(error.name, error.message);
        if(callback) {
          callback(error, _this);
        }
        return Promise.reject();
      }
    })).then((glyphImages) => {
      let result = pack(glyphImages);
      result.items.forEach(function(item) { 
          context.putImageData(item.item.bitmap, item.x, item.y);
          // sdfContext.putImageData(item.item.sdfBitmap, item.x, item.y);
      })
      
      var imgData = new ImageData(WIDTH, HEIGHT);
      imgData.data.set(context.getImageData(0,0, WIDTH, HEIGHT).data);
      var array = ndarray(imgData.data, [WIDTH, HEIGHT * 4]);
      var res = imageSdf(array, { spread: 10, downscale: 1 });
      imgData = new ImageData(WIDTH, HEIGHT);
      imgData.data.set(res.data);
      sdfContext.putImageData(imgData, 0, 0);
      
      //document.body.appendChild(context.canvas);
      //document.body.appendChild(sdfContext.canvas);
        
      _this.createJSON(result, sdfContext, library.font, opts);
      if(callback) callback(undefined, _this);
    }, reason => {
      if (callback) {
        console.error(reason);
        callback(reason, _this);
      }
    });
  }.bind(this));
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
  let page = context.getImageData(0, 0, opts.width, opts.height);

  this.JSON.pages.push(page);
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

