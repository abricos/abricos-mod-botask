<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

$charset = "CHARACTER SET 'utf8' COLLATE 'utf8_general_ci'";
$updateManager = Ab_UpdateManager::$current;
$db = Abricos::$db;
$pfx = $db->prefix;

if ($updateManager->isInstall()){

    Abricos::GetModule('botask')->permission->Install();

    // Задачи
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_task (
		  taskid int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор задачи',
		  parenttaskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор родительской задачи',
		  tasktype int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Тип записи: 1-раздел, 2-проект, 3-задача',
		  userid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор автора',

		  title varchar(250) NOT NULL DEFAULT '' COMMENT 'Название',
          body text NOT NULL COMMENT 'Запись',

		  pubkey varchar(32) NOT NULL DEFAULT '' COMMENT 'Уникальный ключ задачи',

		  dateline int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата создания',
		  deldate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
		  updatedate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата обновления',
		  
		  priority tinyint(1) unsigned NOT NULL DEFAULT 3 COMMENT 'Приоритет: 1-срочно, 2-важно, 3-нормально, 4-не срочно, 5-не важно',
		  
		  isstartdate tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Использовать дату старта',
		  startdate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата старта',
		  startdatebytime tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата старта - уточнение времени',

		  deadline int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Срок выполнения',
		  deadlinebytime tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Срок выполнения - уточнение времени',
		  
		  status int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Текущий статус задачи - значения BotaskStatus',
		  statuserid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Пользователь текущего статуса',
		  statdate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/Время текущего статуса',
		  
		  PRIMARY KEY  (taskid)
		)".$charset
    );

    // Участие пользователей в задаче
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_userrole (
		  userroleid int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  taskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  userid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  viewdate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата последнего просмотра',
		  ord int(5) NOT NULL DEFAULT 0 COMMENT 'Вес этой задачи по мнению пользователя',
		  favorite tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Избранное',
		  expanded tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Развернуты подзадачи',
		  readed tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT '',
		  deldate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
		  PRIMARY KEY  (userroleid), 
		  UNIQUE KEY task (taskid,userid)
		)".$charset
    );

    // Хранение истории
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_history (
		  historyid int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор роли',
		  taskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  userid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  dateline int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время',
		  
		  parenttaskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор родительской задачи',
		  parenttaskidc tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',

		  status int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Новый/текущий статус задачи',
		  prevstatus int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Предыдущий статус задачи',
		  statuserid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Пользователь для статуса',
		  
		  priority tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Сохраненный приоритет',
		  priorityc tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  title varchar(250) NOT NULL DEFAULT '' COMMENT 'Сохраненная версия названия',
		  titlec tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  body TEXT NOT NULL  COMMENT 'Сохраненная версия контента',
		  bodyc tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  imagedata TEXT NOT NULL  COMMENT 'Сохраненная версия зарисовки',
		  imagedatac tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  deadline int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Сохраненный срок выполнения',
		  deadlinec tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  deadlinebytime tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Сохраненный срок выполнения - уточнение времени',
		  deadlinebytimec tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен',
		  
		  useradded varchar(250) NOT NULL DEFAULT '' COMMENT 'Добавленные пользователи',
		  userremoved varchar(250) NOT NULL DEFAULT '' COMMENT 'Удаленные пользователи',

		  hicomment TEXT NOT NULL  COMMENT 'Комментарий к этому изменению',
		  
		  PRIMARY KEY  (historyid)
		)".$charset
    );
}

if ($updateManager->isUpdate('0.1.1')){

    $db->query_write("
		ALTER TABLE ".$pfx."btk_history
			ADD checklist TEXT NOT NULL  COMMENT 'Сохраненная версия чеклиста',
			ADD checkc tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен'
	");


    // добавление чеклиста к задаче. чеклист - нечто подобное микрозадачи.
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_checklist (
		  checklistid int(10) unsigned NOT NULL auto_increment COMMENT '',
		  taskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  userid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя ',
		  dateline int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время',
		  checked tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Выполнена',
		  checkuserid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя ',
		  checkdate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время выполнения',
		  title TEXT NOT NULL COMMENT 'Название группы',
		  ord int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Сортировка',
		  upddate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время обновления',
		  upduserid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя ',
		  deldate int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время удаления',
		  deluserid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  PRIMARY KEY  (checklistid)
		)".$charset
    );

}

