// Javascript for search form "validation"
function change_type(){
    if($("#select_bibitems:checked").is('*')){
	$('#select_chapters').attr('disabled','disabled'); }
    else {
	$('#select_chapters').removeAttr('disabled'); }

    return true; }

// IE's <option> don't respond to most events, so a bit contrived.
var all_selected = false;
// Note a change to selections in chapter list.
// The objective is to have EITHER all-chapters selected, or some subset of specific chapters.
// There's something broken about attr('selected',somevalue) in jQuery for working with option.
// The only thing I can get working is this absurd .each(function...) bizness.
function changed_chapters(){
    var all     = $('#select_chapters option:eq(0)');
    var singles = $('#select_chapters option:gt(0)');
    if(all.is(':selected')){ // All IS selected
	if(all_selected){				 // and was, so must have been another
	    all.each(function(i,x){ x.selected=false;}); } // So, clear ALL
	else {			// All wasn't selected
	    singles.each(function(i,x){x.selected=false; });  }} // so deselect all others
    else {
	var v = !singles.is(':selected');
	all.each(function(i,x){ x.selected=v; }); }
    all_selected = all.is(':selected');
    return true; }

$(document).ready(function(){
	all_selected = $('#select_chapters option:eq(0)').is(':selected');
	//$("input[name='t']").click(function(){ $('#select_chapters').removeAttr('disabled'); });
	//$("input[name='t'][value='bibitem']").click(function(){ $('#select_chapters').attr('disabled','disabled'); });
    });
