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
	
	var TST = NS.TaskStatus;
	
	var TaskListWidget = function(container, ptaskid){
		this.init(container, ptaskid);
	};
	TaskListWidget.prototype = {
		init: function(container, ptaskid){
			var tman = NS.taskManager;

			this.ptaskid = ptaskid = ptaskid || 0;
			
			buildTemplate(this, 'list,table,row');
			container.innerHTML = this._TM.replace('list');
			
			var __self = this, TM = this._TM;
			E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
			
			E.on(container, 'mouseout', function(e){
				__self.onMouseOut(E.getTarget(e));
			});
			
			if (ptaskid == 0){
				this.list = tman.list;
			}else{
				var task = tman.list.find(ptaskid);
				this.list = task.childs;
			}
			
			this.tabPage = {
				'opened':{
					'name': 'opened',
					'el': TM.getEl('list.opened')
				},
				'arhive':{
					'name': 'arhive',
					'el': TM.getEl('list.arhive')
				},
				'removed':{
					'name': 'removed',
					'el': TM.getEl('list.removed')
				},
				'favorite':{
					'name': 'favorite',
					'el': TM.getEl('list.favorite')
				}
			};
			this.selectTabPage('opened');
			
			// Подписаться на событие изменений в задачах
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
			NS.taskManager.newTaskReadEvent.subscribe(this.onNewTaskRead, this, true);
			NS.taskManager.taskUserChangedEvent.subscribe(this.onTaskUserChanged, this, true);
			NS.taskManager.userConfigChangedEvent.subscribe(this.onUserConfigChanged, this, true);
			
			this.vtMan = null;
			
			this._timeSelectedRow = 0;
		},
		
		selectTabPage: function(pagename){
			var page = this.tabPage[pagename];
			if (!page){ return; }
			this.selectedTabPage = page;
			
			for (var n in this.tabPage){
				Dom.removeClass(this.tabPage[n]['el'], 'current');
			}
			Dom.addClass(page['el'], 'current');
			this.render();
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
			
			var chcls = 'nochild';
			
			selTPage = this.selectedTabPage['name'];
			if (selTPage == 'opened'){
				tk.childs.foreach(function(ctk){
					if (!ctk.isRemoved() && !ctk.isArhive()){
						chcls = '';
						return true;
					}
				}, true);
			}
			
			if (chcls == '' && tk.expanded){
				chcls = 'expanded';
			}
			var tnew = this.tnew[tk.id] || {};
			var n = tk.order;
			var sRow = TM.replace('row', {
				'id': tk.id,
				'prt': tk.priority,
				'fav': tk.favorite ? 'fav-checked' : '',
				'ord': n != 0 ? ((n>0?'+':'')+n) : '&mdash;',
				'expired': tk.isExpired() ? 'expired' : '',
				'closed': tk.isClosed() ? 'closed' : '',
				'removed': tk.isRemoved() ? 'removed' : '',
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
			
			if (tk.childs.count() > 0 && tk.expanded && this.selectedTabPage['name'] == 'opened'){
				sRow += this.buildRows(tk.childs, level+1);
			}
			
			return sRow;
		},
		buildRows: function(list, level){
			level = level || 0;
			var lst = "", __self = this, 
				cfg = NS.taskManager.userConfig;
			var selTPage = this.selectedTabPage['name'];
			if (selTPage == 'opened'){
				list.foreach(function(tk){
					if (tk.isRemoved() || tk.isArhive()){
						return;
					}
					lst += __self.buildRow(tk, level);
				}, true, cfg['tasksort'], cfg['tasksortdesc']);
			}else{
				list.foreach(function(tk){
					if ((selTPage == 'closed' && tk.status == TST.CLOSE) || 
							(selTPage == 'arhive' && tk.status == TST.ARHIVE) ||
							(selTPage == 'removed' && tk.status == TST.REMOVE) ||
							(selTPage == 'favorite' && tk.favorite) ){ 
						lst += __self.buildRow(tk, level);
					}
					
				}, false, cfg['tasksort'], cfg['tasksortdesc']);
			}
			
			return lst;
		},
		render: function(){
			this.buildNewInfo();
			var TM = this._TM, 
				lst = this.buildRows(this.list),
				cfg = NS.taskManager.userConfig;
			
			var d = {
				'sortname': '',
				'sortdeadline': '',
				'sortpriority': '',
				'sortfavorite': '',
				'sortvoting': '',
				'rows': lst
			};
			d['sort'+cfg['tasksort']] = cfg['tasksortdesc'] ? 'sb' : 'sa';
			TM.getEl('list.table').innerHTML = TM.replace('table', d);
			
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
			var TId = this._TId;
			var tp = TId['list'];
			switch(el.id){
			case tp['opened']: this.selectTabPage('opened'); return true;
			case tp['arhive']: this.selectTabPage('arhive'); return true;
			case tp['removed']: this.selectTabPage('removed'); return true;
			case tp['favorite']: this.selectTabPage('favorite'); return true;
			}
			
			tp = TId['table'];
			switch(el.id){
			case tp['sortname']: this.sort('name'); return true;
			case tp['sortdeadline']: this.sort('deadline'); return true;
			case tp['sortpriority']: this.sort('priority'); return true;
			case tp['sortfavorite']: this.sort('favorite'); return true;
			case tp['sortvoting']: this.sort('voting'); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				taskid = el.id.replace(prefix, "");
			
			var tp = TId['row'];
			
			switch(prefix){
			case (tp['exp']+'-'): this.shChilds(taskid); return true;
			case (tp['up']+'-'): this.taskVoting(taskid, 1); return true;
			case (tp['down']+'-'): this.taskVoting(taskid, -1); return true;
			case (tp['fav']+'-'): 
			case (tp['favi']+'-'): 
				this.taskFavorite(taskid); return true;
			}

			return false;
		},
		
		sort: function(field){
			var cfg = NS.taskManager.userConfig,
				desc = cfg['tasksort'] == field;

			cfg['tasksort'] = field;
			cfg['tasksortdesc'] = desc ? !cfg['tasksortdesc'] : false;
			
			NS.taskManager.userConfigSave();
			this.render();
		},
		
		taskFavorite: function(taskid){
			NS.taskManager.taskFavorite(taskid);
			var task = NS.taskManager.list.find(taskid);
			task.favorite = !task.favorite;
			this.render();
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
			NS.taskManager.taskExpand(taskid);
			task.expanded = !task.expanded;

			this.render();
		},
		destroy: function(){
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
			NS.taskManager.newTaskReadEvent.unsubscribe(this.onNewTaskRead);
			NS.taskManager.taskUserChangedEvent.unsubscribe(this.onTaskUserChanged);
			NS.taskManager.userConfigChangedEvent.unsubscribe(this.onUserConfigChanged);
		},
		_isHistoryChanged: function(list, ids){
			var __self = this, find = false;
			list.foreach(function(tk){
				for (var id in ids){
					if (tk.id*1 == id*1){
						find=true;
						return true;
					}
				}
				if (tk.childs.count() > 0 && tk.expanded){
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
		},
		onUserConfigChanged: function(type, args){
			this.render();
		}
	};
	NS.TaskListWidget = TaskListWidget;

};