if ($updateManager->isUpdate('0.1.2')){

    // Файлы задачи
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_file (
		  fileid int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор',
		  taskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор задачи',
		  userid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор пользователя',
		  filehash varchar(8) NOT NULL DEFAULT '' COMMENT 'Идентификатор файла таблицы fm_file',
		  PRIMARY KEY  (fileid), 
		  UNIQUE KEY file (taskid,filehash)
		)".$charset
    );

}

if ($updateManager->isUpdate('0.2.2') && !$updateManager->isInstall()){
    $db->query_write("
		ALTER TABLE ".$pfx."btk_task
		ADD tasktype int(2) unsigned NOT NULL DEFAULT 0 COMMENT 'Тип записи: 1-раздел, 2-проект, 3-задача'
	");
    $db->query_write("UPDATE ".$pfx."btk_task SET tasktype=3");

    $db->query_write("
		ALTER TABLE ".$pfx."btk_history
		ADD imagedata TEXT NOT NULL  COMMENT 'Сохраненная версия зарисовки',
		ADD imagedatac tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT 'Параметр изменен'
	");

}
if ($updateManager->isUpdate('0.2.2')){

    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_image (
			imageid int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор',
			taskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Идентификатор',
			title varchar(250) NOT NULL DEFAULT '' COMMENT 'Название',
			data TEXT NOT NULL  COMMENT '',
		PRIMARY KEY  (imageid)
		)".$charset
    );
}

if ($updateManager->isUpdate('0.3.1')){
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_resolution (
            resolutionid int(10) unsigned NOT NULL auto_increment COMMENT '',
		  	userid int(10) unsigned NOT NULL DEFAULT 0 COMMENT '',
		  	title varchar(250) NOT NULL DEFAULT '' COMMENT '',
            PRIMARY KEY (resolutionid),
            KEY userid (userid)
		)".$charset
    );
    $db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."btk_resolutionInTask (
            resolutionInTaskId int(10) unsigned NOT NULL auto_increment COMMENT '',
			taskid int(10) unsigned NOT NULL DEFAULT 0 COMMENT '',
		  	resolutionid int(10) unsigned NOT NULL DEFAULT 0 COMMENT '',
			dateline int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата/время',
            PRIMARY KEY (resolutionInTaskId),
            KEY taskid (taskid)
		)".$charset
    );
}

if ($updateManager->isUpdate('0.3.1') && !$updateManager->isInstall()){

    $db->query_write("
        INSERT INTO ".$pfx."btk_resolution (userid, title)
        SELECT DISTINCT userid, title
        FROM ".$pfx."btk_custatus
	");

    $db->query_write("
        INSERT INTO ".$pfx."btk_resolutionInTask (taskid, resolutionid, dateline)
        SELECT 
            s.taskid, 
            r.resolutionid,
            s.dateline
        FROM ".$pfx."btk_custatus s
        INNER JOIN ".$pfx."btk_resolution r ON r.title=s.title AND r.userid=s.userid
	");

    $db->query_write("DROP TABLE ".$pfx."btk_custatus");

    Abricos::GetModule('comment');

    $db->query_write("
		ALTER TABLE ".$pfx."btk_task
		ADD body text NOT NULL COMMENT 'Запись'
	");

    $db->query_write("
		UPDATE ".$pfx."btk_task t
		INNER JOIN ".$pfx."content c ON c.contentid=t.contentid
		SET t.body=c.body
	");

    $db->query_write("
		UPDATE ".$pfx."comment_owner o
		INNER JOIN ".$pfx."btk_task t ON t.contentid=o.ownerid
		    AND o.ownerModule='botask' AND o.ownerType='content'
		SET
		    o.ownerid=t.taskid,
		    o.ownerType='task'
	");

    $db->query_write("
		UPDATE ".$pfx."comment_ownerstat o
		INNER JOIN ".$pfx."btk_task t ON t.contentid=o.ownerid
		    AND o.ownerModule='botask' AND o.ownerType='content'
		SET
		    o.ownerid=t.taskid,
		    o.ownerType='task'
	");

    $db->query_write("DELETE FROM ".$pfx."content WHERE modman='botask'");

    $db->query_write("
		ALTER TABLE ".$pfx."btk_task
		DROP contentid
	");

    $db->query_write("
		ALTER TABLE ".$pfx."btk_userrole
		DROP showcomments,
		DROP meilhistory,
		DROP meilcomment,
		ADD readed tinyint(1) unsigned NOT NULL DEFAULT 0 COMMENT ''
	");

    $db->query_write("
		UPDATE ".$pfx."btk_userrole
		SET readed=1
	");
}
