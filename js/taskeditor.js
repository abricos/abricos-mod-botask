/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js', 'editor.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'botask', files: ['lib.js', 'roles.js', 'calendar.js']}
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
	
	Brick.util.CSS.update(Brick.util.CSS['botask']['taskeditor']);	

	if (!NS.data){
		NS.data = new Brick.util.data.byid.DataSet('botask');
	}
	
	var buildTemplate = function(w, templates){
		var TM = TMG.build(templates), T = TM.data, TId = TM.idManager;
		w._TM = TM; w._T = T; w._TId = TId;
	};

	var TaskEditorPanel = function(task){
		this.task = task;

		TaskEditorPanel.superclass.constructor.call(this, {fixedcenter: true});
	};
	YAHOO.extend(TaskEditorPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel');
			
			var task = this.task;
			return this._TM.replace('panel', {
				'pid': L.isNull(task.parent) ? 0 : task.parent.id,
				'ptitle': L.isNull(task.parent) ? '' : task.parent.title
			});
		},
		onLoad: function(){
			var TM = this._TM,
				task = this.task;
			
			Dom.setStyle(TM.getEl('panel.tl'+(task.id*1 > 0 ? 'new' : 'edit')), 'display', 'none');
			
			if (!L.isNull(task.parent)){
				Dom.setStyle(TM.getEl('panel.navtask'), 'display', '');
			}
			
			var Editor = Brick.widget.Editor;
			this.editor = new Editor(this._TId['panel']['editor'], {
				width: '750px', height: '250px', 'mode': Editor.MODE_VISUAL
			});
			
			TM.getEl('panel.tl').value = task.title;
			this.editor.setContent(task.descript);
			
			var users = task.id*1==0 && !L.isNull(task.parent) ? task.parent.users : task.users;
			
			this.usersWidget = new UP.UserSelectWidget(TM.getEl('panel.users'), users);
		},
		onClick: function(el){
			var tp = this._TId['panel'];
			switch(el.id){
			
			case tp['ddl']: this.showDeadlineCalendar(); return true;
			case tp['ddlclear']: this.deadlineClear(); return true;
			case tp['ddltimeshow']: this.showDeadlineTime(); return true;
			case tp['ddltimehide']: this.showDeadlineTime(true); return true;
			
			case tp['bsave']: 
			case tp['bsavepub']: this.saveTask(); return true;
			case tp['bsavedraft']: this.saveTask(true); return true;
			case tp['bcancel']: this.close(); return true;
			}
			return false;
		},
		showDeadlineCalendar: function(){
			var el = this._TM.getEl('panel.ddl');
			NS.showCalendar(el, function(dt){
				el.value = NS.dateToString(dt);
			});
		},
		showDeadlineTime: function(hide){
			var TM = this._TM, hide = hide || false;
			var txtDdltime = TM.getEl('panel.ddltime');
			if (!hide && txtDdltime.value.length == 0){
				txtDdltime.value = "12:00";
			}
			Dom.setStyle(txtDdltime, 'display', !hide ? '' : 'none');
			Dom.setStyle(TM.getEl('panel.ddltimeshow'), 'display', hide ? '' : 'none');
			Dom.setStyle(TM.getEl('panel.ddltimehide'), 'display', !hide ? '' : 'none');
		},
		deadlineClear: function(){
			var TM = this._TM;
			TM.getEl('panel.ddl').value = "";
			TM.getEl('panel.ddltime').value = "";
		},
		saveTask: function(){
			var TM = this._TM,
				task = this.task,
				users = this.usersWidget.getSelectedUsers();
			
			users[users.length] = Brick.env.user.id;
			
			var newdata = {
				'title': TM.getEl('panel.tl').value,
				'descript': this.editor.getContent(),
				'users': users,
				'parentid': L.isNull(task.parent) ? 0 : task.parent.id
			};
			
			var __self = this;
			NS.taskManager.saveTask(task, newdata, function(ntask){
				__self.close();
			});
		}
	});
	NS.TaskEditorPanel = TaskEditorPanel;

	// создать задачу
	API.showCreateTaskPanel = function(parenttaskid){
		parenttaskid = parenttaskid || 0;
		var task = new NS.Task();
		
		NS.buildTaskManager(function(tm){
			if (parenttaskid*1 > 0){
				tm.loadTask(parenttaskid, function(ptask){
					task.setParent(ptask);
					new TaskEditorPanel(task);
				});
			}else{
				new TaskEditorPanel(task);	
			}
		});
	};

	API.showTaskEditorPanel = function(taskid){
		NS.buildTaskManager(function(tm){
			tm.loadTask(taskid, function(task){
				new TaskEditorPanel(task);
			});
		});
	};
};