//======================================================================
// DLMF WebGL controls
//======================================================================

//======================================================================
// Low-level utilities

// [NOTE that X3D data is NOT valid html,
// Selectors like $("#someid") on invalid html do not work in
// current(?) versions of jQuery in html mode (but do in xhtml!)
// Thus we are using the longer forms here.]

function getX3DAttribute(id,attr){
    var node = document.getElementById(id);
    if(node != null){
        return node.getAttribute(attr); }
    else {
        alert("No element id="+id+" (looking for "+attr+")");
	return null; }}

function setX3DAttribute(id,attr,value){
    document.getElementById(id).setAttribute(attr,value); }

function getX3DFloatAttribute(id,attr){
    return parseFloat(getX3DAttribute(id,attr)); }
function getX3DIntAttribute(id,attr){
    return parseInt(getX3DAttribute(id,attr)); }

// parse digits%
function parsePercent(value){
    var per = value.split("%"); // may or may not end with "%"
    return parseFloat(per[0])/100; }

// parse comma separated points, each point is space separated values.
function parseVector(p) {
    var attri = p.split(",");
    var ppf=[]; var jj=0;
    for (var i=0; i<attri.length; i++) {
	var pp = attri[i].split(' ');
	for (var j=0; j<pp.length; j++) {
	    if (pp[j]!="") {
                ppf[jj++]=parseFloat(pp[j]); }
	}
    }
    return ppf;
}

//======================================================================
// Initialize the Scales
// by extracting various values from X3D data
// Index: 0=x, 1=y, 2=z
// Dataset (ie. grid)
var nDatasets=1;
// Number of x & y in each grid.
var nxArray=[];
var nyArray=[];

// Range of values for each axis.
var axisMin=[], axisMax=[], axisMid=[], axisWidth=[];
// Name of each axis
var axisName =["x","y","z"];
// Displayed label for each axis.
var axisLabel=["x","y","z"];

// Axes orthogonal to x,y,z, for cut-planes, etc.
var axisOrth1 = [1,0,0];
var axisOrth2 = [2,2,1];

// ????
var Xminmax;
var Yminmax;

var world_scale=[];
var world_translation=[];
var textScale=[];

var gridData = [];

function initScales(){
    axisLabel[0] = getX3DAttribute("textX","string");
    axisLabel[1] = getX3DAttribute("textY","string");

    nDatasets  = getX3DIntAttribute("datasetNum",'value');
    axisMax[0] = getX3DFloatAttribute("maxx",'value');
    axisMin[0] = getX3DFloatAttribute("minx",'value');
    axisMax[1] = getX3DFloatAttribute("maxy",'value');
    axisMin[1] = getX3DFloatAttribute("miny",'value');
    axisMax[2] = getX3DFloatAttribute("maxz",'value');
    axisMin[2] = getX3DFloatAttribute("minz",'value');
    for(var i=0; i<=2; i++){
	axisWidth[i]=axisMax[i]-axisMin[i];
	axisMid[i]=axisMin[i]+axisWidth[i]/2; }

    nxArray=[];
    nyArray=[];
    for (var k = 1; k <= nDatasets; k++) {
	nxArray[k]=getX3DIntAttribute("nx"+k,'value');
	nyArray[k]=getX3DIntAttribute("ny"+k,'value');
    }

    var pp;
    pp = getX3DAttribute("world_scale",'value').split(",");
    for (var j=0; j<pp.length; j++) {
	world_scale[j]=parseFloat(pp[j]); }
    pp = getX3DAttribute("world_translation",'value').split(",");
    for (var j=0; j<pp.length; j++) {
	world_translation[j]=parseFloat(pp[j]); }
    pp = getX3DAttribute("textScale",'value').split(",");
    for (var j=0; j<pp.length; j++) {
	textScale[j]=parseFloat(pp[j]); }
    
    Xminmax = new Array(nDatasets+1);
    Yminmax = new Array(nDatasets+1);
    var MinMax, minmax;
    for (var k = 1; k <= nDatasets; k++) {
	MinMax = getX3DAttribute("Xminmax"+k,'value');
	minmax = MinMax.split(","); 
	Xminmax[k] = new Array(minmax.length);
	for (var i=0; i<minmax.length; i++) {
	    pp = minmax[i].split(' ');
	    var jj=0;
	    var ppf=[]; 
	    for (var j=0; j<pp.length; j++) 
		if (pp[j]!="") {
                    ppf[jj++]=parseFloat(pp[j]); }
	    Xminmax[k][i*2]=ppf[0]; Xminmax[k][i*2+1]=ppf[1];
	} 
    }

    for (var k = 1; k <= nDatasets; k++) {
	MinMax = getX3DAttribute("Yminmax"+k,'value');
	minmax = MinMax.split(","); 
	Yminmax[k] = new Array(minmax.length);
	for (var i=0; i<minmax.length; i++) {
	    pp = minmax[i].split(' ');
	    jj=0;    
	    var ppf=[]; 
	    for (var j=0; j<pp.length; j++) {
		if (pp[j]!="") {
                    ppf[jj++]=parseFloat(pp[j]); }}
	    Yminmax[k][i*2]=ppf[0]; Yminmax[k][i*2+1]=ppf[1];
	} 
    }


    gridData = []
    // Pre-read all data?
    // for (var k = 1; k <= nDatasets; k++) {
    //     var p = getX3DAttribute("pointCoordinate"+k,'point');
    //     gridData[k] = parseVector(p); }
}


//======================================================================
// ColorMap
//======================================================================
// Gets & Modifies X3D data
var colorLegend  = new Image();

function initColormaps(){
    colorLegend.onload = function() {
	var ctx = document.getElementById("colorCanvas").getContext("2d");
	ctx.clearRect(0,0,100,100);
	ctx.drawImage(colorLegend,1,0);
    };
    applyModulusMap(modulusMap); 
    colorLegend.src="./style/webgl-moduluscolor.png";
}

function applyModulusMap(colorMapper) {
    for (var k = 1; k <= nDatasets; k++) {
	var color="";
	var p = getX3DAttribute("pointCoordinate"+k,'point');
	var attri = p.split(",");
	var len = attri.length;
	for (var j=0; j<len; j++) {
	    var pp = attri[j].split(' ');
	    var ppf = parseFloat(pp[pp.length-1]);
	    var cMap=colorMapper(ppf);
	    color = color+" "+cMap[0]+" "+cMap[1]+" "+cMap[2]+","; }
	setX3DAttribute("colorColor"+k,'color', color);
    }
}
function applyPhaseMap(colorMapper) {
    for (var k = 1; k <= nDatasets; k++) {
	var color="";
	var phase = getX3DAttribute("phaseData"+k,'value');
	var phasevalue = phase.split(",");
	for (j=0; j<phasevalue.length; j++) {
	    var cMap = colorMapper(phasevalue[j]);
	    color = color+" "+cMap[0]+" "+cMap[1]+" "+cMap[2]+",";
	}
	setX3DAttribute("colorColor"+k,'color', color);
    }
}

function modulusMap(z) {
    var factor;
    // Stretch z to MORE THAN cover the color range (fudging for x3dom 1.8???)
    //    var fudge = 0.05*axisWidth[2];
    //    f = 4*(z-axisMin[2]-fudge)/(axisWidth[2]-2*fudge);
    f = 4*(z-axisMin[2])/axisWidth[2];
    if      (f < 0){ return [0,   0,   1]; }
    else if (f < 1){ return [0,   f,   1]; }
    else if (f < 2){ return [0,   1, 2-f]; }
    else if (f < 3){ return [f-2, 1,   0]; }
    else if (f < 4){ return [1,   4-f, 0]; }
    else           { return [1,   0,   0]; }
}

