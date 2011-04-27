/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'sys', files: ['container.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'comment', files: ['comment.js']},
        {name: 'botask', files: ['lib.js']}
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
	
	var UP = Brick.mod.uprofile,
		LNG = Brick.util.Language.getc('mod.botask');
	
	var initCSS = false,
		buildTemplate = function(w, ts){
		if (!initCSS){
			Brick.util.CSS.update(Brick.util.CSS['botask']['comments']);
			initCSS = true;
		}
		w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;
	};
	
	var LastCommentsPanel = function(){
		LastCommentsPanel.superclass.constructor.call(this, {
			fixedcenter: true, width: '790px', height: '400px'
		});
	};
	YAHOO.extend(LastCommentsPanel, Brick.widget.Panel, {
		initTemplate: function(){
			buildTemplate(this, 'panel,comment,task');
			
			return this._TM.replace('panel');
		},
		onLoad: function(){
			
			this.gmenu = new NS.GlobalMenuWidget(this._TM.getEl('panel.gmenu'), 'comments');

			this.builder = new Brick.mod.comment.CommentManager(true);
			this.loadLastComments();
		},
		loadLastComments: function(){
			var __self = this
			NS.taskManager.ajax({'do': 'lastcomments'}, function(r){ 
				__self.updateList(r);
			});
		},
		updateList: function(r){
			if (!L.isObject(r)){ return false; }
			
			var TM = this._TM, lst = "";
			
			var tpath = function(arr, task){
				
				if (!L.isNull(task.parent)){
					tpath(arr, task.parent);
				}
				
				arr[arr.length] = TM.replace('task', {
					'id': task.id,
					'tl': task.title
				});
			};
			
			var cmts = [];
			for (var id in r){ cmts[cmts.length] = r[id]; }
			cmts = cmts.sort(function(a, b){
				if (a.de*1 > b.de*1){ return -1; }
				if (a.de*1 < b.de*1){ return 1; }
				return 0;
			});
			for (var i=0;i<cmts.length;i++){
				var item = cmts[i],
					task = NS.taskManager.list.find(item['tkid']),
					arr = [];
				tpath(arr, task);
				lst += TM.replace('comment', {
					'nav': arr.join(' / '),
					'cmt': this.builder.buildHTML(item)
				});
			}
			
			TM.getEl('panel.comments').innerHTML = lst;
		}
	});

	API.showLastCommentsPanel = function(){
		NS.buildTaskManager(function(tm){
			new LastCommentsPanel();
		});
	};

};