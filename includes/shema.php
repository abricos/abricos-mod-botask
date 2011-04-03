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
		  `updatedate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата обновления',
		  
		  `deadline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Срок выполнения',
		  `deadlinebytime` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Срок выполнения - уточнение времени',
		  
		  `status` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Текущий статус задачи - значения BotaskHistoryType',
		  `statuserid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Пользователь текущего статуса',
		  `statdate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/Время текущего статуса',
		  
		  PRIMARY KEY  (`taskid`)
		)".$charset
	);

	// Участие пользователей в задаче
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_userrole (
		  `userroleid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  `taskid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  `viewdate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата последнего просмотра',
		  `deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
		  PRIMARY KEY  (`userroleid`), 
		  UNIQUE KEY `task` (`taskid`,`userid`)
		  
		)".$charset
	);

	// Хранение истории
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_history (
		  `historyid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  `hitype` int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Тип записи - значения BotaskHistoryType',
		  `taskid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  `userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  `dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время',
		  
		  `parenttaskid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор родительской задачи',
		  `parenttaskidc` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  `title` varchar(250) NOT NULL DEFAULT '' COMMENT 'Сохраненная версия названия',
		  `titlec` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  `body` TEXT NOT NULL  COMMENT 'Сохраненная версия контента',
		  `bodyc` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  `deadline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Сохраненный срок выполнения',
		  `deadlinec` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  `deadlinebytime` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Сохраненный срок выполнения - уточнение времени',
		  `deadlinebytimec` tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  `useradded` varchar(250) NOT NULL DEFAULT '' COMMENT 'Добавленные пользователи',
		  `userremoved` varchar(250) NOT NULL DEFAULT '' COMMENT 'Удаленные пользователи',
		  
		  PRIMARY KEY  (`historyid`)
		)".$charset
	);
	
}

?>