/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template,
		R = NS.roles;
	
	var initCSS = false, buildTemplate = function(w, ts){
		if (!initCSS){
			Brick.util.CSS.update(Brick.util.CSS['botask']['checklist']);
			delete Brick.util.CSS['botask']['checklist'];
			initCSS = true;
		}
		w._TM = TMG.build(ts); w._T = w._TM.data; w._TId = w._TM.idManager;
	};
	
	var ChecklistWidget = function(container, task, config){
		config = L.merge({
			'hidebtn': false,
			'hideinfo': false
		}, config || {});
		this.init(container, task, config);
	};
	ChecklistWidget.prototype = {
		init: function(container, task, config){
			this.config = config;
			this.task = task;
			this.hideRecycle = true;

			this.list = [];
			
			this.changedEvent = new YAHOO.util.CustomEvent("changedEvent");
			
			buildTemplate(this, 'widget');
			
			var TM = this._TM;
			
			container.innerHTML = TM.replace('widget');
			this.elTable = TM.getEl('widget.table');
			this.elRecTable = TM.getEl('widget.rectable');
			this.elBAdd = TM.getEl('widget.badd');
			
			var __self = this;
			E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){ E.preventDefault(e); }
			});
			
			E.on(container, 'keypress', function(e){
				if (__self.onKeyPress(e, E.getTarget(e))){ E.stopEvent(e); }
			});
		},
		onKeyPress: function(e, el){
			var ret = false;
			this.foreach(function(ch){
				if (!ch.onKeyPress(e, el)){ return;  }
				return ret = true; 
			});
			
			return ret;
		},
		onClick: function(el){
			var tp = this._TId['widget'];
			switch(el.id){
			case tp['badd']: this.addCheck(); return true;
			case tp['bsave']: this.save(); return true;
			case tp['bcancel']: this.cancel(); return true;
			case tp['brecshow']: this.recShow(); return true;
			case tp['brechide']: this.recHide(); return true;
			
			}
			var ret = false;
			this.foreach(function(ch){
				if (!ch.onClick(el)){ return;  }
				ret = true;
				return true; 
			});
			
			return ret;
		},
		recHide: function(){
			this.hideRecycle = true;
			this.updateRecShowHide();
		},
		recShow: function(){
			this.hideRecycle = false;
			this.updateRecShowHide();
		},
		updateRecShowHide: function(){
			var TM = this._TM, hd = this.hideRecycle;
			Dom.setStyle(TM.getEl('widget.rectable'), 'display', hd ? 'none' : '');
			Dom.setStyle(TM.getEl('widget.brechide'), 'display', hd ? 'none' : '');
			Dom.setStyle(TM.getEl('widget.brecshow'), 'display', hd ? '' : 'none');
		},
		addCheck: function(check){
			var ch = new CheckrowWidget(this, check);
			this.list[this.list.length] = ch;
			return ch;
		},
		_shButtons: function(show){
			if (this.config['hidebtn']){
				show = false;
			}
			this._TM.getEl('widget.btnlst').style.display = show ? '' : 'none';
		},
		onChanged: function(){
			this.changedEvent.fire();
			this._shButtons(true);
		},
		foreach: function(f){
			if (!L.isFunction(f)){ return; }
			var lst = this.list;
			for (var i=0;i<lst.length;i++){
				if (f(lst[i])){ return; }
			}
		},
		getSaveData: function(){
			var sd = [];
			this.foreach(function(ch){
				if (ch.isDestroyed()){ return; }
				sd[sd.length] = ch.data;
			});
			return sd;
		},
		save: function(){
			this._shButtons();
			
			var sd = this.getSaveData();
			
			NS.taskManager.checkListSave(this.task.id, sd, function(){
				// __self._shLoading(false);
			});
		},
		cancel: function(){
			this._shButtons();
			this.update();
		},
		update: function(){
			// обновить список
			this.foreach(function(ch){
				ch.destroy();
			});
			this.list = [];
			
			var checks = this.task.checks;
			var reccnt = 0;
			for (var n in checks){
				var ch = this.addCheck(checks[n]);
				if (ch.isRemoved()){
					reccnt++;
				}
			}
			var TM = this._TM;
			Dom.setStyle(TM.getEl('widget.recycle'), 'display', reccnt > 0 ? '' : 'none');
			TM.getEl('widget.reccnt').innerHTML = reccnt;
		}
	};
	NS.ChecklistWidget = ChecklistWidget;
	
	var CheckrowWidget = function(owner, d){
		d = L.merge({
			'id': 0,
			'uid': Brick.env.user.id,
			'dl': Math.round((new Date()).getTime()/1000),
			'ch': 0,
			'cuid': 0,
			'cdl': 0,
			'udl': 0,
			'uuid': 0,
			'tl': '',
			'o': 0,
			'ddl': 0,
			'duid': 0
			
		}, d || {});
		this.init(owner, d);
	};
	CheckrowWidget.prototype = {
		init: function(owner, d){
			this._destroyed = false;
			this.owner = owner;

			var cfg = this.owner.config;
			
			this.data = this.cloneObj(d);
			buildTemplate(this, 'row,info');
			
			var de = Brick.dateExt,
				us = NS.taskManager.users,
				nUser = us.get(d['uid']), // создал
				uUser = us.get(d['uuid']), // изменил
				cUser = us.get(d['cuid']), // выполнил
				dUser = us.get(d['duid']); // удалил

			var TM = this._TM;
			
			var container = d['ddl']*1 > 0 ? owner.elRecTable : owner.elTable;
			
			container.innerHTML += TM.replace('row', {
				'info': cfg['hideinfo'] ? '' : TM.replace('info', {
					'inew': de.convert(d['dl']) + ', ' + nUser.getUserName(),
					'diupdate': L.isNull(uUser) ? 'none' : 'block',
					'iupdate': L.isNull(uUser) ? '' : (de.convert(d['udl']) + ', ' + uUser.getUserName()),

					'dicheck': L.isNull(cUser) ? 'none' : 'block',
					'icheck': L.isNull(cUser) ? '' : (de.convert(d['cdl']) + ', ' + cUser.getUserName()),

					'diremove': L.isNull(dUser) ? 'none' : 'block',
					'iremove': L.isNull(dUser) ? '' : (de.convert(d['ddl']) + ', ' + dUser.getUserName())
				}),

				'checked': this.data['ch']>0 ? 'checked="checked"' : ''
			});
			
			TM.getEl('row.text').innerHTML = d['tl'];
			this.updateCheckView();
			this.updateRemoveView();
			
			this._isEditMode = false;
			if (this.data['id']*1 == 0){
				this.setEditMode();
			}
		},
		cloneObj: function(o){
			var no = {};
			for (var n in o){ no[n] = o[n]; }
			return no;
		},
		destroy: function(){
			if (this._destroyed){ return; }
			var el = this._TM.getEl('row.id');
			if (!L.isNull(el)){
				el.parentNode.removeChild(el);
			}
			this._destroyed = true;
		},
		onClick: function(el){
			var tp = this._TId['row'];
			switch(el.id){
			case tp['text']: this.setEditMode(); return true;
			case tp['bcancel']: this.cancel(); return true;
			case tp['bsave']: this.setViewMode(); return true;
			case tp['checkbox']: this.onChecked(); return false;
			case tp['bremove']: this.remove(); return false;
			case tp['brestore']: this.restore(); return false;
			}
			return false;
		},
		cancel: function(){
			this.setViewMode(true);
		},
		isChecked: function(){
			return this._TM.getEl('row.checkbox').checked ? 1 : 0;
		},
		onChecked: function(){
			this.updateCheckView();
			this.data['ch'] = this.isChecked();
			this.owner.onChanged();
		},
		remove: function(){
			if (this.data['id']*1 == 0){
				this.destroy();
			}else{
				this.data['duid'] = Brick.env.user.id;
				this.data['ddl'] = Math.round((new Date()).getTime()/1000);
				this.updateRemoveView();
				this.owner.onChanged();
			}
		},
		restore: function(){
			this.data['duid'] = 0;
			this.data['ddl'] = 0;
			this.updateRemoveView();
			this.owner.onChanged();
		},
		isRemoved: function(){
			return this.data['duid']>0 && this.data['ddl']>0;
		},
		isDestroyed: function(){
			return this._destroyed;
		},
		updateRemoveView: function(){
			var el = this._TM.getEl('row.bg');
			
			if (this.isRemoved()){
				Dom.addClass(el, 'removed');
			}else{
				Dom.removeClass(el, 'removed');
			}
		},
		onKeyPress: function(e, el){
			if (el.id != this._TId['row']['input']){ return false; }
			if (e.keyCode != 13){ return false; }
			this.setViewMode();
			return true;
		},
		updateCheckView: function(){
			var el = this._TM.getEl('row.bg');
			
			if (this.isChecked()){
				Dom.replaceClass(el, 'uncheck', 'check');
			}else{
				Dom.replaceClass(el, 'check', 'uncheck');
			}
		},
		setEditMode: function(){ // установить режим редактирования
			if (this.isRemoved() || this._isEditMode){ return; }
			this._isEditMode = true;
			
			var TM = this._TM,
				elText = TM.getEl('row.text'),
				elBtnsc = TM.getEl('row.btnsc'),
				elInput = TM.getEl('row.input'),
				elAction = TM.getEl('row.action');
			
			var str = elText.innerHTML;
			this._oldText = str;
			str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
			str = str.replace(/<br \/>/gi, '\n');
			str = str.replace(/<br\/>/gi, '\n');
			str = str.replace(/<br>/gi, '\n');

			var rg = Dom.getRegion(elText);
			
			var w = Math.max(rg.width, 190),
				h = Math.max(rg.height, 10);
			
			elInput.value = str;
			
			Dom.setStyle(elText, 'display', 'none');
			Dom.setStyle(elBtnsc, 'display', 'none');
			Dom.setStyle(elAction, 'display', '');
			Dom.setStyle(elInput, 'height', h+'px');
			
			try{
				elInput.focus();
			}
			catch(e){}
			
	        E.addListener(elInput,"blur",this.onBlur, this, true);
		},
		onBlur: function(){
			this.setViewMode();
		},
		setViewMode: function(cancel){
			if (!this._isEditMode){ return; }
			this._isEditMode = false;

			var TM = this._TM,
				elText = TM.getEl('row.text'),
				elBtnsc = TM.getEl('row.btnsc'),
				elInput = TM.getEl('row.input'),
				elAction = TM.getEl('row.action');
			
			var str = elInput.value;
			str = str.replace(/</gi, '&lt;').replace(/>/gi, '&gt;').replace(/\n/gi, '<br />');

			var changed = false;
			if (!cancel){
				elText.innerHTML = str;
				changed = this._oldText != str;
			}

			Dom.setStyle(elText, 'display', '');
			Dom.setStyle(elBtnsc, 'display', '');
			Dom.setStyle(elAction, 'display', 'none');

	        E.removeListener(elInput, "blur", this.onBlur);
	        
			try{
				this.owner.elBAdd.focus();
			}
			catch(e){}

			if (changed){
				this.owner.onChanged();
			}
			
			this.data['tl'] = str;
			
			if (this.data['id']*1 == 0 && str.length == 0){
				this.remove();
			}
		}		
	};
	NS.CheckrowWidget = CheckrowWidget;

};