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
        {name: 'botask', files: ['tasklist.js', 'chart.js']}
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
	
	var UP = Brick.mod.uprofile,
		LNG = Brick.util.Language.getc('mod.botask');
	
	var initCSS = false,
		buildTemplate = function(w, ts){
		if (!initCSS){
			var CSS = Brick.util.CSS;
			CSS.update(CSS['botask']['towork']);
			delete CSS['botask']['towork'];
			initCSS = true;
		}
		w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;
	};
	
	var TST = NS.TaskStatus;
	
	var TaskWork = function(taskid){
		this.init(taskid);
	};
	TaskWork.prototype = {
		init: function(taskid){
			this.taskid = taskid;
			this.users = {};
			
			// крайнее время в работе по запрашиваемому периоду
			this.timeFrom = 0; // первая дата
			this.timeEnd = 0; // последняя дата
			
			this.seconds = 0;
			
			this._crUserId = 0;
		},
		addHItem: function(d){
			d['st'] = d['st']*1;
			d['pst'] = d['pst']*1;
			d['dl'] = d['dl']*1;
			
			var us = this.users, 
				uid = d['uid'];
			
			if (d['pst'] == TST.ACCEPT){ 
				// пришла информация а закрытия работы, но информации об открытие нет
				if (this._crUserId*1 == 0){ return; }
				
				// случай, когда один пользователь принял в работу, а другой снял с работы
				uid = this._crUserId;
			}
			
			if (!us[uid]){
				us[uid] = {'sm': 0, 'st': 0, 'vl': 0};
			}
			var it = us[uid];
			
			if (d['st'] == TST.ACCEPT){ // принята в работу
				if (it['st'] == 0){
					it['vl'] = d['dl'];
					it['st'] = d['st'];
					this._crUserId = uid;
					if (this.timeFrom == 0){
						this.timeFrom = d['dl'];
					}
				}
			}else if (d['pst'] == TST.ACCEPT && it['st'] == TST.ACCEPT){ // завершена работа
				if (!it['pd']){
					it['pd'] = [];
				}
				it['pd'][it['pd'].length] = [it['vl'], d['dl']];
				it['sm'] += d['dl']-it['vl'];
				it['st'] = 0;
				it['vl'] = 0;
				this._crUserId = 0;
				this.seconds += it['sm'];
				this.timeEnd = d['dl'];
			}
		},
		secondsByUser: function(userid){
			if (this.seconds == 0){ return 0; }
			var it = this.users[userid];
			if (!it){ return 0; }
			return it['sm'];
		}
	};
	
	var WorkManager = function(){
		this.init();
	};
	WorkManager.prototype = {
		init: function(){
			this.taskWorks = {};
		},
		update: function(d){
			var arr = [];
			for (var id in d){
				arr[arr.length] = d[id];
			}
			arr = arr.sort(function(w2, w1){
				if (w1.id*1 > w2.id*1){ return -1;}
				if (w1.id*1 < w2.id*1){ return 1;}
				return 0;
			});
			var tws = this.taskWorks;
			
			for (var i=0;i<arr.length;i++){
				var taskid = arr[i]['tid'];
				if (!tws[taskid]){
					tws[taskid] = new TaskWork(taskid);
				}
				tws[taskid].addHItem(arr[i]);
			}
			var ntws = {};
			for (var id in tws){
				if (tws[id].seconds > 59){
					ntws[id] = tws[id];
				}
			}
			this.taskWorks = ntws;
			
			var __self = this;
			// обновить информацию в задачах
			NS.taskManager.list.foreach(function(tk){
				tk.work = null;
				__self.foreach(function(tw){
					if (tw.taskid*1 == tk.id*1){
						tk.work = tw;
						return true;
					}
				});
			});
		}, 
		foreach: function(f){
			if (!L.isFunction(f)){ return null; }
			var tws = this.taskWorks;
			for (var id in tws){
				if (f(tws[id])){ return tws[id]; }
			}
			return null;
		}
	};
	NS.WorkManager = WorkManager;
	
	var WorkTaskListWidget = function(container, userid, workManager){
		WorkTaskListWidget.superclass.constructor.call(this, container, NS.taskManager.list, {
			'workmanager': workManager,
			'workuserid': userid,
			'childs': false
		});
	};
	YAHOO.extend(WorkTaskListWidget, NS.TaskTableWidget, {
		init: function(wtlContainer, list, config){

			buildTemplate(this, 'user');
		
			this.wtlContainer = wtlContainer;
			var TM = this._TM, user = this.user = NS.taskManager.users[config['workuserid']];
			
			wtlContainer.innerHTML = TM.replace('user', {
				'uid': user.id,
				'avatar': UP.avatar.get45(user),
				'unm': UP.viewer.buildUserName(user)
			});
		
			WorkTaskListWidget.superclass.init.call(this, TM.getEl('user.table'), list, config);

			this.tabPage = {
				'towork':{
					'name': 'towork',
					'el': TM.getEl('user.towork')
				},
				'month':{
					'name': 'month',
					'el': TM.getEl('user.month')
				},
				'monthchart':{
					'name': 'monthchart',
					'el': TM.getEl('user.monthchart')
				}
			};
			this.selectedTabPage = this.tabPage['towork'];
		},
		selectTabPage: function(pagename){
			var page = this.tabPage[pagename], TM = this._TM;
			if (!page){ return; }
			this.selectedTabPage = page;
			
			for (var n in this.tabPage){
				Dom.removeClass(this.tabPage[n]['el'], 'current');
			}
			Dom.addClass(page['el'], 'current');

			TM.elHide('user.table,chart');

			var cfg = this.cfg;
			switch(pagename){
			case 'towork':
				cfg['showwork'] = false;
				TM.elShow('user.table');
				break;
			case 'month':
				cfg['showwork'] = true;
				TM.elShow('user.table');
				break;
			case 'monthchart':
				TM.elShow('user.chart');
				break;
			}
			this.render();
		},
		render: function(){
			this._taskListForChart = null;
			this.taskViewCounter = 0;
			WorkTaskListWidget.superclass.render.call(this);
			
			if (!L.isNull(this._taskListForChart)){
				new NS.WorkChartWidget(this._TM.getEl('user.chart'), this._taskListForChart, this.user.id);
			}
			this._taskListForChart = null;
		},
		isRenderTask: function(tk){
			var selTPage = this.selectedTabPage['name'], user = this.user;
			
			var forwork = user.id*1 == tk.stUserId*1 && tk.status == NS.TaskStatus.ACCEPT;
			
			var formonth = false;
			if (!L.isNull(tk.work)){ 
				formonth = tk.work.secondsByUser(user.id) > 0;
			}
			if (forwork || formonth){
				this.taskViewCounter++;
			}
			
			if (selTPage == 'towork'){
				return forwork;
			}
			
			if (selTPage == 'monthchart' && formonth){
				if (L.isNull(this._taskListForChart)){
					this._taskListForChart = new NS.TaskList();
				}
				this._taskListForChart.add(tk);
			}
			
			return formonth;
		},
		onClick: function(el){
			
			var tp = this._TId['user'];
			switch(el.id){
			case tp['towork']: this.selectTabPage('towork'); return true;
			case tp['monthchart']: this.selectTabPage('monthchart'); return true;
			case tp['month']: this.selectTabPage('month'); return true;
			}
			return false;
		}
	});
	
	WorkTaskListWidget.sort = function(w1, w2){
		if (w1.user.id*1 == Brick.env.user.id*1){ return -1; }
		return 0;
	};
	NS.WorkTaskListWidget = WorkTaskListWidget;
	
	var ToWorkPanel = function(){
		ToWorkPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px'
		});
	};
	YAHOO.extend(ToWorkPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel,row');
			
			return this._TM.replace('panel');
		},
		onLoad: function(){
			this.gmenu = new NS.GlobalMenuWidget(this._TM.getEl('panel.gmenu'), 'towork');
			this.widgets = [];
			
			this.worker = new WorkManager();
			
			var __self = this;
			NS.taskManager.ajax({'do': 'towork'}, function(r){ 
				__self.renderWidgets(r);
			});
		},
		destroy: function(){
			this.foreach(function(w){
				w.destroy();
			});
			ToWorkPanel.superclass.destroy.call(this);
		},		
		find: function(userid){
			return this.foreach(function(w){
				if (w.user.id == userid){ return true; }
			});
		},
		foreach: function(f){
			var ws = this.widgets;
			for (var i=0;i<ws.length;i++){
				if (L.isFunction(f)){ 
					if (f(ws[i])){ return ws[i]; }
				}
			}
			return null;
		},
		buildWidget: function(userid){
			if (!L.isNull(this.find(userid))){ return; }

			var ws = this.widgets, TM = this._TM;
			
			if (ws.length == 0){
				TM.getEl('panel.users').innerHTML = "";
			}
			
			var div = document.createElement('div');
			div.innerHTML = TM.replace('row', {'uid': userid});
			
			var el = div.childNodes[0];
			TM.getEl('panel.users').appendChild(el);
			
			var w = new WorkTaskListWidget(el, userid, this.worker);
			ws[ws.length] = w;
		},
		renderWidgets: function(r){
			if (L.isNull(r)){ return; }
			
			this.worker.update(r);
			
			var ws = this.widgets;
			var users = NS.taskManager.users;
			for (var uid in users){
				this.buildWidget(uid);
			}
			this.foreach(function(w){
				w.render();
				Dom.setStyle(w.wtlContainer, 'display', w.taskViewCounter > 0 ? '' : 'none');
			});
			
			var resort = false;
			ws = ws.sort(function(w1, w2){
				var ret = WorkTaskListWidget.sort(w1, w2);
				if (ret != 0){
					resort = true;
				}
				return ret;
			});
			this.widgets = ws;
			
			if (!resort){ return; }
			
			var elTable = this._TM.getEl('panel.users');
			this.foreach(function(w){
				elTable.removeChild(w.wtlContainer);
			});
			this.foreach(function(w){
				elTable.appendChild(w.wtlContainer);
			});
		},
		onClick: function(el){
			var w = this.foreach(function(w){
				if (w.onClick(el)){ return true; }
			});
			return !L.isNull(w);
		}
		
	});
	NS.ToWorkPanel = ToWorkPanel;

	API.showToWorkPanel = function(){
		NS.buildTaskManager(function(tm){
			new ToWorkPanel();
		});
	};

};