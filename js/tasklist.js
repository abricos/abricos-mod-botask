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
        {name: 'uprofile', files: ['users.js']},
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
	
	Brick.util.CSS.update(Brick.util.CSS['botask']['tasklist']);	
	
	var buildTemplate = function(w, templates){var TM = TMG.build(templates), T = TM.data, TId = TM.idManager; w._TM = TM; w._T = T; w._TId = TId; };
	
	var TaskListPanel = function(taskid){
		
		this.task = NS.taskManager.getTask(taskid);
		
		TaskListPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px',
			overflow: false, 
			controlbox: 1
		});
	};
	YAHOO.extend(TaskListPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel,table,row');
			

			var task = this.task;
			return this._TM.replace('panel', {
				'id': task.id,
				'tl': task.title
			});
		},
		onLoad: function(){
			var task = this.task,
				lst = "",
				TM = this._TM;
			
			this.navigate = new NS.TaskNavigateWidget(TM.getEl('panel.nav'), task);
			
			// исполнитель
			var eUser = NS.taskManager.users[task.userid];
			this.execUsers = new UP.UserBlockWidget(TM.getEl('panel.execuser'), eUser, {
				'info': Brick.dateExt.convert(task.date.getTime()/1000, 0, false)
			});

			task.childs.foreach(function(tk){

				var ddl = "";
				if (!L.isNull(tk.deadline)){
					ddl = Brick.dateExt.convert(tk.deadline.getTime()/1000, 0, !tk.ddlTime);
				}
				
				var author = NS.taskManager.users[tk.userid];

				lst += TM.replace('row', {
					'id': tk.id,
					'tl': tk.title,
					'aunm': UP.builder.getUserName(author),
					'auid': author.id,
					'ddl': ddl
				});
			}, true);
			TM.getEl('panel.ptlist').innerHTML = TM.replace('table', {'rows': lst});
			
			NS.taskManager.loadTask(task.id, function(task){
				if (L.isNull(task)){ return; }
				TM.getEl('panel.taskbody').innerHTML = task.descript;
			});
			
		},
		onClick: function(el){
			var tp = this._TId['panel'];
			switch(el.id){
			case tp['beditor']: this.taskEditorShow(); return true;
			case tp['ptlistsh']: this.showHideChildTaskTable(); return true;
			
			}
			return false;
		},
		showHideChildTaskTable: function(){
			var el = this._TM.getEl('panel.ptlist');
			var view = Dom.getStyle(el, 'display');
			Dom.setStyle(el, 'display', view != 'none' ? 'none' : '')
		},
		taskEditorShow: function(){
			var taskid = this.task.id;
			Brick.ff('botask', 'taskeditor', function(){
				API.showTaskEditorPanel(taskid);
			});
		},
		onResize: function(rel){
			/*
			var el = this.taskListWidget.getEl('widget.container');
			if (rel.height > 0){
				Dom.setStyle(el, 'height', (rel.height - 70)+'px');
			}
			/**/
		}
	});
	NS.TaskListPanel = TaskListPanel;
	
	API.showTaskListPanel = function(taskid){
		NS.buildTaskManager(function(tm){
			new TaskListPanel(taskid);
			/*
			tm.loadTask(taskid, function(task){
				if (L.isNull(task)){ return; }
			});
			/**/
		});
	};

};