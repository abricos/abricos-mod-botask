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
        {name: 'botask', files: ['lib.js']}
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

	var UP = Brick.mod.uprofile;
	
	if (!NS.data){
		NS.data = new Brick.util.data.byid.DataSet('botask');
	}
	
	Brick.util.CSS.update(Brick.util.CSS['botask']['board']);
	
	var buildTemplate = function(w, templates){ w._TM = TMG.build(templates); w._T = w._TM.data; w._TId = w._TM.idManager; };
	
	var BoardWidget = function(container){
		this.init(container);
	};
	BoardWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'widget,empty,table,row,rowwait,child');
			container.innerHTML = this._TM.replace('widget');
			
			// E.on(container, 'mouseover', this.onMouseOver, this, true);
			// E.on(container, 'mouseout', this.onMouseOut, this, true);
			
			// this.cm = NS.CloudsManager.getInstance();
			this.onRender = new YAHOO.util.CustomEvent("onRender");
			
			if (!R.isWrite){
				this._TM.getEl('widget.bappend').style.display = 'none';
			}
			this.render();
		},
		getEl: function(key){
			return this._TM.getEl(key);
		},
		render: function(){
			var TM = this._TM;
			
			var tm = NS.taskManager;
			if (tm.list.count() < 1){
				TM.getEl('widget.table').innerHTML = TM.replace('empty');
				return;
			}
			var lst = "";
			tm.list.foreach(function(task){
				
				var lstChilds = "";
				for (var i=0; i < Math.min(task.childs.count(), 3); i++){
					var ctk = task.childs.getByIndex(i);
					lstChilds += TM.replace('child', {
						'id': ctk.id,
						'tl': ctk.title
					});
				}
			
				lst += TM.replace('row', {
					'id': task.id,
					'tl': task.title,
					'childs': lstChilds
				});
			}, true);
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': lst});
		},
		onClick: function(el){
			var TId = this._TId, tp = TId['widget'];
			switch(el.id){
			case TId['empty']['bappend']: 
			case tp['bappend']: this.taskEditorShow(0); return true;
			case tp['brefresh']: this.refresh(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, ''),
			numid = el.id.replace(prefix, "");
		
			tp = TId['row'];
			switch(prefix){
			case (tp['task']+'-'): this.taskListShow(numid); return true;
			}
			
			return false;
		},
		taskListShow: function(taskid){
			Brick.ff('botask', 'tasklist', function(){
				API.showTaskListPanel(taskid);
			});
		},
		taskEditorShow: function(taskid, groupkey){
			Brick.ff('botask', 'taskeditor', function(){
				API.showTaskEditorPanel(taskid, groupkey);
			});
		}
	};
	NS.BoardWidget = BoardWidget;

	var BoardPanel = function(frend){
		this.frend = frend;
		BoardPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px',
			overflow: false, 
			controlbox: 1
		});
	};
	YAHOO.extend(BoardPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel');
			return this._TM.replace('panel');
		},
		onLoad: function(){
			this.boardWidget = new BoardWidget(this.body);
			NS.data.request();
		},
		onClick: function(el){
			if (this.boardWidget.onClick(el)){ return true; }
			return false;
		},
		destroy: function(){
			this.boardWidget.destroy();
			BoardPanel.superclass.destroy.call(this);
		},
		onResize: function(rel){
			var el = this.boardWidget.getEl('widget.container');
			if (rel.height > 0){
				Dom.setStyle(el, 'height', (rel.height - 70)+'px');
			}
		}
	});
	NS.BoardPanel = BoardPanel;
	
	API.showBoardPanel = function(){
		NS.buildTaskManager(function(tm){
			new BoardPanel();
		});
	};

};