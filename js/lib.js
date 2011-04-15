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
		E = YAHOO.util.Event,
		L = YAHOO.lang,
		TMG = this.template,
		NS = this.namespace,
		API = NS.API,
		R = NS.roles; 

	Brick.util.CSS.update(Brick.util.CSS['botask']['lib']);
	
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
		'CLOSE'		: 3,	// принята
		'ACCEPT'	: 4,	// закрыта
		'ASSIGN'	: 5,	// назначена
		'REMOVE'	: 6,	// удалена
		'ARHIVE'	: 7		// в архиве
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
				'ddlt': 0,
				'prt': 3
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
			
			this.status = d['st']*1;
			this.pstatus = d['pst']*1;
			this.stUserId = d['stuid'];
			this.stDate = NS.dateToClient(d['stdl']);
			
			this.priority = d['prt']*1;
			this.order = d['o']*1;
			this.favorite = d['f']*1>0;
			this.expanded = d['e']*1>0;
			this.showcmt = d['c']*1>0;
			
			this._updateFlagNew(d);
		},
		setData: function(d){
			this.isLoad = true;
			this.descript = d['bd'];
			this.ctid = d['ctid'];
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
	var sortDateDesc = function(d1, d2){ return sortDate(d2, d1); }
	
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
		this.init();
	};
	TaskList.prototype = {
		init: function(){
			this._list = [];
		},
		// пробег по всем элементам, включая дочерний - если nochild==false 
		foreach: function(f, nochild, sortMethod, desc){
			if (!L.isFunction(f)){ return; }
			nochild = nochild || false;
			if (L.isString(sortMethod)){
				
				if (desc){
					sortMethod += 'desc';
				}
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
	var HItem = function(d){
		this.init(d);
	}
	HItem.prototype = {
		init: function(d){
			this.id = d['id']*1;		// идентификатор элемента истории
			this.taskid = d['tid']*1;	// идентификатор задачи
			this.taskTitle = d['ttl'];
			this.userid = d['uid'];		// идентификатор пользователя
			this.date = NS.dateToClient(d['dl']); // дата/время действия
			this.dl = d['dl']*1;		 // дата/время серверное
			
			this.isTitle = d['tlc']*1 > 0;
			this.isDescript = d['bdc']*1 > 0;
			this.isDeadline = d['ddlc']*1 > 0;
			this.isDdlTime = d['ddltc']*1 > 0;
			this.isParent = d['ptidc']*1 > 0;
			
			this.isStatus = d['st']*1 != d['pst']*1;
			this.stUserId = d['stuid']*1;
			this.status = d['st']*1;
			this.pstatus = d['pst']*1;
			
			this.userAdded = d['usad'];
			this.userRemoved = d['usrm'];
			
		}
	};

	// история может быт в трех состояниях:
	// не загружена вовсе, загружена частично (только параметры - что изменено), 
	// загружена полностью (параметры + сами данные из истории)
	var History = function(){
		this.init();
	};
	History.buildItem = function(d){
		return new HItem(d);
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
			
			// последний загруженный идентификатор в этой коллекции
			this.firstLoadedId = 0;
			this.isFullLoaded = false;
		},
		setFirstLoadedId: function(id){
			if (this.firstLoadedId == 0){
				this.firstLoadedId = id;
			}
			this.firstLoadedId = Math.min(this.firstLoadedId, id*1);
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
				'taskviewcmts': this.taskviewcmts ? 1 : 0,
			};
		}
	};

	var TaskManager = function(initData){
		this.init(initData);
	};
	TaskManager.prototype = {
		init: function(initData){
			initData = L.merge({
				'board': {},
				'users': {},
				'hst': {},
				'cfg': {}
			}, initData || {});
			
			this.userConfig = new UserConfig(initData['cfg']);
			
			var list = {}, tree = {},
				board = initData['board'];
			
			this.list = new TaskList();

			for (var id in board){
				list[id] = new Task(board[id]);
			}
			this._buildTaskTree(list);
			
			this.users = {};
			this._updateUsers(initData['users']);

			// глобальная коллекция истории
			var history = this.history = new History(), 
				hsts = initData['hst'];
			for (var i=0;i<hsts.length;i++){
				var item = this.historyItemAdd(hsts[i]);
				history.setFirstLoadedId(item.id);
			}
			this.historyChangedEvent = new YAHOO.util.CustomEvent("historyChangedEvent");
			
			// событие, когда прочитали новую задачу
			this.newTaskReadEvent = new YAHOO.util.CustomEvent("newTaskReadEvent");
			
			// события внесения изменений пользователя в задачу (добавление в избранное, голосование и т.п.) 
			this.taskUserChangedEvent = new YAHOO.util.CustomEvent("taskUserChangedEvent");
			
			this.userConfigChangedEvent = new YAHOO.util.CustomEvent("userConfigChangedEvent");
			
			this.lastUpdateTime = new Date();
			
			// система автоматического обновления
			// проверяет по движению мыши в документе, срабатывает по задержке обновления
			// более 5 минут
			E.on(document.body, 'mousemove', this.onMouseMove, this, true);
		},
		
		onMouseMove: function(evt){
			var ctime = (new Date()).getTime(), ltime = this.lastUpdateTime.getTime();
			
			if ((ctime-ltime)/(1000*60) < 5){ return; }
			this.lastUpdateTime = new Date();
			
			// получения времени сервера необходимое для синхронизации
			// и проверка обновлений в задачах
			this.ajax({'do': 'sync'}, function(r){ 
				
			});
		},
		
		_updateUsers: function(users){
			for (var uid in users){
				this.users[uid] = users[uid];
			}
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
			if (!L.isNull(task)){
				task.addHItem(item);
			}
			return item;
		},
		
		getTask: function(taskid){
			return this.list.find(taskid);
		},
		
		_ajaxBeforeResult: function(r){
			if (L.isNull(r)){ return false; }
			if (r.u*1 != Brick.env.user.id){ // пользователь разлогинился
				Brick.Page.reload();
				return false;
			}
			if (L.isNull(r['changes'])){ return false; } // изменения не зафиксированы
			
			this._updateUsers(r['changes']['users']);
			
			return true;
		},
		
		_ajaxResult: function(r){

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
				if (item.isDescript){
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
					if (L.isNull(request.data)){ return; }
					var isChanges = __self._ajaxBeforeResult(request.data);
					// применить результат запроса
					callback(request.data.r);
					// применить возможные изменения в истории
					if (isChanges){
						__self._ajaxResult(request.data)
					}
				}
			});
		},
		
		userConfigSave: function(callback){
			callback = callback || function(){};
			var __self = this;
			this.ajax({'do': 'usercfgupdate', 'cfg': this.userConfig.toAjax()}, function(r){
				callback();
				if (L.isNull(r)){ return; }
				__self.userConfig.update(r);
				__self.userConfigChangedEvent.fire(__self.userConfig);
			});
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
			var history = null;
			for (var i=0;i<d['hst'].length;i++){
				var item = this.historyItemAdd(d['hst'][i], task);
				if (L.isNull(history)){
					history = task.history;
				}
				history.setFirstLoadedId(item.id);
			}

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
		
		// сохранить задачу (task - задача, newdata - новые данных по задаче)
		taskSave: function(task, d, callback){
			callback = callback || function(){};
			var __self = this;
			
			d = L.merge({
				'id': 0, 'title': '',
				'descript': '',
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
					'users': d['users'],
					'pid':  d['parentid'],
					'ddl': NS.dateToServer(d['deadline']),
					'ddlt': d['ddlTime'] ? 1 : 0,
					'prt': d['priority']
				}
			}, function(r){
				__self._setLoadedTaskData(r);
				callback();
			});
		},
		
		loadHistory: function(history, taskid, callback){
			callback = callback || function(){};
			var __self = this;
			this.ajax({
				'do': 'history',
				'taskid': taskid,
				'firstid': history.firstLoadedId
			}, function(r){
				r = L.isArray(r) ? r : [];
				history.isFullLoaded = r.length == 0;
				for (var i=0;i<r.length;i++){
					var item = __self.historyItemAdd(r[i]);
					history.setFirstLoadedId(item.id);
				}
				callback();
			});
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
	// TZ_OFFSET = 0;
	
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