function phase4Map(p) {
    var pi=3.1415926;
    var hpi=3.1415926/2;
    // Assumed -pi <= p <= pi
    if      (p < -hpi) { return [1, 0, 0]; }
    else if (p < 0   ) { return [1, 1, 0]; }
    else if (p < hpi ) { return [0, 0, 1]; }
    else               { return [0, 1, 0]; }
}

function HSVtoColormap(h,s,v) {
    var i,f,t,p,q;
    if(h >= 360) { h=0; }
    h = h/60;
    i = Math.floor(h);
    f = h-i;
    p = v * (1-s);
    q = v * (1-(s*f));
    t = v * (1-(s*(1-f)));
    if (i==0) { return [v,t,p]; }
    if (i==1) { return [q,v,p]; }
    if (i==2) { return [p,v,t]; }
    if (i==3) { return [p,q,v]; }
    if (i==4) { return [t,p,v]; }
    if (i==5) { return [v,p,q]; }
}

function phaseSMap(ph) {
    var pi = 3.1415926;
    var a = (ph % (2*pi))*2/pi;
    var h;
    if(a < 0) { a+=4; }
    if      (a > 3) { h = (a-1)/3; }
    else if (a > 2) { h = (a+1)/6; }
    else if (a > 1) { h = (2*a-1)/6; }
    else            { h = a/6; }
    return HSVtoColormap(360*h,1,1); 
} 

//======================================================================
// Viewpoint
//======================================================================    
var currentViewpoint=-1;
var viewName=['front','back','left','right','top','bottom'];

function setViewpoint(view){
    if(cutXYZ == -1){		// only if not cutting!
	setX3DAttribute('outlineSwitch','whichChoice',view); }
    if(currentViewpoint== view) {
	var runtime = document.getElementById('x3dElement').runtime;
	if(runtime != null){
	    document.getElementById('x3dElement').runtime.resetView(); }}
    else {
	setX3DAttribute(viewName[view]+"View",'set_bind','true'); }
    switch (view) {
    case 0: viewFront();  break;
    case 1: viewBack();   break;
    case 2: viewLeft();   break;
    case 3: viewRight();  break;
    case 4: viewTop();    break;
    case 5: viewBottom(); break;
    default: break; }
    currentViewpoint=view;
}

function z_string(s1,s2) {
    setX3DAttribute('minz_switch','whichChoice', s1);
    setX3DAttribute('maxz_switch','whichChoice', s2);
}

// This method of label positioning uses the justify attribute introduced with X3Dom 1.7.x
function positionLabel(name, x,y,z, justify, rotation){
    // NOTE: peculiar ordering for x,y,z ???
    setX3DAttribute(name,'translation',
                    [ (x+world_translation[0])*world_scale[0],
                      (z+world_translation[2])*world_scale[2],
                      -(y+world_translation[1])*world_scale[1]]);
    setX3DAttribute(name,'rotation', rotation);
    var stylenode = document.getElementById(name).getElementsByTagName('FontStyle')[0];
    if(stylenode != null){      // Set the anchor for positioning the text relative to the given position
        stylenode.setAttribute('justify',justify); }
 }

// in which plane to draw text; - sign indicates reverse plane (rotated about z axis) (?)
var axisPlaneRotations={'xz+':'0 1 0  0',   'xz-':'0 1 0  3.14',
                        'yz+':'0 1 0  1.57','yz-':'0 1 0 -1.57',
                        'xy+':'1 0 0 -1.57','xy-':'1 0 0  1.57'};
var onAxis  ={'xz+':0,'xz-':0,  'yz+':1,'yz-':1,  'xy+':0,'xy-':0};
var offAxis ={'xz+':2,'xz-':2,  'yz+':2,'yz-':2,  'xy+':1,'xy-':1};
var faceflip={'xz+':false ,'xz-':true,  'yz+':false,'yz-':true,  'xy+':false,'xy-':false};
// We SHOULD be able to infer these positioning parameters (sideways, plane, a,b)
// from a few projections from user space to screen.
// If we did, we could continuously, dynamically label axes!
function labelAxis(axis,sideways,plane,a,b){
    var name = axisName[axis];
    var rotation = axisPlaneRotations[plane];
    var pos = [];
    pos[axis] = axisMid[axis]
    pos[(axis+1)%3] = a;
    pos[(axis+2)%3] = b;
    var onaxis = onAxis[plane];
    var offaxis = offAxis[plane];
   // Draw axis label
    var node;
    var flip = ((pos[onaxis] <= axisMin[onaxis]) ? !faceflip[plane] : faceflip[plane]); // manual xor
    // Add a little padding away from the axes
    var padding = textScale[0]/5;
    if(!sideways){
        pos[offaxis] += (pos[offaxis] <= axisMin[offaxis] ? -padding : padding); }
    else {
        pos[onaxis] += (pos[onaxis] <= axisMin[onaxis] ? -padding : padding); }
    var yjust = (sideways ? 'MIDDLE' : 'BEGIN');
    if((node = document.getElementById('text_'+name)) != null){
        pos[axis] = axisMid[axis];
        var xjust = (sideways ? (flip ? 'END' : 'BEGIN') : 'MIDDLE');
        positionLabel('text_'+name, pos[0],pos[1],pos[2], '"'+xjust+'" "'+yjust+'"', rotation); }

    // Draw axis minimum value
    if((node = document.getElementById('text_min'+name)) != null){
        pos[axis] = axisMin[axis];
        var xjust = (sideways ? (flip ? 'END' : 'BEGIN') : (flip ? 'END' : 'BEGIN'));
        positionLabel('text_min'+name, pos[0],pos[1],pos[2], '"'+xjust+'" "'+yjust+'"', rotation);}

    // Draw axis maximum value
    if((node = document.getElementById('text_max'+name)) != null){
        pos[axis] = axisMax[axis];
        var xjust = (sideways ? (flip ? 'END' : 'BEGIN') : (flip ? 'BEGIN' : 'END'));
        positionLabel('text_max'+name, pos[0],pos[1],pos[2],  '"'+xjust+'" "'+yjust+'"', rotation); }
}


function viewFront() {          // View from right front, actually.
    z_string('0','0');
    labelAxis(0,false, 'xz+', axisMin[1],axisMin[2]);
    labelAxis(1,true, 'xz+', axisMin[2],axisMax[0]);
    labelAxis(2,true, 'xz+', axisMin[0],axisMin[1]);  }

function viewBack() {           // view from left back
    z_string('0','0');
    labelAxis(0,false, 'xz-',axisMax[1],axisMin[2]);
    labelAxis(1,true, 'xz-',axisMin[2],axisMin[0]);
    labelAxis(2,true,'xz-',axisMax[0],axisMax[1]); }

function viewRight() {                // view from  right front, actually
    z_string('0','0');
    labelAxis(0,true, 'yz+',axisMax[1],axisMin[2]);
    labelAxis(1,false,'yz+',axisMin[2],axisMax[0]);
    labelAxis(2,true,'yz+',axisMax[0],axisMin[1]); }

function viewLeft() {           // view from left rear, actually
    z_string('0','0');
    labelAxis(0,true,'yz-',axisMin[1],axisMin[2]);
    labelAxis(1,false, 'yz-',axisMin[2],axisMin[0]);
    labelAxis(2,true,'yz-',axisMin[0],axisMax[1]); }

