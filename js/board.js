/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['data.js', 'container.js']},
        {name: 'uprofile', files: ['viewer.js']},
        {name: 'botask', files: ['tasklist.js', 'history.js', 'lib.js']}
	]
};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template,
		API = NS.API,
		R = NS.roles;

	if (!NS.data){
		NS.data = new Brick.util.data.byid.DataSet('botask');
	}
	
	Brick.util.CSS.update(Brick.util.CSS['botask']['board']);
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};
	
	var BoardPanel = function(){
		BoardPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px',
			overflow: false, 
			controlbox: 1
		});
	};
	YAHOO.extend(BoardPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel,empty');
			return this._TM.replace('panel');
		},
		onLoad: function(){
			var TM = this._TM;
			
			this.gmenu = new NS.GlobalMenuWidget(TM.getEl('panel.gmenu'), 'task');
			this.history = new NS.HistoryWidget(TM.getEl('panel.history'));
			this.list = new NS.TaskListWidget(TM.getEl('panel.list'), 0);
		},
		destroy: function(){
			this.navigate.destroy();
			this.list.destroy();
			BoardPanel.superclass.destroy.call(this);
		}
	});
	NS.BoardPanel = BoardPanel;
	
	API.showBoardPanel = function(){
		NS.buildTaskManager(function(tm){
			new BoardPanel();
		});
	};
	
	API.showBoardPanelWebos = function(){
		Brick.Page.reload('/bos/#app=botask/board/showBoardPanel');
	};
};