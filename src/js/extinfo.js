/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
        {name: '{C#MODNAME}', files: ['history.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var UID = Brick.env.user.id;
	
	var buildTemplate = this.buildTemplate;
	
	var ExtInfo = function(container, task){
		this.init(container, task);
	};
	ExtInfo.prototype = {
		init: function(container, task){
			var TM = buildTemplate(this, 'extinfo');
			container.innerHTML = TM.replace('extinfo');
			
			this.historyWidget = new NS.HistoryWidget(TM.getEl('extinfo.history'), task.history, {'pagerow': 3});
			this.custatusWidget = new NS.CustomStatusWidget(TM.getEl('extinfo.custatus'), task);
		}
	};
	NS.ExtInfo = ExtInfo;
	
	var SelectMyStatusListWidget = function(container, task, callback){
		this.init(container, task, callback);
	};
	SelectMyStatusListWidget.prototype = {
		init: function(container, task, callback){
			this.task = task;
			this.callback = callback;
			var TM = buildTemplate(this, 'myw,myrow');
			
			var lst = "", mys = task.custatus.my;
			for (var i=0;i<mys.length;i++){
				lst += TM.replace('myrow', {
					'id': i,
					'tl': mys[i]['tl']
				});
			}
			
			container.innerHTML = TM.replace('myw', {'rows': lst});
		},
		onClick: function(el){
			var prefix = el.id.replace(/([0-9]+$)/, ''),
				numid = el.id.replace(prefix, "");
			
			switch(prefix){
			case this._TId['myrow']['id']+'-':
				this.onSelect(numid);
				return true;
			}
		},
		onSelect: function(id){
			var my = this.task.custatus.my[id];
			NS.life(this.callback, my);
		}
	};
	NS.SelectMyStatusListWidget = SelectMyStatusListWidget;
	
	var CustomStatusWidget = function(container, task){
		this.init(container, task);
	};
	CustomStatusWidget.prototype = {
		init: function(container, task){
			this.task = task;
			
			this.myList = null;
			
			var TM = buildTemplate(this, 'cstat,user,editor,slrow');
			container.innerHTML = TM.replace('cstat');
			
			var __self = this;
			E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});

			this.render();
		},
		destroy: function(){ },
		onClick: function(el){
			var TId = this._TId, tp = TId['cstat'];
			switch(el.id){
			case tp['bsave']: this.save(); return true;
			case tp['bcancel']: this.cancel(); return true;
			case TId['editor']['val']:
				this.onEditorClick(el);
				return true;
			}
			
			return false;
		},
		getSt: function(uid){
			return this.task.custatus.list[uid] || {'tl': ''};
		},
		render: function(){
			var TM = this._TM, tk = this.task, lst = "";
			var users = NS.taskManager.users;
			var __self = this;
			
			var buildRow = function(user){
				return TM.replace('user', {
					'avatar': user.avatar24(true),
					'uid': user.id, 'unm': user.getUserName(),
					'status': user.id == UID ? TM.replace('editor') : __self.getSt(user.id)['tl']
				});
			};
			
			lst += buildRow(users.get(UID));

			for (var i=0;i<tk.users.length;i++){
				var user = users.get(tk.users[i]);
				if (user.id != UID){
					lst += buildRow(user);
				}
			}
			TM.getEl('cstat.list').innerHTML = lst;
			
			var elVal = TM.getEl('editor.val');
			elVal.value = this.getSt(UID)['tl'];
			
			E.on(elVal, 'keyup', function(e){
                __self.onEditorChange();
			});
		},
		shSelect: function(show){
			var TM = this._TM, __self = this, elSel = TM.getEl('cstat.sel');
			Dom.setStyle(elSel, 'display', show ? '' : 'none');
			
			if (show && L.isNull(this.myList)){
				this.myList = new SelectMyStatusListWidget(TM.getEl('cstat.sel'), this.task, function(my){
					if (!my){ return;}
					TM.getEl('editor.val').value = my['tl'];
					__self.updateSaveStatus();
				});
				
				var bodyClick = null;
				bodyClick = function(e){
					var el = E.getTarget(e), 
						elEd = TM.getEl('editor.val');
					if (L.isNull(elEd)){
						E.removeListener(document.body, 'click', bodyClick);
						return;
					}
					
					if (elEd.id == el.id){ return; }
					__self.myList.onClick(el);
	                __self.shSelect(false);
				};
				
				E.on(document.body, 'click', bodyClick);
				
			}
		},
		onEditorClick: function(el){
			this.shSelect(true);
		},
		onEditorChange: function(){
			this.updateSaveStatus();
			this.shSelect(false);
		},
		updateSaveStatus: function(){
			var TM = this._TM, el = TM.getEl('editor.val'),
				elBtns = TM.getEl('cstat.btns'),
				tk = this.task;
			
			var cst = tk.custatus.list[UID] || {'tl': ''},
				cval = cst['tl'];

			if (cval != el.value){
				Dom.setStyle(elBtns, 'display', '');
			}else{
				Dom.setStyle(elBtns, 'display', 'none');
			}
		},
		save: function(){
			var TM = this._TM, gel = function(n){ return TM.getEl('cstat.'+n);};
			var __self = this;

			Dom.setStyle(gel('bact'), 'display', 'none');
			Dom.setStyle(gel('saved'), 'display', '');
			var sd = {
				'taskid': this.task.id,
				'title': TM.getEl('editor.val').value
			};
			NS.taskManager.custatusSave(this.task, sd, function(){
				Dom.setStyle(gel('bact'), 'display', '');
				Dom.setStyle(gel('saved'), 'display', 'none');
				__self.updateSaveStatus();
			});
		},
		cancel: function(){
			var TM = this._TM;
			TM.getEl('editor.val').value = this.getSt(UID)['tl'];
			this.updateSaveStatus();
		}
	};
	NS.CustomStatusWidget = CustomStatusWidget;
};