function viewTop() {
    z_string('1','1');
    labelAxis(0,false,'xy+',axisMin[1],axisMax[2]);
    labelAxis(1,true,'xy+',axisMax[2],axisMin[0]); }

function viewBottom() {
    z_string('1','1');
    labelAxis(0,false,'xy-',axisMax[1],axisMin[2]);
    labelAxis(1,true, 'xy-',axisMin[2],axisMin[0]); }

//======================================================================
// Scaling
//======================================================================
// This is all jQuery (ui) stuff
function initScalers(){
}

function scaleslide() {
    var xs= $("#xscaleSlider").slider('option','value');
    var ys= $("#yscaleSlider").slider('option','value');
    var zs= $("#zscaleSlider").slider('option','value');
    if (xs==0) xs=0.0001;
    if (ys==0) ys=0.0001;
    if (zs==0) zs=0.0001;

    setX3DAttribute("scaleXYZ","scale", xs+" "+zs+" "+ys);
    $("#percentX").val(parseInt($("#xscaleSlider").slider("value")*100)+"%");
    $("#percentY").val(parseInt($("#yscaleSlider").slider("value")*100)+"%");
    $("#percentZ").val(parseInt($("#zscaleSlider").slider("value")*100)+"%");
}

//======================================================================
// Cutting Plane
//======================================================================
//cutting plane control using slider
// Mixed x3dom & jquery!
var cutCanvas, cutContext,
    cutCanvasWidth=200, cutCanvasHeight=200,
    // + 1/2 to center lines on pixels
    cutCanvasTop=0.5, cutCanvasLeft=20.5, cutCanvasRight=0.5,  cutCanvasBottom=20.5,
    ptSize=10;
var cutXYZ=-1;
var cutNCoord, cutNIndices, po=[];
var cutCoorda=[], cutCoordb=[], cutIndices=[];
var cutContourMethod = [0,0,1];
var cutMinMargin=[-1,-1,-1];
var cutMaxMargin=[-1,-1,-1];

function initCutters(){
    cutCanvas = document.getElementById("cutCurve");
    cutCanvasWidth  = cutCanvas.width  - cutCanvasLeft - cutCanvasRight; // ?
    cutCanvasHeight = cutCanvas.height - cutCanvasTop  - cutCanvasBottom;
    cutContext = cutCanvas.getContext("2d"); 
    //cutContext.fillStyle = 'f00';
    //cutContext.font = 'bold 20px sans-serif';
    cutContext.font = '12px serif';
//    cutContext.textBaseline = 'bottom';

    setX3DAttribute("cuttingXYZ","whichChoice","-1");
//    $("#cuttingSlider").slider("value","0");
//    $("#cuttingValue").val("");
    cutXYZ=-1;
//    cutContourMethod[0] = getX3DIntAttribute("x_cut_contour",'value');
//    cutContourMethod[1] = getX3DIntAttribute("y_cut_contour",'value');
// experiment: do them ALL
    cutContourMethod[0] = 1;
    cutContourMethod[1] = 1;
}

function clearCutSlider(xyz, xyzText) {
    setX3DAttribute("cuttingXYZ","whichChoice",xyzText);
    setX3DAttribute("outlineSwitch","whichChoice","4");
    $("#cuttingSlider").slider("value","0");
    $("#cuttingValue").val("");
    drawCutAxes(xyz);
    cutSlider(xyz);
    cutXYZ=xyz;
}  

//cutting plane animation related functions
var cut_cycleStart;         // effective start time (millisec) of current "cycle"
var cut_cycleLength = 11000; // Target duration (millisec) of a full pass through an axis
var cut_forward = true;   // direction cutting plane is moving.
var cut_animId;

function startCutter(){
    var now = (new Date()).getTime();
    var current = $("#cuttingSlider").slider('option','value');
    if(cut_forward && (current > 0.99))      { current=0; } // Already at end, restart!
    else if(!cut_forward && (current < 0.01)){ current=1; }
    // compute the start as if we had started from approp. end of the axis
    cut_cycleStart = now - (cut_forward ? current : 1-current)*cut_cycleLength;
    if(cut_animId == null){
        cut_animId = setInterval(function() {
            if (cut_cycleStart==0) return;
            var now = (new Date()).getTime();
            var f = (now - cut_cycleStart)/cut_cycleLength;
            if(f >= 1){
                //console.log("Stop: "+ (cut_forward ? 1 : 0));
                $("#cuttingSlider").slider("value",(cut_forward ? 1 : 0));
                //stopCutter(); }
		$('#stop').button().trigger('click'); }
            else {
                //console.log("Tick: "+ (cut_forward ? f : 1-f));
                $("#cuttingSlider").slider("value",(cut_forward ? f : 1-f));
            }
        }, 10);                     // milliseconds
    }
}

function stopCutter(){
    if(cut_animId != null){    
        clearInterval(cut_animId);
        cut_animId = null; }}

//======================================================================
// Add a Transform element to the group with id=cutline
/* Creates and adds to <Group id="cutline">:
  <Transform rotation="1 0 0 -1.57">
    <Transform scale="[world_scale]">
      <Transform translation="[world_translation]>
        <Shape>
<!-- Note this isn't actually added
	  <Appearance>
	    <Material diffuseColor="0 0 0"/>
	  </Appearance>
-->
	  <IndexedLineSet coordIndex="[index]">
  	    <Coordinate point="[coord]"/>
	  </IndexedLineSet>
	</Shape>
      </Transform>
    </Transform>
  </Transform>
*/
function addToCutlines(index, coord) {
    var t, s, a, m, b, c;
    t = document.createElement('Transform');
    t.setAttribute("rotation","1 0 0 -1.57");
    var t1 = document.createElement('Transform');
    t1.setAttribute("scale",getX3DAttribute("world_scale",'value'));
    var t2 = document.createElement('Transform');
    t2.setAttribute("translation",getX3DAttribute("world_translation",'value'));
    s = document.createElement('Shape');
    a = document.createElement('Appearance');
    m = document.createElement('Material');
    m.setAttribute('diffuseColor',"0 0 0");
    a.appendChild(m);
    b = document.createElement('IndexedLineSet');
    b.setAttribute("coordIndex",index);
    c = document.createElement('Coordinate');
    c.setAttribute("point",coord);
    b.appendChild(c);
    s.appendChild(b);
    t2.appendChild(s);
    t1.appendChild(t2);
    t.appendChild(t1);
    var ot = document.getElementById('cutline');
    ot.appendChild(t);
    return false;
}

// Remove all elements from the cutline group
function removeCutlines() {
    var ot = document.getElementById('cutline');
    var childNumber = ot.childNodes.length;
    for (var i = 0; i < childNumber; i++) {
	// check if we have a real X3DOM Node; not just e.g. a text node
	// always remove first child node. 
	if (ot.childNodes[0].nodeType === Node.ELEMENT_NODE) {
	    ot.removeChild(ot.childNodes[0]); }
    }
}

//======================================================================

