<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskQuery
 */
class BotaskQuery {

    public static function TaskList(Ab_Database $db){
        $sql = "
			SELECT
			    p.taskid as id,
                p.parenttaskid as pid,
                p.tasktype as tp,
                p.userid as uid,

                p.status as st,
                p.statdate as stdl,

                p.title as tl,
                p.priority as prt,

                p.dateline as dl,
                p.updatedate as udl,
                p.deldate as rdl
			FROM ".$db->prefix."btk_userrole ur
			INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
			WHERE ur.userid=".intval(Abricos::$user->id)." AND p.deldate=0
		";
        return $db->query_read($sql);
    }

    public static function HistoryLastId(Ab_Database $db){
        $sql = "
			SELECT h.historyid as id
			FROM ".$db->prefix."btk_userrole ur
			INNER JOIN ".$db->prefix."btk_task p ON ur.taskid=p.taskid
			INNER JOIN ".$db->prefix."btk_history h ON ur.taskid=h.taskid
			WHERE ur.userid=".intval(Abricos::$user->id)." AND p.deldate=0
			ORDER BY h.dateline DESC
			LIMIT 1
		";
        return $db->query_first($sql);
    }

    public static function Task(Ab_Database $db, $taskid){
        $sql = "
			SELECT
                p.taskid as id,
                p.parenttaskid as pid,
                p.tasktype as tp,
                p.userid as uid,

                p.status as st,
                p.statdate as stdl,

                p.title as tl,
                p.priority as prt,

                p.dateline as dl,
                p.updatedate as udl,
                p.deldate as rdl,
				p.body as bd
			FROM ".$db->prefix."btk_task p
			INNER JOIN ".$db->prefix."btk_userrole ur ON p.taskid=ur.taskid AND ur.userid=".intval(Abricos::$user->id)."
			WHERE p.taskid=".intval($taskid)."
			LIMIT 1
		";
        return $db->query_first($sql);
    }

