const OpenTypeBmFont = require('./');
let BmFont = new OpenTypeBmFont();
global. THREE = require('three');
var SDFShader = require('./shaders/sdf')
let createText = require('three-bmfont-text');
let createScene = require('scene-template');
let loop = require('raf-loop');

let renderer, camera, scene;

const fonts = [
  'Cantarell-Regular.ttf', 
  'DejaVuSans.ttf', 
  'firstv2.ttf',
  'ipag.ttf',
  'Lobster.otf',
  'Pacifico.ttf',
  'Pecita.otf',
  'spaceAge.otf',
  'tngan.ttf'
];
let opts = {
  text: './demo/fonts/Pecita.otf',
  fonts: fonts,
  load: function() {}
};
let app;
require('domready')(function() {
  let gui = new dat.GUI( {
    height: 5 * 32
  }); 
  let fontOptions = gui.addFolder('Fonts');
  fonts.forEach(function(font) {
    fontOptions.add(opts, 'load').name(font)
      .onChange(function() {
        opts.text = './demo/fonts/' + font;
        clearScene();
        demo();
      });
  });
  demo();
});

function demo() {
  document.body.style.background = '#1f1f1f';
  BmFont.createBitmap('./demo/fonts/DejaVuSans.ttf', {}, function(err, result) {
    var texture = new THREE.Texture(result.JSON.pages[0]);
    createFont(result, texture);
  });  
}

function createFont(res, texture) {
  const opts = {
    renderer: {
      antialias: true,
      alpha: true
    },
    controls: {
      theta: 0 * Math.PI / 180,
      phi: -90 * Math.PI / 180,
      distance: 12,
      type: 'orbit'
    }
  };
  const { 
    renderer,
    camera,
    scene,
    controls,
    updateControls
  } = createScene(opts, THREE);
  window.scene = scene;
  camera.far = 10000;


  var maxAni = renderer.getMaxAnisotropy();
  texture.needsUpdate = true;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = maxAni;

  var copy = getCopy()

  var geom = createText({
    text: copy,
    font: res.JSON,
    width: 4000
  })

  var material = new THREE.RawShaderMaterial(SDFShader({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    color: 'rgb(230, 230, 230)'
  }))

  var layout = geom.layout
  var text = new THREE.Mesh(geom, material)
  // center it horizontally
  text.position.x = -layout.width / 2
  // origin uses bottom left of last line
  // so we need to move it down a fair bit
  text.position.y = layout.height * 0.7;

  // scale it down so it fits in our 3D units
  var textAnchor = new THREE.Object3D()
  textAnchor.scale.multiplyScalar(-0.005)
  textAnchor.add(text)
  scene.add(textAnchor)


  loop((dt) => {
    updateControls();
    renderer.render(scene, camera);
  }).start();
}

function clearScene(cb) {
  scene.children.forEach(function(item) {
    scene.remove(item);
  });
  if(cb) cb();
}

function getCopy () {
  return [
    'Total characters: 3,326',
    'Click + drag to rotate',
    '',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sodales arcu felis, sed molestie ante faucibus a. Integer ligula est, cursus a nisl nec, tempus euismod lorem. Nullam risus felis, fringilla aliquam eros nec, condimentum pretium felis. Praesent rutrum ornare massa, ac rutrum nisl pharetra sit amet. Morbi scelerisque diam quis eleifend lacinia. Sed a porttitor leo. Aenean et vestibulum eros, id condimentum ligula. Quisque maximus, eros et bibendum tristique, enim nulla laoreet mi, molestie imperdiet felis dolor et turpis. Cras sed nunc nec tortor mollis auctor. Aenean cursus blandit metus, in viverra lacus fringilla nec. Nulla a consectetur urna. Sed scelerisque leo in arcu viverra, quis euismod leo maximus. Maecenas ultrices, ligula et malesuada volutpat, sapien nisi placerat ligula, quis dapibus eros diam vitae justo. Sed in elementum ante. Phasellus sed sollicitudin odio. Fusce iaculis tortor ut suscipit aliquam. Curabitur eu nunc id est commodo ornare eu nec arcu. Phasellus et placerat velit, ut tincidunt lorem. Sed at gravida urna. Vivamus id tristique lacus, nec laoreet dolor. Vivamus maximus quam nec consectetur aliquam. Integer condimentum nulla a elit porttitor molestie. Nullam nec dictum lacus. Curabitur rhoncus scelerisque magna ac semper. Curabitur porta est nec cursus tempus. Phasellus hendrerit ac dolor quis pellentesque. Aenean diam nisl, dapibus eget enim vitae, convallis tempor nibh. Proin sit amet ante suscipit, gravida odio ac, euismod neque. Sed sodales, leo eget congue ultricies, leo tellus euismod mauris, tempor finibus elit orci sit amet massa. Pellentesque aliquam magna a neque aliquet, ac dictum tortor dictum.',
    '',
    'Praesent vestibulum ultricies aliquam. Morbi ut ex at nunc ultrices convallis vel et metus. Aliquam venenatis diam ut sodales tristique. Duis et facilisis ipsum. Sed sed ex dictum, mattis urna nec, dictum ex. Donec facilisis tincidunt aliquam. Sed pellentesque ullamcorper tellus nec eleifend. Mauris pulvinar mi diam, et pretium magna molestie eu. In volutpat euismod porta. Etiam a magna non dolor accumsan finibus. Suspendisse potenti. Phasellus blandit nibh vel tortor facilisis auctor.',
    '',
    'Mauris vel iaculis libero. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; Etiam et porttitor enim, eget semper ipsum. Vestibulum nec eros massa. Nullam ornare dui eget diam tincidunt tristique. Pellentesque molestie finibus pretium. Quisque in tempor elit. Fusce quis orci ut lacus cursus hendrerit. Curabitur iaculis eros et justo condimentum sodales. In massa sapien, mattis nec nibh id, sagittis semper ex. Nunc cursus sem sit amet leo maximus, vitae molestie lectus cursus.',
    '',
    'Morbi viverra ipsum purus, eu fermentum urna tincidunt at. Maecenas feugiat, est quis feugiat interdum, est ante egestas sem, sed porttitor arcu dui quis nulla. Praesent sed auctor enim. Sed vel dolor et nunc bibendum placerat. Nunc venenatis luctus tortor, ut gravida nunc auctor semper. Suspendisse non orci ut justo iaculis pretium lobortis nec nunc. Donec non libero tellus. Mauris felis mauris, consequat sed tempus ut, tincidunt sit amet nibh. Nam pellentesque lacinia massa, quis rhoncus erat fringilla facilisis. Pellentesque nunc est, lobortis non libero vel, dapibus suscipit dui.'
  ].join('\n')
}