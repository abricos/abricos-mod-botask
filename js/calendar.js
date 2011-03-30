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
	
	var buildTemplate = function(w, templates){ w._TM = TMG.build(templates); w._T = w._TM.data; w._TId = w._TM.idManager; };
	
	var YDate = YAHOO.widget.DateMath;

	NS.isCurrentDay = function(date){
		return YDate.clearTime(date).getTime() == YDate.clearTime(NS.getDate()).getTime(); 
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
	
	var DateInputWidget = function(container, config){
		this.init(container, config);
	};
	DateInputWidget.prototype = {
		init: function(container, cfg){
			
			cfg = L.merge({
				'date': null,
				'showTime': false
			}, cfg || {});
			this.cfg = cfg;
		
			buildTemplate(this, 'input');
			container.innerHTML = this._TM.replace('input');
			var __self = this;
			E.on(container, 'click', function(e){
                var el = E.getTarget(e);
                if (__self.onClick(el)){ E.preventDefault(e); }
	        });
			
			if (!L.isNull(cfg.date)){
				this.setDate(cfg.date);
			}
		},
		getValue: function(){
			var ret = {'date': null, 'showTime': false };
			var date = NS.stringToDate(this._TM.getEl('input.date').value),
				st = this.cfg.showTime,
				time = NS.parseTime(this._TM.getEl('input.time').value);

			if (st && L.isNull(time)){ st = false; }
			if (L.isNull(date)){ return ret; }
			
			if (st){
				date.setHours(time[0]);
				date.setMinutes(time[1]);
			}
			return { 'date': date, 'showTime': st};
		},
		setDate: function(date){
			if (L.isNull(date)){
				this.clear();
				return;
			}
			
			var TM = this._TM,
				elTime = TM.getEl('input.time');
			
			TM.getEl('input.date').value = NS.dateToString(date);
			if (this.cfg.showTime){
				this.showTime();
				elTime.value = NS.timeToString(date);
			}else{
				elTime.value = "";
				this.hideTime();
			}
		},
		onClick: function(el){
			var tp = this._TId['input'];
			switch(el.id){
			case tp['date']: this.showCalendar(); return true;
			case tp['clear']: this.clear(); return true;
			case tp['timeshow']: this.showTime(); return true;
			case tp['timehide']: this.hideTime(); return true;
			}
			return false;
		},
		showCalendar: function(){
			__self = this;
			NS.showCalendar(this._TM.getEl('input.date'), function(dt){
				__self.setDate(dt);
			});
		},
		showTime: function(){ this._shTime(false); },
		hideTime: function(){ this._shTime(true); },
		_shTime: function(hide){
			var TM = this._TM, hide = hide || false;
			this.cfg.showTime = !hide;
			var txtTime = TM.getEl('input.time');
			if (!hide && txtTime.value.length == 0){
				txtTime.value = "12:00";
			}
			Dom.setStyle(txtTime, 'display', !hide ? '' : 'none');
			Dom.setStyle(TM.getEl('input.timeshow'), 'display', hide ? '' : 'none');
			Dom.setStyle(TM.getEl('input.timehide'), 'display', !hide ? '' : 'none');
		},
		clear: function(){
			var TM = this._TM;
			TM.getEl('input.date').value = "";
			TM.getEl('input.time').value = "";
		}
	};
	
	NS.DateInputWidget = DateInputWidget;
};