    public static function TaskFavoriteUpdate(Ab_Database $db, $taskid, $value){
        $sql = "
			UPDATE ".$db->prefix."btk_userrole
			SET favorite=".intval($value)."
			WHERE taskid=".intval($taskid)." AND userid=".intval(Abricos::$user->id)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    /* * * * * * * * * * * * * * * * Users * * * * * * * * * * * * * * */

    public static function UserRole(Ab_Database $db, $taskid){
        $sql = "
			SELECT *
			FROM ".$db->prefix."btk_userrole ur
			WHERE ur.taskid=".intval($taskid)." AND ur.userid=".intval(Abricos::$user->id)."
			LIMIT 1
		";
        return $db->query_first($sql);
    }

    public static function UserRoleList(Ab_Database $db, $taskIds){
        $count = count($taskIds);
        if ($count === 0){
            return null;
        }

        $aw = array();
        for ($i = 0; $i < $count; $i++){
            $aw[] = "taskid=".intval($taskIds[$i]);
        }

        $sql = "
			SELECT *
            FROM ".$db->prefix."btk_userrole ur
			WHERE ".implode(" OR ", $aw)."
		";
        return $db->query_read($sql);
    }

    public static function UserRoleAppend(Ab_Database $db, $taskid, $userid){
        $sql = "
			INSERT IGNORE INTO ".$db->prefix."btk_userrole (taskid, userid) VALUES
			(
				".intval($taskid).",
				".intval($userid)."
			)
		";
        $db->query_write($sql);
    }

    public static function UserRoleRemove(Ab_Database $db, $taskid, $userid){
        $sql = "
			DELETE FROM ".$db->prefix."btk_userrole
			WHERE taskid=".intval($taskid)." AND userid=".intval($userid)."
		";
        $db->query_write($sql);
    }

    public static function UserRoleAllRemove(Ab_Database $db, $taskid){
        $sql = "
			DELETE FROM ".$db->prefix."btk_userrole
			WHERE taskid=".intval($taskid)."
		";
        $db->query_write($sql);
    }

    public static function UserFriendList(Ab_Database $db){
        $sql = "
			SELECT DISTINCT u.userid as id
			FROM (
				SELECT DISTINCT ur.taskid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".intval(Abricos::$user->id)." AND p.deldate=0 
			) ps
			LEFT JOIN ".$db->prefix."btk_userrole ur1 ON ps.taskid=ur1.taskid
			INNER JOIN ".$db->prefix."user u ON ur1.userid=u.userid
		";

        return $db->query_read($sql);
    }

    /* * * * * * * * * * * * * * * * Resolution * * * * * * * * * * * * * * */

    public static function ResolutionList(Ab_Database $db){
        $sql = "
            SELECT r.*
            FROM  ".$db->prefix."btk_resolution r
            WHERE r.userid=".intval(Abricos::$user->id)."
            
            UNION

			SELECT r.*
			FROM (
				SELECT ur.taskid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".intval(Abricos::$user->id)." AND p.deldate=0
			) t
			INNER JOIN ".$db->prefix."btk_resolutionInTask rt ON rt.taskid=t.taskid
            INNER JOIN ".$db->prefix."btk_resolution r ON r.resolutionid=rt.resolutionid
            WHERE r.userid<>".intval(Abricos::$user->id)."
		";
        return $db->query_read($sql);
    }

    public static function ResolutionInTaskList(Ab_Database $db, $taskIds){
        $count = count($taskIds);
        if ($count === 0){
            return null;
        }

        $aw = array();
        for ($i = 0; $i < $count; $i++){
            $aw[] = "taskid=".intval($taskIds[$i]);
        }

        $sql = "
			SELECT 
			  rin.*, 
			  r.userid as userid
            FROM ".$db->prefix."btk_resolutionInTask rin
            INNER JOIN ".$db->prefix."btk_resolution r ON r.resolutionid=rin.resolutionid
			WHERE ".implode(" OR ", $aw)."
		";
        return $db->query_read($sql);
    }

    public static function ResolutionAppend(Ab_Database $db, $value){
        $sql = "
			INSERT INTO ".$db->prefix."btk_resolution 
			(userid, title) VALUES (
				".intval(Abricos::$user->id).",
				'".bkstr($value)."'
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

    public static function ResolutionInTaskAppend(Ab_Database $db, $taskid, $resolid){
        $sql = "
			INSERT INTO ".$db->prefix."btk_resolutionInTask 
			(taskid, resolutionid, dateline) VALUES (
				".intval($taskid).",
				".intval($resolid).",
				".intval(TIMENOW)."
			)
		";
        $db->query_write($sql);
    }

    public static function ResolutionInTaskRemove(Ab_Database $db, $taskid, $resolid){
        $sql = "
            DELETE FROM ".$db->prefix."btk_resolutionInTask
            WHERE  taskid=".intval($taskid)." AND resolutionid=".intval($resolid)."
		";
        $db->query_write($sql);
    }

    /* * * * * * * * * * * * * * * * File * * * * * * * * * * * * * * */

    public static function FileList(Ab_Database $db, $taskid){
        $sql = "
			SELECT 
				bf.filehash as id,
				f.filename as nm,
				f.filesize as sz
			FROM ".$db->prefix."btk_file bf
			INNER JOIN ".$db->prefix."fm_file f ON bf.filehash=f.filehash
			WHERE bf.taskid=".intval($taskid)."
		";
        return $db->query_read($sql);
    }

    public static function FileAppend(Ab_Database $db, $taskid, $filehash){
        $sql = "
			INSERT INTO ".$db->prefix."btk_file (taskid, filehash, userid) VALUES
			(
				".intval($taskid).",
				'".bkstr($filehash)."',
				".intval(Abricos::$user->id)."
			)
		";
        $db->query_write($sql);
    }

    public static function FileRemove(Ab_Database $db, $taskid, $filehash){
        $sql = "
			DELETE FROM ".$db->prefix."btk_file
			WHERE taskid=".intval($taskid)." AND filehash='".bkstr($filehash)."' 
		";
        $db->query_write($sql);
    }

    /* * * * * * * * * * * * * * * * Image * * * * * * * * * * * * * * */

    public static function ImageList(Ab_Database $db, $taskid){
        $sql = "
			SELECT
				imageid as id,
				title as tl,
				data as d
			FROM ".$db->prefix."btk_image
			WHERE taskid=".intval($taskid)."
			ORDER BY imageid
		";
        return $db->query_read($sql);
    }

    public static function ImageAppend(Ab_Database $db, $taskid, $title, $data){
        $sql = "
			INSERT INTO ".$db->prefix."btk_image (taskid, title, data) VALUES (
				".intval($taskid).",
				'".bkstr($title)."',
				'".bkstr($data)."'
			)
		";
        $db->query_write($sql);
    }

    public static function ImageUpdate(Ab_Database $db, $imageid, $title, $data){
        $sql = "
			UPDATE ".$db->prefix."btk_image
			SET title='".bkstr($title)."',
				data='".bkstr($data)."'
				WHERE imageid=".intval($imageid)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    public static function ImageRemove(Ab_Database $db, $imageid){
        $sql = "
			DELETE FROM ".$db->prefix."btk_image
			WHERE imageid=".intval($imageid)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    /* * * * * * * * * * * * * * * * History * * * * * * * * * * * * * * */

    const HISTORY_FIELDS = "
		h.historyid 		as id,
		h.taskid 			as tid,
		h.taskid 			as sid,
		p.title 			as ttl,
		h.userid 			as uid,
		h.dateline 			as dl,

		h.parenttaskidc 	as ptidc,
		h.titlec 			as tlc,
		h.bodyc 			as bdc,
		h.checkc 			as chc,
		h.deadlinec 		as ddlc,
		h.deadlinebytimec 	as ddltc,
		h.useradded 		as usad,
		h.userremoved 		as usrm,

		h.status 			as st,
		h.prevstatus 		as pst,
		h.statuserid 		as stuid,
		h.priority 			as prt,
		h.priorityc			as prtc
	";

    public static function HistoryList(Ab_Database $db, $taskid, $firstHId = 0){
        $firstHId = intval($firstHId);
        $where = "";
        if ($firstHId > 0){
            $where = " AND h.historyid < ".$firstHId;
        }

        $sql = "
			SELECT
				".BotaskQuery::HISTORY_FIELDS."
			FROM ".$db->prefix."btk_history h
			INNER JOIN ".$db->prefix."btk_task p ON h.taskid=p.taskid
			WHERE h.taskid=".intval($taskid)." ".$where."
			ORDER BY h.dateline DESC
			LIMIT 100
		";
        return $db->query_read($sql);
    }

    public static function HistoryAppend(Ab_Database $db, BotaskHistory $h){
        $sql = "
			INSERT INTO ".$db->prefix."btk_history (
				taskid, userid, dateline,
				parenttaskid, parenttaskidc,
				title, titlec,
				body, bodyc,
				imagedata, imagedatac,
				checklist, checkc,
				deadline, deadlinec,
				deadlinebytime, deadlinebytimec,
				status,prevstatus,statuserid,
				priority,priorityc,
				useradded, userremoved) VALUES (

				".intval($h->taskid).",
				".intval($h->userid).",
				".intval(TIMENOW).",
				".intval($h->parentid).",
				".intval($h->parentChanged).",
				'".bkstr($h->title)."',
				".intval($h->titleChanged).",
				'".bkstr($h->body)."',
				".intval($h->bodyChanged).",

				'".bkstr($h->imageData)."',
				".intval($h->imageDataChanged).",

				'".bkstr($h->checks)."',
				".intval($h->checksChanged).",
				
				".intval($h->deadline).",
				".intval($h->deadlineChanged).",
				".intval($h->deadlineByTime).",
				".intval($h->deadlineByTimeChanged).",

				".intval($h->iStatus).",
				".intval($h->iParentStatus).",
				".intval($h->statusUserId).",

				".intval($h->priority).",
				".intval($h->priorityChanged).",

				'".bkstr($h->userAdded)."',
				'".bkstr($h->userRemoved)."'
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

    /* * * * * * * * * * * * * * * * Check List * * * * * * * * * * * * * * */

    public static function CheckList(Ab_Database $db, $taskid){
        $sql = "
			SELECT
				c.checklistid as id,
				c.userid as uid,
				c.dateline as dl,
				c.upddate as udl,
				c.upduserid as uuid,
				c.checked as ch,
				c.checkuserid as cuid,
				c.checkdate as cdl,
				c.title as tl,
				c.ord as o,
				c.deldate as ddl,
				c.deluserid as duid
			FROM ".$db->prefix."btk_checklist c 
			WHERE c.taskid=".intval($taskid)."
			ORDER BY c.ord DESC
		";
        return $db->query_read($sql);
    }

    public static function CheckAppend(Ab_Database $db, $taskid, BotaskCheck $check){
        $sql = "
			INSERT INTO ".$db->prefix."btk_checklist (taskid, userid, title, checked, dateline) VALUES (
				".intval($taskid).",
				".intval($check->userid).",
				'".bkstr($check->title)."',
				".intval($check->checked).",
				".TIMENOW."
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

    public static function CheckUpdate(Ab_Database $db, $taskid, BotaskCheck $check){
        $sql = "
			UPDATE ".$db->prefix."btk_checklist
			SET checked=".($check->checked ? 1 : 0).",
				checkdate=".intval($check->checkedDate).",
				checkuserid=".intval($check->checkedUserId).",
			
			    title='".bkstr($check->title)."',
				upddate=".intval($check->updateDate).",
				upduserid=".intval($check->updateUserId).",
				
				deldate=".intval($check->removeDate).",
				deluserid=".intval($check->removeUserId)."
			WHERE taskid=".intval($taskid)." 
			    AND checklistid=".intval($check->id)."
		";
        $db->query_write($sql);
    }

    /* * * * * * * * * * * * * * * * * * * OLD CODE * * * * * * * * * * * * * * * * * */

    /******************************************************/
    // TODO: refactoring source
    /******************************************************/


    public static function BoardHistory(Ab_Database $db, $userid, $lastHId = 0, $firstHId = 0){
        $lastHId = intval($lastHId);
        $firstHId = intval($firstHId);
        $where = "";
        if ($lastHId > 0){
            $where = " AND h.historyid > ".$lastHId;
        }
        if ($firstHId > 0){
            $where = " AND h.historyid < ".$firstHId;
        }

        $sql = "
			SELECT
				".BotaskQuery::HISTORY_FIELDS."
			FROM ".$db->prefix."btk_userrole ur
			INNER JOIN ".$db->prefix."btk_task p ON ur.taskid=p.taskid
			INNER JOIN ".$db->prefix."btk_history h ON ur.taskid=h.taskid
			WHERE ur.userid=".intval($userid)." AND p.deldate=0 ".$where."
			ORDER BY h.dateline DESC
			LIMIT 15
		";
        return $db->query_read($sql);
    }

    public static function TaskHistoryPrevStatus(Ab_Database $db, $taskid, $curst){
        $sql = "
			SELECT
				".BotaskQuery::HISTORY_FIELDS."
			FROM ".$db->prefix."btk_history h
			INNER JOIN ".$db->prefix."btk_task p ON h.taskid=p.taskid
			WHERE h.taskid=".intval($taskid)."
				AND h.status>0 AND h.status<>".intval($curst)."
			ORDER BY h.dateline DESC
			LIMIT 1
		";
        return $db->query_first($sql);
    }

    public static function ItemAppend(Ab_Database $db, $d, $pubkey){
        $sql = "
			INSERT INTO ".$db->prefix."btk_task (
				userid, parenttaskid, tasktype, title, status, statdate, pubkey, body,
				deadline, deadlinebytime, dateline, updatedate, priority) VALUES (
				".intval(Abricos::$user->id).",
				".intval($d->parentid).",
				".intval($d->typeid).",
				'".bkstr($d->title)."',
				".BotaskStatus::TASK_OPEN.",
				".TIMENOW.",
				'".bkstr($pubkey)."',
				'".bkstr($d->body)."',
				
				".intval($d->deadline).",
				".intval($d->deadlineTime).",
				".TIMENOW.",
				".TIMENOW.",
				".intval($d->priority)."
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

    public static function TaskUpdate(Ab_Database $db, $d){
        $sql = "
			UPDATE ".$db->prefix."btk_task
			SET
				title='".bkstr($d->title)."',
				body='".bkstr($d->body)."',
				parenttaskid=".intval($d->parentid).",
				deadline=".intval($d->deadline).",
				deadlinebytime=".intval($d->deadlineTime).",
				updatedate=".TIMENOW.",
				priority=".intval($d->priority)."
			WHERE taskid=".intval($d->id)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    public static function TaskSetStatus(Ab_Database $db, $taskid, $iStatus, $statusUserId){
        $sql = "
			UPDATE ".$db->prefix."btk_task
			SET
				status=".intval($iStatus).",
				statuserid=".intval($statusUserId).",
				statdate=".TIMENOW."
			WHERE taskid=".intval($taskid)."
		";
        $db->query_write($sql);
    }

    public static function TaskUnsetStatus(Ab_Database $db, $taskid){
        $sql = "
			UPDATE ".$db->prefix."btk_task
			SET status=".BotaskStatus::TASK_OPEN.", statuserid=0, statdate=0
			WHERE taskid=".intval($taskid)."
		";
        $db->query_write($sql);
    }

    /**
     * Список пользователей и их права на задачу
     *
     * @param Ab_Database $db
     * @param integer $taskid
     */
    public static function TaskUserList(Ab_Database $db, $taskid){
        $sql = "
			SELECT
				p.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm
			FROM ".$db->prefix."btk_userrole p
			INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.taskid=".intval($taskid)."
		";
        return $db->query_read($sql);
    }

    /**
     * Список участников проекта с расшириными полями для служебных целей (отправка уведомлений и т.п.)
     *
     * @param Ab_Database $db
     * @param integer $taskid
     */
    public static function TaskUserListForNotify(Ab_Database $db, $taskid){
        $sql = "
			SELECT
				p.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				u.email
			FROM ".$db->prefix."btk_userrole p
			INNER JOIN ".$db->prefix."user u ON p.userid=u.userid
			WHERE p.taskid=".intval($taskid)."
		";
        return $db->query_read($sql);
    }


    /**
     * Обновить информацию последнего просмотра задачи (для определения флага - Новая)
     *
     * @param Ab_Database $db
     * @param integer $taskid
     */
    public static function TaskUpdateLastView(Ab_Database $db, $taskid, $userid){
        $sql = "
			UPDATE ".$db->prefix."btk_userrole
			SET viewdate=".TIMENOW."
			WHERE taskid=".intval($taskid)." AND userid=".intval($userid)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    public static function TaskVoting(Ab_Database $db, $taskid, $userid, $value){
        $sql = "
			UPDATE ".$db->prefix."btk_userrole
			SET ord=".intval($value)."
			WHERE taskid=".intval($taskid)." AND userid=".intval($userid)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    public static function TaskExpand(Ab_Database $db, $taskid, $userid, $value){
        $sql = "
			UPDATE ".$db->prefix."btk_userrole
			SET expanded=".intval($value)."
			WHERE taskid=".intval($taskid)." AND userid=".intval($userid)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    public static function ToWork(Ab_Database $db, $userid, $fromtime){
        $sql = "
			SELECT
				h.historyid as id,
				h.taskid as sid,
				h.taskid as tid,
				h.dateline as dl,
				h.status as st,
				h.prevstatus as pst,
				h.statuserid as uid
			FROM ".$db->prefix."btk_userrole ur 
			INNER JOIN ".$db->prefix."btk_task p ON ur.taskid=p.taskid
			INNER JOIN ".$db->prefix."btk_history h ON ur.taskid=h.taskid
			WHERE ur.userid=".intval($userid)." AND p.deldate=0 AND h.dateline >= ".intval($fromtime)." AND
			(h.status = ".BotaskStatus::TASK_ACCEPT." OR h.prevstatus = ".BotaskStatus::TASK_ACCEPT.")
			ORDER BY h.dateline DESC
			LIMIT 500
		";
        return $db->query_read($sql);
    }


    /**
     * Очистить партию удаленных проектов из корзины.
     * Проект на очистку становиться по истечению 10 минут.
     *
     * @param Ab_Database $db
     */
    public static function TaskRemovedClearList(Ab_Database $db, $limit = 10){
        $time = TIMENOW - 10 * 60;
        $sql = "
			UPDATE ".$db->prefix."btk_task
			SET deldate=".TIMENOW."
			WHERE deldate=0
				AND status=".BotaskStatus::TASK_REMOVE."
				AND statdate<".$time."
			LIMIT ".intval($limit)."
		";
        $db->query_write($sql);

        $sql = "
			SELECT *
			FROM ".$db->prefix."btk_task
			WHERE deldate>0
			LIMIT ".intval($limit)."
		";
        return $db->query_read($sql);
    }

    public static function TaskRemovedChildList(Ab_Database $db, $taskid){
        $sql = "
			SELECT *
			FROM ".$db->prefix."btk_task
			WHERE parenttaskid=".intval($taskid)."
				AND status=".BotaskStatus::TASK_REMOVE."
		";
        return $db->query_read($sql);
    }

    public static function TaskRemovedClear(Ab_Database $db, $taskid){
        $sql = "
			DELETE FROM ".$db->prefix."btk_task
			WHERE taskid=".intval($taskid)."
		";
        $db->query_write($sql);
    }

}
