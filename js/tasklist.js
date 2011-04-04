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
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
			
			var tman = NS.taskManager;
			if (ptaskid == 0){
				this.list = tman.list;
			}else{
				var task = tman.list.find(ptaskid);
				this.list = task.childs;
			}
			
			this.expanded = {};
			
			this.render();
			
			// Подписаться на событие изменений в задачах
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
			NS.taskManager.newTaskReadEvent.subscribe(this.onNewTaskRead, this, true);
		},
		buildNewInfo: function(){
			var tnew = {};
			this.list.foreach(function(tk){
				if (tk.isNew){
					tnew[tk.id] = tnew[tk.id] || {};
					tnew[tk.id]['n'] = true;
					if (!L.isNull(tk.parent)){
						tnew[tk.parent.id] = tnew[tk.parent.id] || {};
						tnew[tk.parent.id]['cn'] = true;
					}
				}
			});
			this.tnew = tnew;
		},
		buildRow: function(tk, level){
			level = level || 0;
			var TM = this._TM, ddl = "";
			if (!L.isNull(tk.deadline)){
				ddl = Brick.dateExt.convert(tk.deadline.getTime()/1000, 0, !tk.ddlTime);
			}
			
			var author = NS.taskManager.users[tk.userid];
			
			var chcls = tk.childs.count() > 0 ? '' : 'nochild';
			if (this.expanded[tk.id]){
				chcls = 'expanded';
			}
			var tnew = this.tnew[tk.id] || {};
			var sRow = TM.replace('row', {
				'id': tk.id,
				'tnew': tnew['n'] ? 'tnew' : '',
				'tchnew': tnew['cn'] ? 'tchnew' : '',
				'level': level,
				'classch': chcls,
				'tl': tk.title,
				'aunm': UP.builder.getUserName(author),
				'auid': author.id,
				'ddl': ddl
			});
			
			if (tk.childs.count() > 0 && this.expanded[tk.id]){
				sRow += this.buildRows(tk.childs, level+1);
			}
			
			return sRow;
		},
		buildRows: function(list, level){
			level = level || 0;
			var lst = "", __self = this;
			list.foreach(function(tk){
				lst += __self.buildRow(tk, level);
			}, true);
			return lst;
		},
		render: function(){
			this.buildNewInfo();
			var TM = this._TM, 
				lst = this.buildRows(this.list);
			TM.getEl('list.table').innerHTML = TM.replace('table', {'rows': lst});			
		},
		onClick: function(el){
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				taskid = el.id.replace(prefix, "");
			
			var TId = this._TId;
			var tp = TId['row'];
			
			switch(prefix){
			case (tp['exp']+'-'): this.shChilds(taskid); return true;
			}

			return false;
		},
		shChilds: function(taskid){
			var task = NS.taskManager.getTask(taskid);
			if (L.isNull(task)){ return; }
			var TM = this._TM;
			
			var elRow = Dom.get(TM.getElId('row.id')+'-'+taskid);
			if (L.isNull(elRow)){ return; }
			if (task.childs.count() == 0){
				Dom.removeClass(elRow, 'expanded');
				Dom.addClass(elRow, 'nochild');
				return;
			}
			
			var exp = this.expanded;
			exp[taskid] = exp[taskid] || false;
			exp[taskid] = !exp[taskid];
			
			this.render();
		},
		destroy: function(){
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
			NS.taskManager.newTaskReadEvent.unsubscribe(this.onNewTaskRead);
		},
		_isHistoryChanged: function(list, ids){
			var exp = this.expanded, __self = this, find = false;
			list.foreach(function(tk){
				for (var id in ids){
					if (tk.id*1 == id*1){
						find=true;
						return true;
					}
				}
				if (tk.childs.count() > 0 && exp[tk.id]){
					if (__self._isHistoryChanged(tk.childs, ids)){
						find = true;
						return true;
					}
				}
			}, true);
			return find;
		},
		onHistoryChanged: function(type, args){
			this.render();
			/*
			var ids = {};
			args[0].foreach(function(item){
				ids[item.taskid] = true;
			});
			if (this._isHistoryChanged(this.list, ids)){
				this.render();
			}
			/**/
		},
		onNewTaskRead: function(type, args){
			this.render();
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