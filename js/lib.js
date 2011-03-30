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
	
	var buildTemplate = function(w, templates){var TM = TMG.build(templates), T = TM.data, TId = TM.idManager; w._TM = TM; w._T = T; w._TId = TId; };
	
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
	
	var TaskNavigateWidget = function(container, task){
		this.init(container, task);
	};
	TaskNavigateWidget.prototype = {
		init: function(container, task){
			buildTemplate(this, 'nav,navrow');
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
			
			container.innerHTML = TM.replace('nav', {
				'rows': get(task)
			});
		}
	};
	NS.TaskNavigateWidget = TaskNavigateWidget;
	
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

			this.id = d['id'];				// идентификатор
			this.title = d['tl'];			// заголовок
			this.userid = d['uid'];			// идентификатор автора
			this.date = NS.dateToClient(d['dl']); // Дата создания задачи
			
			this.deadline = NS.dateToClient(d['ddl']); // Срок исполнения
			this.ddlTime = d['ddlt']*1 > 0; // уточнено ли время?
			
			this.users = d['users'];		// участники задачи

			this.parent = null; 			// родительская задача
			this.childs = new TaskList();	// подзадачи
			
			// Данные подгружаемые дополнительно
			// была ли загрузка дополнительных данных?
			this.isLoadFullData = false;
			
			// описание задачи
			this.descript = '';
		},
		setParent: function(task){
			this.parent = task;
		},
		setLoadedData: function(d){
			this.isLoadFullData = true;
			this.descript = d['bd'];
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
		
		find: function(taskid){
			var find = null;
			this.foreach(function(task){
				if (taskid*1 == task.id*1){
					find = task;
					return true;
				}
			});
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
		count: function(){
			return this._list.length;
		}
	};
	
	var TaskManager = function(initData){
		this.init(initData);
	};
	TaskManager.prototype = {
		init: function(initData){
			var list = {}, tree = {},
				board = initData['board'];
			
			for (var id in board){
				list[id] = new Task(board[id]);
			}
			
			// построить дерево
			for (var id in list){
				var task = list[id],
					di = board[task.id],
					pid = di['pid'],
					ptask = list[pid];
				
				if (pid*1 > 0 && ptask){
					task.setParent(ptask);
					ptask.childs.add(task);
				}
			}
			
			var tlist = new TaskList();
			for (var id in list){
				var task = list[id];
				if (L.isNull(task.parent)){
					tlist.add(task);
				}
			}
			this.list = tlist;
			this.users = initData['users'];
			
			// this.onMakeOrder = new YAHOO.util.CustomEvent("onMakeOrder");
			
		},
		loadTask: function(taskid, callback){
			callback = L.isFunction(callback) ? callback : function(){};
			var task = this.list.find(taskid);
			if (L.isNull(task) || task.isLoadFullData){
				callback(task);
				return;
			}
			Brick.ajax('botask', {
				'data': {'do': 'task', 'taskid': taskid },
				'event': function(request){
					var fd = request.data;
					if (!L.isNull(fd)){
						task.setLoadedData(fd);
					}
					callback(task);
				}
			});
		},
		// сохранить задачу (task - задача, newdata - новые данных по задаче)
		// если сохранение пройдет успешно => обновить данные и вызвать событие
		saveTask: function(task, d, callback){
			var __self = this;
			
			d = L.merge({
				'id': 0, 'title': '',
				'descript': '',
				'users': [Brick.env.user.id],
				'deadline': null,
				'ddlTime': false
			}, d || {});
			
			Brick.ajax('botask', {
				'data': {
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
				},
				'event': function(request){
					var ntask = __self._afterSave(task, d, request.data);
					if (L.isFunction(callback)){
						callback(ntask);
					}
				}
			});
		},
		// обработать результат сохранения задачи
		_afterSave: function(task, newdata, result){
			return task;
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
	
};