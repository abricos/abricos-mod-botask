/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2008-2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.entryPoint = function(NS){
	NS.API.showBoardPanel = function(taskid){
		Brick.Page.reload('#app=botask/ws/showWorkspacePanel/');
	};
};