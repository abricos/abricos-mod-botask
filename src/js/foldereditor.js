/*
@version $Id: taskeditor.js 1527 2012-04-26 15:56:50Z roosit $
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['editor.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'botask', files: ['widgets.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var UP = Brick.mod.uprofile;
	
	var buildTemplate = this.buildTemplate;
	
	var FolderEditorWidget = function(container, task){
		this.init(container, task);
	};
	FolderEditorWidget.prototype = {
		init: function(container, task){
			this.task = task;
			
			var TM = buildTemplate(this, 'widget');
			
			container.innerHTML = TM.replace('widget', {
				'pid': L.isNull(task.parent) ? 0 : task.parent.id,
				'ptitle': L.isNull(task.parent) ? '' : task.parent.title
			});
			
			var TM = this._TM,
				gel = function(n){ return TM.getEl('widget.'+n); };
				task = this.task;
			
			Dom.setStyle(TM.getEl('widget.tl'+(task.id*1 > 0 ? 'new' : 'edit')), 'display', 'none');
			
			this.parentSelWidget = new NS.TaskTreeSelectWidget(gel('path'), L.isNull(task.parent) ? 0 : task.parent.id);
			
			gel('tl').value = task.title;

			var users = task.id*1==0 && !L.isNull(task.parent) ? task.parent.users : task.users;
			this.usersWidget = new UP.UserSelectWidget(gel('users'), users);
			
			var __self = this;
			E.on(TM.getEl('widget.id'), 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
		},
		destroy: function(){
			var elw = this._TM.getEl('widget.id');
			elw.parentNode.removeChild(elw);
		},
		onClick: function(el){
			var tp = this._TId['widget'];
			switch(el.id){
			
			case tp['bsave']: case tp['bsavei']: this.saveTask(); return true;
			case tp['bcancel']: case tp['bcanceli']: this.close(); return true;
			}
			return false;
		},
		close: function(){
			var tk = this.task;
			if (tk.id > 0){
				NS.navigator.folderView(tk.id);
			}else if (tk.id == 0 || !L.isNull(tk.parent)){
				NS.navigator.folderView(tk.parent.id);
			}else{
				NS.navigator.home();
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
			
			var newdata = {
				'type': 'folder',
				'title': gel('tl').value,
				'users': users,
				'parentid': this.parentSelWidget.getValue()
			};
			NS.taskManager.taskSave(task, newdata, function(d){
				d = d || {};
				var taskid = (d['id'] || 0)*1;

				setTimeout(function(){
					NS.navigator.folderView(taskid);
				}, 500);
			});
		}		
	};
	NS.FolderEditorWidget = FolderEditorWidget;
};