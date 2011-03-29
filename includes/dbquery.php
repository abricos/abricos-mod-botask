<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Botask
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

class BotaskQuery {
	
	/**
	 * Список доступных пользователю задач
	 * 
	 * @param CMSDatabase $db
	 * @param integer $userid
	 */
	public static function Board(CMSDatabase $db, $userid){
		// задачи доступные этому пользователю
		$sql = "
			SELECT
				p.taskid as id,
				p.parenttaskid as pid,
				p.userid as uid,
				p.title as tl
			FROM ".$db->prefix."btk_userrole ur
			INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
			WHERE ur.userid=".bkint($userid)." AND p.deldate=0
		";
		return $db->query_read($sql);
	}
	
	/**
	 * Список задач доступные этому пользователю, включая свои,
	 * со списком пользователей на каждую задачу
	 * 
	 * @param CMSDatabase $db
	 * @param unknown_type $userid
	 */
	public static function BoardTaskUsers(CMSDatabase $db, $userid){
		$sql = "
			SELECT
				CONCAT(ur1.taskid,'-',ur1.userid) as id,
				ur1.taskid as tid,
				ur1.userid as uid
			FROM (
				SELECT ur.taskid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".bkint($userid)." AND p.deldate=0
			) ps
			LEFT JOIN ".$db->prefix."btk_userrole ur1 ON ps.taskid=ur1.taskid
			WHERE ur1.userid>0
		";
		return $db->query_read($sql);
	}
	
	public static function Task(CMSDatabase $db, $taskid, $retarray = false){
		$sql = "
			SELECT
				p.taskid as id,
				p.userid as uid,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				p.title as tl,
				c.body as bd,
				p.contentid as ctid,
				p.dateline as dl
			FROM ".$db->prefix."btk_task p
			INNER JOIN ".$db->prefix."content c ON p.contentid=c.contentid
			LEFT JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.taskid=".bkint($taskid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function TaskAppend(CMSDatabase $db, $tk, $pubkey){
		$contentid = CoreQuery::ContentAppend($db, $tk->bd, 'botask');
		
		$sql = "
			INSERT INTO ".$db->prefix."btk_task (userid, parenttaskid, title, pubkey, contentid, dateline) VALUES (
				".bkint($tk->uid).",
				".bkint($tk->pid).",
				'".bkstr($tk->tl)."',
				'".bkstr($pubkey)."',
				".$contentid.",
				".TIMENOW."
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function TaskUpdate(CMSDatabase $db, $tk){
		$info = BotaskQuery::Task($db, $tk->id, true);
		CoreQuery::ContentUpdate($db, $info['ctid'], $tk->bd);
		$sql = "
			UPDATE ".$db->prefix."btk_task
			SET
				title='".bkstr($tk->tl)."',
				parenttaskid=".bkint($tk->pid)."
			WHERE taskid=".bkint($tk->id)."
		";
		$db->query_write($sql);
	}
	

	/**
	 * Список пользователей и их права на задачу
	 * @param CMSDatabase $db
	 * @param integer $taskid
	 */
	public static function TaskUserList(CMSDatabase $db, $taskid){
		$sql = "
			SELECT 
				p.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm
			FROM ".$db->prefix."btk_userrole p
			INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.taskid=".bkint($taskid)."
		";
		return $db->query_read($sql);
	}
	
	public static function UserRoleAppend(CMSDatabase $db, $taskid, $userid){
		$sql = "
			INSERT INTO ".$db->prefix."btk_userrole (taskid, userid) VALUES
			(
				".bkint($taskid).",
				".bkint($userid)."
			)
		";
		$db->query_write($sql);
	}
	
	public static function UserRole(CMSDatabase $db, $taskid, $userid, $retarray = false){
		$sql = "
			SELECT
				ur.userroleid as id
			FROM ".$db->prefix."btk_userrole ur
			WHERE ur.taskid=".bkint($taskid)." AND ur.userid=".bkint($userid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	
	/*
	public static function UserRoleUpdate(CMSDatabase $db, $taskid, $userid){
		$sql = "
			UPDATE ".$db->prefix."btk_userrole
			SET isread=".bkint($isRead).",
				iswrite=".bkint($isWrite)."
			WHERE taskid=".bkint($taskid)." AND userid=".bkint($userid)."
		";
		$db->query_write($sql);
	}
	/**/
	
	public static function UserRoleRemove(CMSDatabase $db, $taskid, $userid){
		$sql = "
			DELETE FROM ".$db->prefix."btk_userrole
			WHERE taskid=".bkint($taskid)." AND userid=".bkint($userid)." 
		";
		$db->query_write($sql);
	}
}

?>