var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +

  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +

  'uniform int u_shade;\n' +
  'uniform vec3 u_LightDirection;\n' +

  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  if (u_shade==1) {\n' +
//  '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
  '  float ndotL_clamp = clamp(dot(u_LightDirection, normal), 0.0, 1.0);\n' +
  '  v_Color = vec4(a_Color.rgb*0.3 + a_Color.rgb * ndotL_clamp * 0.7, 1);\n' +
  '  } else {\n' +
  '  v_Color = a_Color;\n' +
  '  }\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var floatsPerVertex = 10;
var ANGLE_STEP = 45.0;
var ang_step=45.0;
var key_swAngle = 0;

var qTot = new Quaternion();
var quatMatrix = new Matrix4();

var canvas;

function main() {
  canvas = document.getElementById('webgl');

  var gl = getWebGLContext(canvas);

  // GET the context of WebGL
  if (!gl) {
    console.log('Failed to get the context for WebGL.');
    return ;
  }

  //Init Shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize the shaders.');
    return ;
  }

  //Init vertex Buffer
  var n = initVertexBuffer(gl);
  if (n<0) {
    console.log('Failed to initialize vertex buffer.');
    return ;
  }

  // Init canvas
  gl.clearColor(0.0, 0.0, 0, 0.3);
  gl.enable(gl.DEPTH_TEST);

  // // Get the handle to the storage locationo of u_ViewMatrix
  // var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  // if (!u_ViewMatrix) {
  //   console.log('Failed to get the storage location of u_ViewMatrix');
  //   return ;
  // }
  // var viewMatrix = new Matrix4();

  // Get the handle to the storage locationo of u_ViewMatrix
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if (!u_ViewMatrix) {
    console.log('Failed to get the storage location of u_ViewMatrix');
    return ;
  }
  var viewMatrix = new Matrix4();

  // Get the handle to the storage locationo of u_ProjMatrix
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if (!u_ProjMatrix) {
    console.log('Failed to get the storage location of u_ProjMatrix');
    return ;
  }
  var projMatrix = new Matrix4();

  // Get the handle to the storage locationo of u_NormalMatrix
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  if (!u_NormalMatrix) {
    console.log('Failed to get the storage location of u_NormalMatrix');
    return ;
  }
  var normalMatrix = new Matrix4();

  // Assign light direction
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');
  var lightDirection = new Vector3([0.0, 1.0, 0.0]);
  lightDirection.normalize();
  gl.uniform3fv(u_LightDirection, lightDirection.elements);

  // Enable Light Shading
  var u_shade = gl.getUniformLocation(gl.program, 'u_shade');
  gl.uniform1i(u_shade,1);

  canvas.onmousedown = function(ev){myMouseDown(ev, gl, canvas)};
  canvas.onmousemove = function(ev){myMouseMove(ev, gl, canvas)};
  canvas.onmouseup = function(ev){myMouseUp(ev, gl, canvas)};


  var tick = function() {
    initVertexBuffer(gl);
    //initSurfNorm(gl, vertex_num);
     canvas.width = window.innerWidth;
     canvas.height = window.innerHeight * 0.9;
     animateRotate();
     animateSwing();
    // draw(gl, viewMatrix, u_ViewMatrix, viewMatrix, u_ViewMatrix, projMatrix, u_ProjMatrix);
    draw(gl, viewMatrix, u_ViewMatrix, projMatrix, u_ProjMatrix, normalMatrix, u_NormalMatrix);
    requestAnimationFrame(tick, canvas);
  };
  tick();
}

function makeAxes() {
  axesVerts = new Float32Array([
       0.0,  0.0,  0.0, 1.0,		1.0,  0.0,  0.0,	0.0, 0.0, 0.0,// X axis line (origin: gray)
  		 1.0,  0.0,  0.0, 1.0,		1.0,  0.0,  0.0,	0.0, 0.0, 0.0,// 						 (endpoint: red)

  		 0.0,  0.0,  0.0, 1.0,    0.0,  1.0,  0.0,	0.0, 0.0, 0.0,// Y axis line (origin: white)
  		 0.0,  1.0,  0.0, 1.0,		0.0,  1.0,  0.0,	0.0, 0.0, 0.0,//						 (endpoint: green)

  		 0.0,  0.0,  0.0, 1.0,		0.0,  0.0,  1.0,	0.0, 0.0, 0.0,// Z axis line (origin:white)
  		 0.0,  0.0,  1.0, 1.0,		0.0,  0.0,  1.0,	0.0, 0.0, 0.0,//						 (endpoint: blue)
   ]);
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;
	var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.

	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.

	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))

	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
		}
    gndVerts[j+3] = 1.0;
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
		}
    gndVerts[j+3] = 1.0;
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}

function makeStar(){
  le = 1;
  se = 0.25;

  // colors
  // front center
  // fcr = 244/255;
  // fcg = 66/255;
  // fcb = 158/255;
  w = 1;
  fcr = 234/255*w;
  fcg = 146/255*w;
  fcb = 30/255*w;


  // back center
  br = 1.0;
  bg = 1.0;
  bb = 1.0;

  // right
  rr = 1.0;
  rg = 1.0;
  rb = 0.0;

  //up
  ur = 1.0;
  ug = 0.0;
  ub = 0.0;

  // left
  lr = 0.0;
  lg = 1.0;
  lb = 0.0;

  // down
  dr = 0.0;
  dg = 0.0;
  db = 1.0;

  starVerts = new Float32Array([
    // right up-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,// front center
    le,	 0.0,  0.0,  1.0,		    rr,  rg,  rb,	   0.0, 0.0, 0.0,// right sharp
    se,   se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//rr,  rg,  rb,	 // right-up waist
    // right down-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
    le,	 0.0,  0.0,  1.0,		    rr,  rg,  rb,	   0.0, 0.0, 0.0,// right sharp
    se,  -se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//dr,  dg,  db,	// right-down waist

    // up left-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
    0.0,	 le,  0.0,   1.0,		  ur,  ug,  ub,	   0.0, 0.0, 0.0,// up sharp
   -se,   se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//ur,  ug,  ub,	// left-up waist
   // up right-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
    0.0,	 le,  0.0,   1.0,		  ur,  ug,  ub,	   0.0, 0.0, 0.0,// up sharp
    se,   se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//ur,  ug,  ub,	// right-up waist

    //left up-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
   -le,	 0.0,  0.0,  1.0,		    lr,  lg,  lb,	   0.0, 0.0, 0.0,// left sharp
   -se,   se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//lr,  lg,  lb,	// left-up waist
    //left down-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
   -le,	 0.0,  0.0,  1.0,		  lr,  lg,  lb,	     0.0, 0.0, 0.0,// left sharp
   -se,   -se,   0.0, 1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//lr,  lg,  lb,	// left-down waist

    // down left-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
    0.0,	-le,  0.0,   1.0,		  dr,  dg,  db,	   0.0, 0.0, 0.0,// down sharp
   -se,  -se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//dr,  dg,  db,	// down-left waist
   // down right-half
    0.0,	 0.0,  se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// front center
    0.0,	-le,  0.0,   1.0,		  dr,  dg,  db,	   0.0, 0.0, 0.0,// down sharp
    se,  -se,   0.0,  1.0,		  fcr, fcg, fcb,   0.0, 0.0, 0.0,//dr,  dg,  db,	// down-right waist

    // back
    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// Node 0
    le,	 0.0,  0.0,  1.0,		  rr,  rg,  rb,	     0.0, 0.0, 0.0,// Node 0
    se,   se,   0.0,  1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,//rr,  rg,  rb,	// Node 0

    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,// Node 0
    le,	 0.0,  0.0,  1.0,		  rr,  rg,  rb,	     0.0, 0.0, 0.0,// Node 0
    se,  -se,   0.0,  1.0,		  fcr, fcg, fcb,	 0.0, 0.0, 0.0,//dr,  dg,  db,	//rr,  rg,  rb,	// Node 0


    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,// Node 0
    0.0,	 le,  0.0,   1.0,		  ur,  ug,  ub,	    0.0, 0.0, 0.0,// Node 0
   -se,   se,   0.0,  1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,//ur,  ug,  ub,	// Node 0

    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,// Node 0
    0.0,	 le,  0.0,   1.0,		  ur,  ug,  ub,	    0.0, 0.0, 0.0,// Node 0
    se,   se,   0.0,  1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,//rr,  rg,  rb, //ur,  ug,  ub,	// Node 0


    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,// Node 0
   -le,	 0.0,  0.0,  1.0,		    lr,  lg,  lb,	    0.0, 0.0, 0.0,// Node 0
   -se,   se,   0.0,  1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,//ur,  ug,  ub,	//lr,  lg,  lb,	// Node 0

    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,// Node 0
   -le,	 0.0,  0.0,  1.0,		  lr,  lg,  lb,	      0.0, 0.0, 0.0,// Node 0
   -se,   -se,   0.0, 1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,//lr,  lg,  lb,	// Node 0

    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,// Node 0
    0.0,	-le,  0.0,   1.0,		  dr,  dg,  db,	    0.0, 0.0, 0.0,// Node 0
   -se,  -se,   0.0,  1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,//lr,  lg,  lb,	//dr,  dg,  db,	// Node 0

    0.0,	 0.0, -se,   1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,// Node 0
    0.0,	-le,  0.0,   1.0,		  dr,  dg,  db,	    0.0, 0.0, 0.0,// Node 0
    se,  -se,   0.0,  1.0,		  fcr, fcg, fcb,	  0.0, 0.0, 0.0,//dr,  dg,  db,	// Node 0
  ])
}