function drawCutAxes(xyz) {
    if(cutContext != null){
    cutContext.clearRect(0,0, cutCanvas.width, cutCanvas.height);
    cutContext.beginPath();
    cutContext.moveTo(cutCanvasLeft,                  cutCanvasTop);
    cutContext.lineTo(cutCanvasLeft+cutCanvasWidth,   cutCanvasTop);
    cutContext.lineTo(cutCanvasLeft+cutCanvasWidth,   cutCanvasTop+cutCanvasHeight);
    cutContext.lineTo(cutCanvasLeft,                  cutCanvasTop+cutCanvasHeight);
    cutContext.lineTo(cutCanvasLeft,                  cutCanvasTop);
    cutContext.stroke();
    cutContext.fillText(axisLabel[(xyz == 0 ? 1 : 0)],
			cutCanvasLeft+cutCanvasWidth/2,
			cutCanvasTop +cutCanvasHeight+ptSize);
    cutContext.fillText(axisLabel[(xyz == 2 ? 1 : 2)],
			0,
			cutCanvasTop+cutCanvasHeight/2-ptSize/2);
    }
}

// Draw the segment encoded in cutCoorda, cutIndex1 as a plot in the cuttingCanvax
// with the axes axis0 & axis1 serving as x & y.
// AND, add cut-line objects to the X3D object to show
// at the min & max ends of the figure (for the 3rd axis)
function drawCurve(point, axis0,axis1) {
    var as =   cutCanvasWidth/axisWidth[axis0],
	bs = - cutCanvasHeight/axisWidth[axis1];
    var a0 = cutCanvasLeft                - axisMin[axis0]*as,
	b0 = cutCanvasTop+cutCanvasHeight - axisMin[axis1]*bs;
    cutContext.beginPath();
    var newSeg = true;
    for (var j=0; j<cutNIndices; j++) {
	var i = cutIndices[j];
	if(i == -1){
	    newSeg = true; }
	else if(newSeg){
	    newSeg = false;
	    cutContext.moveTo(a0+point[i*3+axis0]*as,b0+point[i*3+axis1]*bs); }
	else {
	    cutContext.lineTo(a0+point[i*3+axis0]*as,b0+point[i*3+axis1]*bs); }}
    cutContext.stroke();

    var coord1="", coord2="", index="";
    for (i=0; i<cutNCoord; i++) {
	coord1=coord1+" "+cutCoorda[i*3]+" "+cutCoorda[i*3+1]+" "+cutCoorda[i*3+2]+",";
	coord2=coord2+" "+cutCoordb[i*3]+" "+cutCoordb[i*3+1]+" "+cutCoordb[i*3+2]+",";
    }
    for (i=0; i<cutNIndices; i++) {
	index=index+" "+cutIndices[i]; }
    addToCutlines(index, coord1);
    addToCutlines(index, coord2);
}

//======================================================================

function cutSlider(xyz) {
    if(cutContext != null){
    cutContext.clearRect(cutCanvasLeft+1,cutCanvasTop+1,
			 cutCanvasWidth-2, cutCanvasHeight-2);
    var value=$("#cuttingSlider").slider('option','value')*axisWidth[xyz];
//    var fudge = (cutContourMethod[xyz] == 1 ? 0.01 : 0.00001);
    if (cutContourMethod[xyz] != 1) {
        cutMinMargin[xyz] = cutMaxMargin[xyz] = 0.0001; }
    else {
        if(cutMinMargin[xyz] < 0){
            cutMinMargin[xyz] = computeCutMargin(xyz,0); }
        if(cutMaxMargin[xyz] < 0){
            cutMaxMargin[xyz] = computeCutMargin(xyz,1); }
    }
    var minvalue = cutMinMargin[xyz]*axisWidth[xyz];
    var maxvalue = (1-cutMaxMargin[xyz])*axisWidth[xyz];

    var useValue = (value < minvalue ? minvalue
		    : (value > maxvalue ? maxvalue
		       : value));
    $("#cuttingLabel").html("plane at "+axisLabel[xyz]+" = ");
    // does NOT re-trigger!
    $("#cuttingValue").val(Math.round(10000*(axisMin[xyz]+useValue))/10000);

    if((xyz >= 0) && (xyz <= 2)){
        var p=[0, 0, 0];
        p[xyz]=useValue;
	setX3DAttribute(axisName[xyz]+"plane","translation",p[0]+" "+p[1]+" "+p[2]);
	removeCutlines();
	for (var k = 1; k <= nDatasets; k++) {
	    var p = getX3DAttribute("pointCoordinate"+k,'point');
	    var ppf = parseVector(p);
            //var ppf = gridData[k];
	    if (cutContourMethod[xyz] == 1) {
	    //if(true){
	    //if(xyz == 2){
		contour_cut(useValue, xyz, axisMin[xyz], nxArray[k], nyArray[k],ppf); }
	    else {
                // Two functions almost the same!
                if(xyz == 0){
		    x_cut(useValue, nxArray[k], Xminmax[k], nyArray[k], ppf); }
                else if(xyz == 1){
                    y_cut(useValue, nxArray[k], Yminmax[k], nyArray[k], ppf); }
                }
            if(cutNIndices > 0){
                drawCurve(cutCoorda,axisOrth1[xyz],axisOrth2[xyz]); }
	}
    } }
}
//var fudgeTrials=[0.0,0.0001,0.0003,0.001,0.003,0.01,0.03,0.1];
//var fudgeTrials=[0.0001,0.0003,0.001,0.003,0.01,0.03,0.1];
//var fudgeTrials=[0.0001,0.0002,0.0005,0.001,0.002,0.005,0.01,0.02,0.05,0.1];
var fudgeTrials=[0.0001,0.0002,0.0005,0.001,0.002,0.005,0.01];


function computeCutMargin(xyz,pos){
    var best = fudgeTrials[0];
    var np = -1;
    var lp = 0;
    var nf=0;
//    console.log("Find cut margin for axis="+xyz+" at position="+pos);
    for(var i=0; i<fudgeTrials.length; i++){
        var fudge = fudgeTrials[i]
        var value = axisWidth[xyz]*(pos == 0 ? fudge : (1-fudge));

        var ni=0,nc=0, ns=0,ln=0;
        for (var k = 1; k <= nDatasets; k++) {
	    var p = getX3DAttribute("pointCoordinate"+k,'point');
	    var ppf = parseVector(p);
            //var ppf = gridData[k];
	    contour_cut(value, xyz, axisMin[xyz], nxArray[k], nyArray[k],ppf);
            ni += cutNIndices;
            nc += cutNCoord;
            ns += computeSegments(xyz);
            ln += computeLength(xyz);}
//        console.log(" value="+value+" [fudge="+fudge+"] => "+nc+" points "+ni+" indices"
//                    +" segments="+ns+" length="+ln+" nfails="+nf);
	if((np < 0) || (ln < 0.1)){}
	//            np = ns; }
        else if((ns < np)	// Generally fewer segments is good(?)
		|| ((ns > 0) && (np==0)) // but none isn't convincing
                || ((ns == np) && (ln > lp*1.2)) // Same but much longer lines?
		|| ((ns < 4*np) && (ln > 1) && (lp < 0.1))){ // or prev was tooo short
            best = fudge;  nf=0; }			     // then, this fudge better
//            np = ns; }
//        else if(best > fudgeTrials[0]){
//            break; }
//	else if(nf > 2){
//	    break; }
	else {
	    nf++; }
            np = ns; lp = ln; }
//    console.log("   use fudge="+best);
    return best; }

function computeLength(xyz){
    var zxy = axisOrth1[xyz];
    var yzx = axisOrth2[xyz];
    var length=0;
    for(var i=0; i < cutNCoord; i+=2){
        var f=0;
        var x1 = cutCoorda[i*3+zxy];
        var y1 = cutCoorda[i*3+yzx];
        var x2 = cutCoorda[i*3+zxy+3];
        var y2 = cutCoorda[i*3+yzx+3];
        length += Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2)); }
    return length; }

