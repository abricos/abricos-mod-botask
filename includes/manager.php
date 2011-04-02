<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Botask
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

require_once 'dbquery.php';

class BotaskHistory {
	
	public $userid = 0;
	public $hitype = 0;
	public $taskid = 0;
	
	public $parenttaskid = 0;
	public $parenttaskidc = false;
	
	public $title = "";
	public $titlec = false;
	
	public $body = "";
	public $bodyc = false;
	
	public $deadline = 0;
	public $deadlinec = false;
	
	public $deadlinebytime = 0;
	public $deadlinebytimec = false;
	
	public $useradded = "";
	public $userremoved = "";
	
	public $change = false;
	
	private $userAddArray = array();
	private $userRemoveArray = array();
	
	public function BotaskHistory($userid){
		$this->userid = $userid;
	}
	
	public function CompareTask($nt, $ot){
		$this->hitype = BotaskHistoryType::TASK_UPDATE;
		
		if ($nt->tl != $ot['tl']){
			$this->title = $ot['tl'];
			$this->titlec = true;
			$this->change = true;
		}
		if ($nt->bd != $ot['bd']){
			$this->body = $ot['bd'];
			$this->bodyc = true;
			$this->change = true;
		}
		if (intval($nt->pid) != intval($ot['pid'])){
			$this->parenttaskid = $ot['pid'];
			$this->parenttaskidc = true;
			$this->change = true;
		}
		if (intval($nt->ddl) != intval($ot['ddl'])){
			$this->deadline = $ot['ddl'];
			$this->deadlinec = true;
			$this->change = true;
		}
		if (intval($nt->ddlt) != intval($ot['ddlt'])){
			$this->deadlinebytime = $ot['ddlt'];
			$this->deadlinebytimec = true;
			$this->change = true;
		}
	}
	
	public function UserAdd($uid){
		array_push($this->userAddArray, $uid);
		$this->useradded = implode(",", $this->userAddArray);
		$this->change = true;
	}
	
	public function UserRemove($uid){
		array_push($this->userRemoveArray, $uid);
		$this->userremoved = implode(",", $this->userRemoveArray);
		$this->change = true;
	}
	
	public function Save(){
		if ($this->hitype == BotaskHistoryType::TASK_UPDATE && !$this->change){ return; }
		BotaskQuery::HistoryAppend(CMSRegistry::$instance->db, $this);
	}
}

class BotaskManager extends ModuleManager {
	
	/**
	 * 
	 * @var BotaskModule
	 */
	public $module = null;
	
	/**
	 * User
	 * @var User
	 */
	public $user = null;
	public $userid = 0;
	
	/**
	 * @var BotaskManager
	 */
	public static $instance = null; 
	
	public function BotaskManager(BotaskModule $module){
		parent::ModuleManager($module);
		
		$this->user = CMSRegistry::$instance->modules->GetModule('user');
		$this->userid = $this->user->info['userid'];
		BotaskManager::$instance = $this;
	}
	
	public function IsAdminRole(){
		return $this->module->permission->CheckAction(BotaskAction::ADMIN) > 0;
	}
	
	public function IsWriteRole(){
		return $this->module->permission->CheckAction(BotaskAction::WRITE) > 0;
	}
	
	public function IsViewRole(){
		return $this->module->permission->CheckAction(BotaskAction::VIEW) > 0;
	}
	
	public function DSProcess($name, $rows){
		$p = $rows->p;
		$db = $this->db;
		
		switch ($name){
			case 'board':
				/*
				foreach ($rows->r as $r){
					if ($r->f == 'a'){ $this->LayerAppend($r->d); }
					if ($r->f == 'u'){ $this->LayerUpdate($r->d); }
					if ($r->f == 'd'){ $this->LayerRemove($r->d->id); }
				}
				/**/
				return;
		}
	}
	
	public function DSGetData($name, $rows){
		$p = $rows->p;
		switch ($name){
			// case 'board': return $this->Board();
		}
	}
	
	private function _AJAX($d){
		switch($d->do){
			case 'task': return $this->Task($d->taskid);
			case 'tasksave': return $this->TaskSave($d->task);
		}
		return null;
	}
	
	public function AJAX($d){
		if ($d->do == "init"){
			return $this->BoardData(0);
		}
		$ret = new stdClass();
		$ret->u = $this->userid;
		$ret->r = $this->_AJAX($d);
		$ret->board = $this->BoardData($d->hlid);
		
		return $ret;
	}
	
	/**
	 * Список знакомых пользователй
	 */
	public function UProfile_UserFriendList(){
		if (!$this->IsViewRole()){ return null; }

		$users = array();
		$rows = BotaskQuery::BoardUsers($this->db, $this->userid);
		while (($row = $this->db->fetch_array($rows))){
			if ($row['id']*1 == $this->userid*1){ continue; }
			$users[$row['id']] = $row;
		}
		
		$o = new stdClass();
		$o->p = UserFriendPriority::MIDDLING;
		$o->users = $users;
		
		return $o;
	}
	
	
	private function ToArray($rows){
		$ret = array();
		while (($row = $this->db->fetch_array($rows))){
			$ret[$row['id']] = $row;
		}
		return $ret;
	}