function makePyramid() {
  var lx = Math.sqrt(3)/3;
  var sx = Math.sqrt(3)/6;
  var  h = Math.sqrt(6)/3;

  var fr = 1;
  var fg = 1;
  var fb = 1;

  var rr = 229/255;
  var rg = 137/255;
  var rb = 16/255;

  var br = 105/255;
  var bg = 156/255;
  var bb = 239/255;


  pyramidVerts = new Float32Array([
    // Bottom face
    0.0,  lx,  0.0, 1.0,    1.0,  1.0,  0.0,    0.0, 0.0, 0.0,	// Y axis line (origin: white)
   -0.5, -sx,  0.0, 1.0,    1.0,  1.0,  0.0,    0.0, 0.0, 0.0,	// Y axis line (origin: white)
    0.5, -sx,  0.0, 1.0,    1.0,  1.0,  0.0,    0.0, 0.0, 0.0,	// Y axis line (origin: white)

   // left face
   0.0,  0.0,  h, 1.0,      fr, fg, fb,	        0.0, 0.0, 0.0,// Y axis line (origin: white)
  -0.5, -sx,  0.0, 1.0,    0.0,  0.0,  0.0,	    0.0, 0.0, 0.0,// Y axis line (origin: white)
   0.0,  lx,  0.0, 1.0,    0.5,  0.5,  0.5,     0.0, 0.0, 0.0,	// Y axis line (origin: white)

   // right face
   0.0,  0.0,  h, 1.0,     1.0, 1.0, 0.0,    0.0, 0.0, 0.0,	// Y axis line (origin: white)
   0.0,  lx,  0.0, 1.0,    rr, rg, rb,	    0.0, 0.0, 0.0,// Y axis line (origin: white)
   0.5, -sx,  0.0, 1.0,    rr, rg, rb,	    0.0, 0.0, 0.0,// Y axis line (origin: white)

   // front face
   0.0,  0.0,  h, 1.0,     fr, fg, fb,	    0.0, 0.0, 0.0,// Y axis line (origin: white)
   0.5, -sx,  0.0, 1.0,    br, bg, bb,	    0.0, 0.0, 0.0,// Y axis line (origin: white)
  -0.5, -sx,  0.0, 1.0,    br, bg, bb,    0.0, 0.0, 0.0,// Y axis line (origin: white)
  ]);
}

function makeRecPyramid() {
  var fr = 0;
  var fg = 1;
  var fb = 0;

  var rr = 27/255;
  var rg = 40/255;
  var rb = 32/255;

  var bcolor = new Float32Array([5/255, 112/255, 30/255]);



  recPyrVerts = new Float32Array([
    // front face
    0.0,  0.0, 1.0, 1.0,    fr, fg, fb,	  0, -1, 1,// Y axis line (origin: white)
    1.0, -1.0,  0.0, 1.0,    fr, fg, fb,	0, -1, 1,// Y axis line (origin: white)
   -1.0, -1.0,  0.0, 1.0,    fr, fg, fb,	0, -1, 1,// Y axis line (origin: white)

   // left face
   0.0,  0.0, 1.0, 1.0,    rr, rg, rb,	 -1, 0, 1,// Y axis line (origin: white)
  -1.0, -1.0,  0.0, 1.0,    rr, rg, rb,	 -1, 0, 1,// Y axis line (origin: white)
  -1.0,  1.0,  0.0, 1.0,    rr, rg, rb,	 -1, 0, 1,// Y axis line (origin: white)

  // back face
  0.0,  0.0, 1.0, 1.0,    bcolor[0], bcolor[1],bcolor[2],	  0, 1, 1,// Y axis line (origin: white)
 -1.0,  1.0,  0.0, 1.0,    bcolor[0], bcolor[1],bcolor[2],	0, 1, 1,// Y axis line (origin: white)
  1.0,  1.0,  0.0, 1.0,    bcolor[0], bcolor[1],bcolor[2],	0, 1, 1,// Y axis line (origin: white)

  // right face
  0.0,  0.0, 1.0, 1.0,    rr, rg, rb,	   1, 0, 1,// Y axis line (origin: white)
  1.0,  1.0,  0.0, 1.0,    rr, rg, rb,	 1, 0, 1,// Y axis line (origin: white)
  1.0, -1.0,  0.0, 1.0,    rr, rg, rb,	 1, 0, 1,// Y axis line (origin: white)

  // bottom face1
  1.0,  1.0,  0.0, 1.0,    fr, fg, fb,	0, 0, -1,// Y axis line (origin: white)
  1.0, -1.0,  0.0, 1.0,    fr, fg, fb,	0, 0, -1,// Y axis line (origin: white)
 -1.0, -1.0,  0.0, 1.0,    fr, fg, fb,	0, 0, -1,// Y axis line (origin: white)

  // bottom face2
 -1.0, -1.0,  0.0, 1.0,    fr, fg, fb,	0, 0, -1,// Y axis line (origin: white)
 -1.0,  1.0,  0.0, 1.0,    fr, fg, fb,	0, 0, -1,// Y axis line (origin: white)
  1.0,  1.0,  0.0, 1.0,    fr, fg, fb,	0, 0, -1,// Y axis line (origin: white)
  ]);
}