function computeSegments(xyz){
    // Horrible way to have to determine connected lines!?!?!
    var zxy = axisOrth1[xyz];
    var yzx = axisOrth2[xyz];
    var nseg=0;
    for(var i=0; i < cutNCoord; i++){
        var f=0;
        var x = cutCoorda[i*3+zxy];
        var y = cutCoorda[i*3+yzx];
        for(var j=i+1; j < cutNCoord; j++){
            if((Math.abs(x-cutCoorda[j*3+zxy]) < 0.0001)
               && (Math.abs(y-cutCoorda[j*3+yzx]) < 0.0001)){
                f++; }}
        if((f%2)==1) {nseg--; }
        else{ nseg++; }}
    return nseg; }

//======================================================================

// Works out contours (somehow)
// stores into cutCoorda,cutCoordb and cutIndices, with cutNIndices,cutNCoord
function x_cut(value, nx, xminmax, ny, point) {
    var v,kx,cidx=[];
    v= value+axisMin[0];
    kx=0;
    for (var i=1; i<nx; i++) {
	if ((v>=xminmax[(i-1)*2] && v<=xminmax[i*2]) ||
	    (v>=xminmax[(i-1)*2] && v<=xminmax[i*2+1])) {
	    if (kx==0) {
                cidx[kx]=i-1; cidx[kx+1]=i; kx=kx+2;}
	    // Is this really correct? the test was between i-1 & i!!
	    //else if (cidx[kx-1] == i) {
                //cidx[kx]=i+1; kx=kx+1; }
	    else if (cidx[kx-1] == i-1) {
                cidx[kx]=i; kx=kx+1; }
	    else {
                //cidx[kx]=i; cidx[kx+1]=i; kx=kx+2; }
		//////cidx[kx++]=-1;
                cidx[kx]=i-1; cidx[kx+1]=i; kx=kx+2; }
        }}
    //    console.log("Band="+kx);
    //    if (Math.abs(v-axisMax[0])<0.0001) { // If at upper limit of surface
    if(false){
	if (xminmax[(nx-1)*2+1]<v) {	 // if beyond this subsurface; nothing
            return; }
	var n = 0;
	for (var i=0; i<ny; i++) {
	    ij=ny*(nx-1)+i;
	    if (point[(ij-ny)*3]<=v && point[ij*3]>=v) {
		cutCoorda[n*3]=axisMax[0];
		cutCoorda[n*3+1]=point[ij*3+1];
		cutCoorda[n*3+2]=point[ij*3+2];
		cutCoordb[n*3]=axisMin[0];
		cutCoordb[n*3+1]=point[ij*3+1];
		cutCoordb[n*3+2]=point[ij*3+2];
		cutIndices[n]=n;
		n++;
	    }
	}
	cutNCoord=n;
	cutIndices[n]=-1;
	cutNIndices=n+1;
    }
    else {
	////	console.log("New Curve");
	var n=0,ni=0; 
	var cut=false;
	var x1,y1,z1, x2,y2,z2, zz,yy;
	for (i=0; i<ny; i++) {
	    var npp=0;
	    for (j=0; j<kx; j++) {
		var ii = cidx[j]; 
		if(cut){
		    cutIndices[ni++]=-1; 
		    cut=false; }
		//		else
		if (ii!=nx-1) {
		    var ij=ii*ny+i;
		    if (v>=point[ij*3] && v<point[(ij+ny)*3]) {
			x1=point[ij*3];      y1=point[ij*3+1];      z1=point[ij*3+2];
			x2=point[(ij+ny)*3]; y2=point[(ij+ny)*3+1]; z2=point[(ij+ny)*3+2];
		    }
		    else if (i<ny-1) {
			if (v>=point[(ij+1)*3] && v<point[ij*3]) {
			    x1=point[(ij+1)*3];y1=point[(ij+1)*3+1];z1=point[(ij+1)*3+2];
			    x2=point[ij*3];    y2=point[ij*3+1];    z2=point[ij*3+2];
			}
			else if (v>=point[(ij+ny)*3] && v<point[(ij+ny+1)*3]) {
			    x1=point[(ij+ny)*3];  y1=point[(ij+ny)*3+1]; z1=point[(ij+ny)*3+2];
			    x2=point[(ij+ny+1)*3];y2=point[(ij+ny+1)*3+1];z2=point[(ij+ny+1)*3+2];
			}
			else {
			    //cut=true;
			    //cut = (j <= kx) && (cidx[j+1] > 0);
			    //			    console.log("inner skip "+cut);
			    			    cut = (npp == 0) && (j==kx-1);
                            continue; }}
		    else  {
			//console.log("outer skip");
			//cut=true;
                        continue; }
		    npp++;
		    yy=y1+(y2-y1)*(v-x1)/(x2-x1);
		    zz=z1+(z2-z1)*(v-x1)/(x2-x1);
		    //		    console.log(v+","+yy+","+zz);
		    cutCoorda[n*3]=axisMax[0];
		    cutCoorda[n*3+1]=yy;
		    cutCoorda[n*3+2]=zz;
		    cutCoordb[n*3]=axisMin[0];
		    cutCoordb[n*3+1]=yy;
		    cutCoordb[n*3+2]=zz;
		    cutIndices[ni++]=n;
		    n++; 
		}
	    }
        }
	cutNCoord=n;
	cutIndices[ni++]=-1;
	cutNIndices=ni;
    }
}

