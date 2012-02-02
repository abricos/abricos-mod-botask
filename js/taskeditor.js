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
        {name: 'botask', files: ['lib.js', 'roles.js', 'calendar.js', 'checklist.js']},
        {name: 'filemanager', files: ['attachment.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var UP = Brick.mod.uprofile;
	
	var TMG = this.template,
		initCSS = false,
		buildTemplate = function(w, ts){
		if (!initCSS){
			Brick.util.CSS.update(Brick.util.CSS['{C#MODNAME}']['{C#COMNAME}']);
			delete Brick.util.CSS['{C#MODNAME}']['{C#COMNAME}'];
			initCSS = true;
		}
		w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;
	};
	
	var TaskEditorWidget = function(container, task){
		this.init(container, task);
	};
	TaskEditorWidget.prototype = {
		init: function(container, task){
			this.task = task;
			
			buildTemplate(this, 'widget,tree,node');
			var TM = this._TM;
			
			container.innerHTML = TM.replace('widget', {
				'pid': L.isNull(task.parent) ? 0 : task.parent.id,
				'ptitle': L.isNull(task.parent) ? '' : task.parent.title
			});
			this.onLoad();
		},
		onLoad: function(){
			var TM = this._TM,
				gel = function(n){ return TM.getEl('widget.'+n); };
				task = this.task;
			
			Dom.setStyle(TM.getEl('widget.tl'+(task.id*1 > 0 ? 'new' : 'edit')), 'display', 'none');
			
			// путь
			var getPT = function(tk){
				var tl = tk.title;
				if (!L.isNull(tk.parent)){ tl = getPT(tk.parent)+" / "+tl; }
				return tl;
			};
			var isChild = function(tk){
				if (tk.id == task.id){ return true; }
				if (!L.isNull(tk.parent)){ return isChild(tk.parent); }
				return false;
			};
			
			var lst = "";
			NS.taskManager.list.foreach(function(tk){
				if (tk.id == task.id || isChild(tk)){ return; }
				lst += TM.replace('node', {
					'id': tk.id,
					'tl': getPT(tk)
				});
				tk.childs.foreach();
			}, false, NS.taskSort['name']);
			
			gel('path').innerHTML = TM.replace('tree', {'rows': lst});
			TM.getEl('tree.id').value = L.isNull(task.parent) ? 0 : task.parent.id;
			

			gel('tl').value = task.title;
			TM.getEl('widget.editor').innerHTML = task.descript;

			var Editor = Brick.widget.Editor;
			this.editor = new Editor(this._TId['widget']['editor'], {
				width: '750px', height: '350px', 'mode': Editor.MODE_VISUAL
			});
			
			this.checklist = new NS.ChecklistWidget(TM.getEl('widget.checklist'), task, {
				'hidebtn': true,
				'hideinfo': true
			});
			this.checklist.update();
			
			if (Brick.Permission.check('filemanager', '30') == 1){
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
			
			Dom.setStyle(gel('bsave'), 'display', 'none');
			Dom.setStyle(gel('bsavei'), 'display', 'none');
			
			Dom.setStyle(gel('bcancel'), 'display', 'none');
			Dom.setStyle(gel('bcanceli'), 'display', 'none');
			
			Dom.setStyle(gel('loading'), 'display', '');
			Dom.setStyle(gel('loadingi'), 'display', '');
			
			users[users.length] = Brick.env.user.id;
			
			var newdata = {
				'title': gel('tl').value,
				'descript': this.editor.getContent(),
				'checks': this.checklist.getSaveData(),
				'files': L.isNull(this.filesWidget) ? task.files : this.filesWidget.files,
				'users': users,
				'parentid': TM.getEl('tree.id').value,
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