// function RecPyramidSurfN() {
//
//   recPyrSNs = new Float32Array([
//     // front face
//     0, -1, 1,
//     0, -1, 1,
//     0, -1, 1,
//
//     -1, 0, 1,
//     -1, 0, 1,
//     -1, 0, 1,
//
//     0, 1, 1,
//     0, 1, 1,
//     0, 1, 1,
//
//     1, 0, 1,
//     1, 0, 1,
//     1, 0, 1,
//
//     0, 0, -1,
//     0, 0, -1,
//     0, 0, -1,
//   ]);
// }

function makeCylinder() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var ctrColr = new Float32Array([89/255, 56/255, 8/255]);	// dark gray
 var topColr = new Float32Array([89/255, 56/255, 8/255]);	// light green
 var botColr = new Float32Array([89/255, 56/255, 8/255]);	// light blue
 var capVerts = 16;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.0;		// radius of bottom of cylinder (top always 1.0)

 // Create a (global) array to hold this cylinder's vertices;
 cylVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them.

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			cylVerts[j+1] = 0.0;
			cylVerts[j+2] = 1.0;
			cylVerts[j+3] = 1.0;			// r,g,b = topColr[]
			cylVerts[j+4]=ctrColr[0];
			cylVerts[j+5]=ctrColr[1];
			cylVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			cylVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			cylVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			cylVerts[j+2] = 1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=topColr[0];
			cylVerts[j+5]=topColr[1];
			cylVerts[j+6]=topColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{
				cylVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				cylVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				cylVerts[j+2] = 1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=topColr[0];
				cylVerts[j+5]=topColr[1];
				cylVerts[j+6]=topColr[2];
		}
		else		// position all odd# vertices along the bottom cap:
		{
				cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				cylVerts[j+2] =-1.0;	// z
				cylVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				cylVerts[j+4]=botColr[0];
				cylVerts[j+5]=botColr[1];
				cylVerts[j+6]=botColr[2];
		}
	}
	// Create the cylinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			cylVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			cylVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			cylVerts[j+2] =-1.0;	// z
			cylVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j+4]=botColr[0];
			cylVerts[j+5]=botColr[1];
			cylVerts[j+6]=botColr[2];
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			cylVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j+1] = 0.0;
			cylVerts[j+2] =-1.0;
			cylVerts[j+3] = 1.0;			// r,g,b = botColr[]
			cylVerts[j+4]=botColr[0];
			cylVerts[j+5]=botColr[1];
			cylVerts[j+6]=botColr[2];
		}
	}
}