function y_cut(value, nx, yminmax, ny, point) {
    var v, ky, cidx=[];
    v=value+axisMin[1];
    ky=0;
    for (var i=1; i<ny; i++) {
	if ((v>=yminmax[(i-1)*2] && v<=yminmax[i*2]) ||
	    (v>=yminmax[(i-1)*2] && v<=yminmax[i*2+1])) {
	    if (ky==0) {
                cidx[ky]=i-1;cidx[ky+1]=i;ky=ky+2; }
	    //else if (cidx[ky-1] == i) {
	    //                cidx[ky]=i+1;ky=ky+1; }
	    else if (cidx[ky-1] == i-1) {
                cidx[ky]=i;ky=ky+1; }
	    else {
                //cidx[ky]=i; cidx[ky+1]=i; ky=ky+2; }
                cidx[ky]=i-1; cidx[ky+1]=i; ky=ky+2; }
        }}

    //if (Math.abs(v-axisMax[1])<0.00001) {
    if (false){
	if (yminmax[(ny-1)*2+1]<v) {
            return; }
	var n = 0;
	for (var i=0; i<nx; i++) {
	    ij=ny*(i+1)-1;
	    if (point[(ij-1)*3+1]<=v && point[ij*3+1]>=v) {
		cutCoorda[n*3]=point[ij*3];
		cutCoorda[n*3+1]=axisMin[1];
		cutCoorda[n*3+2]=point[ij*3+2];
		cutCoordb[n*3]=point[ij*3];
		cutCoordb[n*3+1]=axisMax[1];
		cutCoordb[n*3+2]=point[ij*3+2];
		cutIndices[n]=n;
		n++;
	    }
	}

	cutNCoord=n;
	cutIndices[n]=-1;
	cutNIndices=++n;
    }
    else {
	var n=0,ni=0;
	var cut=false;
	var x1,y1,z1,x2,y2,z2,zz,xx;
	for (var i=0; i<nx; i++) {
	    var npp=0;
	    for (j=0; j<ky; j++) {
		var ii = cidx[j];
		if(cut){
		    cutIndices[ni++]=-1;
		    cut=false; }
		if (ii!=ny-1) { 
		    ij=ii+i*ny; 
		    if (v>=point[ij*3+1] && v<point[(ij+1)*3+1]) {
			y1=point[ij*3+1];z1=point[ij*3+2];x1=point[ij*3];
			y2=point[(ij+1)*3+1]; z2=point[(ij+1)*3+2];x2=point[(ij+1)*3];
		    }
		    else if (i<nx-1) {
			if (v<=point[ij*3+1] && v>point[(ij+ny)*3+1]) {
			    y1=point[ij*3+1];z1=point[ij*3+2];x1=point[ij*3];
			    y2=point[(ij+ny)*3+1]; z2=point[(ij+ny)*3+2];x2=point[(ij+ny)*3]; }
			else if (v>=point[(ij+1)*3+1] && v<point[(ij+ny+1)*3+1]) {
			    y1=point[(ij+1)*3+1];z1=point[(ij+1)*3+2];x1=point[(ij+1)*3];
			    y2=point[(ij+ny+1)*3+1]; z2=point[(ij+ny+1)*3+2];x2=point[(ij+ny+1)*3];
			}
			else {
			    cut = (npp==0) && (j==ky-1);
                            continue; }}
		    else {
			//			cut=true;
                        continue; }
		    npp++;
		    zz=z1+(z2-z1)*(v-y1)/(y2-y1);
		    xx=x1+(x2-x1)*(v-y1)/(y2-y1);
		    cutCoorda[n*3]=xx;
		    cutCoorda[n*3+1]=axisMin[1];
		    cutCoorda[n*3+2]=zz;
		    cutCoordb[n*3]=xx;
		    cutCoordb[n*3+1]=axisMax[1];
		    cutCoordb[n*3+2]=zz;
		    cutIndices[ni++]=n;
		    n++;
		}
	    }
        }
	cutNCoord=n;
	cutIndices[ni++]=-1;
	cutNIndices=ni;
    }
}
//simple_cut(0,value,nx,Xminmax,ny,point)
//simple_cut(1,value,ny,Yminmax,nx,point)
function simple_cut(xyz,value, n0, minmax, n1, point) {
    var v,kx,cidx=[];
    v= value+axisMin[xyz];
    kx=0;
    for (var i=1; i<n0; i++) {
	if ((v>=minmax[(i-1)*2] && v<=minmax[i*2]) ||
	    (v>=minmax[(i-1)*2] && v<=minmax[i*2+1])) {
	    if (kx==0) {
                cidx[kx]=i-1; cidx[kx+1]=i; kx=kx+2;}
	    else if (cidx[kx-1] == i-1) {
                cidx[kx]=i; kx=kx+1; }
	    else {
                cidx[kx]=i-1; cidx[kx+1]=i; kx=kx+2; }
        }}
    var n=0,ni=0; 
    var cut=false;
    var x1,y1,z1, x2,y2,z2, zz,yy;
    for (i=0; i<ny; i++) {
	var npp=0;
	for (j=0; j<kx; j++) {
	    var ii = cidx[j]; 
	    if(cut || (ii == -1)){
		cutIndices[ni++]=-1; 
		cut=false; }
	    if (ii!=nx-1) {
		var ij=ii*ny+i;
		if (v>=point[ij*3] && v<point[(ij+ny)*3]) {
		    x1=point[ij*3];      y1=point[ij*3+1];      z1=point[ij*3+2];
		    x2=point[(ij+ny)*3]; y2=point[(ij+ny)*3+1]; z2=point[(ij+ny)*3+2];
		}
		else if (i<ny-1) {
		    if (v>=point[(ij+1)*3] && v<point[ij*3]) {
			x1=point[(ij+1)*3];y1=point[(ij+1)*3+1];z1=point[(ij+1)*3+2];
			x2=point[ij*3];    y2=point[ij*3+1];    z2=point[ij*3+2];
		    }
		    else if (v>=point[(ij+ny)*3] && v<point[(ij+ny+1)*3]) {
			x1=point[(ij+ny)*3];  y1=point[(ij+ny)*3+1]; z1=point[(ij+ny)*3+2];
			x2=point[(ij+ny+1)*3];y2=point[(ij+ny+1)*3+1];z2=point[(ij+ny+1)*3+2];
		    }
		    else {
			cut = (npp == 0) && (j==kx-1);
			continue; }}
		else  {
		    cut=true;
		    continue; }
		npp++;
		yy=y1+(y2-y1)*(v-x1)/(x2-x1);
		zz=z1+(z2-z1)*(v-x1)/(x2-x1);
		cutCoorda[n*3]=axisMax[0];
		cutCoorda[n*3+1]=yy;
		cutCoorda[n*3+2]=zz;
		cutCoordb[n*3]=axisMin[0];
		cutCoordb[n*3+1]=yy;
		cutCoordb[n*3+2]=zz;
		cutIndices[ni++]=n;
		n++; 
	    }
	}
    }
    cutNCoord=n;
    cutIndices[ni++]=-1;
    cutNIndices=ni;
}

// Works out contours (somehow)
// stores into cutCoorda,cutCoordb and cutIndices, with cutNIndices,cutNCoord
function contour_cut(value, dimension_num, dimension_min, nx, ny, ppf) {
    var v = value+dimension_min;
    cutNIndices=0; cutNCoord=0;
    for (var i=0; i<nx-1; i++) {
	for (var j=0; j<ny-1; j++) {
	    ij0=i*ny+j;
	    ij1=ij0+ny;
	    ij2=ij1+1;
	    ij3=ij0+1;
	    cellContour(ij0,ij1,ij2,ij3,v,dimension_num,ppf);
	}
    }
}

