/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
        {name: 'botask', files: ['lib.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}', '{C#COMNAME}']);

	var buildTemplate = this.buildTemplate;
	
	var TeamUserListWidget = function(container, config){
		config = L.merge({
		}, config || {});
		this.init(container, config);
	};
	TeamUserListWidget.prototype = {
		init: function(container, config){
			this.config = config;
			
			this.selectedUserId = null;
			this.filter = null;
			this._users = [];
			this.userSelectChangedEvent = new YAHOO.util.CustomEvent("userSelectChangedEvent");
 			
			buildTemplate(this, 'widget,user');
			var TM = this._TM;
			container.innerHTML = TM.replace('widget');
			
			var __self = this; 
			E.on(TM.getEl('widget.id'), 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
			
			this.render();
		},
		destroy: function(){
			var el = this._TM.getEl('widget.id');
			el.parentNode.removeChild(el);
		},
		render: function(){
			var TM = this._TM,  
				users = {},
				isFilter = !L.isNull(this.filter);
			
			var fetchUsers = function(tk){
				for (var i=0;i<tk.users.length;i++){
					var uid = tk.users[i]*1;
					users[uid] = !users[uid] ? 1 : users[uid]+1;
				}
			};
			
			if (!isFilter){
				NS.taskManager.list.foreach(function(tk){
					fetchUsers(tk);
				}, false);
			}else{
				fetchUsers(this.filter);
			}
			
			var a = [];
			for (var n in users){
				if (isFilter || (!isFilter && Brick.env.user.id*1 != n*1)){
						a[a.length] = {'uid': n, 'count': users[n]};
				}
			}
			a = a.sort(function(u1, u2){
				if (u1.count > u2.count){ return -1; }
				if (u1.count < u2.count){ return 1; }
				return 0;
 			});
			this._users = a;
			
			var lst = "";
			for (var i=0;i<a.length;i++){
				var user = NS.taskManager.users.get(a[i]['uid']);
				lst += TM.replace('user', {
					'avatar': user.avatar24(true),
					'uid': user.id, 'unm': user.getUserName()
				});
			}
			TM.getEl('widget.table').innerHTML = lst;
			TM.getEl('widget.cnt').innerHTML = a.length;
			TM.getEl('widget.tl').innerHTML = LNG['boxtitle'][isFilter ? 'filter' : 'all'];
			
			if (lst == ""){
				Dom.setStyle(TM.getEl('widget.empty'), 'display', '');
			}else{
				Dom.setStyle(TM.getEl('widget.empty'), 'display', 'none');
			}
		},
		shBox: function(){
			this._isHide = !this._isHide;
			
			var TM = this._TM,
				el = TM.getEl('widget.id'),
				elBody = TM.getEl('widget.boxbody');
			if (this._isHide){
				Dom.replaceClass(el, 'boxstshow', 'boxsthide');
				Dom.setStyle(elBody, 'opacity', 0.9);
			}else{
				Dom.replaceClass(el, 'boxsthide', 'boxstshow');
				Dom.setStyle(elBody, 'opacity', 1);
			}
		},
		onClick: function(el){
			var TId = this._TId, tp = TId['widget'];
			
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");

			switch(prefix){
			case (TId['user']['intask']+'-'):
				this.selectUser(el['checked'] ? numid : null);
				return false;
			}
			
			switch(el.id){
			case tp['head']: case tp['info']: case tp['tl']: case tp['shbox']:
				this.shBox();
				return true;
			}
			return false;
		},
		selectUser: function (userid){
			if (this.selectedUserId == userid){ return; }
			
			var TId = this._TId;
			
			// снять другие выделения
			var a = this._users;
			for (var i=0;i<a.length;i++){
				var uid = a[i]['uid'];
				if (uid == userid){ continue; }
				var elCheck = Dom.get(TId['user']['intask']+'-'+uid);
				elCheck.checked = '';
			}
			
			this.selectedUserId = userid;
			this.userSelectChangedEvent.fire();
		},
		setFilter: function(task){
			this.selectUser(null);
			this.filter = task;
			this.render();
		}
	};
	NS.TeamUserListWidget = TeamUserListWidget;
};