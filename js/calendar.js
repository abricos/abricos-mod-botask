/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	yahoo:['calendar'],
	mod:[
		{name: 'sys', files: ['container.js', 'editor.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'botask', files: ['lib.js', 'roles.js']}
	]
};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template,
		API = NS.API;
	
	var YDate = YAHOO.widget.DateMath;

	NS.getDate = function(){ return new Date(); };
	NS.isCurrentDay = function(date){
		return YDate.clearTime(date).getTime() == YDate.clearTime(NS.getDate()).getTime(); 
	};

	var lz = function(num){
		var snum = num+'';
		return snum.length == 1 ? '0'+snum : snum; 
	};
	
	var TZ_OFFSET = NS.getDate().getTimezoneOffset(); 
	
	NS.dateToServer = function(date){
		var tz = TZ_OFFSET*60*1000;
		return (date.getTime()-tz)/1000; 
	};
	NS.dateToClient = function(unix){
		unix = unix * 1;
		var tz = TZ_OFFSET*60;
		return new Date((tz+unix)*1000);
	};
	
	NS.dateToTime = function(date){
		return lz(date.getHours())+':'+lz(date.getMinutes());
	};

	var DPOINT = '.';
	NS.dateToString = function(date){
		if (L.isNull(date)){ return ''; }
		var day = date.getDate();
		var month = date.getMonth()+1;
		var year = date.getFullYear();
		return lz(day)+DPOINT+lz(month)+DPOINT+year;
	};
	NS.stringToDate = function(str){
		str = str.replace(/,/g, '.').replace(/\//g, '.');
		var aD = str.split(DPOINT);
		if (aD.length != 3){ return null; }
		var day = aD[0]*1, month = aD[1]*1-1, year = aD[2]*1;
		if (day > 31 || day < 0){ return null; }
		if (month > 11 || month < 0) { return null; }
		return new Date(year, month, day);
	};
	
	NS.dateToKey = function(date){
		date = new Date(date.getTime());
		var d = new Date(date.setHours(0,0,0,0));
		var tz = TZ_OFFSET*60*1000;
		var key = (d.getTime()-tz)/YDate.ONE_DAY_MS ; 
		return key;
	};
	
	NS.calendarLocalize = function(cal){
		var cfg = cal.cfg;
		
		var lng = Brick.util.Language.getc('mod.botask.calendar');
		
		var dict = [];
		for (var i=1; i<=12; i++){
			dict[dict.length] = lng['month'][i]; 
		}
		cfg.setProperty("MONTHS_LONG", dict);

		dict = [];
		for (var i=0; i<7; i++){
			dict[dict.length] = lng['week']['short'][i]; 
		}
		cfg.setProperty("WEEKDAYS_SHORT", dict);
	};
	
	
	var dialog = null,
		elementParent = null;

	var dialogHide = function(){
		dialog.hide();
		dialog.destroy();
		dialog = null;
		elementParent = null;
	};
	
	E.on(document, "click", function(e) {
		var el = E.getTarget(e);
		if (el == elementParent || L.isNull(dialog)){ return; }
		
		var dialogEl = dialog.element;
		
		if (Dom.isAncestor(dialogEl, el)){ return; }
		dialogHide();
	});

	NS.showCalendar = function(elInput, callback){
		if (!L.isNull(dialog)){ return; }
		
		elementParent = elInput;
		
		dialog = new YAHOO.widget.Overlay(Dom.generateId(), {context: [elInput.id, "tl", "bl"], visible: true });
		dialog.setBody("&#32;");
		dialog.body.id = Dom.generateId();
		dialog.render(document.body);

		var oCalendar = new YAHOO.widget.Calendar(Dom.generateId(), dialog.body.id);
		NS.calendarLocalize(oCalendar);
		
		var date = NS.stringToDate(elInput.value);
		if (!L.isNull(date)){
			oCalendar.select(date);
			oCalendar.cfg.setProperty("pagedate", (date.getMonth()+1) + "/" + date.getFullYear());
		}

		oCalendar.render();
		
		oCalendar.selectEvent.subscribe(function() {
			if (oCalendar.getSelectedDates().length > 0) {
				var selDate = oCalendar.getSelectedDates()[0];
				if (L.isFunction(callback)){
					callback(selDate);
				}
				dialogHide();
			}
		});
	};
};