function cellContour(ij0,ij1,ij2,ij3,contour,xyz,point) {
    var r,s,t;
//    if      (xyz==0) {r=2; s=1; t=0;}
//    else if (xyz==1) {r=0; s=2; t=1;}
//    else if (xyz==2) {r=0; s=1; t=2;}

// Not quite....[was a flip for x, but also flipped in drawline!]
    r=axisOrth1[xyz];
    s=axisOrth2[xyz];
    t=xyz;

    var xx0,yy0,zz0, xx1,yy1,zz1, xx2,yy2,zz2, xx3,yy3,zz3;
    xx0=point[ij0*3+r];
    yy0=point[ij0*3+s];
    zz0=point[ij0*3+t];
    
    xx1=point[ij1*3+r];
    yy1=point[ij1*3+s];
    zz1=point[ij1*3+t];

    xx2=point[ij2*3+r];
    yy2=point[ij2*3+s];
    zz2=point[ij2*3+t];

    xx3=point[ij3*3+r];
    yy3=point[ij3*3+s];
    zz3=point[ij3*3+t];

    if (zero(contour-zz0) && zero(contour-zz1)) {
	drawline(xx0,yy0,xx1,yy1,xyz); }
    else if (zero(contour-zz1) && zero(contour-zz3)) {
	drawline(xx1,yy1,xx3,yy3,xyz); }
    else if (zero(contour-zz0) && zero(contour-zz3)) {
	drawline(xx0,yy0,xx3,yy3,xyz); }

    n=0;
    if (contains(contour, zz0,zz1,zz3)) {
	if ((zz0<contour && zz1>contour) || (zz1<contour && zz0>contour)) {
	    percent = (contour - zz0) / (zz1 - zz0);
	    x = xx0 + percent * (xx1 - xx0);
	    y = yy0 + percent * (yy1 - yy0);
	    po[n*3]=x; po[n*3+1]=y; po[n*3+2]=0; n++;
	}
	if ((zz1<contour && zz3>contour) || (zz3<contour && zz1>contour)) {
	    percent = (contour - zz1) / (zz3 - zz1);
	    x = xx1 + percent * (xx3 - xx1);
	    y = yy1 + percent * (yy3 - yy1);
	    po[n*3]=x; po[n*3+1]=y; po[n*3+2]=0; n++;
	}
	if ((zz0<contour && zz3>contour) || (zz3<contour && zz0>contour)) {
	    percent = (contour - zz0) / (zz3 - zz0);
	    x = xx0 + percent * (xx3 - xx0);
	    y = yy0 + percent * (yy3 - yy0);
	    po[n*3]=x; po[n*3+1]=y; po[n*3+2]=0; n++;
	}
	drawline(po[0],po[1],po[3],po[4],xyz);
    }

    if (zero(contour-zz1) && zero(contour-zz2)) {
	drawline(xx1,yy1,xx2,yy2,xyz); }
    else if (zero(contour-zz1) && zero(contour-zz3)) {
	drawline(xx1,yy1,xx3,yy3,xyz); }
    else if (zero(contour-zz2) && zero(contour-zz3)) {
        drawline(xx2,yy2,xx3,yy3,xyz); }

    n=0;
    if (contains(contour, zz1,zz2,zz3)) {
	if ((zz1<contour && zz2>contour) || (zz2<contour && zz1>contour)) {
	    percent = (contour - zz1) / (zz2 - zz1);
	    x = xx1 + percent * (xx2 - xx1);
	    y = yy1 + percent * (yy2 - yy1);
	    po[n*3]=x; po[n*3+1]=y; po[n*3+2]=0; n++;
	}
	if ((zz2<contour && zz3>contour) || (zz3<contour && zz2>contour)) {
	    percent = (contour - zz2) / (zz3 - zz2);
	    x = xx2 + percent * (xx3 - xx2);
	    y = yy2 + percent * (yy3 - yy2);
	    po[n*3]=x; po[n*3+1]=y; po[n*3+2]=0; n++;
	}
	if ((zz1<contour && zz3>contour) || (zz3<contour && zz1>contour)) {
	    percent = (contour - zz1) / (zz3 - zz1);
	    x = xx1 + percent * (xx3 - xx1);
	    y = yy1 + percent * (yy3 - yy1);
	    po[n*3]=x; po[n*3+1]=y; po[n*3+2]=0; n++;
	}
	drawline(po[0],po[1],po[3],po[4],xyz);
    }
}

function contains(h,h1,h2,h3) {
    return ((h1 < h && h2 > h && h3 > h) || (h2 < h && h1 > h && h3 > h) ||
            (h3 < h && h1 > h && h2 > h) || (h1 > h && h2 < h && h3 < h) ||
            (h2 > h && h1 < h && h3 < h) || (h3 > h && h1 < h && h2 < h)); }

function zero(value) {
    return (Math.abs(value) < 0.0001); }
//    return (Math.abs(value) < 0.0001*axisWidth[xyz]); }

// These store line fragments of the cut line into
// storing x,y into coordinates cutCoorda,cutCoordb and updating index
// cutNIndices is current position in index
// cutNCoord (3*cutNCoord, +1, +2) points into cutCoorda,cutCoordb.


function drawline(x1,y1, x2,y2, xyz) {
//    var yzx = (xyz == 2 ? 1 : (xyz+1)%3);
//    var zxy = (xyz == 2 ? 0 : (xyz+2)%3);
    var zxy = axisOrth1[xyz];
    var yzx = axisOrth2[xyz];

    cutCoorda[cutNCoord*3+ xyz]=axisMin[xyz];
    cutCoorda[cutNCoord*3+ yzx]=y1;
    cutCoorda[cutNCoord*3+ zxy]=x1;
    cutCoordb[cutNCoord*3+ xyz]=axisMax[xyz];
    cutCoordb[cutNCoord*3+ yzx]=y1;
    cutCoordb[cutNCoord*3+ zxy]=x1;

    cutIndices[cutNIndices++] = cutNCoord++;

    cutCoorda[cutNCoord*3+ xyz]=axisMin[xyz];
    cutCoorda[cutNCoord*3+ yzx]=y2;
    cutCoorda[cutNCoord*3+ zxy]=x2;
    cutCoordb[cutNCoord*3+ xyz]=axisMax[xyz];
    cutCoordb[cutNCoord*3+ yzx]=y2;
    cutCoordb[cutNCoord*3+ zxy]=x2;

    cutIndices[cutNIndices++]=cutNCoord++;
    cutIndices[cutNIndices++]=-1;
}

//======================================================================
function showOrientation(){
    orienter_id = setInterval(function() {
        var runtime = document.getElementById('x3dElement').runtime;
        if(runtime != null){
            // console.log("Projection: "+ runtime.projectionMatrix()); }
            // This should be the center of the object
            var center = runtime.calcCanvasPos(-0.00000, -0.00000, -2.00002)
            var eye = runtime.getViewingRay(center[0],center[1]);
            // This is rotated about X by 90
//            console.log("Eye: "+ eye.dir);
            var x = -eye.dir.x;
            var y = eye.dir.z;
            var z = -eye.dir.y;
//            console.log("Eye: "+ x+", "+y+", "+z);

// //            var surface = document.getElementById('Surface1');
//             var surface = document.getElementById('scaleXYZ');
//             if(surface == null){
//                 console.log("no surface"); }
//             else {
//                 var c = runtime.getCenter(surface);
//                 console.log("Center @ "+c);
//                 var tr = runtime.getCurrentTransform(surface);
//                 console.log("Transform: "+tr); }
 }
        else {
            console.log("No runtime"); }
        }, 5000); }

//======================================================================
var fallback_format = null;
function set_vizfallback(value){
    if(value == "auto"){ value = null; }
    fallback_format = value;
    if(value != null){
	$("#vizfallback_submit").removeAttr('disabled'); }
    return false; }

function VizFallback(url){
    $('#vizfallback form').each(function(){ this.reset(); });
    $("#vizfallback_submit").attr('disabled',true);
    $("#choose_vizfallback input").attr('checked',false);
    $("#mask").height( $(document).height()).fadeIn('slow');
    $("#vizfallback").css("left",($(window).scrollLeft()+$(window).width()/2-150)+"px")
	.css("top",($(window).scrollTop()+$(window).height()/2-150)+"px").fadeIn('slow');
    // Take down the pop up if they've navigated around ?? Is a minute enough?
    window.setTimeout("VizFallbackDefault()",60000);
    //window.setTimeout("VizFallbackCancel()",6000);
    return false; }


function VizFallbackDone(){
    var ext = (fallback_format == 'VRML' ? 'wrl' : fallback_format); // Ugh
    var newurl = window.document.location.pathname.replace(/webgl$/,ext);

    if($("#choose_vizfallback_remember:checked").val() != undefined){
	// [NOTE that you do NOT test for attr("checked")... which is screwy...
	// If we should remember the choice, copy the temporary choice to permanent.
	setCookie("VizFormat",fallback_format); }
    $("#mask").css('display','none');
    $("#vizfallback").css('display','none');
    // Now move on to the approriate graphic (extension is already explicit)
    window.location = newurl;
    return false; }

function VizFallbackDefault(){
    if(fallback_format == null){
        var newurl = window.document.location.pathname.replace(/webgl$/,'mag');
        $("#mask").css('display','none');
        $("#vizfallback").css('display','none');
        window.location = newurl; }
    return false; }

function VizFallbackCancel(){
    window.history.back();
    return true; }

