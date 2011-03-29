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
		NS = this.namespace,
		API = NS.API,
		R = NS.roles; 

	Brick.util.CSS.update(Brick.util.CSS['botask']['lib']);
	
	
	var CACHE = {
		'task': {},
		set: function(task){
			if (L.isNull(task)){ return; }
			CACHE.task[task.id] = task;
		},
		get: function(id){
			return CACHE.task[id];
		}
	};
	NS.CACHE = CACHE;
	
	var Task = function(data){
		this.init(data);
	};
	Task.prototype = {
		init: function(d){
		
			d = L.merge({
				'id': 0,
				'tl': '',
				'uid': Brick.env.user.id,
				'users': [Brick.env.user.id]
			}, d || {});

			// идентификатор
			this.id = d['id'];
			
			// заголовок
			this.title = d['tl'];
			
			// идентификатор автора
			this.userid = d['uid'];
			
			// участники задачи
			this.users = d['users'];

			// родительская задача
			this.parent = null;
			
			// подзадачи
			this.childs = new TaskList();
			
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
			return "Title: '"+this.title+"', Child: "+this.childs.count();
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
		foreach: function(f){
			if (!L.isFunction(f)){ return; }
			var task;
			for (var i=0;i<this._list.length;i++){
				task = this._list[i];
				if (f(task)){ break; };
				task.childs.foreach(f);
			}
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
			
			Brick.ajax('botask', {
				'data': {
					'do': 'tasksave',
					'task': {
						'tl': d['title'],
						'bd': d['descript'],
						'users': d['users'],
						'pid':  d['parentid']
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