function makeHex() {
//==============================================================================
// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
// 'stepped spiral' design described in notes.
// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
//
 var r = 206;
 var g = 220;
 var b = 234;
 var ctrColr = new Float32Array([r/255, g/255, b/255]);	// dark gray
 var topColr = new Float32Array([r/255, g/255, b/255]);	// light green
 var botColr = new Float32Array([r/255, g/255, b/255]);	// light blue
 var capVerts = 6;	// # of vertices around the topmost 'cap' of the shape
 var botRadius = 1.0;		// radius of bottom of cylinder (top always 1.0)

 // Create a (global) array to hold this cylinder's vertices;
 hexVerts = new Float32Array(  ((capVerts*6) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them.

	// Create circle-shaped top cap of cylinder at z=+1.0, radius 1.0
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for(v=1,j=0; v<2*capVerts; v++,j+=floatsPerVertex) {
		// skip the first vertex--not needed.
		if(v%2==0)
		{				// put even# vertices at center of cylinder's top cap:
			hexVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,1,1
			hexVerts[j+1] = 0.0;
			hexVerts[j+2] = 1.0;
			hexVerts[j+3] = 1.0;			// r,g,b = topColr[]
			hexVerts[j+4]=ctrColr[0];
			hexVerts[j+5]=ctrColr[1];
			hexVerts[j+6]=ctrColr[2];
		}
		else { 	// put odd# vertices around the top cap's outer edge;
						// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
						// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
			hexVerts[j  ] = Math.cos(Math.PI*(v-1)/capVerts);			// x
			hexVerts[j+1] = Math.sin(Math.PI*(v-1)/capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts, so we
			//	 can simplify cos(2*PI * (v-1)/(2*capVerts))
			hexVerts[j+2] = 1.0;	// z
			hexVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			hexVerts[j+4]=topColr[0];
			hexVerts[j+5]=topColr[1];
			hexVerts[j+6]=topColr[2];
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	for(v=0; v< 2*capVerts; v++, j+=floatsPerVertex) {
		if(v%2==0)	// position all even# vertices along top cap:
		{
				hexVerts[j  ] = Math.cos(Math.PI*(v)/capVerts);		// x
				hexVerts[j+1] = Math.sin(Math.PI*(v)/capVerts);		// y
				hexVerts[j+2] = 1.0;	// z
				hexVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				hexVerts[j+4]=topColr[0];
				hexVerts[j+5]=topColr[1];
				hexVerts[j+6]=topColr[2];
		}
		else		// position all odd# vertices along the bottom cap:
		{
				hexVerts[j  ] = botRadius * Math.cos(Math.PI*(v-1)/capVerts);		// x
				hexVerts[j+1] = botRadius * Math.sin(Math.PI*(v-1)/capVerts);		// y
				hexVerts[j+2] =-1.0;	// z
				hexVerts[j+3] = 1.0;	// w.
				// r,g,b = topColr[]
				hexVerts[j+4]=botColr[0];
				hexVerts[j+5]=botColr[1];
				hexVerts[j+6]=botColr[2];
		}
	}
	// Create the hexinder bottom cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements
	for(v=0; v < (2*capVerts -1); v++, j+= floatsPerVertex) {
		if(v%2==0) {	// position even #'d vertices around bot cap's outer edge
			hexVerts[j  ] = botRadius * Math.cos(Math.PI*(v)/capVerts);		// x
			hexVerts[j+1] = botRadius * Math.sin(Math.PI*(v)/capVerts);		// y
			hexVerts[j+2] =-1.0;	// z
			hexVerts[j+3] = 1.0;	// w.
			// r,g,b = topColr[]
			hexVerts[j+4]=botColr[0];
			hexVerts[j+5]=botColr[1];
			hexVerts[j+6]=botColr[2];
		}
		else {				// position odd#'d vertices at center of the bottom cap:
			hexVerts[j  ] = 0.0; 			// x,y,z,w == 0,0,-1,1
			hexVerts[j+1] = 0.0;
			hexVerts[j+2] =-1.0;
			hexVerts[j+3] = 1.0;			// r,g,b = botColr[]
			hexVerts[j+4]=botColr[0];
			hexVerts[j+5]=botColr[1];
			hexVerts[j+6]=botColr[2];
		}
	}
}

function makeRectangle(){
   rectVerts = new Float32Array([
     // Rectangles
     0.0,  0.0,  0.0, 1.0,     0.0, 0.0, 0.0,    0.0, 0.0, 0.0,
     0.5,  0.0,  0.0, 1.0,     0.0, 0.0, 0.0,    0.0, 0.0, 0.0,
     0.5,  0.1,  0.0, 1.0,     0.0, 0.0, 0.0,    0.0, 0.0, 0.0,

     0.0,  0.0,  0.0, 1.0,     0.0, 0.0, 0.0,    0.0, 0.0, 0.0,
     0.5,  0.1,  0.0, 1.0,     0.0, 0.0, 0.0,    0.0, 0.0, 0.0,
     0.0,  0.1,  0.0, 1.0,     0.0, 0.0, 0.0,    0.0, 0.0, 0.0,
  ]);
}


function makeSphere() {
//==============================================================================
// Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like
// equal-lattitude 'slices' of the sphere (bounded by planes of constant z),
// and connect them as a 'stepped spiral' design (see makeCylinder) to build the
// sphere from one triangle strip.
  var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
											// (choose odd # or prime# to avoid accidental symmetry)
  var sliceVerts	= 27;	// # of vertices around the top edge of the slice
											// (same number of vertices on bottom of slice, too)
  var topColr = new Float32Array([1.0, 1.0, 1.0]);	// North Pole: light gray
  var equColr = new Float32Array([1.0, 1.0, 1.0]);	// Equator:    bright green
  var botColr = new Float32Array([1.0, 1.0, 1.0]);	// South Pole: brightest gray.
  var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

	// Create a (global) array to hold this sphere's vertices:
  sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
										// # of vertices * # of elements needed to store them.
										// each slice requires 2*sliceVerts vertices except 1st and
										// last ones, which require only 2*sliceVerts-1.

	// Create dome-shaped top slice of sphere at z=+1
	// s counts slices; v counts vertices;
	// j counts array elements (vertices * elements per vertex)
	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
	var sin0 = 0.0;
	var cos1 = 0.0;
	var sin1 = 0.0;
	var j = 0;							// initialize our array index
	var isLast = 0;
	var isFirst = 1;
	for(s=0; s<slices; s++) {	// for each slice of the sphere,
		// find sines & cosines for top and bottom of this slice
		if(s==0) {
			isFirst = 1;	// skip 1st vertex of 1st slice.
			cos0 = 1.0; 	// initialize: start at north pole.
			sin0 = 0.0;
		}
		else {					// otherwise, new top edge == old bottom edge
			isFirst = 0;
			cos0 = cos1;
			sin0 = sin1;
		}								// & compute sine,cosine for new bottom edge.
		cos1 = Math.cos((s+1)*sliceAngle);
		sin1 = Math.sin((s+1)*sliceAngle);
		// go around the entire slice, generating TRIANGLE_STRIP verts
		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {
			if(v%2==0)
			{				// put even# vertices at the the slice's top edge
							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
							// and thus we can simplify cos(2*PI(v/2*sliceVerts))
				sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);
				sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);
				sphVerts[j+2] = cos0;
				sphVerts[j+3] = 1.0;
			}
			else { 	// put odd# vertices around the slice's lower edge;
							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
				sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
				sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
				sphVerts[j+2] = cos1;																				// z
				sphVerts[j+3] = 1.0;																				// w.
			}
			if(s==0) {	// finally, set some interesting colors for vertices:
				sphVerts[j+4]=topColr[0];
				sphVerts[j+5]=topColr[1];
				sphVerts[j+6]=topColr[2];
				}
			else if(s==slices-1) {
				sphVerts[j+4]=botColr[0];
				sphVerts[j+5]=botColr[1];
				sphVerts[j+6]=botColr[2];
			}
			else {
					sphVerts[j+4]=1;// equColr[0];
					sphVerts[j+5]=1;// equColr[1];
					sphVerts[j+6]=1;// equColr[2];
			}
		}
  }
}

function makeMouth(){
  mouthVerts = new Float32Array([
    0.0,   0.0,  0.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
   -0.5,   0.0,  1.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
   -0.25, -1.0,  0.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,

   0.0,   0.0,  0.0, 1.0,	    1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
  -0.5,   0.0,  -1.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
  -0.25, -1.0,  0.0, 1.0,	    1.0, 0.0, 0.0,    0.0, 0.0, 0.0,

   ]);
 }

 function makeTriangle(){
   triVerts = new Float32Array([
     -1.0, -1.0,  0.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
      1.0, -1.0,  0.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
      0.0,  0.0,  0.0, 1.0,	  1.0, 0.0, 0.0,    0.0, 0.0, 0.0,
   ]);
 }

 function makeTorus() {
 // //==============================================================================
 // // 		Create a torus centered at the origin that circles the z axis.
 // // Terminology: imagine a torus as a flexible, cylinder-shaped bar or rod bent
 // // into a circle around the z-axis. The bent bar's centerline forms a circle
 // // entirely in the z=0 plane, centered at the origin, with radius 'rbend'.  The
 // // bent-bar circle begins at (rbend,0,0), increases in +y direction to circle
 // // around the z-axis in counter-clockwise (CCW) direction, consistent with our
 // // right-handed coordinate system.
 // // 		This bent bar forms a torus because the bar itself has a circular cross-
 // // section with radius 'rbar' and angle 'phi'. We measure phi in CCW direction
 // // around the bar's centerline, circling right-handed along the direction
 // // forward from the bar's start at theta=0 towards its end at theta=2PI.
 // // 		THUS theta=0, phi=0 selects the torus surface point (rbend+rbar,0,0);
 // // a slight increase in phi moves that point in -z direction and a slight
 // // increase in theta moves that point in the +y direction.
 // // To construct the torus, begin with the circle at the start of the bar:
 // //					xc = rbend + rbar*cos(phi);
 // //					yc = 0;
 // //					zc = -rbar*sin(phi);			(note negative sin(); right-handed phi)
 // // and then rotate this circle around the z-axis by angle theta:
 // //					x = xc*cos(theta) - yc*sin(theta)
 // //					y = xc*sin(theta) + yc*cos(theta)
 // //					z = zc
 // // Simplify: yc==0, so
 // //					x = (rbend + rbar*cos(phi))*cos(theta)
 // //					y = (rbend + rbar*cos(phi))*sin(theta)
 // //					z = -rbar*sin(phi)
 // // To construct a torus from a single triangle-strip, make a 'stepped spiral' along the length of the bent bar; successive rings of constant-theta, using the same design used for cylinder walls in 'makeCyl()' and for 'slices' in makeSphere().  Unlike the cylinder and sphere, we have no 'special case' for the first and last of these bar-encircling rings.
 // //
 // var rbend = 1.0;										// Radius of circle formed by torus' bent bar
 // var rbar = 0.5;											// radius of the bar we bent to form torus
 // var barSlices = 23;									// # of bar-segments in the torus: >=3 req'd;
 // 																		// more segments for more-circular torus
 // var barSides = 13;										// # of sides of the bar (and thus the
 // 																		// number of vertices in its cross-section)
 // 																		// >=3 req'd;
 // 																		// more sides for more-circular cross-section
 // // for nice-looking torus with approx square facets,
 // //			--choose odd or prime#  for barSides, and
 // //			--choose pdd or prime# for barSlices of approx. barSides *(rbend/rbar)
 // // EXAMPLE: rbend = 1, rbar = 0.5, barSlices =23, barSides = 11.
 //
 // 	// Create a (global) array to hold this torus's vertices:
 //  torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
 // //	Each slice requires 2*barSides vertices, but 1st slice will skip its first
 // // triangle and last slice will skip its last triangle. To 'close' the torus,
 // // repeat the first 2 vertices at the end of the triangle-strip.  Assume 7
 //
 // var phi=0, theta=0;										// begin torus at angles 0,0
 // var thetaStep = 2*Math.PI/barSlices;	// theta angle between each bar segment
 // var phiHalfStep = Math.PI/barSides;		// half-phi angle between each side of bar
 // 																			// (WHY HALF? 2 vertices per step in phi)
 // 	// s counts slices of the bar; v counts vertices within one slice; j counts
 // 	// array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
 // 	for(s=0,j=0; s<barSlices; s++) {		// for each 'slice' or 'ring' of the torus:
 // 		for(v=0; v< 2*barSides; v++, j+=7) {		// for each vertex in this slice:
 // 			if(v%2==0)	{	// even #'d vertices at bottom of slice,
 // 				torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
 // 																						 Math.cos((s)*thetaStep);
 // 							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
 // 				torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
 // 																						 Math.sin((s)*thetaStep);
 // 								//  y = (rbend + rbar*cos(phi)) * sin(theta)
 // 				torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
 // 								//  z = -rbar  *   sin(phi)
 // 				torVerts[j+3] = 1.0;		// w
 // 			}
 // 			else {				// odd #'d vertices at top of slice (s+1);
 // 										// at same phi used at bottom of slice (v-1)
 // 				torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
 // 																						 Math.cos((s+1)*thetaStep);
 // 							  //	x = (rbend + rbar*cos(phi)) * cos(theta)
 // 				torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
 // 																						 Math.sin((s+1)*thetaStep);
 // 								//  y = (rbend + rbar*cos(phi)) * sin(theta)
 // 				torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
 // 								//  z = -rbar  *   sin(phi)
 // 				torVerts[j+3] = 1.0;		// w
 // 			}
 // 			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
 // 			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
 // 			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
 // 		}
 // 	}
 // 	// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
 // 			torVerts[j  ] = rbend + rbar;	// copy vertex zero;
 // 						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
 // 			torVerts[j+1] = 0.0;
 // 							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==0)
 // 			torVerts[j+2] = 0.0;
 // 							//  z = -rbar  *   sin(phi==0)
 // 			torVerts[j+3] = 1.0;		// w
 // 			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
 // 			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
 // 			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
 // 			j+=7; // go to next vertex:
 // 			torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
 // 						  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
 // 			torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
 // 							//  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep)
 // 			torVerts[j+2] = 0.0;
 // 							//  z = -rbar  *   sin(phi==0)
 // 			torVerts[j+3] = 1.0;		// w
 // 			torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
 // 			torVerts[j+5] = Math.random();		// random color 0.0 <= G < 1.0
 // 			torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0


 // //==============================================================================
 // Make a sphere from one OpenGL TRIANGLE_STRIP primitive.   Make ring-like
 // equal-lattitude 'slices' of the sphere (bounded by planes of constant z),
 // and connect them as a 'stepped spiral' design (see makeCylinder) to build the
 // sphere from one triangle strip.
   var slices = 13;		// # of slices of the sphere along the z axis. >=3 req'd
 											// (choose odd # or prime# to avoid accidental symmetry)
   var sliceVerts	= 27;	// # of vertices around the top edge of the slice
 											// (same number of vertices on bottom of slice, too)
   var topColr = new Float32Array([0.0, 0.0, 1.0]);	// North Pole: light gray
   var equColr = new Float32Array([1.0, 1.0, 0.0]);	// Equator:    bright green
   var botColr = new Float32Array([1.0, 0.0, 0.0]);	// South Pole: brightest gray.
   var sliceAngle = Math.PI/slices;	// lattitude angle spanned by one slice.

 	// Create a (global) array to hold this sphere's vertices:
   torVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertex);
 										// # of vertices * # of elements needed to store them.
 										// each slice requires 2*sliceVerts vertices except 1st and
 										// last ones, which require only 2*sliceVerts-1.

 	// Create dome-shaped top slice of torere at z=+1
 	// s counts slices; v counts vertices;
 	// j counts array elements (vertices * elements per vertex)
 	var cos0 = 0.0;					// sines,cosines of slice's top, bottom edge.
 	var sin0 = 0.0;
 	var cos1 = 0.0;
 	var sin1 = 0.0;
 	var j = 0;							// initialize our array index
 	var isLast = 0;
 	var isFirst = 1;
 	for(s=0; s<slices; s++) {	// for each slice of the torere,
 		// find sines & cosines for top and bottom of this slice
 		if(s==0) {
 			isFirst = 1;	// skip 1st vertex of 1st slice.
 			cos0 = 1.0; 	// initialize: start at north pole.
 			sin0 = 0.0;
 		}
 		else {					// otherwise, new top edge == old bottom edge
 			isFirst = 0;
 			cos0 = cos1;
 			sin0 = sin1;
 		}								// & compute sine,cosine for new bottom edge.
 		cos1 = Math.cos((s+1)*sliceAngle);
 		sin1 = Math.sin((s+1)*sliceAngle);
 		// go around the entire slice, generating TRIANGLE_STRIP verts
 		// (Note we don't initialize j; grows with each new attrib,vertex, and slice)
 		if(s==slices-1) isLast=1;	// skip last vertex of last slice.
 		for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertex) {
 			if(v%2==0)
 			{				// put even# vertices at the the slice's top edge
 							// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
 							// and thus we can simplify cos(2*PI(v/2*sliceVerts))
 				torVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts);
 				torVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);
 				torVerts[j+2] = cos0;
 				torVerts[j+3] = 1.0;
 			}
 			else { 	// put odd# vertices around the slice's lower edge;
 							// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
 							// 					theta = 2*PI*((v-1)/2)/capVerts = PI*(v-1)/capVerts
 				torVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
 				torVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
 				torVerts[j+2] = cos1;																				// z
 				torVerts[j+3] = 1.0;																				// w.
 			}
 			if(s<slices/3) {	// finally, set some interesting colors for vertices:
 				torVerts[j+4]=topColr[0];
 				torVerts[j+5]=topColr[1];
 				torVerts[j+6]=topColr[2];
 				}
 			else if(s>2*slices/3) {
 				torVerts[j+4]=botColr[0];
 				torVerts[j+5]=botColr[1];
 				torVerts[j+6]=botColr[2];
 			}
 			else {
 					torVerts[j+4]=equColr[0];//Math.random();// equColr[0];
 					torVerts[j+5]=equColr[1];//Math.random();// equColr[1];
 					torVerts[j+6]=equColr[2];//Math.random();// equColr[2];
 			}
 		}
 	}
 }