function disableCutPlayer(value){
    $('#rewind').button("option","disabled",value);
    $('#reverse').button("option","disabled",value);
    $('#stop').button("option","disabled",value);
    $('#play').button("option","disabled",value);
    $('#ff').button("option","disabled",value); }

//======================================================================

var x3dom_ready = false;
var jquery_ready = false;
x3dom.runtime.ready = function(){
    console.log("X3Dom initializing");
    initScales();
    initColormaps();
    initScalers();
    initCutters();
    console.log("X3Dom ready!");
    x3dom_ready = true;
    if(jquery_ready){
        finishInit(); }
  }

$(document).ready(function(){
    console.log("jQuery initializing");
    // If we don't have WebGL?
    if(! checkWebGL()){
        var url = window.document.location.pathname.replace(/\.webgl/,'');
        //var url = window.document.location;
	return VizFallback(url); }

    //======================================================================
    // Establish handlers on Controls

    //----------------------------------------------------------------------
    // color mapping buttons
    $('#modulus').button({label:"Modulus"}).on('click',function() {
        colorLegend.src="./style/webgl-moduluscolor.png";
        applyModulusMap(modulusMap); });
    $('#spectrum').button({label:"Phase"}).on('click',function() {
        colorLegend.src="./style/webgl-phasecolor.png";
        applyPhaseMap(phaseSMap); });
    $('#four').button({label:"Quadrant"}).on('click',function() {
        colorLegend.src="./style/webgl-fourcolor.png";
        applyPhaseMap(phase4Map); });
    
    //----------------------------------------------------------------------
    // viewpoint button functions
    $('#front' ).button({label:"&#x21D6;"}).on('click',function() { setViewpoint(0); });
    $('#right' ).button({label:"&#x21D9;"}).on('click',function() { setViewpoint(3); });
    $('#back'  ).button({label:"&#x21D8;"}).on('click',function() { setViewpoint(1); });
    $('#left'  ).button({label:"&#x21D7;"}).on('click',function() { setViewpoint(2); });
    $('#top'   ).button({label:"&#x21D3;"}).on('click',function() { setViewpoint(4); });
    $('#bottom').button({label:"&#x21D1;"}).on('click',function() { setViewpoint(5); });

    //----------------------------------------------------------------------
    // Scaling the figure by moving one of (x,y,z) the sliders
    $(".slider").slider({min:0, max:1, value:1, step: 0.0001,
                        slide:  function(e, ui) {
                            scaleslide(); },
                        change: function(e, ui) {
                            scaleslide(); }
                       });

    // initial scaling slider values
    $("#percentX").val(parseInt($("#xscaleSlider").slider("value")*100)+"%");
    $("#percentY").val(parseInt($("#yscaleSlider").slider("value")*100)+"%");
    $("#percentZ").val(parseInt($("#zscaleSlider").slider("value")*100)+"%");
    
    // scaling figures by changing the percent numbers (updates indirectly through slider) 
    $("#percentX").on('change',function() {
        $("#xscaleSlider").slider("value",parsePercent(this.value)); });
    $("#percentY").on('change',function() {
        $("#yscaleSlider").slider("value",parsePercent(this.value)); });
    $("#percentZ").on('change',function() {
        $("#zscaleSlider").slider("value",parsePercent(this.value)); });

    //----------------------------------------------------------------------
    // cutting plane controls
    $('#X').button().on('click',function() {
        $('.cutDisplay').show('fast');
       clearCutSlider(0,"0");
       //        stopCutter();
       disableCutPlayer(false);
       $('#stop').button().trigger('click');
    });
    $('#Y').button().on('click',function() {
        $('.cutDisplay').show('fast');
        clearCutSlider(1, "1");
        //stopCutter();
        disableCutPlayer(false);
        $('#stop').button().trigger('click');
    });
    $('#Z').button().on('click',function() {
        $('.cutDisplay').show('fast');
        clearCutSlider(2, "2");
        //        stopCutter();
        disableCutPlayer(false);
        $('#stop').button().trigger('click');
    });
    $('#clear').button({label:"Clear"}).on('click',function() {
        setX3DAttribute("cuttingXYZ","whichChoice","-1");
        setX3DAttribute("outlineSwitch","whichChoice",currentViewpoint);
        $("#cuttingSlider").slider("value","0");
        $("#cuttingValue").val("");
        cutXYZ=-1;
        removeCutlines();
    if(cutContext != null){
        cutContext.clearRect(0,0,cutCanvas.width,cutCanvas.height); 
    }
        //stopCutter();
        $('#stop').button().trigger('click');
        $('.cutDisplay').hide('fast');
        disableCutPlayer(true); });

    // cutting slider set up and control
    // Changes to the slider value (by user or code)
    // cause the cutting line to be recomputed & redrawn.
    $("#cuttingSlider").slider({min:0, max:1, value:0, step:0.0001,
        	                change: function(e, ui) {
        	                    cutSlider(cutXYZ);
        	                },
        	                slide: function(e, ui) {
        	                    cutSlider(cutXYZ);
        	                }
                               });

    // User changes the number above the slider, we move the slider to that position
    // (which causes the new cut to be displayed)
    $("#cuttingValue").on('change',function() {
        var v = this.value;
        var cut = v.split("=");
        var cutValue = (cut.length==1 ? cut[0] : cut[1]);
        var axis = cutXYZ;
        $("#cuttingSlider").slider("value",(parseFloat(cutValue)-axisMin[axis])/axisWidth[axis]);
        /*$("#cuttingValue").val(axisLabel[axis]+"="+cutValue); // does NOT re-trigger!*/
        $("#cuttingValue").val(cutValue); // does NOT re-trigger!
    });   

    // animation button control
    $('#rewind').button({label:"\u25C0\u25C0"}).on('click',function(e) {
        //stopCutter();           // if running...
        $('#stop').button().trigger('click');
        $("#cuttingSlider").slider("value",0); });
    $('#reverse').button({label:"\u25C0"}).on('click',function(e) {
        cut_forward = false;
        startCutter(); });
    $('#stop').button({label:"\u25A0"}).on('click',function(e) { 
        stopCutter(); });
    $('#play').button({label:"\u25B6"}).on('click',function(e) {
        cut_forward = true;
        startCutter(); });
    $('#ff').button({label:"\u25B6\u25B6"}).on('click',function(e) {
        //stopCutter();           // if running...
        $('#stop').button().trigger('click');
        $("#cuttingSlider").slider("value",1); });
    jquery_ready = true;
    console.log("jQuery is ready!");
    if(x3dom_ready){
        finishInit(); }
});

// Presumably can only do these when BOTH jquery & x3dom are ready?
// NOTE: What about race condition?
function finishInit() {
    console.log("Finishing initialization");
    // Apply labels whereever they apper (after x3dom & jquery available)
    $(".labelX").html(axisLabel[0]);
    $(".labelY").html(axisLabel[1]);
    $(".labelZ").html(axisLabel[2]);
    $('#X').button({label:axisLabel[0]});
    $('#Y').button({label:axisLabel[1]});
    $('#Z').button({label:axisLabel[2]});

    // Put buttons (& what they affect) into default state.
    // Probably can't do this till BOTH jquery & x3dom are ready???
    $('#clear').button().trigger('click');
    $('#stop').button().trigger('click');
    $('#modulus').button().trigger('click');
    $('#'+viewName[parseInt(getX3DIntAttribute("initViewpoint",'value'))]).button().trigger('click');

    console.log("Viz initialized!");
}
