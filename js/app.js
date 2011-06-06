/*
@version $Id$
@copyright Copyright (C) 2008 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = { 
	mod:[{name: 'webos', files: ['os.js']}]
};
Component.entryPoint = function(){
	
	if (Brick.Permission.check('botask', '10') != 1){ return; }
	
	var os = Brick.mod.webos;
	
	var app = new os.Application(this.moduleName);
	app.icon = '/modules/botask/images/app_icon.gif';
	app.entryComponent = 'board';
	app.entryPoint = 'Brick.mod.botask.API.showBoardPanelWebos';
	
	os.ApplicationManager.register(app);
};