function initVertexBuffer(gl) {
  // Init vertex buffers for objects
  makeAxes();
  makeStar();
  makeGroundGrid();
  makePyramid();
  makeRecPyramid();
  makeCylinder();
  makeHex();
  makeRectangle();
  makeSphere();
  makeMouth();
  makeTriangle();
  makeTorus();

  // Allocate the buffers
  mySiz = axesVerts.length + starVerts.length + gndVerts.length + pyramidVerts.length + recPyrVerts.length
          + cylVerts.length + hexVerts.length + rectVerts.length + sphVerts.length + mouthVerts.length
          + triVerts.length + torVerts.length;
  vertex_num = mySiz/floatsPerVertex;
  var vArray = new Float32Array(mySiz);

  axes_start = 0;
  for (i=0; i<axesVerts.length;i++) {
    vArray[i] = axesVerts[i];
  }

  star_start = i;
  for (j=0;i<starVerts.length;i++,j++) {
    vArray[i] = starVerts[j];
  }

  gnd_start = i;
  for (j=0;j<gndVerts.length;i++,j++) {
    vArray[i] = gndVerts[j];
  }

  pyr_start = i;
  for (j=0;j<pyramidVerts.length;i++,j++) {
    vArray[i] = pyramidVerts[j];
  }

  recpyr_start = i;
  for (j=0;j<recPyrVerts.length;i++,j++) {
    vArray[i] = recPyrVerts[j];
  }

  cyl_start = i;
  for (j=0;j<cylVerts.length;i++,j++) {
    vArray[i] = cylVerts[j];
  }

  hex_start = i;
  for (j=0;j<hexVerts.length;i++,j++) {
    vArray[i] = hexVerts[j];
  }

  rect_start = i;
  for (j=0;j<rectVerts.length;i++,j++) {
    vArray[i] = rectVerts[j];
  }

  sph_start = i;
  for (j=0;j<sphVerts.length;i++,j++) {
    vArray[i] = sphVerts[j];
  }

  mouth_start = i;
  for (j=0;j<mouthVerts.length;i++,j++) {
    vArray[i] = mouthVerts[j];
  }

  tri_start = i;
  for (j=0;j<triVerts.length;i++,j++) {
    vArray[i] = triVerts[j];
  }

  tor_start = i;
  for (j=0;j<torVerts.length;i++,j++) {
    vArray[i] = torVerts[j];
  }


  var shapeBufferHandle = gl.createBuffer();
  if (!shapeBufferHandle) {
    console.log('Failed to create the shapeBufferHandle.');
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  gl.bufferData(gl.ARRAY_BUFFER, vArray, gl.STATIC_DRAW);

  var FSIZE = vArray.BYTES_PER_ELEMENT;

  // Allocate data to a_postion
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  gl.vertexAttribPointer(a_Position, 4, gl.FLOAT, false, FSIZE*floatsPerVertex, 0);
  gl.enableVertexAttribArray(a_Position);

  // Allocate data to a_Color
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE*floatsPerVertex, FSIZE*4);
  gl.enableVertexAttribArray(a_Color);

  // Allocate data to a_Normal
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE*floatsPerVertex, FSIZE*7);
  gl.enableVertexAttribArray(a_Normal);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vertex_num;
}

