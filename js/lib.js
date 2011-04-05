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
        {name: 'botask', files: ['roles.js']}
	]		
};
Component.entryPoint = function(){

	var Dom = YAHOO.util.Dom,
		L = YAHOO.lang,
		TMG = this.template,
		NS = this.namespace,
		API = NS.API,
		R = NS.roles; 

	Brick.util.CSS.update(Brick.util.CSS['botask']['lib']);
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};
	
	var HType = {
		'TASK_OPEN'		: 1,	// открыта
		'TASK_CLOSE'	: 2,	// закрыта
		'TASK_ACCEPT'	: 3,	// принята
		'TASK_UPDATE'	: 4 	// обновлена
	}
	NS.HType = HType;
	
	var TaskStatus = {
		'TASK_OPEN'		: HType.TASK_OPEN,	// открыта
		'TASK_CLOSE'	: HType.TASK_CLOSE,	// принята
		'TASK_ACCEPT'	: HType.TASK_ACCEPT	// закрыта
	}
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
				'ddlt': 0
			}, d || {});
			
			this.update(d);
			this.childs = new TaskList();	// подзадачи
			this.parent = null; 			// родительская задача
			
			this.history = null;
			
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
			
			this.status = d['st'];
			this.stUserId = d['stuid'];
			this.stDate = NS.dateToClient(d['stdl']);
			
			this._updateFlagNew(d);
		},
		setData: function(d){
			this.isLoad = true;
			this.descript = d['bd'];
			this._updateFlagNew(d);
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
		
		toString: function(){
			return "'"+this.title+"', Child: "+this.childs.count();
		}
	};
	NS.Task = Task;
	
	var TaskList = function(){
		this.init();
	};
	TaskList.prototype = {
		init: function(){
			this._list = [];
		},
		// пробег по всем элементам, включая дочерний - если nochild==false 
		foreach: function(f, nochild){
			nochild = nochild || false;
			if (!L.isFunction(f)){ return; }
			var task;
			for (var i=0;i<this._list.length;i++){
				task = this._list[i];
				if (f(task)){ break; };
				if (!nochild){
					task.childs.foreach(f);
				}
			}
		},
		
		getByIndex: function(index){
			index = index || 0;
			if (index < 0 || index >= this.count()){ return null; }
			return this._list[index];
		},
		
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
			return !L.isNull(this.find(taskid)); 
		},
		add: function(task){
			if (this.exist(task.id)){ return; }
			this._list[this._list.length] = task;
		},
		remove: function(taskid){
			var nlist = [];
			
			this.foreach(function(task){
				if (taskid*1 != task.id*1){
					nlist[nlist.length] = task;
				}
			});
			this._list = nlist;
		},
		clear: function(){
			this._list = [];
		},
		count: function(){
			return this._list.length;
		}
	};
	
	// абстрактный класс элемента задачи
	var HItem = function(classHType, d){
		if (d['tp']*1 != classHType*1){
			throw "HItem incorrect data";
		}
		this.init(d);
	}
	HItem.prototype = {
		init: function(d){
			this.id = d['id']*1;		// идентификатор элемента истории
			this.htype = d['tp']*1;		// тип действия HType
			this.taskid = d['tid']*1;	// идентификатор задачи
			this.userid = d['uid'];		// идентификатор пользователя
			this.date = NS.dateToClient(d['dl']); // дата/время действия
			this.dl = d['dl']*1;		 // дата/время серверное
		}
	};
	
	// Элемент действия истории: Задача открыта
	var HItemTaskOpen = function(d){
		HItemTaskOpen.superclass.constructor.call(this, HType.TASK_OPEN, d);
	}
	YAHOO.extend(HItemTaskOpen, HItem, {});
	NS.HItemTaskOpen = HItemTaskOpen;

	// Элемент действия истории: Задача закрыта
	var HItemTaskClose = function(d){
		HItemTaskClose.superclass.constructor.call(this, HType.TASK_CLOSE, d);
	}
	YAHOO.extend(HItemTaskClose, HItem, {});
	NS.HItemTaskClose = HItemTaskClose;

	// Элемент действия истории: Задача принята на выполнение
	var HItemTaskAccept = function(d){
		HItemTaskAccept.superclass.constructor.call(this, HType.TASK_ACCEPT, d);
	}
	YAHOO.extend(HItemTaskAccept, HItem, { });
	NS.HItemTaskAccept = HItemTaskAccept;

	// Элемент действия истории: Обновлена
	var HItemTaskUpdate = function(d){
		HItemTaskUpdate.superclass.constructor.call(this, HType.TASK_UPDATE, d);
	}
	YAHOO.extend(HItemTaskUpdate, HItem, {
		init: function(d){
			HItemTaskUpdate.superclass.init.call(this, d);
			
			this.isTitle = d['tlc']*1 > 0;
			this.isDescript = d['bdc']*1 > 0;
			this.isDeadline = d['ddlc']*1 > 0;
			this.isDdlTime = d['ddltc']*1 > 0;
			this.isParent = d['ptidc']*1 > 0;
			
			this.userAdded = d['usa'];
			this.userRemoved = d['usr'];
		}
	});
	NS.HItemTaskUpdate = HItemTaskUpdate;

	// история может быт в трех состояниях:
	// не загружена вовсе, загружена частично (только параметры - что изменено), 
	// загружена полностью (параметры + сами данные из истории)
	var History = function(){
		this.init();
	};
	History.buildItem = function(d){
		switch(d['tp']*1){
		case HType.TASK_OPEN:	return new HItemTaskOpen(d);
		case HType.TASK_CLOSE:	return new HItemTaskClose(d);
		case HType.TASK_ACCEPT:	return new HItemTaskAccept(d);
		case HType.TASK_UPDATE: return new HItemTaskUpdate(d);
		}
		return null;
	};
	var hSort = function(a, b){
		if (a.id > b.id){ return -1;
		}else if(a.id < b.id){ return 1; }
		return 0;
	};
	var hSortDesc = function(a, b){
		if (a.id > b.id){ return 1;
		}else if(a.id < b.id){ return -1; }
		return 0;
	};
	History.prototype = {
		init: function(){
			this._list = [];
		},
		foreach: function(f, desc){
			if (!L.isFunction(f)){ return; }
			var lst = this._list;
			if (desc){ // сортировка по дате
				lst = lst.sort(hSortDesc)				
			}
			for (var i=0;i<lst.length;i++){
				if (f(lst[i])){ break; };
			}
		},
		getByIndex: function(index){
			index = index || 0;
			if (index < 0 || index >= this.count()){ return null; }
			return this._list[index];
		},
		find: function(id){
			var find = null;
			this.foreach(function(hst){
				if (id*1 == hst.id*1){
					find = hst;
					return true;
				}
			});
			return find;
		},
		exist: function(itemid){ 
			return !L.isNull(this.find(itemid)); 
		},
		add: function(item){
			if (this.exist(item.id)){ return; }
			var lst = this._list;
			lst[lst.length] = item;
			this._list = lst.sort(hSort)				
		},
		remove: function(hstid){
			var nlist = [];
			
			this.foreach(function(hst){
				if (hstid*1 != hst.id*1){
					nlist[nlist.length] = hst;
				}
			});
			this._list = nlist;
		},
		clear: function(){
			this._list = [];
		},
		count: function(){
			return this._list.length;
		},
		lastTime: function(){ // последнее время изменений
			var time = 0;
			this.foreach(function(hst){
				time = Math.max(time, hst.dl)
			});
			return time;
		},
		lastId: function(){ // последний идентификатор действия в истории
			var id = 0;
			this.foreach(function(hst){
				id = Math.max(id, hst.id)
			});
			return id;
		}
	};

	var TaskManager = function(initData){
		this.init(initData);
	};
	TaskManager.prototype = {
		init: function(initData){
			initData = L.merge({
				'board': {},
				'users': [],
				'hst': {}
			}, initData || {});
			
			var list = {}, tree = {},
				board = initData['board'];
			
			this.list = new TaskList();

			for (var id in board){
				list[id] = new Task(board[id]);
			}
			this._buildTaskTree(list);
			
			this.users = initData['users'];
			
			// глобальная коллекция истории
			var history = this.history = new History(), 
				hsts = initData['hst'];
			for (var i=0;i<hsts.length;i++){
				this.historyItemAdd(hsts[i]);
			}
			this.historyChangedEvent = new YAHOO.util.CustomEvent("historyChangedEvent");
			
			// событие, когда прочитали новую задачу
			this.newTaskReadEvent = new YAHOO.util.CustomEvent("newTaskReadEvent");
		},
		
		_buildTaskTree: function(list){

			this.list.clear();
			var tlist = this.list;
			
			for (var id in list){
				var task = list[id];
				task.parent = null;
				task.childs.clear();
			}
			
			for (var id in list){
				var task = list[id],
					pid = task.parentTaskId,
					ptask = list[pid];
				
				if (pid*1 > 0 && ptask){
					task.parent = ptask;
					ptask.childs.add(task);
				}
			}
			
			for (var id in list){
				var task = list[id];
				if (L.isNull(task.parent)){
					tlist.add(task);
				}
			}
		},
		
		historyItemAdd: function(d, task){
			var item = this.history.find(d.id);
			if (!L.isNull(item)){ return item; }
			item = History.buildItem(d);
			this.history.add(item);
			
			task = task || this.list.find(item.taskid);
			task.addHItem(item);
			return item;
		},
		
		getTask: function(taskid){
			return this.list.find(taskid);
		},
		
		_ajaxResult: function(r){
			if (r.u*1 != Brick.env.user.id){ // пользователь разлогинился
				Brick.Page.reload();
				return;
			}
			if (L.isNull(r['changes'])){ return; } // изменения не зафиксированы
			
			// построить архитектуру задач
			var tups = {};
			for (var id in r['changes']['board']){
				var d = r['changes']['board'][id];
				var task = this.list.find(id); 
				if (L.isNull(task)){ // новая задача
					task = new Task(d);
				}else{
					task.update(d);
				}
				tups[id] = task;
			}
			this.list.foreach(function(task){
				if (!tups[task.id]){
					tups[task.id]= task;
				}
			});
			this._buildTaskTree(tups);

			var histe = new History(), 
				hsts = r['changes']['hst'];

			// применить изменения зафиксированные сервером
			for (var i=0;i<hsts.length;i++){
				var item = this.historyItemAdd(hsts[i]);
				histe.add(item);
				var task = tups[item.taskid];
				if (item.htype == HType.TASK_UPDATE && item.isDescript){
					task.isLoad = false;
				}
			}
			this.historyChangedEvent.fire(histe);
		},
		
		ajax: function(d, callback){
			d['hlid'] = this.history.lastId();
			
			// все запросы по модулю проходят через этот менеджер.
			// ко всем запросам добавляется идентификатор последнего обновления
			// если на сервере произошли изменения, то они будут 
			// зафиксированны у этого пользователя
			var __self = this;
			Brick.ajax('botask', {
				'data': d,
				'event': function(request){
					// применить результат запроса
					callback(request.data.r);
					// прменить возможные изменения в истории
					__self._ajaxResult(request.data)
				}
			});
		},
		taskSetExec: function(taskid, callback){ // принять на исполнение
			callback = callback || function(){};
			this.ajax({'do': 'tasksetexec', 'taskid': taskid }, function(r){
				callback();
			});
		},
		taskLoad: function(taskid, callback){
			callback = callback || function(){};
			var task = this.list.find(taskid),
				__self = this;

			if (task.isLoad){
				callback();
				return true;
			}

			this.ajax({'do': 'task', 'taskid': taskid }, function(r){
				var isNew = task.isNew;
				task.setData(r);
				if (isNew){
					__self.newTaskReadEvent.fire(task);
				}

				for (var i=0;i<r['hst'].length;i++){
					__self.historyItemAdd(r['hst'][i], task);
				}
				callback();
			});
		},
		
		// сохранить задачу (task - задача, newdata - новые данных по задаче)
		taskSave: function(task, d, callback){
			var __self = this;
			
			d = L.merge({
				'id': 0, 'title': '',
				'descript': '',
				'users': [Brick.env.user.id],
				'deadline': null,
				'ddlTime': false
			}, d || {});
			
			this.ajax({
				'do': 'tasksave',
				'task': {
					'id': task.id,
					'tl': d['title'],
					'bd': d['descript'],
					'users': d['users'],
					'pid':  d['parentid'],
					'ddl': NS.dateToServer(d['deadline']),
					'ddlt': d['ddlTime'] ? 1 : 0
				}
			}, callback);
		}
	};
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
			
			this.container= container;
			this.task = task;
			
			// Подписаться на событие изменений в задачах
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
			this.render();
		},
		onHistoryChanged: function(type, args){
			this.render();
		},
		render: function(){
			var TM = this._TM;
			
			var get = function(tk){
				var lst = "";
				if (!L.isNull(tk.parent)){
					lst += get(tk.parent);
				}
				lst += TM.replace('navrow', {
					'id': tk.id,
					'tl': tk.title
				});
				return lst;
			};
			
			this.container.innerHTML = TM.replace('nav', {
				'rows': L.isNull(this.task) ? TM.replace('navrowadd') : get(this.task)
			});
		},
		destroy: function(){
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
		}
	};
	NS.TaskNavigateWidget = TaskNavigateWidget;
	
	NS.getDate = function(){ return new Date(); };
	
	var lz = function(num){
		var snum = num+'';
		return snum.length == 1 ? '0'+snum : snum; 
	};
	
	var TZ_OFFSET = NS.getDate().getTimezoneOffset();
	
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
		return lz(date.getHours()) +':'+lz(date.getMinutes())
	}
	NS.parseTime = function(str){
		var a = str.split(':');
		if (a.length != 2){ return null; }
		var h = a[0]*1, m = a[1]*1;
		if (!(h>=0 && h<=23 && m>=0&&m<=59)){ return null; }
		return [h, m];
	}
	
};