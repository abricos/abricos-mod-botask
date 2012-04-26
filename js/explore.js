/*
@version $Id$
@copyright Copyright (C) 2011 Brickos Ltd. All rights reserved.
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: '{C#MODNAME}', files: ['lib.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}']);
	
	var buildTemplate = this.buildTemplate;
	
	var ExploreWidget = function(container, config){
		config = L.merge({
			'showArhive': false,
			'showRemoved': false
		}, config || {});
		this.init(container, config);
	};
	ExploreWidget.prototype = {
		init: function(container, cfg){
			
			this.config = cfg;
			
			buildTemplate(this, 'widget,table,row,rowuser');
			var TM = this._TM;
			container.innerHTML = TM.replace('widget');
			
			TM.getEl('widget.showarch').checked = cfg['showArhive'];
			TM.getEl('widget.showrem').checked = cfg['showRemoved'];
			
			this.selectedTask = null;
			this.selectedUserId = null;
			
			var __self = this;
			E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
			this.render();
			
			NS.taskManager.taskListChangedEvent.subscribe(this.onTaskListChanged, this, true);
		},
		
		destroy: function(){
			NS.taskManager.taskListChangedEvent.unsubscribe(this.onTaskListChanged);
		},
		
		onTaskListChanged: function(){
			this.render();
		},
		
		buildRow: function(tk, level, first, islast){
			this._taskRender[tk.id] = true;
			
			var sChild = tk.childs.count() > 0 ? this.buildRows(tk, tk.childs, level+1) : '';

			if (tk.isUserRow){
				var user = NS.taskManager.users.get(tk.userid);
				return this._TM.replace('rowuser', {
					'id': tk.id,
					'tl': user.getUserName(),
					'linkview': '#',
					'child': sChild,
					'clst': islast ? 'ln' : 'tn',
					'chdicoview': tk.childs.count() == 0 ? 'hide' : 'none',
					'chdicon': true ? 'chdcls' : 'chdexpd'
				});
			}else{
				return this._TM.replace('row', {
					'id': tk.id,
					'tl': tk.title,
					'linkview': NS.navigator.taskViewLink(tk.id),
					'csstrem': tk.isRemoved() ? 'strem' : '',
					'csstarch': tk.isArhive() ? 'starch' : '',
					'child': sChild,
					'clst': islast ? 'ln' : 'tn',
					'chdicoview': tk.childs.count() == 0 ? 'hide' : 'none',
					'chdicon': tk.expanded ? 'chdcls' : 'chdexpd'
				});
			}
		},
		
		buildRows: function(ptk, list, level){

			var cfg = this.config, a = [], anp = null;
			
			list.foreach(function(tk){
				if ((tk.isArhive() && !cfg['showArhive']) 
					|| (tk.isRemoved() && !cfg['showRemoved'])){ 
					return; 
				}
				
				if ((level == 0 && L.isNull(tk.parent) && tk.parentTaskId > 0)){
					if (L.isNull(anp)){
						anp = {};
					}
					if (!anp[tk.userid]){
						anp[tk.userid] = {
							'id': tk.userid,
							'userid': tk.userid,
							'isUserRow': true,
							'childs': new NS.TaskList()
						};
					}
					anp[tk.userid].childs.add(tk);
				}else{
					a[a.length] = tk;
				}
			}, true, 'name');
			
			if (!L.isNull(anp)){
				for (var n in anp){
					a[a.length] = anp[n];
				}
			}

			var lst = "";
			for (var i=0;i<a.length;i++){
				lst += this.buildRow(a[i], level, i==0, i==a.length-1);
			}
			
			if (lst == ""){ return ""; }
			
			if (this._firstRenderRows){
				this._firstRenderRows = false;
				Dom.setStyle(this._TM.getEl('widget.empty'), 'display', 'none');
				Dom.setStyle(this._TM.getEl('widget.table'), 'display', '');
			}
			
			var sRow = {
				'pid': 0,
				'clshide': '',
				'rows': lst
			};
			if (!L.isNull(ptk) && !ptk.isUserRow){
				sRow['pid'] = ptk.id;
				sRow['clshide'] = ptk.expanded ? '' : 'hide';
			}
			
			return this._TM.replace('table', sRow);
		},
		
		render: function(){
			this._firstRenderRows = true;
			var TM = this._TM;
			Dom.setStyle(TM.getEl('widget.empty'), 'display', '');
			Dom.setStyle(TM.getEl('widget.table'), 'display', 'none');
			
			this._taskRender = {};
			this._TM.getEl('widget.table').innerHTML = 
				this.buildRows(null, NS.taskManager.list, 0);
			this.selectPath(this.selectedTask);
		},
		
		shChilds: function(taskid){
			var task = NS.taskManager.getTask(taskid);
			if (L.isNull(task)){ return; }
			
			NS.taskManager.taskExpand(taskid);
			task.expanded = !task.expanded;
			this.render();
		},
		
		onClick: function(el){
			var TId = this._TId,
				tp = TId['widget'],
				prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");
		
			switch(el.id){
			case tp['showrem']: this.shRemoved(); return false;
			case tp['showarch']: this.shArhive();  return false;
			case tp['btitle']: NS.navigator.taskHome(); return true;
			
			case tp['badd']: 
			case tp['baddc']:
				NS.navigator.taskCreate(0);
				return true;
			}
			
			tp = TId['row'];
			switch(prefix){
			case (tp['badd']+'-'): 
			case (tp['baddc']+'-'):
				NS.navigator.taskCreate(numid);
				return true;
				
			case (tp['bedit']+'-'): 
			case (tp['beditc']+'-'):
				NS.navigator.taskEdit(numid);
				return true;
				
			case (TId['row']['bclsexpd']+'-'): this.shChilds(numid); return true;
			}
			
			return false;
		},
		
		shArhive: function(){
			var TM = this._TM, gel = function(n){ return TM.getEl('widget.'+n);};
			this.config['showArhive'] = gel('showarch').checked;
			this.render();
		},
		shRemoved: function(){
			var TM = this._TM, gel = function(n){ return TM.getEl('widget.'+n);};
			this.config['showRemoved'] = gel('showrem').checked;
			this.render();
		},
		
		selectPathMethod: function(task){
			if (L.isNull(task)){ return; }
			var TId = this._TId, gel = function(id){ return Dom.get(TId['row']['title']+'-'+id); };
			Dom.addClass(gel(task.id), 'select');
			this.selectPathMethod(task.parent);
		},
		
		selectPath: function(task){
			this.selectedTask = task;
			var TId = this._TId, gel = function(id){ return Dom.get(TId['row']['title']+'-'+id); };
			NS.taskManager.list.foreach(function(tk){
				Dom.removeClass(gel(tk.id), 'select');
			}, false);
			this.selectPathMethod(task);
		},
		
		// выделить все задачи, где участвует этот пользователь
		selectUser: function(userid){
			this.selectedUserId = userid;
			var TId = this._TId, gel = function(id){ return Dom.get(TId['row']['title']+'-'+id); };
			NS.taskManager.list.foreach(function(tk){
				var find = false;
				for (var i=0;i<tk.users.length;i++){
					var uid = tk.users[i];
					if (userid == uid){
						find = true;
						break;
					}
				}
				
				if (find){
					Dom.addClass(gel(tk.id), 'seluser');
				}else{
					Dom.removeClass(gel(tk.id), 'seluser');
				}
			}, false);
		}
	};
	NS.ExploreWidget = ExploreWidget;
	
};