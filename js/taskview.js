/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'botask', files: ['tasklist.js']}
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
	
	var LNG = Brick.util.Language.getc('mod.botask');

	Brick.util.CSS.update(Brick.util.CSS['botask']['taskview']);	
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};
	
	var TST = NS.TaskStatus;
	
	var TaskViewPanel = function(taskid){
		
		this.task = NS.taskManager.getTask(taskid);
		
		TaskViewPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px',
			overflow: false, 
			controlbox: 1
		});
	};
	YAHOO.extend(TaskViewPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel,user');
			
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
			if (!L.isNull(this.history)){
				this.history.destroy();
			}
			
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
			TaskViewPanel.superclass.destroy.call(this);
		},
		onHistoryChanged: function(type, args){
			var history = args[0];

			var task = this.task, isRTask = false;
			history.foreach(function(item){
				if (item.taskid == task.id){
					isRTask = true;
					return true;
				}
			});
			if (isRTask){
				this.renderTask();
			}
		},
		renderTask: function(){
			var TM = this._TM, task = this.task;
			var gel = function(nm){
				return TM.getEl('panel.'+nm);
			};
			
			gel('taskbody').innerHTML = task.descript;
			if (L.isNull(this.history)){
				this.history = new NS.HistoryWidget(gel('history'), task.history, {'taskid': task.id});
			}

			var elColInfo = gel('colinfo');
			for (var i=1;i<=5;i++){
				Dom.removeClass(elColInfo, 'priority'+i);
				Dom.removeClass(elColInfo, 'status'+i);
			}
			Dom.addClass(elColInfo, 'priority'+task.priority);
			Dom.addClass(elColInfo, 'status'+task.status);

			// Статус
			gel('status').innerHTML = LNG['status'][task.status];
			
			// Приоритет
			gel('priority').innerHTML = LNG['priority'][task.priority];

			// Автор
			var user = NS.taskManager.users[task.userid];
			gel('author').innerHTML = TM.replace('user', {
				'uid': user.id, 'unm': UP.builder.getUserName(user)
			});
			// Создана
			gel('dl').innerHTML = Brick.dateExt.convert(task.date, 3, true);
			gel('dlt').innerHTML = Brick.dateExt.convert(task.date, 4);

			// Исполнитель
			var s = "";
			if (task.stUserId*1 > 0){
				user = NS.taskManager.users[task.stUserId];
				s = TM.replace('user', {
					'uid': user.id, 'unm': UP.builder.getUserName(user)
				});
			}
			gel('exec').innerHTML = s;
			
			// Участники
			var lst = "";
			for (var i=0;i<task.users.length;i++){
				user = NS.taskManager.users[task.users[i]];
				lst += TM.replace('user', {
					'uid': user.id, 'unm': UP.builder.getUserName(user)
				});
			}
			gel('users').innerHTML = lst;

			var sddl = "", sddlt = "";
			// срок исполнения
			if (!L.isNull(task.deadline)){
				sddl = Brick.dateExt.convert(task.deadline, 3, true);
				if (task.ddlTime){
					sddlt = Brick.dateExt.convert(task.deadline, 4);
				}
			}
			gel('ddl').innerHTML = sddl;
			gel('ddlt').innerHTML = sddlt;

			// закрыть все кнопки, открыть те, что соответсуют статусу задачи
			TM.elHide('panel.bsetexec,bunsetexec,bclose,bclosens,bopen,beditor,bremove')

			// статус
			switch(task.status){
			case TST.OPEN:
			case TST.REOPEN:
				TM.elShow('panel.bsetexec,bclosens,beditor,bremove')
				break;
			case TST.ACCEPT:
				TM.elShow('panel.bclose,bunsetexec,beditor,bremove');
				break;
			case TST.CLOSE:
				TM.elShow('panel.bopen');
				break;
			case TST.REMOVE:
				TM.elShow('panel.bopen');
				break;
			}
		},
		onClick: function(el){
			var tp = this._TId['panel'];
			switch(el.id){
			case tp['bsetexec']: this.setExecTask(); return true;
			case tp['bunsetexec']: this.unsetExecTask(); return true;
			
			case tp['bclose']: 
			case tp['bclosens']: 
				this.taskClose(); return true;
			case tp['bcloseno']: this.taskCloseCancel(); return true;
			case tp['bcloseyes']: this.taskCloseMethod(); return true;

			case tp['bremove']: 
				this.taskRemove(); return true;
			case tp['bremoveno']: this.taskRemoveCancel(); return true;
			case tp['bremoveyes']: this.taskRemoveMethod(); return true;

			case tp['bopen']:  this.taskOpen(); return true;
			case tp['beditor']: this.taskEditorShow(); return true;
			
			case tp['ptlisthide']: 
			case tp['ptlistshow']: 
				this.showHideChildTaskTable(); return true;
			
			}
			return false;
		},
		_shLoading: function(show){
			var TM = this._TM;
			TM.elShowHide('panel.buttons', !show);
			TM.elShowHide('panel.bloading', show);
		},
		
		taskRemoveCancel: function(){
			var TM = this._TM;
			TM.elShow('panel.manbuttons');
			TM.elHide('panel.dialogremove');
		},
		taskRemove: function(){
			var TM = this._TM;
			TM.elHide('panel.manbuttons');
			TM.elShow('panel.dialogremove');
		},
		taskRemoveMethod: function(){
			this.taskRemoveCancel();
			var __self = this;
			this._shLoading(true);
			NS.taskManager.taskRemove(this.task.id, function(){
				__self._shLoading(false);
			});
		},
		
		taskCloseCancel: function(){
			var TM = this._TM;
			TM.elShow('panel.manbuttons');
			TM.elHide('panel.dialogclose');
		},
		taskClose: function(){ // закрыть задачу
			if (!NS.taskManager.checkTaskOpenChilds(this.task.id)){
				this.taskCloseMethod();
				retur;
			}
			var TM = this._TM;
			TM.elHide('panel.manbuttons');
			TM.elShow('panel.dialogclose');
		},
		taskCloseMethod: function(){
			this.taskCloseCancel();
			var __self = this;
			this._shLoading(true);
			NS.taskManager.taskClose(this.task.id, function(){
				__self._shLoading(false);
			});
		},
		taskOpen: function(){ // открыть задачу повторно
			var __self = this;
			this._shLoading(true);
			NS.taskManager.taskOpen(this.task.id, function(){
				__self._shLoading(false);
			});
		},
		setExecTask: function(){ // принять задачу в работу 
			var __self = this;
			this._shLoading(true);
			NS.taskManager.taskSetExec(this.task.id, function(){
				__self._shLoading(false);
			});
		},
		unsetExecTask: function(){ // отказаться от выполнения данной задачи
			var __self = this;
			this._shLoading(true);
			NS.taskManager.taskUnsetExec(this.task.id, function(){
				__self._shLoading(false);
			});
		},
		showHideChildTaskTable: function(){
			var TM = this._TM, el = TM.getEl('panel.ptlist');
			var view = Dom.getStyle(el, 'display');
			Dom.setStyle(el, 'display', view != 'none' ? 'none' : '')
			Dom.setStyle(TM.getEl('panel.ptlisthide'), 'display', view != 'none' ? 'none' : '')
			Dom.setStyle(TM.getEl('panel.ptlistshow'), 'display', view != 'none' ? '' : 'none')
		},
		taskEditorShow: function(){
			var taskid = this.task.id;
			Brick.ff('botask', 'taskeditor', function(){
				API.showTaskEditorPanel(taskid);
			});
		}
	});
	NS.TaskViewPanel = TaskViewPanel;
	
	API.showTaskViewPanel = function(taskid){
		NS.buildTaskManager(function(tm){
			new TaskViewPanel(taskid);
		});
	};

};