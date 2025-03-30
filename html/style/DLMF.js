//======================================================================
// DLMF Common Javascript
//======================================================================

var debug=true;

// Check if str is simple "id": letters, +,-,_,.
function isValidID(str){
    //    return !str.test("[^\w\-\+\.]"); }
    //return true; }
    return  ! /[^\w\-\+\.]/.test(str); }

function page_code() {
    return window.document.location.pathname.replace(/^.*\//,''); }

//----------------------------------------------------------------------
// Basic Cookie support.

// A date in the past, for expiring cookies
var EXPIRE_NOW = new Date();
var EXPIRE_NEVER = new Date();
EXPIRE_NOW.setTime(EXPIRE_NOW.getTime() - 1000);
EXPIRE_NEVER.setFullYear(EXPIRE_NEVER.getFullYear() +1);

// caller should validate...
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
	var c = ca[i];
	while (c.charAt(0)==' ') c = c.substring(1,c.length);
	if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null; }

function setCookie(name,value){
    if(value != null){
	document.cookie = name+"="+value+";path=/;SameSite=Strict;expires="+EXPIRE_NEVER; }
    else {
        document.cookie = name+"=;path=/;SameSite=Strict;expires=Thu, 01 Jan 1970 00:00:00 GMT"; }}

//======================================================================
// Browser Feature detection/sniffing
//======================================================================
// Check for KNOWN MathML support by browser agent sniffing
function hasNativeMathML(){
    let agent = navigator.userAgent;
    let is_gecko = (agent.indexOf("Gecko") > -1 &&
                    agent.indexOf("KHTML") === -1 &&
                    agent.indexOf("Trident") === -1);
    // Check for MathPlayer, but only IE's before IE 10 when it was disabled.
    let has_mathplayer = (agent.indexOf("MathPlayer") > -1 &&
                          agent.indexOf("rv:1") === -1); /* till ie 20! */
    return is_gecko || has_mathplayer; }

// Check for possible MathML support by feature detection
// (but we don't know how complete the support is)
function maybehasNativeMathML(){
    document.body.insertAdjacentHTML(
        "afterbegin",
        "<div style='border: 0; clip: rect(0 0 0 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; width: 1px;'>"
            +"<math xmlns='http://www.w3.org/1998/Math/MathML'>"
            +"<mpadded height='23px' width='77px'></mpadded>"
            +"</math></div>"
    );
    console.log("MathML Probe inserted");
    let b=document.body.firstChild;
    let a=b.firstChild.firstChild.getBoundingClientRect();
    if(a && b){
        document.body.removeChild(b);
        console.log("MathML Probe insertion is "+a.width+" x "+a.height);
        return (1 >= Math.abs(a.height-23)) && (1 >= Math.abs(a.width-77)); }
    console.log("MathML Probe failed");
    return false; }

// Do we need MathJax? Based on cookie and/or known MathML support
function needsMathJax (){
    // Better would be to look for lack of math element
    if(document.doctype){
        let sysid = document.doctype.systemId;
        if(sysid.indexOf("html4") > 0){
            return false; } }
    let mode = readCookie("MathML");
    if((mode == 'mathjax') || ((mode != 'native') && !maybehasNativeMathML())){
        return true; }
    return false; }

var mathjax_url = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/mml-chtml.js";

// Load MathJax onto this page.
function loadMathJax(){
    let head = document.getElementsByTagName("head")[0];
    if (head != null) {
        let script = document.createElement("script");
        script.type = "text/javascript";
        script.src = mathjax_url;
        script.onreadystatechange = refreshMathJax;
        script.onload = refreshMathJax;
        head.appendChild(script);
    } }

function refreshMathJax() {
    // Maybe unnecessary, or overkill, but...
    if ((typeof MathJax != "undefined")
        && (typeof MathJax.Hub != "undefined")
        && (typeof MathJax.Hub.Queue != "undefined")) {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }
}

// Does the browser appear to support WebGL?
function checkWebGL(){
    if (!!window.WebGLRenderingContext){
        var canvas = document.createElement("canvas"),
	    names = ["webgl", "experimental-webgl", "moz-webgl", "webkit-3d"],
	    context = false;
        for(var i=0;i<4;i++) {
            try {
                context = canvas.getContext(names[i]);
                if (context && typeof context.getParameter == "function") {
                    return true; } // WebGL is enabled
            } catch(e) {}
        }
        return false; }  // WebGL is supported, but disabled
    return false;    // WebGL not supported
}

//======================================================================
// If there's a form and query data in the URL, prefill the form.
//======================================================================

function prefillForms(){
    if(document.forms != null){
        // watch for hacks/xss/etc coming from contrived urls & query string...
	var pairs = window.document.location.search.substring(1).split("&");
	var msg = "";
	for(var i = 0; i < pairs.length; i++){
	    var pos = pairs[i].indexOf('=');
	    if(pos == -1) continue;
	    var key = pairs[i].substring(0,pos);
	    if(isValidID(key)){
		var control = $("[name='"+key+"']");
		var tag =  control.prop('tagName');
		var type = control.attr('type');
		// Note: values can be escaped two different ways.
		var val = decodeURIComponent(pairs[i].substring(pos+1).replace(/\+/g,' '));
		// Preset the control in a way appropriate to the element tag & type
		// For text input, accept 'arbitrary' text.
		if((tag == 'INPUT') && (type == 'text')){
                    if(debug){ console.log("preset "+key+" = "+val); }
		    $("input[name='"+key+"'][type='text']").attr('value',val); }
		// for all others, value must correspond to clean id
		else if(isValidID(val)){
		    if(tag == 'SELECT'){
                        if(debug){ console.log("preselect "+key+":"+val); }
			$("select[name='"+key+"'] option[value='"+val+"']").attr('selected',true); }
		    else if((tag == "INPUT") && (type == 'radio')){
                        if(debug){ console.log("precheck "+key+":"+val); }
			$("input[name='"+key+"'][type='radio'][value='"+val+"']").prop('checked',true); } }
		else if (debug) {
                    console.log("prefill form: key "+key+" has invalid value: "+val); } }
	    else if (debug) {
                console.log("prefill form: has invalid key: "+key); } }
    } }

//======================================================================
// Stylesheet selection.
//======================================================================
// Adapted From http://www.alistapart.com/stories/alternate/  by Paul Snowden
// Saves a persistent cookie!.

var BODY = null;
var REQ_Style = readCookie("Style");
var DEF_Style = null;
if(/[^\w\-\+\.\#]/.test(REQ_Style)){ // validate.
    REQ_Style =  null; }

// This contrivance attempts to find the body & set style BEFORE onload!
// to avoid visible switch of styles.
// But note: it's not guaranteed to happen before onload!!!
if(REQ_Style != null){
    var init_step=0;
    var timer = window.setInterval(function(){
	init_step++;
	if((typeof document.getElementsByTagName != 'undefined')
	   && (((BODY=document.getElementsByTagName('body')[0]) != null)
	       || (BODY=document.body) != null)){
	    if(DEF_Style == null) 
		DEF_Style = BODY.className.replace(/ /g,'#');
	    BODY.className = REQ_Style.replace(/#/g,' ');
	    window.clearInterval(timer); }
	if(init_step > 100){
	    window.clearInterval(timer); }},
	50); }

function updateCSSStyle() {
    if(BODY == null){
	BODY = document.getElementsByTagName('body')[0];
	if(DEF_Style == null)
	    DEF_Style = BODY.className.replace(/ /g,'#'); 
    }
    REQ_Style = readCookie("Style");
    if(/[^\w\-\+\.\#]/.test(REQ_Style)){ // validate.
        REQ_Style =  null; }
    BODY.className = (REQ_Style == null ? DEF_Style : REQ_Style).replace(/#/g,' ');
    // // If a customize form is present, set fields
    // $("#customize\\.form").each(function(){
    //     var classes = $('body').attr('class').split(' ');
    //     for(i=0; i < classes.length; i++){
    //         $("#choose_"+classes[i]).prop('checked',true); }
    //     let format = readCookie("Format");
    //     if((format == null) || !isValidID(format)){ format = 'auto'; }
    //     $("#choose_format_"+format.replace('+','_')).prop('checked',true);
    //     let vformat = readCookie("VizFormat");
    //     if((vformat == null) || !isValidID(vformat)){ format = 'auto'; }
    //     $("#choose_vizformat_"+vformat).prop('checked',true);
    //     var mode = readCookie("MathML");
    //     if((mode == null) || !isValidID(mode)){ mode = 'auto'; }
    //     $("#choose_mathml_"+mode.replace('+','_')).prop('checked',true);
    //     });
    return true; }

// Used by Customization forms (if any).
// function set_style(group,value){
//     var classes = $('body').attr('class').split(' ');
//     var newstyle = "";
//     var nondefault = false;
//     if(! (isValidID(group) && isValidID(value))){
//         return; }
//     for(i=0; i < classes.length; i++){
// 	var pair = classes[i].split('_');
//         if(pair[0] == null || !pair[0] || pair[0] == 'false'){
//             continue; }
// 	if(pair[0] == group){
// 	    pair[1] = value; }
// 	nondefault = nondefault || (pair[1] != 'default');
// 	newstyle += (newstyle == "" ? "" : "#");
// 	newstyle += pair[0]+'_'+pair[1]; }
//     $('body').attr('class',newstyle.replace(/#/g,' '));
//     setCookie("Style",(nondefault ? newstyle : null)); 
//     return false; }

//======================================================================
// Highlighting the document portion identified by the document fragment.
//======================================================================
var SELECTED_ID='';

function hiliteFrag(){
    // watch for hacks/xss/etc coming from contrived urls & query string...
    var id = window.document.location.hash.substr(1);
    if(isValidID(id)){
        var matchid = id.replace(/\./g,'\\.');
	if(matchid != SELECTED_ID){
            if(debug){ console.log("hilite "+id); }
	    if(SELECTED_ID != ''){
//                if(SELECTED_ID.search(/(^|\.)info$/) >0){
//		    $('#'+SELECTED_ID+" .ltx_infocontent").removeClass('selected'); }
//                else {
		    $('#'+SELECTED_ID).removeClass('selected'); } //}
	    SELECTED_ID = matchid;
	    if(matchid == ''){ }
//	    else if(matchid.search(/(^|\.)info$/) >0){
//		$('#'+matchid+" .ltx_infocontent").addClass('selected'); }
	    else {
		$('#'+matchid).addClass('selected'); }
	} }
    else if(debug){ 
        console.log("fragment id is not valid: "+id); }
}

//======================================================================
// Exposing the Info/metadata
//======================================================================
// Info boxes are visible by:
//  *  PopUp on mouseover of the Info icon
//     Uses info:hover in CSS
// They are "displayed" (in the document flow) by:
//  * toggling Show/Hide annotations 
//    which affects ALL infoboxes by adding class='shown'
//    sets sidewide cookie
//  * clicking an Info icon
//    which toggles that Info box by adding class='shown' 
//    adds/removes that id from page cookie.
//  * If frag ID (in url) is to an Info box.

// NOTE: IE doesn't seem to allow storing cookies PER PAGE (ie w/ path=page)
// rather it wants the whole directory. Thus ID's get prefixed w/ the page.

var SHOWN_INFO = '';
var infoOpened = new Object();
var THISPAGE = page_code();
function updateInfo(){
    if(THISPAGE != null){
        var showall = readCookie("ShowInfoAll") == 'true';
        var showids = readCookie("ShowInfo_"+THISPAGE);
        var trigger = (showall ? "all" : ((showids == null) || (showids == "") ? "none" : showids));
        if(trigger != SHOWN_INFO){	// If displayed state is diff. from request in cookies
	    SHOWN_INFO = trigger;
	    if(showall){
	        $('#showinfo').css('display','none');
	        $('#hideinfo').css('display','inline-block');
	        $(".ltx_infocontent").addClass('shown').show('fast'); }
	    else {
	        $('#showinfo').css('display','inline-block');
	        $('#hideinfo').css('display','none');
	        infoOpened = new Object();
	        if(showids != null){
		    var ids = showids.split('#');
		    for(i=0; i < ids.length; i++){  
                        if(isValidID(ids[i])){
		            infoOpened[ids[i]]=ids[i]; } } }
	        $('.ltx_infocontent').each(function(){ 
		    var id = $(this).parent().attr('id');
		    if(infoOpened[id]){
			$(this).addClass('shown').slideDown("fast"); }
		    else {
			$(this).removeClass('shown').hide(); }});
	    } } } }

// Show (all) Annotations button clicked
function showInfo(){
    setCookie("ShowInfoAll",true);
    $('#showinfo').css('display','none');
    $('#hideinfo').css('display','inline-block');
//    $(".ltx_infocontent").addClass('shown').removeClass('hover').slideDown('fast'); }
    $(".ltx_infocontent").addClass('shown').removeClass('hover').show('fast'); }

// Hide (all) Annotations button clicked
function hideInfo(){
    setCookie("ShowInfoAll",null);
    $('#showinfo').css('display','inline-block');
    $('#hideinfo').css('display','none');
    $(".ltx_infocontent").removeClass('shown').slideUp('fast'); }

function updateInfoCookie (){
    var shown_info='';
    var page = page_code();
    if(page != null) {
        for(var anid in infoOpened){
	    shown_info += (shown_info=='' ? '' : '#') + anid; }
        if(shown_info == ""){
	    shown_info=null;
	    document.cookie = "ShowInfo_"+page+"=;SameSite=Strict;expires="+EXPIRE_NOW; }
        else {
	    document.cookie = "ShowInfo_"+page+"="+shown_info+";SameSite=Strict"; }
    } }

//======================================================================
// Orchestrate the whole mess.
//======================================================================

// Note: onLoad doesn't (necessarily) get invoked via <back> or <forward>,
// or following a link within the same document.
// Since we're trying to track changes to cookies, stylesheets, #frag (!)
// we need to occasionally peek at the state & possibly refresh.
// So, we set a timer to check the document's URL every second and update if needed.

var PREV_COOKIE = "";
function do_refresh(){
    if(document.cookie != PREV_COOKIE){
	updateCSSStyle(); 
	PREV_COOKIE = document.cookie; }
    updateInfo();
    hiliteFrag(); 
}

function initLeaveNotice(){
    $(function(){
        $('a.external').leaveNotice({
            //timeOut:0,
            exitMessage: "<h4>You are now leaving NIST's</h4><h3>{SITENAME}</h3>",
            siteName:    "Digital Library of Mathematical Functions",
            preLinkMessage: "<p>You will momentarily be directed to</p><div class='setoff'>{URL}</div>",
            preCancelMessage: "Click the link to leave immediately or ",
            postCancelMessage: "."
});
    });
}

var beenhere=false;
$(document).ready(function(){
    if(needsMathJax()){
        loadMathJax(); }
    $(".ltx_infoicon").on({
        click:function(event){	// Set up sticky info boxes on clicks
	    var box = $(this).parent().find('.ltx_infocontent');
	    if(box.hasClass('shown')){ // If already shown,  remove shown, but let mouseleave hide
		box.removeClass('shown').removeClass('hover');
		var id = box.parent().attr('id');
		if(id != null){
		    delete infoOpened[id];
		    updateInfoCookie(); }}
            else { // else if not shown, show it, recording it as shown
		box.removeClass('hover').addClass('shown')
		    .animate({height:"show"},200,'linear',
			     function(){
				 var id = box.parent().attr('id');
				 if(id != null){
				     infoOpened[id]=id;
				     updateInfoCookie(); }
			     }); }
	    return false; },
        mouseenter:function(event){ 	// Set up popup info boxes on hover begin.
	    var box = $(this).parent().find(".ltx_infocontent");
	    if(! box.hasClass('shown') && ! box.hasClass('hover')){
		box//.addClass('hover')
		    .animate({opacity:"show", height:"show"},200); }
	    //return false;
        },
	mouseleave:null});
    $(".ltx_info").on({
        mouseleave:function(event){	// but don't popdown til we leave the whole info box
	    var box = $(this).find(".ltx_infocontent");
	    //			     if(box.hasClass('hover')){
	    if(! $(this).hasClass('selected')
               && !box.hasClass('shown')){
		box.animate({opacity:"hide", height:"hide"},200, 'linear',
			    function(){ box.removeClass('hover'); });
	    }
	    //return false;
        }});

    /* script footnotes too, so they work in IE */
    $(".ltx_footnote").on({
        mouseenter:function(event){
	    var box = $(this).find(".ltx_note_content");
	    box.animate({opacity:"show", height:"show"},200); },
        mouseleave:function(event){
	    var box = $(this).find(".ltx_note_content");
	    box.animate({opacity:"hide", height:"hide"},200, 'linear',
			function(){ box.removeClass('hover'); }); }});

    $("body.navbar_popup .ltx_page_navbar").on({
        mouseenter:function(){ $(this).animate({width:100},200); },
        mouseleave:function(){ $(this).animate({width:20},200); }});

    //do_refresh();
    updateCSSStyle();
    //hiliteFrag();
    prefillForms();
    initLeaveNotice();
    window.setInterval("do_refresh()",500); // Set timer to recover, if needed.
});