// function initSurfNorm(gl, vertex_num) {
//   RecPyramidSurfN();
//
//   var vSurNorm = new Float32Array(vertex_num*3);
//   for (i=0;i<vertex_num*3;i++) {
//     vSurNorm[i] = 0;
//   }
//
//   for (i=recpyr_start*3,j=0;j<recPyrSNs.length;i++,j++){
//     vSurNorm[i] = recPyrSNs[j];
//   }
//
//   var shapeBufferHandle = gl.createBuffer();
//   if (!shapeBufferHandle) {
//     console.log('Failed to create the shapeBufferHandle.');
//     return false;
//   }
//   gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
//   gl.bufferData(gl.ARRAY_BUFFER, vSurNorm, gl.STATIC_DRAW);
//
//   var FSIZE = vSurNorm.BYTES_PER_ELEMENT;
//
//   var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
//   if (a_Normal < 0) {
//     console.log('Failed to get the storage location of a_Position');
//     return -1;
//   }
//
//   gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE, 0);
//   gl.enableVertexAttribArray(a_Normal);
//
//   gl.bindBuffer(gl.ARRAY_BUFFER, null);
//   return vertex_num;
// }

function drawViews(gl, viewMatrix, u_ViewMatrix, normalMatrix, u_NormalMatrix) {
  // Draw Origin axes
  //viewMatrix.rotate(-90, 1, 0, 0);
  pushMatrix(viewMatrix);
  pushMatrix(viewMatrix);
  viewMatrix.scale(0.5, 0.5, 0.5);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES, axes_start/floatsPerVertex, axesVerts.length/floatsPerVertex);

  // Draw ground grid
  viewMatrix = popMatrix();
  //viewMatrix.translate(0, 0, -0.8);
  pushMatrix(viewMatrix);
  //viewMatrix.translate(0, 5, 0);
  viewMatrix.scale(0.4, 0.4, 0.4);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES, gnd_start/floatsPerVertex, gndVerts.length/floatsPerVertex);

  // Draw pyramid
  viewMatrix = popMatrix();
  viewMatrix = drawPyramid(gl, viewMatrix, u_ViewMatrix);

  // Draw Cylinder
  viewMatrix = drawTree(gl, viewMatrix, u_ViewMatrix, normalMatrix, u_NormalMatrix);

  // Draw WindMill
  //viewMatrix = popMatrix();
  viewMatrix = drawWindMill(gl, viewMatrix, u_ViewMatrix);

  // Draw Goose
  viewMatrix = drawGoose(gl, viewMatrix, u_ViewMatrix);

  // Draw torus
  viewMatrix = drawTorus(gl, viewMatrix, u_ViewMatrix);

}

function drawTorus(gl, viewMatrix, u_ViewMatrix) {
  pushMatrix(viewMatrix);

  viewMatrix.scale(0.2, 0.2, 0.2);
  viewMatrix.translate(0.0, 5.0, 1);
  viewMatrix.rotate(rtAngle, 1, 0, 0);

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  		// Draw just the torus's vertices
  gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
  						  tor_start/floatsPerVertex,	// start at this vertex number, and
  						  torVerts.length/floatsPerVertex);	// draw this many vertices.

  return popMatrix();
}




