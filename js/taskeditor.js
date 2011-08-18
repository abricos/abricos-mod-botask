/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js', 'editor.js', 'calendar.js']},
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

	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};

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
			
			this.navigate = new NS.TaskNavigateWidget(TM.getEl('panel.nav'), task);
			
			Dom.setStyle(TM.getEl('panel.tl'+(task.id*1 > 0 ? 'new' : 'edit')), 'display', 'none');
			
			if (!L.isNull(task.parent)){
				Dom.setStyle(TM.getEl('panel.navtask'), 'display', '');
			}
			

			TM.getEl('panel.tl').value = task.title;
			TM.getEl('panel.editor').innerHTML = task.descript;

			var Editor = Brick.widget.Editor;
			this.editor = new Editor(this._TId['panel']['editor'], {
				width: '750px', height: '250px', 'mode': Editor.MODE_VISUAL
			});
			
			var users = task.id*1==0 && !L.isNull(task.parent) ? task.parent.users : task.users;
			
			this.usersWidget = new UP.UserSelectWidget(TM.getEl('panel.users'), users);
			this.ddlDateTime = new Brick.mod.sys.DateInputWidget(TM.getEl('panel.ddl'), {
				'date': task.deadline,
				'showTime': task.ddlTime
			});
			
			TM.getEl('panel.prt').value = task.priority;
		},
		onClick: function(el){
			var tp = this._TId['panel'];
			switch(el.id){
			
			case tp['bsave']: this.saveTask(); return true;
			case tp['bcancel']: this.close(); return true;
			}
			return false;
		},
		saveTask: function(){
			var TM = this._TM,
				task = this.task,
				users = this.usersWidget.getSelectedUsers();
			
			Dom.setStyle(TM.getEl('panel.bsave'), 'display', 'none');
			Dom.setStyle(TM.getEl('panel.bcancel'), 'display', 'none');
			Dom.setStyle(TM.getEl('panel.loading'), 'display', '');
			
			users[users.length] = Brick.env.user.id;
			
			var ddl =  this.ddlDateTime.getValue();

			var newdata = {
				'title': TM.getEl('panel.tl').value,
				'descript': this.editor.getContent(),
				'users': users,
				'parentid': L.isNull(task.parent) ? 0 : task.parent.id,
				'deadline': ddl['date'],
				'ddlTime': ddl['showTime'],
				'priority': TM.getEl('panel.prt').value
			};
			
			var __self = this;
			NS.taskManager.taskSave(task, newdata, function(){
				__self.close();
			});
		}
	});
	NS.TaskEditorPanel = TaskEditorPanel;

	// создать задачу
	API.showCreateTaskPanel = function(ptaskid){
		ptaskid = ptaskid || 0;
		var task = new NS.Task();
		
		NS.buildTaskManager(function(tm){
			if (ptaskid*1 > 0){
				var ptask = tm.list.find(ptaskid);
				task.parent = ptask;
				new TaskEditorPanel(task);
			}else{
				new TaskEditorPanel(task);	
			}
		});
	};

	API.showTaskEditorPanel = function(taskid){
		NS.buildTaskManager(function(tm){
			var task = tm.list.find(taskid);
			tm.taskLoad(taskid, function(){
				new TaskEditorPanel(task);
			});
		});
	};
};