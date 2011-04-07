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

	var HistoryWidget = function(container, history, cfg){
		this.init(container, history, cfg);
	};
	HistoryWidget.prototype = {
		init: function(container, history, cfg){
			buildTemplate(this, 'widget,item,act1,act2,act3,act4,hd,fhd');
			container.innerHTML = this._TM.replace('widget');

			this.cfg = L.merge({
				'taskid': 0,
				'pagerow': 5,
				'page': 1
			}, cfg || {});
			this.history = history || NS.taskManager.history;

			var __self = this;
			E.on(container, 'click', function(e){
                var el = E.getTarget(e);
                if (__self.onClick(el)){ E.preventDefault(e); }
	        });
			
			this.render();
			
			NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
		},
		destroy: function(){
			NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
		},
		onHistoryChanged: function(type, args){
			var taskid = this.cfg['taskid']*1,
				isRender = taskid == 0;
			
			if (!isRender){
				args[0].foreach(function(hst){
					if (hst['taskid']*1 == taskid*1){
						isRender = true;
						return true;
					}
				});
			}
			if (isRender){
				this.render();
			}
		},
		buildRow: function(hst){
			var TM = this._TM,
				tman = NS.taskManager,
				task = tman.list.find(hst.taskid),
				user = tman.users[hst.userid];
			
			var shead = "";
			if (this.cfg['taskid']*1 > 0){
				var sht = "",
					LNGA = LNG['act'],
					HT = NS.HType;
				switch(hst.htype){
				case HT.TASK_OPEN: sht = LNGA['new']; break;
				case HT.TASK_UPDATE:
					
					var fa = [];
					if (hst.isTitle){fa[fa.length] = LNGA['title'];}
					if (hst.isDescript){fa[fa.length] = LNGA['descript'];}
					if (hst.isDeadline || hst.isDdlTime){fa[fa.length] = LNGA['deadline'];}

					if (hst.userAdded.length > 0 || hst.userRemoved.length > 0 ){fa[fa.length] = LNGA['users'];}

					if (hst.isStatus){
						var TS = NS.TaskStatus;
						if (hst.status == TS.CLOSE){
							fa[fa.length] = LNGA['close'];
						}else if (hst.status == TS.ACCEPT){
							fa[fa.length] = LNGA['st_accept'];
						}else if (hst.status == TS.OPEN){
							if (hst.pstatus == TS.ACCEPT){
								fa[fa.length] = LNGA['st_unaccept'];
							}
						}
					}
					sht = fa.join('<br />');
					break;
				}
				
				shead = TM.replace('fhd', {'ht': sht});
			}else{
				shead = TM.replace('hd', {
					'act': TM.replace('act'+hst.htype),
					'tl': task.title,
					'tid': task.id
				});
			}
			
			return TM.replace('item', {
				'tl': task.title,
				'tid': task.id,
				'hd': shead,
				'dl': Brick.dateExt.convert(hst.date.getTime()/1000),
				'uid': user.id,
				'unm': UP.builder.getUserName(user, true)
			});
		},
		render: function(){
			var __self = this,
				lst = "";
			
			var cfg = this.cfg, counter = 1, limit = cfg['pagerow']*cfg['page'];
			this.history.foreach(function(hst){
				lst += __self.buildRow(hst);
				if (counter >= limit){ return true; }
				counter++;
			});
			this._TM.getEl('widget.list').innerHTML = lst;
			
			if (this.history.isFullLoaded){
				Dom.setStyle(this._TM.getEl('widget.more'), 'display', 'none');
			}
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
				elL = TM.getEl('widget.load'),
				history = this.history;

			var cfg = this.cfg; 
			cfg['page']++;
			
			var counter = 1, limit = cfg['pagerow']*cfg['page'];
			
			var isLoad = limit > history.count();

			if (!isLoad && cfg['taskid']*1 == 0){
				
				// кол-во в кеше достаточно, но может быть это кеш кусков загруженных задач?
				history.foreach(function(hst){
					if (history.firstLoadedId > hst.id){
						isLoad = true;
						return true;
					}
				});
			}
			
			if (isLoad){
				var __self = this;
				Dom.setStyle(elB, 'display', 'none');
				Dom.setStyle(elL, 'display', '');
				
				NS.taskManager.loadHistory(history, cfg['taskid'], function(){
					Dom.setStyle(elB, 'display', '');
					Dom.setStyle(elL, 'display', 'none');
					__self.render();
				});
			}else{
				this.render();
			}
			
			TM.getEl('widget.end').scrollIntoView(true);
		}
	};
	NS.HistoryWidget = HistoryWidget;
};