function drawGoose(gl, viewMatrix, u_ViewMatrix){
  // Draw sphere
  // Draw neck_lower
  pushMatrix(viewMatrix);
  viewMatrix.translate(-0.1, -2, 0.08);
  viewMatrix.rotate(90, 1, 0, 0);
  viewMatrix.scale(0.5, 0.5, 0.5);
  pushMatrix(viewMatrix);
  viewMatrix.rotate(75+swAngle*0.5, 0, 0, 1);
  viewMatrix.scale(0.3, 0.2, 1);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, rect_start/floatsPerVertex, rectVerts.length/floatsPerVertex);
  //Draw neck_mid
  viewMatrix.translate(0.5, 0, 0);
  viewMatrix.rotate(-swAngle, 0, 0, 1);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, rect_start/floatsPerVertex, rectVerts.length/floatsPerVertex);
  // Draw neck_upper
  viewMatrix.translate(0.5, 0, 0);
  viewMatrix.rotate(swAngle*0.7-15, 0, 0, 1);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, rect_start/floatsPerVertex, rectVerts.length/floatsPerVertex);
  // Draw mouth
  viewMatrix.translate(0.5, 0, 0);
  viewMatrix.rotate(15+swAngle*0.4, 0, 0, 1);
  viewMatrix.scale(0.5, 0.8, 0.02);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, mouth_start/floatsPerVertex, mouthVerts.length/floatsPerVertex);

  //--------Draw Spinning Sphere
  //viewMatrix.setTranslate( -0.4, -0.4, 0.0); // 'set' means DISCARD old matrix,
  viewMatrix = popMatrix();
  viewMatrix.scale(0.3, 0.1,-0.1);							// convert to left-handed coord sys
  pushMatrix(viewMatrix);
  //viewMatrix.rotate(90, 1, 0, 0);
  viewMatrix.rotate(swAngle*0.3,1, 0, 0);
  viewMatrix.translate(-1, 0 ,0);

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP,				// use this drawing primitive, and
  							sph_start/floatsPerVertex,	// start at this vertex number, and
  							sphVerts.length/floatsPerVertex);	// draw this many vertices.

  //draw left_foot
  viewMatrix = popMatrix();
  pushMatrix(viewMatrix);
  viewMatrix.translate(-0.8, -0.9, 0.2);
  // draw leg
  viewMatrix.scale(1.5, 1, 1);
  viewMatrix.rotate(-100, 0, 0, 1);
    viewMatrix.rotate(swAngle*0.30, 0, 0, 1);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, rect_start/floatsPerVertex, rectVerts.length/floatsPerVertex);
  // Draw foot
  viewMatrix.translate(0.5, 0.0, 0.0);
  viewMatrix.scale(0.08, 0.3, 1);
  viewMatrix.rotate(180, 0, 0, 1);
    viewMatrix.rotate(swAngle*0.60, 0, 0, 1);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, tri_start/floatsPerVertex, triVerts.length/floatsPerVertex);

  //draw right_foot
  viewMatrix = popMatrix();
  pushMatrix(viewMatrix);
  viewMatrix.translate(-0.8, -0.9, -0.2);
  // draw leg
  viewMatrix.scale(1.5, 1, 1);
  viewMatrix.rotate(-100, 0, 0, 1);
    viewMatrix.rotate(-swAngle*0.50, 0, 0, 1);

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, rect_start/floatsPerVertex, rectVerts.length/floatsPerVertex);
  // Draw foot
  viewMatrix.translate(0.5, 0.0, 0.0);
  viewMatrix.scale(0.08, 0.3, 1);
  viewMatrix.rotate(180, 0, 0, 1);
    viewMatrix.rotate(swAngle*0.60, 0, 0, 1);

  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, tri_start/floatsPerVertex, triVerts.length/floatsPerVertex);

  popMatrix();
  return popMatrix();
}

function drawWindMill(gl, viewMatrix, u_ViewMatrix) {
  pushMatrix(viewMatrix);

  viewMatrix.translate(1.2, 0.0, 0);
  viewMatrix.scale(0.05, 0.05, 0.4);
  viewMatrix.translate(0, 0, 1);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, hex_start/floatsPerVertex, hexVerts.length/floatsPerVertex);

  viewMatrix.translate(0.0, -1, 1);
  viewMatrix.scale(6, 6, 1,5);
  viewMatrix.rotate(90, 1, 0, 0);
  viewMatrix.rotate(rtAngle, 0, 0, 1);
  //viewMatrix.translate(0.8, 0.6, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, star_start/floatsPerVertex, starVerts.length/floatsPerVertex);

  return popMatrix();
}

function drawPyramid(gl, viewMatrix, u_ViewMatrix) {
  pushMatrix(viewMatrix);

  viewMatrix.translate(0.5, -1, 0);
  viewMatrix.rotate(180, 0, 0, 1);
  //qTot.setFromAxisAngle(0,0,1,90);
  //qTot = new Quaternion();
  quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);
  //console.log("qTot.x=",qTot.x, "qTot.y=", qTot.y, "qTot.z=", qTot.z);
  viewMatrix.concat(quatMatrix);
  viewMatrix.scale(0.5, 0.5, 0.5);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, pyr_start/floatsPerVertex, pyramidVerts.length/floatsPerVertex);

  return popMatrix();
}

var rtAngle = 0; // rotate angle
var swAngle = 10; // swing angle

function drawTree(gl, viewMatrix, u_ViewMatrix, normalMatrix, u_NormalMatrix) {
  // Save matrix
  pushMatrix(viewMatrix);

  // Draw Cylinder
  viewMatrix.scale(0.08, 0.08, 0.16);
  viewMatrix.translate(-10, -10, 1);
  viewMatrix.rotate(key_swAngle*0.1, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLE_STRIP, cyl_start/floatsPerVertex, cylVerts.length/floatsPerVertex);

  // Draw axes of the tree base
  pushMatrix(viewMatrix);
  viewMatrix.translate(0, 0, -1.0);
  viewMatrix.rotate(-90, 0, 0, 1);
  viewMatrix.scale(6,3,2);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES, axes_start/floatsPerVertex, axesVerts.length/floatsPerVertex);

  // Draw recPyramid
  viewMatrix = popMatrix();
  viewMatrix.translate(0, 0, 1.0);
  viewMatrix.rotate(90, 0, 0, 1);
  viewMatrix.scale(3, 3, 1.5);
  viewMatrix.rotate(key_swAngle*0.2, 1, 0, 0);
  viewMatrix.rotate(swAngle*0.2,0,1,0);
  normalMatrix.setInverseOf(viewMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, recpyr_start/floatsPerVertex, recPyrVerts.length/floatsPerVertex);

  viewMatrix.translate(0, 0, 1.0);
  viewMatrix.rotate(90, 0, 0, 1);
  viewMatrix.scale(0.8, 0.8, 1.2);
  viewMatrix.rotate(-key_swAngle*0.2, 0, 1, 0);
  viewMatrix.rotate(swAngle*0.2,1,0,0);
  normalMatrix.setInverseOf(viewMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, recpyr_start/floatsPerVertex, recPyrVerts.length/floatsPerVertex);

  viewMatrix.translate(0, 0, 1.0);
  viewMatrix.rotate(180, 0, 0, 1);
  viewMatrix.scale(0.6, 0.8, 1.6);
  viewMatrix.rotate(key_swAngle*0.2, 0, 1, 0);
  viewMatrix.rotate(-swAngle*0.2,1,0,0);
  normalMatrix.setInverseOf(viewMatrix);
  normalMatrix.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, recpyr_start/floatsPerVertex, recPyrVerts.length/floatsPerVertex);


  viewMatrix.rotate(-90, 0, 0, 1);
  viewMatrix.scale(2,2,1.2);
  viewMatrix.rotate(key_swAngle*0.2, 0, 1, 0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.drawArrays(gl.LINES, axes_start/floatsPerVertex, axesVerts.length/floatsPerVertex);

  //gl.uniform1i(u_shade,0);

  return popMatrix();
}

var g_EyeX = 0.0;
// var g_EyeY = 0.2;
// var g_EyeZ = 5.0;

