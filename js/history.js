/*
@version $Id: board.js 956 2011-04-01 12:59:08Z roosit $
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
        {name: 'uprofile', files: ['viewer.js']},
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

	var UP = Brick.mod.uprofile;
	
	var LNG = Brick.util.Language.getc('mod.botask.history');


	Brick.util.CSS.update(Brick.util.CSS['botask']['history']);
	
	var buildTemplate = function(w, ts){w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;};

	var HistoryWidget = function(container, history){
		this.init(container, history);
	};
	HistoryWidget.prototype = {
		init: function(container, history){
			buildTemplate(this, 'widget,item,act1,act2,act3,act4');
			container.innerHTML = this._TM.replace('widget');
			this.history = history || NS.taskManager.history;
			
			var __self = this;
			E.on(container, 'click', function(e){
                var el = E.getTarget(e);
                if (__self.onClick(el)){ E.preventDefault(e); }
	        });
			
			this.render();
		},
		render: function(){
			var TM = this._TM,
				tman = NS.taskManager,
				lst = "";
			
			var task, user;
			this.history.foreach(function(hst){
				task = tman.list.find(hst.taskid);
				user = tman.users[hst.userid];
				
				lst += TM.replace('item', {
					'tl': task.title,
					'act': TM.replace('act'+hst.htype),
					'tid': task.id,
					'dl': Brick.dateExt.convert(hst.date.getTime()/1000),
					'uid': user.id,
					'unm': UP.builder.getUserName(user, true)
				});
			});
			TM.getEl('widget.list').innerHTML = lst;
		},
		onClick: function(el){
			if (el.id == this._TId['widget']['bmore']){
				this.loadMore();
				return true;
			}
			return false;
		},
		loadMore: function(){
			var TM = this._TM;
			var elB = TM.getEl('widget.bmore'),
				elL = TM.getEl('widget.load');
			Dom.setStyle(elB, 'display', 'none');
			Dom.setStyle(elL, 'display', '');
		}
	};
	NS.HistoryWidget = HistoryWidget;
};