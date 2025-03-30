//======================================================================
// DLMF customization form support
//======================================================================
// Assumes DLMF.js, jquery.js present

function set_style(group,value){
    var classes = $('body').attr('class').split(' ');
    var newstyle = "";
    var nondefault = false;
    if(! (isValidID(group) && isValidID(value))){
        return; }
    for(i=0; i < classes.length; i++){
	var pair = classes[i].split('_');
        if(pair[0] == null || !pair[0] || pair[0] == 'false'){
            continue; }
	if(pair[0] == group){
	    pair[1] = value; }
	nondefault = nondefault || (pair[1] != 'default');
	newstyle += (newstyle == "" ? "" : "#");
	newstyle += pair[0]+'_'+pair[1]; }
    $('body').attr('class',newstyle.replace(/#/g,' '));
    setCookie("Style",(nondefault ? newstyle : null));
    return false; }

function set_format(value){
    setCookie("Format", ((value != null) && (value != "auto") ? value : null));
    $("#choose_mathml").attr("disabled",(value == 'HTML+images'));       // NO MathML!
    return false; }

function set_mathml(value){
    setCookie("MathML", ((value != null) && (value != "auto") ? value : null));
    return false; }

function set_vizformat(value){
    if(!isValidID(value) || (value == "auto")){ value = null; }
    setCookie("VizFormat",value);
    return false; }

$(document).ready(function(){
    // Set form fields from cookies.
    let style = readCookie("Style");
    if(style == null){
        style="color_default#textfont_default#titlefont_default#fontsize_default#navbar_default"; }
    let pairs = style.split('#');
    for(i=0; i < pairs.length; i++){
        $("#choose_"+pairs[i]).prop('checked',true); }

    let format = readCookie("Format");
    if((format == null) || !isValidID(format)){ format = 'auto'; }
    $("#choose_format_"+format.replace('+','_')).prop('checked',true);
    $("#choose_mathml").attr("disabled",(format == 'HTML+images'));       // NO MathML!

    let mode = readCookie("MathML");
    if((mode == null) || !isValidID(mode)){ mode = 'auto'; }
    $("#choose_mathml_"+mode).prop('checked',true);

    let vformat = readCookie("VizFormat");
    if((vformat == null) || !isValidID(vformat)){ vformat = 'auto'; }
    $("#choose_vizformat_"+vformat).prop('checked',true);

    let browser = "<span title='"+ navigator.userAgent+"'>Browser</span>"
    let formatinfo="Default will be HTML5 (except older browsers).";
    let mathinfo=
        "Your "+browser+" "
        + (hasNativeMathML()
           ? "supports MathML natively; Default will use that."
           : (maybehasNativeMathML()
              ? "<em>may</em> support MathML natively; Default will use Native, but you may wish to try MathJax."
              : "does <em>not</em> support MathML; Default will use MathJax."));
    let vizinfo=
        "Your "+browser+" "
        +(checkWebGL() ? "supports WebGL." : "does <em>not</em> support WebGL.");
    $('#format_info').html(formatinfo);
    $('#mathml_info').html(mathinfo);
    $('#vizformat_info').html(vizinfo);

    return true; });

//window.onload = do_customize_onload;
