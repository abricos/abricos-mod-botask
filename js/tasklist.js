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
	
	var LNG = Brick.util.Language.getc('mod.botask');

	Brick.util.CSS.update(Brick.util.CSS['botask']['tasklist']);	
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};
	
	var TaskStatus = NS.TaskStatus;
	
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
			
			E.on(container, 'mouseout', function(e){
				__self.onMouseOut(E.getTarget(e));
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
			NS.taskManager.taskUserChangedEvent.subscribe(this.onTaskUserChanged, this, true);
			
			this.vtMan = null;
			
			this._timeSelectedRow = 0;
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
			var n = tk.order;
			var sRow = TM.replace('row', {
				'id': tk.id,
				'prt': tk.priority,
				'ord': n != 0 ? ((n>0?'+':'')+n) : '&mdash;',
				'expired': tk.isExpired() ? 'expired' : '',
				'closed': tk.isClosed() ? 'closed' : '',
				'prts': LNG['priority'][tk.priority],
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
			
			if (this._timeSelectedRow*1 > 0){
				var __self = this,
					taskid = this._timeSelectedRow;
				
				this._timeSelectedRow = 0;
				var elRow = Dom.get(TM.getElId('row.id')+'-'+taskid);
				Dom.addClass(elRow, 'row-hover');
				setTimeout(function(){
					Dom.removeClass(elRow, 'row-hover');
				}, 500);
			}
		},
		_parseId: function(el){
			if (!el.id){ return null; }
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				taskid = el.id.replace(prefix, "");
			
			return [prefix, taskid];
		},
		onClick: function(el){
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				taskid = el.id.replace(prefix, "");
			
			var TId = this._TId;
			var tp = TId['row'];
			
			switch(prefix){
			case (tp['exp']+'-'): this.shChilds(taskid); return true;
			case (tp['up']+'-'): this.taskVoting(taskid, 1); return true;
			case (tp['down']+'-'): this.taskVoting(taskid, -1); return true;
			}

			return false;
		},
		onMouseOut: function(el){
			if (L.isNull(this.vtMan)){ return; }

			var psid = this._parseId(el);
			if (L.isNull(psid)){ return; }
			
			var prefix = psid[0], tp = this._TId['row'];
			if (!((tp['up']+'-') == prefix || (tp['down']+'-') == prefix)) { return; }
			
			var vtMan = this.vtMan, taskid = psid[1], __self = this;
			this.vtMan = null;
			if (vtMan.task.id*1 != taskid*1){ return; }
			
			this._isVotingProcess = true;
			var elList = this._TM.getEl('list.id');
			Dom.addClass(elList, 'voting-process');
			NS.taskManager.taskSetOrder(taskid, vtMan['n'], function(){
				__self._isVotingProcess = false;
				__self._timeSelectedRow = taskid;
				Dom.removeClass(elList, 'voting-process');
			});
		},
		taskVoting: function(taskid, inc){
			if (this._isVotingProcess){ return; }
			
			if (L.isNull(this.vtMan)){
				var task = NS.taskManager.getTask(taskid);
				this.vtMan = {'task': task, 'n': task.order};
			}
			var vtMan = this.vtMan;
			vtMan['n'] += inc;
			
			var elRow = Dom.get(this._TM.getElId('row.vot')+'-'+taskid);
			var n = vtMan['n'];
			
			elRow.innerHTML = n != 0 ? ((n>0?'+':'')+n) : '&mdash;';
			
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
			NS.taskManager.taskUserChangedEvent.unsubscribe(this.onTaskUserChanged);
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
		
		onTaskUserChanged: function(type, args){
			this.render();
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
			TaskListPanel.superclass.destroy.call(this);
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
			Dom.setStyle(gel('bsetexec'), 'display', 'none');
			Dom.setStyle(gel('bunsetexec'), 'display', 'none');
			Dom.setStyle(gel('bclose'), 'display', 'none');
			Dom.setStyle(gel('bclosens'), 'display', 'none');
			Dom.setStyle(gel('bopen'), 'display', 'none');

			// статус
			switch(task.status){
			case TaskStatus.OPEN:
			case TaskStatus.REOPEN:
				Dom.setStyle(gel('bsetexec'), 'display', '');
				Dom.setStyle(gel('bclosens'), 'display', '');
				break;
			case TaskStatus.ACCEPT:
				Dom.setStyle(gel('bclose'), 'display', '');
				Dom.setStyle(gel('bunsetexec'), 'display', '');
				break;
			case TaskStatus.CLOSE:
				Dom.setStyle(gel('bopen'), 'display', '');
				Dom.setStyle(gel('beditor'), 'display', 'none');
				Dom.setStyle(gel('bremove'), 'display', 'none');
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
				this.closeTask(); return true;
			case tp['beditor']: this.taskEditorShow(); return true;
			case tp['ptlisthide']: 
			case tp['ptlistshow']: 
				this.showHideChildTaskTable(); return true;
			
			}
			return false;
		},
		_shLoading: function(show){
			var TM = this._TM;
			Dom.setStyle(TM.getEl('panel.buttons'), 'display', show ? 'none' : '');
			Dom.setStyle(TM.getEl('panel.bloading'), 'display', show ? '' : 'none');
		},
		closeTask: function(){ // закрыть задачу
			var __self = this;
			this._shLoading(true);
			NS.taskManager.taskClose(this.task.id, function(){
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
	NS.TaskListPanel = TaskListPanel;
	
	API.showTaskListPanel = function(taskid){
		NS.buildTaskManager(function(tm){
			new TaskListPanel(taskid);
		});
	};

};