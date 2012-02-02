/*
@version $Id: ws.js 1285 2011-11-23 07:42:29Z roosit $
@package Abricos
@copyright Copyright (C) 2008-2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js']},
        {name: 'botask', files: ['lib.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var TMG = this.template,
		initCSS = false,
		buildTemplate = function(w, ts){
		if (!initCSS){
			Brick.util.CSS.update(Brick.util.CSS['{C#MODNAME}']['{C#COMNAME}']);
			delete Brick.util.CSS['{C#MODNAME}']['{C#COMNAME}'];
			initCSS = true;
		}
		w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;
	};
	
	var AboutWidget = function(container){
		this.init(container);
	};
	AboutWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'widget');
			container.innerHTML = this._TM.replace('widget');
		}
	};
	NS.AboutWidget = AboutWidget;
	
	var AboutPanel = function(){
		AboutPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px'
		});
	};
	YAHOO.extend(AboutPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel');
			return this._TM.replace('panel');
		},
		onLoad: function(){
			this.gmenu = new NS.GlobalMenuWidget(this._TM.getEl('panel.gmenu'), 'about');

			this.aboutWidget = new NS.AboutWidget(this._TM.getEl('panel.widget'));
		}
	});
	NS.AboutPanel = AboutPanel;
	
	var _activeAboutPanel = null;
	NS.API.showAboutPanel = function(){
		if (L.isNull(_activeAboutPanel) || _activeAboutPanel.isDestroy()){
			_activeAboutPanel = new AboutPanel();
		}
		return _activeAboutPanel;
	};
};