var g_EyeY = -6.0;
var g_EyeZ = 0.3;


var g_LookAtX = 0.0;
var g_LookAtY = 0.0;
var g_LookAtZ = 0.0;

function draw(gl, viewMatrix, u_ViewMatrix, projMatrix, u_ProjMatrix, normalMatrix, u_NormalMatrix){

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw Left Scene
  gl.viewport(0										, 				// Viewport lower-left corner
              0, 		// location(in pixels)
              canvas.width/2, 				// viewport width, height.
              canvas.height);
  projMatrix.setPerspective(40, canvas.width/(2*canvas.height), 1, 100);
  //projMatrix.setOrtho(-1, 1, -1, 1, 1, 50);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ,
                       g_LookAtX, g_LookAtY, g_LookAtZ,
                       0, 0, 1);
  drawViews(gl, viewMatrix, u_ViewMatrix, normalMatrix, u_NormalMatrix);

  // Draw Right Scene
  gl.viewport(canvas.width/2, 				// Viewport lower-left corner
              0, 		// location(in pixels)
              canvas.width/2, 				// viewport width, height.
              canvas.height);
  //projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
  projMatrix.setOrtho(-1.8, 1.8, -1.5, 1.5, 1, 34);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  viewMatrix.setLookAt(g_EyeX, g_EyeY, g_EyeZ,
                       g_LookAtX, g_LookAtY, g_LookAtZ,
                       0, 0, 1);
  drawViews(gl, viewMatrix, u_ViewMatrix, normalMatrix, u_NormalMatrix);

  //projMatrix.setFromQuat(q.x, q.y, q.z, q.w);

}

var g_last = Date.now();
function animateRotate() {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;

  rtAngle += (ANGLE_STEP * elapsed) / 1000.0;
  rtAngle %= 360;
}

var t_last = Date.now();
function animateSwing() {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - t_last;
  t_last = now;

  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
  if(swAngle >   45.0 && ang_step > 0) ang_step = -ang_step;
  if(swAngle <  -45.0 && ang_step < 0) ang_step = -ang_step;

  swAngle += (ang_step * elapsed) / 1000.0;
  swAngle %= 360;
}

var CAMERA_SETP = 0.05;
var LOOK_STEP = Math.PI/180;
var thetaZ = 0;

window.addEventListener("keydown",
                        function(ev){
                          var dx = g_LookAtX - g_EyeX;
                          var dy = g_LookAtY - g_EyeY;
                          var dz = g_LookAtZ - g_EyeZ;
                          var ax = Math.sqrt(dx*dx + dy*dy);
                          var theta = Math.acos(dx/ax);

                          switch(ev.keyCode) {
                            case 188:  // left-arrow key
                              if (key_swAngle>-60) {
                                key_swAngle -= 5;
                              }
                              break;

                            case 190:  // up-arrow key
                              if (key_swAngle<60){
                                 key_swAngle += 5;
                               }
                              break;

                            case 37:  // left-arrow
                              var sx = CAMERA_SETP * Math.cos(theta+Math.PI/2);
                              var sy = CAMERA_SETP * Math.sin(theta+Math.PI/2);
                              g_EyeX += sx;
                              g_LookAtX += sx;
                              g_EyeY += sy;
                              g_LookAtY += sy;
                              console.log("dx=",dx, "dy=",dy, "sx=", sx, "sy=",sy);
                              break;

                            case 39: // right-arrow
                              var sx = CAMERA_SETP * Math.cos(theta-Math.PI/2);
                              var sy = CAMERA_SETP * Math.sin(theta-Math.PI/2);
                              g_EyeX += sx;
                              g_LookAtX += sx;
                              g_EyeY += sy;
                              g_LookAtY += sy;
                              console.log("dx=",dx, "dy=",dy, "sx=", sx, "sy=",sy);

                              break;

                            case 38:
                            var sx = CAMERA_SETP * Math.cos(theta);
                            var sy = CAMERA_SETP * Math.sin(theta);
                            g_EyeX += sx;
                            g_LookAtX += sx;
                            g_EyeY += sy;
                            g_LookAtY += sy;
                            break;

                            case 40:
                              var sx = -CAMERA_SETP * Math.cos(theta);
                              var sy = -CAMERA_SETP * Math.sin(theta);
                              g_EyeX += sx;
                              g_LookAtX += sx;
                              g_EyeY += sy;
                              g_LookAtY += sy;
                              break;

                            case 65: // A, look left
                              g_LookAtX = g_EyeX + ax*Math.cos(theta+LOOK_STEP);
                              g_LookAtY = g_EyeY + ax*Math.sin(theta+LOOK_STEP);
                              break;

                            case 68: // D, look right
                              g_LookAtX = g_EyeX + ax*Math.cos(theta-LOOK_STEP);
                              g_LookAtY = g_EyeY + ax*Math.sin(theta-LOOK_STEP);
                              break;

                            case 87: // W, look up
                              //thetaZ += LOOK_STEP * 0.2;
                              //g_LookAtZ = g_EyeZ + ax*Math.sin(thetaZ);
                              g_LookAtZ += LOOK_STEP; //*0.5;
                              break;

                            case 83: // S, look down
                              //thetaZ -= LOOK_STEP * 0.2;
                              //g_LookAtZ = g_EyeZ + ax*Math.sin(thetaZ);
                              g_LookAtZ -= LOOK_STEP;// * 0.5;
                              break;

                            default:
                              break;
                          }
                        },
                        false);

var isDrag = false;
xMclick = 0;
yMclick = 0;
xMdragTot = 0;
yMdragTot = 0;

function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
  isDrag = true;                      // set our mouse-dragging flag
  xMclik = x;                         // record where mouse-dragging began
  yMclik = y;
};


function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
  if(isDrag==false) return;       // IGNORE all mouse-moves except 'dragging'
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
  xMdragTot += (x - xMclik);          // Accumulate change-in-mouse-position,&
  yMdragTot += (y - yMclik);
  dragQuat(x - xMclik, y - yMclik);
  xMclik = x;                         // Make next drag-measurement from here.
  yMclik = y;
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
  var rect = ev.target.getBoundingClientRect(); // get canvas corners in pixels
  var xp = ev.clientX - rect.left;                  // x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top); // y==0 at canvas bottom edge
  var x = (xp - canvas.width/2)  /    // move origin to center of canvas and
               (canvas.width/2);      // normalize canvas to -1 <= x < +1,
  var y = (yp - canvas.height/2) /    //                     -1 <= y < +1.
               (canvas.height/2);
  console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);

  isDrag = false;                     // CLEAR our mouse-dragging flag, and
  // accumulate any final bit of mouse-dragging we did:
  xMdragTot += (x - xMclik);
  yMdragTot += (y - yMclik);
  dragQuat(x - xMclik, y - yMclik);
};

var qNew = new Quaternion();
function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
  var res = 5;
  var qTmp = new Quaternion(0,0,0,1);

  var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
  // console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
  qNew.setFromAxisAngle(ydrag + 0.0001, 0.0, xdrag +0.0001, dist*150.0);
  qTmp.multiply(qNew,qTot);     // apply new rotation to current rotation.
  qTot.copy(qTmp);
};
