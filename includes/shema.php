<?php
/**
 * Схема таблиц данного модуля.
 * 
 * @version $Id$
 * @package Abricos
 * @subpackage Botask
 * @copyright Copyright (C) 2011 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author  Alexander Kuzmin (roosit@abricos.org)
 */

$charset = "CHARACTER SET 'utf8' COLLATE 'utf8_general_ci'";
$updateManager = CMSRegistry::$instance->modules->updateManager; 
$db = CMSRegistry::$instance->db;
$pfx = $db->prefix;

$uprofileManager = CMSRegistry::$instance->modules->GetModule('uprofile')->GetManager(); 

if ($updateManager->isInstall()){

	$uprofileManager->FieldAppend('lastname', 'Фамилия', UserFieldType::STRING, 100);
	$uprofileManager->FieldAppend('firstname', 'Имя', UserFieldType::STRING, 100);
	$uprofileManager->FieldCacheClear();
	
	CMSRegistry::$instance->modules->GetModule('botask')->permission->Install();

	// Задачи
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_task (
		  `taskid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор задачи',
		  `parenttaskid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор родительской задачи',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор автора',
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Название',
		  `contentid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор контента',
		  `pubkey` varchar(32) NOT NULL DEFAULT '' COMMENT 'Уникальный ключ задачи',
		  `dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата создания',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',

		  `statusid` int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Статус задачи',
		  
		  `execuserid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Исполнитель на текущий статус',
		  `execdate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Время принятия на исполнение',
		  
		  `deadline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Срок выполнения',
		  `deadlinebytime` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Срок выполнения - уточнение времени',
		  
		  `closedate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Фактическая дата завершения задачи',
		  
		  PRIMARY KEY  (`taskid`)
		)".$charset
	);

	// Участие пользователей в задаче
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_userrole (
		  `userroleid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  `taskid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  PRIMARY KEY  (`userroleid`), 
		  UNIQUE KEY `task` (`taskid`,`userid`)
		  
		)".$charset
	);
	
}

?>