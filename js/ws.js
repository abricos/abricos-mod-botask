/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008-2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js']},
        {name: 'botask', files: ['users.js', 'easylist.js', 'explore.js', 'history.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var buildTemplate = this.buildTemplate;
	
	var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}']);

	var WorkspacePanel = function(gConfig){
		this.gConfig = gConfig || {};
		
		WorkspacePanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px'
		});
	};
	YAHOO.extend(WorkspacePanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel');
			return this._TM.replace('panel');
		},
		onLoad: function(){
			var TM = this._TM, __self = this;
			
			this.gmenu = new NS.GlobalMenuWidget(TM.getEl('panel.gmenu'), 'project', '');
			this.wsMode = '';
			this.wsw = {
				'explore': null,
				'easyList': null,
				'taskEditor': null,
				'taskViewer': null,
				'teamUsers': null
			};
			
			NS.buildTaskManager(function(tm){
				__self.onBuildTaskManager();
			});
		},
		foreachWidgets: function(f){
			for (var n in this.wsw){
				f(this.wsw[n], n);
			}
		},
		destroy: function(){
			this.destroyWSWidgets();
			WorkspacePanel.superclass.destroy.call(this);
		},
		destroyWSWidgets: function(nonls){
			nonls = nonls || '';
			var a = nonls.split(','),
				wsw = this.wsw;
			this.foreachWidgets(function(w, n){
				for (var i=0;i<a.length;i++){
					if (n == a[i]){ return; }
				}
				if (!L.isNull(w) && L.isFunction(w['destroy'])){
					w['destroy']();
					wsw[n] = null;
				}
			});
		},
		onBuildTaskManager: function(){
			var TM = this._TM;
			
			Dom.setStyle(TM.getEl('panel.loading'), 'display', 'none');
			Dom.setStyle(TM.getEl('panel.board'), 'display', '');
			
			this.wsw['explore'] = new NS.ExploreWidget(TM.getEl('panel.explore'));
			this.wsw['easyList'] = new NS.EasyListWidget(TM.getEl('panel.easylist'), TM.getEl('panel.boxfav'));
			this.wsw['teamUsers'] = new NS.TeamUserListWidget(TM.getEl('panel.teamusers'));

			this.wsw['teamUsers'].userSelectChangedEvent.subscribe(this.onTeamUserSelectChanged, this, true);
			this._renderByGConfig();
		},
		onTeamUserSelectChanged: function(){
			var userid = this.wsw['teamUsers'].selectedUserId;
			this.wsw['explore'].selectUser(userid);
		},
		setGlobalConfig: function(gConfig){
			this.gConfig = gConfig;
			if (!L.isNull(this.wsw['explore'])){
				this._renderByGConfig();
			}
		},
		_renderByGConfig: function(){
			
			var gcfg = L.merge({
				'go': '', 'p1': '', 'p2': ''
			}, this.gConfig || {});

			var wsMode = gcfg['go'];
			
			if (wsMode == this.wsMode){
				// return;
			}
			var __self = this,
				TM = this._TM, gel = function(name){ return TM.getEl('panel.'+name); },
				elPage = gel('wspage'),
				wsw = this.wsw,
				wEasyList = wsw['easyList'],
				wExplore = wsw['explore'],
				wTeamUsers = wsw['teamUsers'];
		
			this.destroyWSWidgets('explore,easyList,teamUsers');
			
			wExplore.selectPath(null);
			wTeamUsers.setFilter(null);

			if (wsMode == ''){
				wEasyList.changeContainer(gel('easylist'));
				Dom.setStyle(gel('wspagemain'), 'display', '');
			} else {
				
				switch(wsMode){
				case 'taskadd': 
				case 'taskedit': 
				case 'taskview': 
					break;
				default: return;
				}
				
				wEasyList.changeContainer(gel('easylistcol'));
				
				Dom.setStyle(gel('wspagemain'), 'display', 'none');
				Dom.setStyle(gel('wspageloading'), 'display', '');
				
				var hidewait = function(){
					Dom.setStyle(gel('wspageloading'), 'display', 'none');
				};
				
				if (wsMode == 'taskadd' || wsMode == 'taskedit'){
					Brick.ff('botask', 'taskeditor', function(){
						hidewait();
						
						var task = null;
						if (wsMode == 'taskadd'){
							var ptaskid = gcfg['p1']*1;

							task = new NS.Task();
							
							if (ptaskid*1 > 0){
								var ptask = NS.taskManager.list.find(ptaskid);
								task.parent = ptask;
							}
							wExplore.selectPath(task.parent);
						} else {
							task = NS.taskManager.getTask(gcfg['p1']*1);
							wExplore.selectPath(task);
						}
						wsw['taskEditor'] = new NS.TaskEditorWidget(elPage, task);
					});
				}else if (wsMode == 'taskview'){
					
					var task = NS.taskManager.getTask(gcfg['p1']*1);
					wExplore.selectPath(task);
					
					Brick.ff('botask', 'taskview', function(){
						hidewait();
						wsw['taskViewer'] = new NS.TaskViewWidget(elPage, task);
						wTeamUsers.setFilter(task);
					});					
				}
			}
			
			this.wsMode = wsMode;
		}
	});
	NS.WorkspacePanel = WorkspacePanel;
	
	var activeWSPanel = null;
	NS.API.showWorkspacePanel = function(pgo, p1, p2){
		
		var gConfig = {
			'go': pgo,
			'p1': p1,
			'p2': p2
		};
		
		if (L.isNull(activeWSPanel) || activeWSPanel.isDestroy()){
			activeWSPanel = new WorkspacePanel(gConfig);
		}else{
			activeWSPanel.setGlobalConfig(gConfig);
		}
		return activeWSPanel;
	};
};