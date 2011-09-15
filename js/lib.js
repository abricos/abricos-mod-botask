/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = { 
	mod:[
        {name: 'uprofile', files: ['users.js']},
        {name: 'social', files: ['lib.js']},
        {name: 'botask', files: ['roles.js']}
	]		
};
Component.entryPoint = function(){

	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang,
		TMG = this.template,
		NS = this.namespace,
		API = NS.API,
		R = NS.roles;
	var SC = Brick.mod.social;

	Brick.util.CSS.update(Brick.util.CSS['botask']['lib']);
	delete Brick.util.CSS['botask']['lib'];
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};
	
	// дополнить эксперементальными функциями менеджер шаблонов
	var TMP = Brick.Template.Manager.prototype;
	TMP.elHide = function(els){ this.elShowHide(els, false); };
	TMP.elShow = function(els){ this.elShowHide(els, true); };
	TMP.elShowHide = function(els, show){
		if (L.isString(els)){
			var arr = els.split(','), tname = '';
			els = [];
			for (var i=0;i<arr.length;i++){
				var arr1 = arr[i].split('.');
				if (arr1.length == 2){
					tname = L.trim(arr1[0]);
					els[els.length] = L.trim(arr[i]);
				}
				els[els.length] = tname+'.'+L.trim(arr[i]);
			}
		}
		if (!L.isArray(els)){ return; }
		for (var i=0;i<els.length;i++){
			var el = this.getEl(els[i]);
			Dom.setStyle(el, 'display', show ? '' : 'none');
		}
	};
	
	var TaskStatus = {
		'OPEN'		: 1,	// открыта
		'REOPEN'	: 2,	// открыта повторно
		'CLOSE'		: 3,	// завершена
		'ACCEPT'	: 4,	// в работе
		'ASSIGN'	: 5,	// назначена
		'REMOVE'	: 6,	// удалена
		'ARHIVE'	: 7		// в архиве
	};
	NS.TaskStatus = TaskStatus;

	var Task = function(data){
		this.init(data);
	};
	Task.prototype = {
		init: function(d){
		
			d = L.merge({
				'id': 0,
				'tl': '',
				'dl': 0,
				'uid': Brick.env.user.id,
				'users': [Brick.env.user.id],
				'ddl': 0,
				'ddlt': 0,
				'prt': 3
			}, d || {});
			
			this.update(d);
			this.childs = new TaskList();	// подзадачи
			this.parent = null; 			// родительская задача
			
			this.history = null;
			this.checks = null;				// чек-лист
			this.files = [];
			
			// была ли загрузка оставшихся данных (описание задачи, история изменений)?
			this.isLoad = false;

			// описание задачи
			this.descript = '';
		},
		update: function(d){
			this.id = d['id']*1;				// идентификатор
			this.title = d['tl'];				// заголовок
			this.userid = d['uid'];				// идентификатор автора
			this.date = NS.dateToClient(d['dl']); // Дата создания задачи
			
			this.deadline = NS.dateToClient(d['ddl']); // Срок исполнения
			this.ddlTime = d['ddlt']*1 > 0;		// уточнено ли время?
			
			this.users = d['users'];			// участники задачи
			this.parentTaskId = d['pid']*1;		// идентификатор родителя
			
			this.status = d['st']*1;
			this.pstatus = d['pst']*1;
			this.stUserId = d['stuid'];
			this.stDate = NS.dateToClient(d['stdl']);
			
			this.priority = d['prt']*1;
			this.order = d['o']*1;
			this.favorite = d['f']*1>0;
			this.expanded = d['e']*1>0;
			this.showcmt = d['c']*1>0;
			
			this.work = null;
			
			this._updateFlagNew(d);
		},
		setData: function(d){
			this.isLoad = true;
			this.descript = d['bd'];
			this.ctid = d['ctid'];
			this.checks = d['chlst'];
			this.files = d['files'];
			this.update(d);
		},
		_updateFlagNew: function(d){
			this.isNew = d['n']*1 > 0;
			if (Brick.env.user.id*1 == this.userid*1){
				this.isNew = false;
			}
		},
		addHItem: function(hst){
			if (L.isNull(this.history)){
				this.history = new History();
			}
			this.history.add(hst);
		},
		
		isExpired: function(){
			var ddl = this.deadline;
			if (L.isNull(ddl)){ return false; }
			return ddl.getTime() < (new Date()).getTime();
		},

		isClosed: function(){
			return this.status*1 == NS.TaskStatus.CLOSE;
		},
		
		isRemoved: function(){
			return this.status*1 == NS.TaskStatus.REMOVE;
		},
		
		isArhive: function(){
			return this.status*1 == NS.TaskStatus.ARHIVE;
		},

		toString: function(){
			return "'"+this.title+"', Child: "+this.childs.count();
		}
	};
	NS.Task = Task;
	
	var sortDate = function(d1, d2){ // Дата в порядке убывания
		var v1 = d1.getTime(), v2 = d2.getTime();
		if (v1 > v2){ return 1; }
		if (v1 < v2){ return -1; }
		return 0;
	};
	var sortDateDesc = function(d1, d2){ return sortDate(d2, d1); };
	
	var sortPriority = function(tk1, tk2){
		var v1 = tk1.priority, v2 = tk2.priority;
		if (v1 > v2){ return 1; }
		if (v1 < v2){ return -1; }
		return 0;
	};
	
	var sortClosed = function(tk1, tk2){
		var v1 = tk1.isClosed() ? 1 : 0,
			v2 = tk2.isClosed() ? 1 : 0;
		
		if (v1 > v2){ return 1; }
		if (v1 < v2){ return -1; }
		return 0;
	};
	
	var sortOrder = function(tk1, tk2){
		if (tk1.order < tk2.order){ return 1;}
		if (tk1.order > tk2.order){ return -1;}
		return 0;
	};
	
	var sortDeadline = function(tk1, tk2){
		var t1 = L.isNull(tk1.deadline) || tk1.isClosed() ? 9999999999999 : tk1.deadline.getTime();
		var t2 = L.isNull(tk2.deadline) || tk2.isClosed() ? 9999999999999 : tk2.deadline.getTime();

		if (t1 < t2) { return -1;}
		if (t1 > t2) { return 1; }
		return 0;
	};
	
	var sortFavorite = function(tk1, tk2){
		var v1 = tk1.favorite ? 1 : 0, v2 = tk2.favorite ? 1 : 0;
		
		if (v1 < v2){ return 1; }
		if (v1 > v2){ return -1; }
		return 0;
	};
	
	var sortDCPD = function(tk1, tk2){
		var v = sortDeadline(tk1, tk2);
		if (v != 0){ return v; }
		
		v = sortPriority(tk1, tk2); if (v != 0){ return v; }
		v = sortOrder(tk1, tk2); if (v != 0){ return v; }
		
		var isClosed = tk1.isClosed() && tk2.isClosed();
		
		if (!isClosed){
			return sortPriority(tk1, tk2);
		}
		v = sortDate(tk1.date, tk2.date); if (v != 0){ return v; }
		
		return sortDate(tk1.stDate, tk2.stDate);
	};
	
	NS.taskSort = {
	 	'default': function(tk1, tk2){ // сортировка: Наименьший срок, наивысший приоритет
			var v = sortClosed(tk1, tk2);
			if (v != 0){ return v; }

			return sortDCPD(tk1, tk2);
		},
		'deadline': function(tk1, tk2){ return NS.taskSort['default'](tk1, tk2); },
		'deadlinedesc': function(tk1, tk2){ return NS.taskSort['deadline'](tk2, tk1); },
		'name': function(tk1, tk2){
			if (tk1.title == tk2.title){ return 0; }
			return (tk1.title < tk2.title) ? -1 : 1;
		},
		'namedesc': function(tk1, tk2){return NS.taskSort['name'](tk2, tk1);},
		'priority': function(tk1, tk2){

			var v = sortClosed(tk1, tk2);
			if (v != 0){ return v; }

			var v1 = tk1.priority, v2 = tk2.priority;
			if (v1 < v2){ return -1; }
			if (v1 > v2){ return 1; }

			return 0;
		},
		'prioritydesc': function(tk2, tk1){ 
			var v = sortClosed(tk2, tk1);
			if (v != 0){ return v; }

			var v1 = tk1.priority, v2 = tk2.priority;
			if (v1 < v2){ return -1; }
			if (v1 > v2){ return 1; }
			return 0;
		},
		'favorite': function(tk1, tk2){
			var v = sortClosed(tk1, tk2); if (v != 0){ return v; }
			v = sortFavorite(tk1, tk2); if (v != 0){ return v; }
			return sortDCPD(tk1, tk2);
		},
		'favoritedesc': function(tk1, tk2){ 
			var v = sortClosed(tk1, tk2); if (v != 0){ return v; }
			v = sortFavorite(tk2, tk1); if (v != 0){ return v; }
			return sortDCPD(tk2, tk1);
		},
		'voting': function(tk1, tk2){ 
			var v = sortClosed(tk1, tk2); if (v != 0){ return v; }
			v = sortOrder(tk1, tk2); if (v != 0){ return v; }
			return sortDCPD(tk1, tk2);
		},
		'votingdesc': function(tk1, tk2){ 
			var v = sortClosed(tk1, tk2); if (v != 0){ return v; }
			v = sortOrder(tk2, tk1); if (v != 0){ return v; }
			return sortDCPD(tk2, tk1);
		}
	};
	
	var TaskList = function(){
		TaskList.superclass.constructor.call(this);
	};
	YAHOO.extend(TaskList, SC.SocialItemList, {
		
		// пробег по всем элементам, включая дочерний - если nochild==false 
		foreach: function(f, nochild, sortMethod, desc){
			if (!L.isFunction(f)){ return; }
			nochild = nochild || false;
			if (L.isString(sortMethod)){
				if (desc){ sortMethod += 'desc'; }
				sortMethod = NS.taskSort[sortMethod];
			}
			if (!L.isFunction(sortMethod)){
				sortMethod = NS.taskSort['default'];
			}
			
			var lst = this._list;
			
			if (L.isFunction(sortMethod)){
				lst = lst.sort(sortMethod);				
			}
			
			var task;
			for (var i=0;i<lst.length;i++){
				task = lst[i];
				if (f(task)){ break; };
				if (!nochild){
					task.childs.foreach(f);
				}
			}
		},
		
		// поиск задачи. если nochild=false, то поиск так же в подзадачах 
		find: function(taskid, nochild){
			var find = null;
			this.foreach(function(task){
				if (taskid*1 == task.id*1){
					find = task;
					return true;
				}
			}, nochild);
			return find;
		},
		
		exist: function(taskid){ 
			return !L.isNull(this.find(taskid, true)); 
		}
	});
	NS.TaskList = TaskList;
	

	var HItem = function(di){
		HItem.superclass.constructor.call(this, di);
	};
	YAHOO.extend(HItem, SC.HistoryItem, {
		init: function(d){
			HItem.superclass.init.call(this, d);
		
			this.taskid = d['tid']*1;	// идентификатор задачи
			
			this.socid = this.taskid;  

			
			this.taskTitle = d['ttl'];
			
			this.isTitle = d['tlc']*1 > 0;
			this.isDescript = d['bdc']*1 > 0;
			this.isDeadline = d['ddlc']*1 > 0;
			this.isDdlTime = d['ddltc']*1 > 0;
			this.isParent = d['ptidc']*1 > 0;
			
			this.isStatus = d['st']*1 != d['pst']*1;
			this.stUserId = d['stuid']*1;
			this.status = d['st']*1;
			this.pstatus = d['pst']*1;
		}
	});

	// история может быт в трех состояниях:
	// не загружена вовсе, загружена частично (только параметры - что изменено), 
	// загружена полностью (параметры + сами данные из истории)
	var History = function(data){
		History.superclass.constructor.call(this, data);
	};
	YAHOO.extend(History, SC.History, {
		itemInstance: function(di){
			return new HItem(di);
		}
	});
	
	var UserConfig = function(d){
		this.init(d);
	};
	UserConfig.prototype = {
		init: function(d){
			this.update(d);
		},
		update: function(d){
			d = L.merge({
				'tasksort': 'deadline',
				'tasksortdesc': false,
				'taskviewchild': true,
				'taskviewcmts': true
			}, d || {});
			
			this.tasksort = NS.taskSort[d['tasksort']] ? d['tasksort'] : 'deadline';
			this.tasksortdesc = d['tasksortdesc']*1 > 0;
			this.taskviewchild = d['taskviewchild']*1 > 0;
			this.taskviewcmts = d['taskviewcmts']*1 > 0;
		},
		toAjax: function(){
			return {
				'tasksort': NS.taskSort[this.tasksort] ? this.tasksort : 'deadline',
				'tasksortdesc': this.tasksortdesc ? 1 : 0,
				'taskviewchild': this.taskviewchild ? 1 : 0,
				'taskviewcmts': this.taskviewcmts ? 1 : 0
			};
		}
	};
	
	var TaskManager = function(initData){
		TaskManager.superclass.constructor.call(this, 'botask', initData);
	};
	YAHOO.extend(TaskManager, SC.SocialManager, {
		init: function(modname, initData){
			TaskManager.superclass.init.call(this, modname, initData);
			
			// событие, когда прочитали новую задачу
			this.newTaskReadEvent = new YAHOO.util.CustomEvent("newTaskReadEvent");
			
			// события внесения изменений пользователя в задачу (добавление в избранное, голосование и т.п.) 
			this.taskUserChangedEvent = new YAHOO.util.CustomEvent("taskUserChangedEvent");
			
		},
		
		initUserConfig: function(d){ return new UserConfig(d); },
		initHistory: function(){ return new History(); },

		initSocialList: function(data){ return new TaskList(); },
		socialUpdate: function(data){
			
			// обновить данные по задачам: новые - создать, существующие - обновить
			var objs = {};
			for (var id in data){
				var di = data[id];
				var task = this.list.find(id); 
				if (L.isNull(task)){ // новая задача
					task = new Task(di);
				}else{
					task.update(di);
				}
				objs[id] = task;
			}
			
			// не тронутые обновлением задачи
			this.list.foreach(function(task){
				if (!objs[task.id]){
					objs[task.id]= task;
				}
			});

			// очистить информацию для древовидной структуры
			for (var id in objs){
				objs[id].parent = null;
				objs[id].childs.clear();
			}

			// заполнить древовидную структуру
			for (var id in objs){
				var task = objs[id],
					ptask = objs[task.parentTaskId];
				
				if (task.parentTaskId*1 > 0 && ptask){
					task.parent = ptask;
					ptask.childs.add(task);
				}
			}

			// все те, что не содержат родителя поместить в корень списка
			this.list.clear();
			for (var id in objs){
				if (L.isNull(objs[id].parent)){
					this.list.add(objs[id]);
				}
			}
		},
		

		/************************* OLD **********************/
		getTask: function(taskid){
			return this.list.find(taskid);
		},
		
		taskFavorite: function(taskid, callback){
			var task = this.list.find(taskid);
			callback = callback || function(){};
			var __self = this;
			this.ajax({'do': 'taskfavorite', 'taskid': taskid, 'val': (!task.favorite ? '1' : '0')}, function(r){
				callback();
				if (L.isNull(r)){ return; }
				task.favorite = r*1>0;
				__self.taskUserChangedEvent.fire(task);
			});
		},
		
		taskShowComments: function(taskid, callback){
			var task = this.list.find(taskid);
			callback = callback || function(){};
			var __self = this;
			this.ajax({'do': 'taskshowcmt', 'taskid': taskid, 'val': (!task.showcmt ? '1' : '0')}, function(r){
				callback();
				if (L.isNull(r)){ return; }
				task.showcmt = r*1>0;
				// __self.taskUserChangedEvent.fire(task);
			});
		},
		
		taskExpand: function(taskid, callback){
			var task = this.list.find(taskid);
			callback = callback || function(){};
			var __self = this;
			this.ajax({'do': 'taskexpand', 'taskid': taskid, 'val': (!task.expanded ? '1' : '0')}, function(r){
				callback();
				if (L.isNull(r)){ return; }
				task.expanded = r*1>0;
				__self.taskUserChangedEvent.fire(task);
			});
		},
		
		taskSetOrder: function(taskid, value, callback){
			callback = callback || function(){};
			var __self = this;
			this.ajax({'do': 'taskvoting', 'taskid': taskid, 'val': value }, function(r){
				callback();
				if (L.isNull(r)){ return; }
				var task = NS.taskManager.list.find(taskid);
				task.order = r*1;
				__self.taskUserChangedEvent.fire(task);
			});
		},
		
		_taskAJAX: function(taskid, cmd, callback){
			callback = callback || function(){};
			var __self = this;
			this.ajax({'do': cmd, 'taskid': taskid }, function(r){
				__self._setLoadedTaskData(r);
				callback();
			});
		},
		_setLoadedTaskData: function(d){
			if (L.isNull(d)){ return; }
			var task = this.list.find(d['id']);
			if (L.isNull(task)){ return; }
			
			var isNew = task.isNew;
			task.setData(d);
			
			this.historyUpdate(d['hst']);
			
			if (isNew){
				this.newTaskReadEvent.fire(task);
			}
		},
		checkTaskOpenChilds: function(taskid){ // проверить, есть ли открытые подзадачи
			var task = this.list.find(taskid);
			if (L.isNull(task)){ return false; }
			var find = false;
			task.childs.foreach(function(tk){
				if (tk.status != TaskStatus.CLOSE){
					find = true;
					return true;
				}
			});
			return find;
		},
		taskRemove: function(taskid, callback){ // удалить задачу
			this._taskAJAX(taskid, 'taskremove', callback);
		},
		taskRestore: function(taskid, callback){ // восстановить удаленную задачу
			this._taskAJAX(taskid, 'taskrestore', callback);
		},
		taskClose: function(taskid, callback){ // закрыть задачу
			this._taskAJAX(taskid, 'taskclose', callback);
		},
		taskArhive: function(taskid, callback){ // Переместить задачу в архив
			this._taskAJAX(taskid, 'taskarhive', callback);
		},
		taskOpen: function(taskid, callback){ // открыть задачу повторно
			this._taskAJAX(taskid, 'taskopen', callback);
		},
		taskSetExec: function(taskid, callback){ // принять на исполнение
			this._taskAJAX(taskid, 'tasksetexec', callback);
		},
		taskUnsetExec: function(taskid, callback){ // отказаться от выполнения данной задачи
			this._taskAJAX(taskid, 'taskunsetexec', callback);
		},
		taskLoad: function(taskid, callback){
			callback = callback || function(){};
			var task = this.list.find(taskid);
	
			if (L.isNull(task) || task.isLoad){
				callback();
				return true;
			}
			this._taskAJAX(taskid, 'task', callback);
		},
		
		checkListSave: function(taskid, checkList, callback){
			callback = callback || function(){};
			var __self = this;
			this.ajax({
				'do': 'checklistsave',
				'taskid': taskid,
				'checklist': checkList
			}, function(r){
				__self._setLoadedTaskData(r);
				callback();
			});
		},
		
		// сохранить задачу (task - задача, newdata - новые данных по задаче)
		taskSave: function(task, d, callback){
			callback = callback || function(){};
			var __self = this;
			
			d = L.merge({
				'id': 0, 'title': '',
				'descript': '',
				'checks': [],
				'files': [],
				'users': [Brick.env.user.id],
				'deadline': null,
				'ddlTime': false,
				'priority': 3
			}, d || {});
			
			this.ajax({
				'do': 'tasksave',
				'task': {
					'id': task.id,
					'tl': d['title'],
					'bd': d['descript'],
					'checks': d['checks'],
					'files': d['files'],
					'users': d['users'],
					'pid':  d['parentid'],
					'ddl': NS.dateToServer(d['deadline']),
					'ddlt': d['ddlTime'] ? 1 : 0,
					'prt': d['priority']
				}
			}, function(r){
				__self._setLoadedTaskData(r);
				callback(r);
			});
		}
	});
	NS.taskManager = null;
	
	NS.buildTaskManager = function(callback){
		if (!L.isNull(NS.taskManager)){
			callback(NS.taskManager);
			return;
		}
		R.load(function(){
			Brick.ajax('botask', {
				'data': {'do': 'init'},
				'event': function(request){
					NS.taskManager = new TaskManager(request.data);
					callback(NS.taskManager);
				}
			});
		});
	};
	
	var TaskNavigateWidget = function(container, task){
		task = task || null;
		this.init(container, task);
	};
	TaskNavigateWidget.prototype = {
		init: function(container, task){
			buildTemplate(this, 'nav,navrow,navrowadd');
			
			this.container = container;
			this.task = task;
			
			// Подписаться на событие изменений в задачах
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
			this.render();
		},
		onHistoryChanged: function(type, args){
			this.render();
		},
		render: function(){
			var TM = this._TM,
				task = this.task,
				first = true;
			
			var get = function(tk){
				var lst = "";
				if (!L.isNull(tk.parent)){
					lst += get(tk.parent);
				}
				lst += TM.replace('navrow', {
					'id': tk.id,
					'tl': tk.title,
					'first': first ? 'first' : '',
					'current': tk.id == task.id ? 'current' : ''
				});
				first = false;
				return lst;
			};
			
			this.container.innerHTML = TM.replace('nav', {
				'rows': L.isNull(task) ? TM.replace('navrowadd') : get(task)
			});
		},
		destroy: function(){
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
		}
	};
	NS.TaskNavigateWidget = TaskNavigateWidget;
	
	
	var GlobalMenuWidget = function(container, page){
		this.init(container, page);
	};
	GlobalMenuWidget.prototype = {
		init: function(container, page){
			buildTemplate(this, 'gbmenu');
			
			container.innerHTML = this._TM.replace('gbmenu', {
				'task': page == 'task' ? 'current' : '',
				'comments': page == 'comments' ? 'current' : '',
				'towork': page == 'towork' ? 'current' : ''
			});
		}
	};
	NS.GlobalMenuWidget = GlobalMenuWidget;
	
	NS.getDate = function(){ return new Date(); };
	
	var lz = function(num){
		var snum = num+'';
		return snum.length == 1 ? '0'+snum : snum; 
	};
	
	var TZ_OFFSET = NS.getDate().getTimezoneOffset();
	TZ_OFFSET = 0;
	
	NS.dateToServer = function(date){
		if (L.isNull(date)){ return 0; }
		var tz = TZ_OFFSET*60*1000;
		return (date.getTime()-tz)/1000; 
	};
	NS.dateToClient = function(unix){
		unix = unix * 1;
		if (unix == 0){ return null; }
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
	
	NS.timeToString = function(date){
		if (L.isNull(date)){ return ''; }
		return lz(date.getHours()) +':'+lz(date.getMinutes());
	};
	NS.parseTime = function(str){
		var a = str.split(':');
		if (a.length != 2){ return null; }
		var h = a[0]*1, m = a[1]*1;
		if (!(h>=0 && h<=23 && m>=0&&m<=59)){ return null; }
		return [h, m];
	};
	
	// кол-во дней, часов, минут (параметр в секундах)
	NS.timeToSSumma = function(hr){
		var ahr = [];
		var d = Math.floor(hr / (60*60*24));
		if (d > 0){
			hr = hr-d*60*60*24;
			ahr[ahr.length] = d+'д';
		}
		var h = Math.floor(hr / (60*60));
		if (h > 0){
			hr = hr-h*60*60;
			ahr[ahr.length] = h+'ч';
		}
		var m = Math.floor(hr / 60);
		if (m > 0){
			hr = hr-m*60;
			ahr[ahr.length] = m+'м';
		}
		return ahr.join(' ');
	};
	
};