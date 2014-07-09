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
	
	var UID = Brick.env.user.id;
	
	var buildTemplate = this.buildTemplate;
	
	var ExploreWidget = function(container, config){
		config = L.merge({
			'showArhive': false,
			'showRemoved': false,
			'shUsers': {}
		}, config || {});
		this.init(container, config);
	};
	ExploreWidget.prototype = {
		init: function(container, cfg){

			this.config = cfg;
			
			var TM = buildTemplate(this, 'widget,table,row,rowuser');
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
			
			var cfg = this.config;
			
			var sChild = tk.childs.count() > 0 ? this.buildRows(tk, tk.childs, level+1) : '';

			if (tk.isUserRow){
				var user = NS.taskManager.users.get(tk.userid);
				return this._TM.replace('rowuser', {
					'id': tk.id,
					'avatar': user.avatar24(true),
					'tl': user.getUserName(),
					'linkview': '#',
					'child': sChild,
					'clst': islast ? 'ln' : 'tn',
					'chdicoview': tk.childs.count() == 0 ? 'hide' : 'none',
					'chdicon': cfg['shUsers'][tk.userid] ? 'chdcls' : 'chdexpd'
				});
			}else{
				return this._TM.replace('row', {
					'id': tk.id,
					'tl': tk.title,
					'linkview': NS.navigator.taskViewLink(tk),
					'csstrem': tk.isRemoved() ? 'strem' : '',
					'csstarch': tk.isArhive() ? 'starch' : '',
					'cssttype': tk.type,
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
				
				if (level == 0 && ((L.isNull(tk.parent) && tk.parentTaskId > 0) || tk.userid != UID)){
					
					if (L.isNull(anp)){
						anp = {};
					}
					if (!anp[tk.userid]){
						var user = NS.taskManager.users.get(tk.userid);
						anp[tk.userid] = {
							'id': tk.userid,
							'title': user.getUserName(),
							'userid': tk.userid,
							'isUserRow': true,
							'childs': new NS.TaskList(),
							'expanded': cfg['shUsers'][tk.userid]
						};
					}
					anp[tk.userid].childs.add(tk);
				}else{
					a[a.length] = tk;
				}
			}, true, 'name');
			
			if (!L.isNull(anp)){
				var at = [];
				for (var n in anp){
					at[at.length] = anp[n];
				}
				at = at.sort(function(tk1, tk2){
					if (tk1.title < tk2.title){ return -1; }
					if (tk1.title > tk2.title){ return 1; }
					return 0;
				});
				for (var i=0;i<at.length;i++){
					a[a.length] = at[i];
				}
				this.urows = anp;
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
			if (!L.isNull(ptk)){
				sRow['pid'] = ptk.id;
				sRow['clshide'] = ptk.expanded ? '' : 'hide';
			}
			
			return this._TM.replace('table', sRow);
		},
		
		render: function(){
			this.urows = null;
			
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

		shChildsUser: function(taskid){
			this.config['shUsers'][taskid] = !this.config['shUsers'][taskid];
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
				NS.navigator.add(0);
				return true;
			
			case tp['bgo']:
			case tp['bgoc']:
				this.showGoByIdPanel();
				return true;
			}
			
			tp = TId['row'];
			switch(prefix){
			case (tp['badd']+'-'): 
			case (tp['baddc']+'-'):
				NS.navigator.add(numid);
				return true;
				
			case (tp['bedit']+'-'): 
			case (tp['beditc']+'-'):
				this.editById(numid);
				return true;
				
			case (tp['bclsexpd']+'-'): this.shChilds(numid); return true;
			}
			
			tp = TId['rowuser'];
			switch(prefix){
			case (tp['bclsexpd']+'-'): 
			case (tp['btitle']+'-'): 
				this.shChildsUser(numid); return true;
			}
			
			return false;
		},
		
		editById: function(id){
			var task = NS.taskManager.list.get(id);
			if (L.isNull(task)){ return; }
			
			switch(task.type){
			case 'folder': NS.navigator.folderEdit(id); break;
			case 'project': NS.navigator.projectEdit(id); break;
			case 'task': NS.navigator.taskEdit(id); break;
			}
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
			var TId = this._TId, gel = function(n, id){ return Dom.get(TId[n]['title']+'-'+id); };
			Dom.addClass(gel('row', task.id), 'select');
			
			if ((L.isNull(task.parent) && task.parentTaskId > 0) || (task.parentTaskId == 0 && task.userid != UID)){
				Dom.addClass(gel('rowuser', task.userid), 'select');
			}

			this.selectPathMethod(task.parent);
		},
		
		selectPath: function(task){
			this.selectedTask = task;
			var TId = this._TId, gel = function(n, id){ return Dom.get(TId[n]['title']+'-'+id); };
			NS.taskManager.list.foreach(function(tk){
				Dom.removeClass(gel('row', tk.id), 'select');
			}, false);
			for (var uid in this.urows){
				var utk = this.urows[uid];
				Dom.removeClass(gel('rowuser', utk.id), 'select');
			}
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
		},
		
		showGoByIdPanel: function(){
			new GoByIdPanel(function(task){
				switch(task.type){
				case 'folder':
					NS.navigator.folderView(task.id);
					break;
				case 'task':
					NS.navigator.taskView(task.id);
					break;
				case 'project':
					NS.navigator.projectView(task.id);
					break;
				}
				
			});
		}
	};
	NS.ExploreWidget = ExploreWidget;
	
	
	var GoByIdPanel = function(callback){
		this.callback = L.isFunction(callback) ? callback : function(){};
		GoByIdPanel.superclass.constructor.call(this, {fixedcenter: true});
	};
	YAHOO.extend(GoByIdPanel, Brick.widget.Dialog, {
		initTemplate: function(){
			return buildTemplate(this, 'gopanel').replace('gopanel');
		},
		onClick: function(el){
			var tp = this._TId['gopanel'];
			switch(el.id){
			case tp['bcancel']: this.close(); return true;
			case tp['bok']: this.goById(); return true;
			}
			
			return false;
		},
		goById: function(){
			var TM = this._TM, gel = function(n){ return TM.getEl('gopanel.'+n); };
			
			var numid = gel('number').value;
			
			var task = NS.taskManager.getTask(numid);

			if (L.isNull(task)){
				gel('num').innerHTML = numid;
				Dom.setStyle(gel('err'), 'display', '');
				return;
			}

			this.close();
			this.callback(task);
		}
	});
	NS.GoByIdPanel = GoByIdPanel;	

	
};