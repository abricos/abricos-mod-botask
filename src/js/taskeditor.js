/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['editor.js']},
		{name: 'widget', files: ['calendar.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'botask', files: ['widgets.js', 'calendar.js', 'checklist.js']},
        {name: 'pictab', files: ['draw.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var UP = Brick.mod.uprofile;
	
	var buildTemplate = this.buildTemplate;
	
	var TaskEditorWidget = function(container, task){
		this.init(container, task);
	};
	TaskEditorWidget.prototype = {
		init: function(container, task){
			this.task = task;
			
			var TM = buildTemplate(this, 'widget');
			
			container.innerHTML = TM.replace('widget', {
				'pid': L.isNull(task.parent) ? 0 : task.parent.id,
				'ptitle': L.isNull(task.parent) ? '' : task.parent.title
			});
			this.onLoad();
		},
		onLoad: function(){
			var TM = this._TM,
				gel = function(n){ return TM.getEl('widget.'+n); },
				task = this.task;
			
			Dom.setStyle(TM.getEl('widget.tl'+(task.id*1 > 0 ? 'new' : 'edit')), 'display', 'none');
			
			this.parentSelWidget = new NS.TaskTreeSelectWidget(gel('path'), task.id, L.isNull(task.parent) ? 0 : task.parent.id);
			
			gel('tl').value = task.title;
			TM.getEl('widget.editor').value = task.descript;

			var Editor = Brick.widget.Editor;
			this.editor = new Editor(this._TId['widget']['editor'], {
				width: '750px', height: '350px', 'mode': Editor.MODE_VISUAL
			});
			
			this.checklist = new NS.ChecklistWidget(TM.getEl('widget.checklist'), task, {
				'hidebtn': true,
				'hideinfo': true
			});
			this.checklist.update();
			
			if (Brick.mod.filemanager.roles.isWrite){
				this.filesWidget = new Brick.mod.filemanager.AttachmentWidget(gel('files'), task.files);
			}else{
				this.filesWidget = null;
				Dom.setStyle(gel('rfiles'), 'display', 'none');
			}
			
			var users = task.id*1==0 && !L.isNull(task.parent) ? task.parent.users : task.users;
			
			this.usersWidget = new UP.UserSelectWidget(gel('users'), users);
			
			this.ddlDateTime = new Brick.mod.widget.DateInputWidget(gel('ddl'), {
				'date': task.deadline,
				'showTime': task.ddlTime
			});
			
			TM.getEl('widget.prt').value = task.priority;

			this.drawListWidget = null;
			if (Brick.mod.pictab && Brick.mod.pictab.ImageListWidget){
				this.drawListWidget = new Brick.mod.pictab.ImageListWidget(gel('widget'), task.images);
			}

			var __self = this;
			E.on(TM.getEl('widget.id'), 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
		},
		destroy: function(){
			this.editor.destroy();
			var elw = this._TM.getEl('widget.id');
			elw.parentNode.removeChild(elw);
		},
		onClick: function(el){
			var tp = this._TId['widget'];
			switch(el.id){
			
			case tp['bimgdis']: this.imageEnable(false); return true;
			case tp['bimgen']: this.imageEnable(true); return true; 
			case tp['baddtab']: this.drawListWidget.createTab(); return true; 
			
			case tp['bsave']: 
			case tp['bsavei']: 
				this.saveTask(); 
				return true;
			case tp['bcancel']: 
			case tp['bcanceli']: 
				this.close(); 
				return true;
			}
			return false;
		},
		imageEnable: function(en){
			this._imageEnabled = en;
			var TM = this._TM;
			TM.elShowHide('widget.imgurl,imgremove,bimgupload,bshowfm,bimgdis,widget', en);
			TM.elShowHide('widget.bimgen', !en);
		},
		close: function(){
			var tk = this.task;
			if (tk.id > 0){
				NS.navigator.taskView(tk.id);
			}else if (tk.id == 0 || !L.isNull(tk.parent)){
				NS.navigator.taskView(tk.parent.id);
			}else{
				NS.navigator.taskHome();
			}
		},
		saveTask: function(){
			var TM = this._TM,
				gel = function(n){ return TM.getEl('widget.'+n);},
				task = this.task,
				users = this.usersWidget.getSelectedUsers();
			
			TM.elHide('widget.bsave,bsavei,bcancel,bcanceli');
			TM.elShow('widget.loading,loadingi');
			
			users[users.length] = Brick.env.user.id;
			
			var images = [];
			if (!L.isNull(this.drawListWidget)){
				images = this.drawListWidget.toSave();
			}

			var newdata = {
				'title': gel('tl').value,
				'descript': this.editor.getContent(),
				'checks': this.checklist.getSaveData(),
				'files': L.isNull(this.filesWidget) ? task.files : this.filesWidget.files,
				'images': images,
				'users': users,
				'parentid': this.parentSelWidget.getValue(),
				'deadline': this.ddlDateTime.getValue(),
				'ddlTime': this.ddlDateTime.getTimeVisible(),
				'priority': gel('prt').value
			};
			NS.taskManager.taskSave(task, newdata, function(d){
				d = d || {};
				var taskid = (d['id'] || 0)*1;

				setTimeout(function(){
					NS.navigator.taskView(taskid);
				}, 500);
			});
		}		
	};
	NS.TaskEditorWidget = TaskEditorWidget;

	// создать задачу
	NS.API.showCreateTaskPanel = function(ptaskid){
		NS.navigator.taskCreate(ptaskid);
	};

	NS.API.showTaskEditorPanel = function(taskid){
		NS.navigator.taskEdit(taskid);
	};
};