	/**
	 * Получить структуру доски задач
	 */
	public function BoardData($lastHId = 0){
		if (!$this->IsViewRole()){ return null; }
		$ret = new stdClass();
		$ret->hst = array();
		$ret->board = array();
		$ret->users = array();
		
		$lastupdate = 0;
		// история изменений, последнии 15 записей
		$rows = BotaskQuery::BoardHistory($this->db, $this->userid, $lastHId);
		while (($row = $this->db->fetch_array($rows))){
			if ($lastupdate == 0){
				$lastupdate = $row['dl'];
			}
			$lastupdate = min($lastupdate, $row['dl']*1);
			array_push($ret->hst, $row);
		}
		if (count($ret->hst) == 0){ // нет изменений
			return null;
		}
		if ($lastHId == 0){
			$lastupdate = 0;
		}
		
		$rows = BotaskQuery::Board($this->db, $this->userid, $lastupdate);
		while (($row = $this->db->fetch_array($rows))){
			$row['users'] = array();
			$ret->board[$row['id']] = $row;
		}
		
		$rows = BotaskQuery::BoardTaskUsers($this->db, $this->userid, $lastupdate);
		while (($row = $this->db->fetch_array($rows))){
			array_push($ret->board[$row['tid']]['users'], $row['uid']);
		}

		$rows = BotaskQuery::BoardUsers($this->db, $this->userid, $lastupdate);
		while (($row = $this->db->fetch_array($rows))){
			$ret->users[$row['id']] = $row;
		}
		
		return $ret;
	}

	public function TaskUserList($taskid, $retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$rows = BotaskQuery::TaskUserList($this->db, $taskid);
		if (!$retarray){ return $rows; }
		return $this->ToArray($rows);
	}
	
	/**
	 * Есть ли доступ пользователя к задаче?
	 * @param unknown_type $taskid
	 */
	public function TaskAccess($taskid){
		$row = BotaskQuery::UserRole($this->db, $taskid, $this->userid, true);
		return !empty($row);
	}
	
	/**
	 * Сохранить задачу
	 * 
	 * @param object $tk
	 */
	public function TaskSave($tk){
		if (!$this->IsWriteRole()){ return null; }
		
		$tk->id = intval($tk->id);
		if (!$this->IsAdminRole()){
			// порезать теги и прочие гадости
			$utmanager = CMSRegistry::$instance->GetUserTextManager();
			$tk->tl = $utmanager->Parser($tk->tl);
			$tk->bd = $utmanager->Parser($tk->bd);
		}
		
		// родительская задача, есть ли доступ сохранения в нее
		if ($tk->pid*1 > 0){
			if (!$this->TaskAccess($tk->pid)){ return null; }
		}

		$history = new BotaskHistory($this->userid);
		
		$publish = false;
		if ($tk->id == 0){
			$tk->uid = $this->userid;
			$pubkey = md5(time().$this->userid);
			$tk->id = BotaskQuery::TaskAppend($this->db, $tk, $pubkey);
			
			$history->hitype = BotaskHistoryType::TASK_OPEN;
			$history->taskid = $tk->id;
			
		}else{
			
			// является ли пользователь участником этой задача, если да, то он может делать с ней все что хошь
			if (!$this->TaskAccess($tk->id)){ return null; }
			
			$history->taskid = $tk->id;
			
			$info = BotaskQuery::Task($this->db, $tk->id, true);
			BotaskQuery::TaskUpdate($this->db, $tk);
			
			$history->CompareTask($tk, $info);
		}
		
		$users = $this->TaskUserList($tk->id, true);
		$arr = $tk->users;
		
		// обновить информацию по правам пользователей
		foreach ($users as $rUserId => $cuser){
			$find = false;
			foreach ($arr as $uid){
				if ($uid == $rUserId){
					$find = true;
					break;
				}
			}
			if (!$find){
				BotaskQuery::UserRoleRemove($this->db, $tk->id, $rUserId);
				$history->UserRemove($rUserId);
			}
		}
		foreach ($arr as $uid){
			$find = false;
			foreach ($users as $rUserId => $cuser){
				if ($uid == $rUserId){
					$find = true;
					break;
				}
			}
			if (!$find){
				BotaskQuery::UserRoleAppend($this->db, $tk->id, $uid);
				$history->UserAdd($uid);
			}
		}
		
		$history->Save();
		
		return $this->Task($tk->id);
	}
	
	public function Task($taskid){
		if (!$this->IsViewRole()){ return null; }
		
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$task = BotaskQuery::Task($this->db, $taskid, true);
		$task['users'] = array();
		$users = $this->TaskUserList($taskid, true);
		foreach ($users as $user){
			array_push($task['users'], $user['id']);
		}

		$hst = array();

		$rows = BotaskQuery::TaskHistory($this->db, $taskid);
		while (($row = $this->db->fetch_array($rows))){
			array_push($hst, $row);
		}
		$task['hst'] = $hst;
		
		return $task;
	}

}

?>