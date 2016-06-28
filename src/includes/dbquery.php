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
			SELECT *
            FROM ".$db->prefix."btk_resolutionInTask
			WHERE ".implode(" OR ", $aw)."
		";
        return $db->query_read($sql);
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

    public static function FileAppend(Ab_Database $db, $taskid, $filehash, $userid){
        $sql = "
			INSERT INTO ".$db->prefix."btk_file (taskid, filehash, userid) VALUES
			(
				".intval($taskid).",
				'".bkstr($filehash)."',
				".intval($userid)."
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


    /******************************************************/
    // TODO: refactoring source
    /******************************************************/

    const TASK_FIELDS = "
		p.taskid as id,
		p.parenttaskid as pid,
		p.tasktype as tp,
		p.userid as uid,
		p.title as tl,
		p.dateline as dl,
		p.updatedate as udl,
		p.deadline as ddl,
		p.deadlinebytime as ddlt,
		p.status as st,
		p.statuserid as stuid,
		p.statdate as stdl,
		p.priority as prt,
		
		ur.viewdate as vdl,
		IF (ur.viewdate > 0, 0, 1) as n,
		ur.ord as o,
		ur.favorite as f,
		ur.expanded as e,
		ur.showcomments as c
	";

    private static function BoardWhere($lastupdate = 0, $parenttaskid = 0, $status = 0){
        $where = "";
        if ($lastupdate > 0){
            $where = " AND p.updatedate >= ".intval($lastupdate);
        }
        if ($parenttaskid > 0){
            $where .= " AND p.parenttaskid = ".intval($parenttaskid);
        }
        return $where;
    }

    /**
     * Список доступных пользователю задач
     *
     * @param Ab_Database $db
     * @param integer $userid
     * @param integer $lastupdate
     */
    public static function Board(Ab_Database $db, $userid, $lastupdate = 0, $parenttaskid = 0, $status = 0, $page = 0, $limit = 0){
        $limit = "";
        $where = BotaskQuery::BoardWhere($lastupdate, $parenttaskid, $status);
        $sql = "
			SELECT
				".BotaskQuery::TASK_FIELDS.",
				cmtl.commentid as cmtv,
				(
					SELECT lastCommentid as cmtid
					FROM ".$db->prefix."comment_ownerstat cmt
					WHERE p.taskid=cmt.ownerid AND cmt.ownerModule='botask' AND cmt.ownerType='task'
					LIMIT 1
				) as cmt
			FROM ".$db->prefix."btk_userrole ur
			INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
			LEFT JOIN ".$db->prefix."comment_userview cmtl
			    ON p.taskid=cmtl.ownerid AND cmtl.ownerModule='botask' AND cmtl.ownerType='task'
			        AND cmtl.userid=".intval($userid)."
			WHERE ur.userid=".intval($userid)." AND p.deldate=0 ".$where."
		";
        return $db->query_read($sql);
    }


    public static function BoardOnline(Ab_Database $db, $userid){
        $sql = "
			SELECT * 
			FROM (
				SELECT
					".BotaskQuery::TASK_FIELDS.",
					cmtl.commentid as cmtv,
					(
						SELECT commentid as cmtid
						FROM ".$db->prefix."cmt_comment cmt
						WHERE p.contentid=cmt.contentid
						ORDER BY commentid DESC
						LIMIT 1
					) as cmt
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				LEFT JOIN ".$db->prefix."cmt_lastview cmtl ON p.contentid=cmtl.contentid AND cmtl.userid=".intval($userid)."
				WHERE ur.userid=".intval($userid)." AND p.deldate=0
			) a
			WHERE a.cmt > a.cmtv OR a.n > 0
		";
        return $db->query_read($sql);
    }

    /**
     * Список задач доступные этому пользователю, включая свои,
     * со списком пользователей на каждую задачу
     *
     * @param Ab_Database $db
     * @param unknown_type $userid
     */
    public static function BoardTaskUsers(Ab_Database $db, $userid, $lastupdate = 0, $parenttaskid = 0, $status = 0, $page = 0, $limit = 0){
        $where = BotaskQuery::BoardWhere($lastupdate, $parenttaskid, $status);
        $sql = "
			SELECT
				CONCAT(ur1.taskid,'-',ur1.userid) as id,
				ur1.taskid as tid,
				ur1.userid as uid
			FROM (
				SELECT ur.taskid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".intval($userid)." AND p.deldate=0 ".$where."
			) ps
			LEFT JOIN ".$db->prefix."btk_userrole ur1 ON ps.taskid=ur1.taskid
			WHERE ur1.userid>0
		";
        return $db->query_read($sql);
    }

    /**
     * Список пользователей участвующих на доске проектов, включая закрытые и удаленные проекты
     *
     * @param Ab_Database $db
     * @param unknown_type $userid
     */
    public static function BoardUsers(Ab_Database $db, $userid, $lastupdate = 0, $autors = array()){
        $where = "";
        if ($lastupdate > 0){
            $where = " AND p.updatedate >= ".intval($lastupdate);
        }

        $whereu = "";
        $whereun = "";
        if (is_array($autors) && count($autors) > 0){
            $sa = array();
            $san = array();
            foreach ($autors as $id => $v){
                $sa[] = " u.userid = ".intval($id);
                $san[] = " u.userid <> ".intval($id);
            }
            $whereu = "WHERE ".implode(" OR ", $sa);
            $whereun = "WHERE ".implode(" OR ", $san);
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
				WHERE ur.userid=".intval($userid)." AND p.deldate=0 ".$where."
			) ps
			LEFT JOIN ".$db->prefix."btk_userrole ur1 ON ps.taskid=ur1.taskid
			INNER JOIN ".$db->prefix."user u ON ur1.userid=u.userid
			".$whereun."
		";

        if (!empty($whereu)){
            $sql .= "
				UNION
				SELECT
					DISTINCT
					u.userid as id,
					u.username as unm,
					u.firstname as fnm,
					u.lastname as lnm,
					u.avatar as avt
				FROM ".$db->prefix."user u
				".$whereu."
			";
        }

        return $db->query_read($sql);
    }

    public static function MyUserData(Ab_Database $db, $userid, $retArray = false){
        $sql = "
			SELECT
				DISTINCT
				u.userid as id,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				u.avatar as avt
			FROM ".$db->prefix."user u
			WHERE u.userid=".intval($userid)."
			LIMIT 1
		";
        return $retArray ? $db->query_first($sql) : $db->query_read($sql);
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
				".TIMENOW.",
				".intval($h->parenttaskid).",
				".intval($h->parenttaskidc).",
				'".bkstr($h->title)."',
				".intval($h->titlec).",
				'".bkstr($h->body)."',
				".intval($h->bodyc).",

				'".bkstr($h->imagedata)."',
				".intval($h->imagedatac).",

				'".bkstr($h->check)."',
				".intval($h->checkc).",
				".intval($h->deadline).",
				".intval($h->deadlinec).",
				".intval($h->deadlinebytime).",
				".intval($h->deadlinebytimec).",

				".intval($h->status).",
				".intval($h->prevstatus).",
				".intval($h->statuserid).",

				".intval($h->priority).",
				".intval($h->priorityc).",

				'".bkstr($h->useradded)."',
				'".bkstr($h->userremoved)."'
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

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

    public static function TaskAppend(Ab_Database $db, $tk, $pubkey){
        $sql = "
			INSERT INTO ".$db->prefix."btk_task (
				userid, parenttaskid, tasktype, title, status, statdate, pubkey, body,
				deadline, deadlinebytime, dateline, updatedate, priority) VALUES (
				".intval($tk->uid).",
				".intval($tk->pid).",
				".intval($tk->typeid).",
				'".bkstr($tk->tl)."',
				".BotaskStatus::TASK_OPEN.",
				".TIMENOW.",
				'".bkstr($pubkey)."',
				'".bkstr($tk->bd)."',
				".intval($tk->ddl).",
				".intval($tk->ddlt).",
				".TIMENOW.",
				".TIMENOW.",
				".intval($tk->prt)."
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

    public static function TaskUpdate(Ab_Database $db, $tk, $userid){
        $sql = "
			UPDATE ".$db->prefix."btk_task
			SET
				title='".bkstr($tk->tl)."',
				body='".bkstr($tk->bd)."',
				parenttaskid=".intval($tk->pid).",
				deadline=".intval($tk->ddl).",
				deadlinebytime=".intval($tk->ddlt).",
				updatedate=".TIMENOW.",
				priority=".intval($tk->prt)."
			WHERE taskid=".intval($tk->id)."
		";
        $db->query_write($sql);
    }

    public static function TaskSetStatus(Ab_Database $db, $taskid, $status, $statuserid){
        $sql = "
			UPDATE ".$db->prefix."btk_task
			SET
				status=".intval($status).",
				statuserid=".intval($statuserid).",
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

    public static function TaskShowComments(Ab_Database $db, $taskid, $userid, $value){
        $sql = "
			UPDATE ".$db->prefix."btk_userrole
			SET showcomments=".intval($value)."
			WHERE taskid=".intval($taskid)." AND userid=".intval($userid)."
			LIMIT 1
		";
        $db->query_write($sql);
    }

    public static function CommentList(Ab_Database $db, $userid){
        $sql = "
			SELECT 
				a.commentid as id,
				a.parentcommentid as pid,
				t1.taskid as tkid,
				a.body as bd, 
				a.dateedit as de,
				a.status as st, 
				u.userid as uid, 
				u.username as unm,
				u.avatar as avt,
				u.firstname as fnm,
				u.lastname as lnm
			FROM ".$db->prefix."cmt_comment a
			INNER JOIN (SELECT
					p.taskid, 
					p.contentid
				FROM ".$db->prefix."btk_userrole ur
				INNER JOIN ".$db->prefix."btk_task p ON p.taskid=ur.taskid
				WHERE ur.userid=".intval($userid).") t1 ON t1.contentid=a.contentid
			LEFT JOIN ".$db->prefix."user u ON u.userid = a.userid
			ORDER BY a.commentid DESC  
			LIMIT 15
		";
        return $db->query_read($sql);
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

    public static function CheckListAppend(Ab_Database $db, $taskid, $userid, $title){
        $sql = "
			INSERT INTO ".$db->prefix."btk_checklist (taskid, userid, title, dateline) VALUES (
				".intval($taskid).",
				".intval($userid).",
				'".bkstr($title)."',
				".TIMENOW."
			)
		";
        $db->query_write($sql);
        return $db->insert_id();
    }

    public static function CheckListRemove(Ab_Database $db, $userid, $chid){
        $sql = "
			UPDATE ".$db->prefix."btk_checklist
			SET deldate=".TIMENOW.",
				deluserid=".intval($userid)."
			WHERE checklistid=".intval($chid)."
		";
        $db->query_write($sql);
    }

    public static function CheckListRestore(Ab_Database $db, $userid, $chid){
        $sql = "
			UPDATE ".$db->prefix."btk_checklist
			SET deldate=0, deluserid=0
			WHERE checklistid=".intval($chid)."
		";
        $db->query_write($sql);
    }

    public static function CheckListUpdate(Ab_Database $db, $userid, $chid, $title){
        $sql = "
			UPDATE ".$db->prefix."btk_checklist
			SET title='".bkstr($title)."',
				upddate=".TIMENOW.",
				upduserid=".intval($userid)."
			WHERE checklistid=".intval($chid)."
		";
        $db->query_write($sql);
    }

    public static function CheckListCheck(Ab_Database $db, $userid, $chid, $check){
        $sql = "
			UPDATE ".$db->prefix."btk_checklist
			SET checked=".(!empty($check) ? 1 : 0).",
				checkdate=".TIMENOW.",
				checkuserid=".intval($userid)."
			WHERE checklistid=".intval($chid)."
		";
        $db->query_write($sql);
    }


    public static function CustatusListByUser(Ab_Database $db, $userid){
        $sql = "
			SELECT DISTINCT title as tl
			FROM ".$db->prefix."btk_custatus
			WHERE userid=".intval($userid)."
		";
        return $db->query_read($sql);
    }

    public static function CustatusSave(Ab_Database $db, $taskid, $userid, $title){
        $sql = "
			REPLACE ".$db->prefix."btk_custatus (taskid, userid, title, dateline) VALUES (
				".intval($taskid).",
				".intval($userid).",
				'".bkstr($title)."',
				".TIMENOW."
			)
		";
        $db->query_write($sql);
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
