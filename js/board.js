/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['data.js', 'container.js']},
        {name: 'uprofile', files: ['viewer.js']},
        {name: 'botask', files: ['roles.js']}
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
	
	if (!NS.data){
		NS.data = new Brick.util.data.byid.DataSet('botask');
	}
	
	Brick.util.CSS.update(Brick.util.CSS['botask']['board']);
	
	var buildTemplate = function(w, templates){
		var TM = TMG.build(templates), T = TM.data, TId = TM.idManager;
		w._TM = TM; w._T = T; w._TId = TId;
	};
	
	var BoardWidget = function(container){
		this.init(container);
	};
	BoardWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'widget,empty,table,row,rowwait');
			container.innerHTML = this._TM.replace('widget');
			
			// E.on(container, 'mouseover', this.onMouseOver, this, true);
			// E.on(container, 'mouseout', this.onMouseOut, this, true);
			
			// this.cm = NS.CloudsManager.getInstance();
			this.onRender = new YAHOO.util.CustomEvent("onRender");
			
			this.tables = new Brick.mod.sys.TablesManager(NS.data, ['board'], {'owner': this});
			
			if (!R.isWrite){
				this._TM.getEl('widget.bappend').style.display = 'none';
			}
		},
		destroy: function(){
			this.tables.destroy();
		},
		getEl: function(key){
			return this._TM.getEl(key);
		},
		onDataLoadWait: function(tables){ 
			var TM = this._TM, T = this._T;
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': T['rowwait']});
		},
		onDataLoadComplete: function(tables){
			this.render(); 
		},
		refresh: function(){
			
		},
		render: function(){
			var TM = this._TM;
			if (NS.data.get('board').getRows().count() < 1){
				TM.getEl('widget.table').innerHTML = TM.replace('empty');
				return;
			}
			var lst = "";
			NS.data.get('board').getRows().foreach(function(row){
				var di = row.cell;
				lst += TM.replace('row', {
					'id': di['id'],
					'tl': di['tl'] 
				});
			});
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': lst});
		},
		onClick: function(el){
			var TId = this._TId, tp = TId['widget'];
			switch(el.id){
			case TId['empty']['bappend']: 
			case tp['bappend']: this.taskEditorShow(0); return true;
			case tp['brefresh']: this.refresh(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, ''),
			numid = el.id.replace(prefix, "");
		
			tp = TId['row'];
			switch(prefix){
			case (tp['task']+'-'): this.taskListShow(numid); return true;
			}
			
			return false;
		},
		taskListShow: function(taskid){
			Brick.ff('botask', 'tasklist', function(){
				API.showTaskListPanel(taskid);
			});
		},
		taskEditorShow: function(taskid, groupkey){
			Brick.ff('botask', 'taskeditor', function(){
				API.showTaskEditorPanel(taskid, groupkey);
			});
		}
	};
	NS.BoardWidget = BoardWidget;

	var BoardPanel = function(frend){
		this.frend = frend;
		BoardPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px',
			overflow: false, 
			controlbox: 1
		});
	};
	YAHOO.extend(BoardPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel');
			return this._TM.replace('panel');
		},
		onLoad: function(){
			this.boardWidget = new BoardWidget(this.body);
			NS.data.request();
		},
		onClick: function(el){
			if (this.boardWidget.onClick(el)){ return true; }
			return false;
		},
		destroy: function(){
			this.boardWidget.destroy();
			BoardPanel.superclass.destroy.call(this);
		},
		onResize: function(rel){
			var el = this.boardWidget.getEl('widget.container');
			if (rel.height > 0){
				Dom.setStyle(el, 'height', (rel.height - 70)+'px');
			}
		}
	});
	NS.BoardPanel = BoardPanel;
	
	API.showBoardPanel = function(){
		R.load(function(){
			new BoardPanel();
		});
	};
	
	/*
	var BoardWidget = function(container){
		this.init(container);
	};
	BoardWidget.prototype = {
		init: function(container){
			buildTemplate(this, 'widget,table,row,rowwait,grow,urow,empty');
			container.innerHTML = this._TM.replace('widget');
			
			E.on(container, 'mouseover', this.onMouseOver, this, true);
			E.on(container, 'mouseout', this.onMouseOut, this, true);
			
			this.cm = NS.CloudsManager.getInstance();
			this.onRender = new YAHOO.util.CustomEvent("onRender");
			
			this.tables = new Brick.mod.sys.TablesManager(NS.data, ['board'], {'owner': this});
			
			if (!R.isWrite){
				this._TM.getEl('widget.bappend').style.display = 'none';
			}
		},
		destroy: function(){
			this.tables.destroy();
		},
		getEl: function(key){
			return this._TM.getEl(key);
		},
		onDataLoadWait: function(tables){ 
			var TM = this._TM, T = this._T;
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': T['rowwait']});
		},
		onDataLoadComplete: function(tables){
			this.render(); 
		},
		render: function(){
			var TM = this._TM;
			if (NS.data.get('board').getRows().count() < 1){
				TM.getEl('widget.table').innerHTML = TM.replace('empty');
				return;
			}
			
			var ngs = this.cm.getClouds(true);
			var lst = "";
			for (var i=0;i<ngs.length;i++){
				var g = ngs[i], glst = "", ulst = "";
				
				var gusersnm = [];
				// список пользователей в группе
				var ids = g.key.split(' ');
				for (var n in ids){
					// if (Brick.env.user.id != ids[n] || (Brick.env.user.id == ids[n] && ids.length == 1)){  
						var user = NS.data.get('boardusers').getRows().getById(ids[n]);
						if (!L.isNull(user)){
							var udi = user.cell;
							
							gusersnm[gusersnm.length] = buildUserName(udi);
							glst += TM.replace('grow', {
								'unm': buildUserName(udi),
								'uid': udi['id'],
								'avatar': UP.avatar.get45(udi)
							});
						}
					// }
				}
				
				var gNewCnt = 0, gNewCmtCnt = 0;
				// строительтсво списка проектов в группе
				for (var ii=0;ii<g.rows.length;ii++){
					var row = g.rows[ii];
					var di = row.cell,
						isnewcmt = !L.isNull(di['cmtn']) && di['cmtn'],
						myproject = di['uid'] == Brick.env.user.id,
						isnew = L.isNull(di['cn']) && !myproject;
					
					gNewCnt += (isnew ? 1 : 0);
					gNewCmtCnt += (isnewcmt ? di['cmtn']*1 : 0);
					
					var udi = NS.data.get('boardusers').getRows().getById(di['uid']).cell;
					
					ulst += TM.replace('urow', {
						'id': di['id'],
						'uid': di['uid'],
						'unm': buildUserName(udi),
						'ispublish': (myproject && di['pb'] == 0 ? '' : 'none'),
						'isedit': myproject ? '' : 'none',
						'pb': Brick.dateExt.convert(di['pb']),
						'cmt': di['cmt'],
						'iscmtnew': (isnewcmt ? '' : 'none'),
						'cmtn': (isnewcmt ? di['cmtn'] : '0'),
						'isnew': (isnew ? '' : 'none'),
						'isremove': myproject ? '' : 'none',
						'tl': di['tl']
					});
				}
				
				lst += TM.replace('row', {
					'gid': i,
					'dispuserappend': R.isAdmin ? '' : 'none',
					'gnewcnt': gNewCnt,
					'gnewcmtcnt': gNewCmtCnt,
					'gusers': gusersnm.join(', '),
					'gucnt': gusersnm.length,
					'gkey': g.key.split(' ').join(''),
					'group': glst,
					'projects': ulst
				});
			}
			TM.getEl('widget.table').innerHTML = TM.replace('table', {'rows': lst});
			this.onRender.fire();
		},
		onMouseOver: function(e){
			return this.onMouse(E.getTarget(e), true);
		},
		onMouseOut: function(e){
			return this.onMouse(E.getTarget(e), false);
		},
		onMouse: function(el, on){

			var TId = this._TId,
				tp = TId['urow'];

			var prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");
			
			switch(prefix){
			case (tp['view']+'-'): this.mouseMoveProjectRow(numid, on); return true;
			}
			
			var fel = this.findElByClass(el, tp['id']+'row'); 
			if (!L.isNull(fel)){
				var prefix = fel.id.replace(/([0-9]+$)/, ''),
					numid = fel.id.replace(prefix, "");
				this.mouseMoveProjectRow(numid, on); return true;
			}
			
			return false;
		},
		findElByClass: function(el, className){
			var TId = this._TId, isRowStep = 0;
			var isRow = function(fel){
				if (isRowStep++ > 7 || fel.id == TId['widget']['table'] ){ return null; }
				if (fel.tagName == 'TR' && Dom.hasClass(fel, className)){
					return fel;
				}
				return isRow(fel.parentNode);
			};
			return isRow(el); 
		},
		mouseMoveProjectRow: function(prjid, on){
			var tp = this._TId['urow'],
				el = Dom.get(tp['id']+'-'+prjid);
			if (on){
				Dom.addClass(el, 'selected');
			}else{
				Dom.removeClass(el, 'selected');
			}

			// выделить автора проекта

			var prjRow = NS.data.get('board').getRows().getById(prjid);
			if (L.isNull(prjRow)){ return; }
		},
		refresh: function(){
			NS.data.get('board').clear();
			NS.data.get('boardusers').clear();
			NS.data.get('boardprojectusers').clear();
			NS.data.request();
		},
		help: function(){			
			Brick.f("bopros", "help", "showHelpPanel");
		},
		onClick: function(el){
			var TId = this._TId, tp = TId['widget'];
			switch(el.id){
			case TId['empty']['bappend']: 
			case tp['bappend']: this.projectEditorShow(0); return true;
			case tp['brefresh']: this.refresh(); return true;
			case tp['help']: this.help(); return true;
			}
			
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");
			
			tp = TId['urow'];
			switch(prefix){
			case (tp['publish']+'-'):
				this.projectPublish(numid);
				return true;
			case (tp['edit']+'-'):
			case (tp['editimg']+'-'): this.projectEditorShow(numid); return true;
			case (tp['remove']+'-'):
			case (tp['removeimg']+'-'):
				this.projectRemove(numid);
				return true;
			case (tp['view']+'-'):
				this.projectShow(numid);
				return true;
			}

			tp = TId['row'];
			switch(prefix){
			case (tp['ghide']+'-'): this.showHideGroup(numid, false); return true;
			case (tp['gshow']+'-'): this.showHideGroup(numid, true); return true;
			case (tp['newproject']+'-'): this.projectEditorShow(0, this.cm.clouds[numid].key); return true;
			case (tp['userappend']+'-'):
				this.userAppendInCloud(this.cm.clouds[numid]);
				return true;
			}
			var fel = this.findElByClass(el, tp['id']+'row');
			if (!L.isNull(fel)){
				var prefix = fel.id.replace(/([0-9]+$)/, ''),
					numid = fel.id.replace(prefix, "");
				
				var isshow = Dom.get(tp['grow']+'-'+numid).style.display == '';
				this.showHideGroup(numid, !isshow);
			}
			return false;
		},
		userAppendInCloud: function(cloud){ // добавить пользователя в группу
			var a = cloud.key.split(' '),
				__self = this;
			
			var prjids = [];
			for (var i in cloud.rows){
				prjids[prjids.length] = cloud.rows[i].id;
			}

			new NS.UserAppendPanel(function(user){
				for (var i=0; i<a.length; i++){
					if (a[i]*1 == user.id*1){
						return;
					}
				}
				new NS.NewUserInCloudPanel(user, a, function(){
					__self.onDataLoadWait(__self.tables);
					Brick.ajax('bopros', {
						'data': {
							'do': 'userappendincloud',
							'userid': user.id,
							'cloudkey': cloud.key,
							'prjs': prjids.join(' ')
						},
						'event': function(request){
							__self.refresh();
						}
					});
					
				});
			});
		},
		showHideGroup: function(gid, isshow){
			var tp = this._TId['row'];
			Dom.get(tp['grow']+'-'+gid).style.display = isshow ? '' : 'none';
			Dom.get(tp['ghide']+'-'+gid).style.display = isshow ? '' : 'none';
			Dom.get(tp['gshow']+'-'+gid).style.display = !isshow ? '' : 'none';
			
			var c1 = 'group-row-hshow', c2 = 'group-row-hhide';
			if (isshow){ var c = c1; c1 = c2; c2 = c; }
			Dom.replaceClass(Dom.get(tp['ghead']+'-'+gid), c1, c2);
		},
		projectShow: function(projectid){
			var __self = this;
			API.showProjectPanel(projectid, {
				'onLoadComments': function(){
					__self.refresh();
				}
			});
		},
		projectPublish: function(projectid){
			var __self = this;
			Brick.ajax('bopros', {
				'data': {
					'do': 'projectpublish',
					'projectid': projectid
				},
				'event': function(request){
					var project = request.data;
					if (!L.isNull(project)){ 
						NS.CACHE.project[project.id] = project;
					}
					__self.refresh();
				}
			});
		},
		projectRemove: function(projectid){
			var row = NS.data.get('board').getRows().getById(projectid);
			if (L.isNull(row)){ return; }
			var __self = this;
			new ProjectRemovePanel(row.cell['tl'], function(){
				Brick.ajax('bopros', {
					'data': {
						'do': 'projectremove',
						'projectid': projectid
					},
					'event': function(request){
						__self.refresh();
					}
				});				
			});
		},
		projectEditorShow: function(projectid, groupkey){
			Brick.ff('bopros', 'prjeditor', function(){
				API.showProjectEditorPanel(projectid, groupkey);
			});
		}
	};
	NS.BoardWidget = BoardWidget;
	
	
	var ProjectRemovePanel = function(prjTitle, callback){
		this.prjTitle = prjTitle;
		this.callback = callback;
		ProjectRemovePanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '500px',
			modal: true
		});
	};
	YAHOO.extend(ProjectRemovePanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'prjremovepanel');
			return this._TM.replace('prjremovepanel', {
				'tl': this.prjTitle
			});
		},
		onClick: function(el){
			var tp = this._TId['prjremovepanel'];
			switch(el.id){
			case tp['bremove']: this.callback(); this.close(); return true;
			case tp['bcancel']: this.close(); return true;
			}
			return false;
		}
	});
	NS.ProjectRemovePanel = ProjectRemovePanel;


	var NewUserInCloudPanel = function(user, cloudusers, callback){
		this.user = user;
		this.cloudusers = cloudusers;
		this.callback = callback;
		NewUserInCloudPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '500px',
			modal: true
		});
	};
	YAHOO.extend(NewUserInCloudPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'newuserincloud');
			
				var ids = this.cloudusers, arr = [];
				for (var n in ids){
					arr[arr.length] =
						UP.viewer.buildUserName(NS.data.get('boardusers').getRows().getById(ids[n]).cell);
				}
				return this._TM.replace('newuserincloud', {
					'tl': UP.viewer.buildUserName(this.user),
					'glst': arr.join(', ')
				});
			
		},
		onClick: function(el){
			var tp = this._TId['newuserincloud'];
			switch(el.id){
			case tp['bappend']: this.callback(); this.close(); return true;
			case tp['bcancel']: this.close(); return true;
			}
			return false;
		}
	});
	NS.NewUserInCloudPanel = NewUserInCloudPanel;
/**/
};