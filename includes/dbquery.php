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
	 * @param integer $lastupdate
	 */
	public static function Board(CMSDatabase $db, $userid, $lastupdate = 0){
		$where = "";
		if ($lastupdate > 0){
			$where = " AND p.updatedate >= ".bkint($lastupdate);
		}
		$sql = "
			SELECT
				p.taskid as id,
				p.parenttaskid as pid,
				p.userid as uid,
				p.title as tl,
				p.dateline as dl,
				p.deadline as ddl,
				p.deadlinebytime as ddlt
			FROM ".$db->prefix."btk_userrole ur
			INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
			WHERE ur.userid=".bkint($userid)." AND p.deldate=0 ".$where."
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
	public static function BoardTaskUsers(CMSDatabase $db, $userid, $lastupdate = 0){
		$where = "";
		if ($lastupdate > 0){
			$where = " AND p.updatedate >= ".bkint($lastupdate);
		}
		$sql = "
			SELECT
				CONCAT(ur1.taskid,'-',ur1.userid) as id,
				ur1.taskid as tid,
				ur1.userid as uid
			FROM (
				SELECT ur.taskid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".bkint($userid)." AND p.deldate=0 ".$where."
			) ps
			LEFT JOIN ".$db->prefix."btk_userrole ur1 ON ps.taskid=ur1.taskid
			WHERE ur1.userid>0
		";
		return $db->query_read($sql);
	}
	
	/**
	 * Список пользователей участвующих на доске проектов
	 * 
	 * @param CMSDatabase $db
	 * @param unknown_type $userid
	 */
	public static function BoardUsers(CMSDatabase $db, $userid, $lastupdate = 0){
		$where = "";
		if ($lastupdate > 0){
			$where = " AND p.updatedate >= ".bkint($lastupdate);
		}
		$sql = "
			SELECT
				DISTINCT
				u.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				u.avatar as avt
			FROM (
				SELECT DISTINCT ur.taskid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".bkint($userid)." AND p.deldate=0 ".$where."
			) ps
			LEFT JOIN ".$db->prefix."btk_userrole ur1 ON ps.taskid=ur1.taskid
			INNER JOIN ".$db->prefix."user u ON ur1.userid=u.userid
		";
		return $db->query_read($sql);
	}
	
	public static function HistoryAppend(CMSDatabase $db, BotaskHistory $h) {
		$sql = "
			INSERT INTO ".$db->prefix."btk_history (
				hitype, taskid, userid, dateline, 
				parenttaskid, parenttaskidc,
				title, titlec,
				body, bodyc, 
				deadline, deadlinec, 
				deadlinebytime, deadlinebytimec,
				useradded, userremoved) VALUES (
				
				".bkint($h->hitype).",
				".bkint($h->taskid).",
				".bkint($h->userid).",
				".TIMENOW.",
				".bkint($h->parenttaskid).",
				".bkint($h->parenttaskidc).",
				'".bkstr($h->title)."',
				".bkint($h->titlec).",
				'".bkstr($h->body)."',
				".bkint($h->bodyc).",
				".bkint($h->deadline).",
				".bkint($h->deadlinec).",
				".bkint($h->deadlinebytime).",
				".bkint($h->deadlinebytimec).",
				'".bkstr($h->useradded)."',
				'".bkstr($h->userremoved)."'
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function BoardHistory(CMSDatabase $db, $userid, $lastHId = 0){
		$lastHId = bkint($lastHId);
		$where = "";
		if ($lastHId > 0){
			$where = " AND h.historyid > ".$lastHId;
		}
		$sql = "
			SELECT 
				h.historyid as id,
				h.hitype as tp,
				h.taskid as tid,
				h.userid as uid,
				h.dateline as dl,
				
				h.parenttaskidc as ptidc,
				h.titlec as tlc,
				h.bodyc as bdc,
				h.deadlinec as ddlc, 
				h.deadlinebytimec as ddltc
				
			FROM ".$db->prefix."btk_userrole ur 
			INNER JOIN ".$db->prefix."btk_task p ON ur.taskid=p.taskid
			INNER JOIN ".$db->prefix."btk_history h ON ur.taskid=h.taskid
			WHERE ur.userid=".bkint($userid)." AND p.deldate=0 ".$where."
			ORDER BY h.dateline DESC
			LIMIT ".($lastHId == 0 ? 15 : 300)." 
		";
		return $db->query_read($sql);
	}
	
	public static function TaskHistory(CMSDatabase $db, $taskid){
		$sql = "
			SELECT 
				h.historyid as id,
				h.hitype as tp,
				h.taskid as tid,
				h.userid as uid,
				h.dateline as dl,
				
				h.parenttaskidc as ptidc,
				h.titlec as tlc,
				h.bodyc as bdc,
				h.deadlinec as ddlc, 
				h.deadlinebytimec as ddltc
				
			FROM ".$db->prefix."btk_history h
			WHERE h.taskid=".bkint($taskid)."
			ORDER BY h.dateline DESC
			LIMIT 5 
		";
		return $db->query_read($sql);
	}
	
	public static function Task(CMSDatabase $db, $taskid, $retarray = false){
		$sql = "
			SELECT
				p.taskid as id,
				p.parenttaskid as pid,
				p.userid as uid,
				p.title as tl,
				c.body as bd,
				p.contentid as ctid,
				p.deadline as ddl,
				p.deadlinebytime as ddlt,
				p.dateline as dl
			FROM ".$db->prefix."btk_task p
			INNER JOIN ".$db->prefix."content c ON p.contentid=c.contentid
			WHERE p.taskid=".bkint($taskid)."
			LIMIT 1
		";
		return $retarray ? $db->query_first($sql) : $db->query_read($sql);
	}
	
	public static function TaskAppend(CMSDatabase $db, $tk, $pubkey){
		$contentid = CoreQuery::ContentAppend($db, $tk->bd, 'botask');
		
		$sql = "
			INSERT INTO ".$db->prefix."btk_task (
				userid, parenttaskid, title, pubkey, contentid, 
				deadline, deadlinebytime, dateline, updatedate) VALUES (
				".bkint($tk->uid).",
				".bkint($tk->pid).",
				'".bkstr($tk->tl)."',
				'".bkstr($pubkey)."',
				".$contentid.",
				".bkint($td->ddl).",
				".bkint($td->ddlt).",
				".TIMENOW.",
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
				parenttaskid=".bkint($tk->pid).",
				deadline=".bkint($tk->ddl).",
				deadlinebytime=".bkint($tk->ddlt).",
				updatedate=".TIMENOW."
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