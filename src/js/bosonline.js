/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = { };
Component.entryPoint = function(NS){
	
	if (!Brick.mod.bos && Brick.mod.bos.onlineManager){ 
		return; 
	}
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var buildTemplate = this.buildTemplate;
	
	var OnlineWidget = function(container, rs){
		OnlineWidget.superclass.constructor.call(this, container, rs);
	};
	YAHOO.extend(OnlineWidget, Brick.mod.bos.OnlineWidget, {
		init: function(container, rs){
			
			var nta = [], nca = [];
			
			for (var i=0;i<rs.length;i++){
				var di = rs[i];
				if (di['n']*1>0){
					nta[nta.length] = di;
				}else{
					nca[nca.length] = di;
				}
			}
			
			var TM = buildTemplate(this, 'widget,item,gnew,gnewcmt'), lst = "";
			
			var buildItem = function(di){
				lst += TM.replace('item', {
					'id': di['id'],
					'tl': di['tl']
				});
			};
			
			if (nta.length > 0){ lst += TM.replace('gnew'); }
			for (var i=0;i<nta.length;i++){
				buildItem(nta[i]);
			}
			if (nca.length > 0){ lst += TM.replace('gnewcmt'); }
			for (var i=0;i<nca.length;i++){
				buildItem(nca[i]);
			}
			
			container.innerHTML = TM.replace('widget', {
				'lst': lst
			});
		}
	});
	NS.OnlineWidget = OnlineWidget;
	
	
	Brick.mod.bos.onlineManager.register('{C#MODNAME}', OnlineWidget);
};