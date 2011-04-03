/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'botask', files: ['history.js', 'lib.js']}
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

	Brick.util.CSS.update(Brick.util.CSS['botask']['tasklist']);	
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};
	
	var TaskListWidget = function(container, ptaskid){
		this.init(container, ptaskid);
	};
	TaskListWidget.prototype = {
		init: function(container, ptaskid){
			this.ptaskid = ptaskid = ptaskid || 0;
			
			buildTemplate(this, 'list,table,row');
			container.innerHTML = this._TM.replace('list');
			
			var __self = this;
			E.on(container, 'click', function(e){
                var el = E.getTarget(e);
                if (__self.onClick(el)){ E.preventDefault(e); }
			});
			
			var tman = NS.taskManager;
			if (ptaskid == 0){
				this.list = tman.list;
			}else{
				var task = tman.list.find(ptaskid);
				this.list = task.childs;
			}
			
			this.render();
			
			// Подписаться на событие изменений в задачах
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);

		},
		render: function(){
			var TM = this._TM, lst = "";
			this.list.foreach(function(tk){

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
			TM.getEl('list.table').innerHTML = TM.replace('table', {'rows': lst});			
		},
		onClick: function(el){
			
			return false;
		},
		destroy: function(){
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
		},
		onHistoryChanged: function(type, args){
			var history = args[0],
				list = this.list, isRChild = false;
			history.foreach(function(item){
				if (list.find(item.taskid, true)){
					isRChild = true;
					return true;
				}
			});
			if (isRChild){
				this.render();
			}
		}
	};
	NS.TaskListWidget = TaskListWidget;
	
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
			buildTemplate(this, 'panel');
			
			var task = this.task;
			return this._TM.replace('panel', {
				'id': task.id,
				'tl': task.title
			});
		},
		onLoad: function(){
			var task = this.task,
				TM = this._TM,
				__self = this;
			
			this.history = null;
			this.navigate = new NS.TaskNavigateWidget(TM.getEl('panel.nav'), task);
			
			// исполнитель
			var eUser = NS.taskManager.users[task.userid];
			this.execUsers = new UP.UserBlockWidget(TM.getEl('panel.execuser'), eUser, {
				'info': Brick.dateExt.convert(task.date.getTime()/1000, 0, false)
			});
			
			// подзадачи
			this.childs = new NS.TaskListWidget(TM.getEl('panel.ptlist'), task.id);
			
			// Подписаться на событие изменений в задачах
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
			
			// запросить дополнительные данные по задаче (описание, история)
			NS.taskManager.taskLoad(task.id, function(){
				__self.renderTask();
			});
		},
		destroy: function(){
			this.navigate.destroy();
			this.childs.destroy();
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
			TaskListPanel.superclass.destroy.call(this);
		},
		onHistoryChanged: function(type, args){
			var history = args[0];
			// пришла новая история с сервера, необходимо ее просмотреть
			// и если это затронуло задачи в этом виджите, то применить
			// эти изменения
			var task = this.task, isRTask = false;
			history.foreach(function(item){
				if (item.taskid == task.id){
					isRTask = true;
					return true;
				}
			});
			if (isRTask){
				var __self = this;
				NS.taskManager.taskLoad(task.id, function(){
					__self.renderTask();
				});
			}
		},
		renderTask: function(){
			var TM = this._TM, task = this.task;
			TM.getEl('panel.taskbody').innerHTML = task.descript;
			this.history = new NS.HistoryWidget(TM.getEl('panel.history'), task.history);
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
		});
	};

};