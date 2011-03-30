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
	public $title = "";
	public $body = "";
	
	public $deadline = 0;
	public $deadlinebytime = 0;
	
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
			$this->change = true;
		}
		if ($nt->bd != $ot['bd']){
			$this->body = $ot['bd'];
			$this->change = true;
		}
		if (intval($nt->pid) != intval($ot['pid'])){
			$this->parenttaskid = $ot['pid'];
			$this->change = true;
		}
		if (intval($nt->ddl) != intval($ot['ddl'])){
			$this->deadline = $ot['ddl'];
			$this->change = true;
		}
		if (intval($nt->ddlt) != intval($ot['ddlt'])){
			$this->deadlinebytime = $ot['ddlt'];
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
			case 'board': return $this->Board();
			// case 'boardusers': return $this->BoardUsers();
		}
	}
	
	public function AJAX($d){
		switch($d->do){
			case 'init': return $this->InitializeData();
			case 'taskdata': return $this->TaskData($d->taskid);
			
			
			case 'task': return $this->Task($d->taskid);
			case 'tasksave': return $this->TaskSave($d->task);
		}
		return null;
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
	public function InitializeData(){
		if (!$this->IsViewRole()){ return null; }
		$ret = new stdClass();

		$ret->board = array();
		$rows = BotaskQuery::Board($this->db, $this->userid);
		while (($row = $this->db->fetch_array($rows))){
			$row['users'] = array();
			$ret->board[$row['id']] = $row;
		}
		
		$rows = BotaskQuery::BoardTaskUsers($this->db, $this->userid);
		while (($row = $this->db->fetch_array($rows))){
			array_push($ret->board[$row['tid']]['users'], $row['uid']);
		}

		$ret->users = array();
		$rows = BotaskQuery::BoardUsers($this->db, $this->userid);
		while (($row = $this->db->fetch_array($rows))){
			$ret->users[$row['id']] = $row;
		}
		
		return $ret;
	}
	
	/**
	 * Получить полные данные по задаче
	 */
	public function TaskData($taskid){
		if (!$this->IsViewRole()){ return null; }
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
			$row = BotaskQuery::UserRole($this->db, $tk->pid, $this->userid, true);
			if (empty($row)){
				return null; // нет ролей для сохранения в родительскую задачу
			}
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
			$row = BotaskQuery::UserRole($this->db, $tk->id, $this->userid, true);
			if (empty($row)){ return null; }
			
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
	
	
	/**
	 * Получить структуру всех задач, доступных этому пользователю
	 */
	public function Board($retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$rows = BotaskQuery::Board($this->db, $this->userid);
		return $retarray ? $this->ToArray($rows) : $rows; 
	}
	
	
	
	/**
	 * Список пользователей участвующих на доске задач этого пользователя
	 */
	public function BoardUsers($retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$rows = BotaskQuery::BoardUsers($this->db, $this->userid);
		return $retarray ? $this->ToArray($rows) : $rows;
	}
	
	/**
	 * Роль текущего пользователя в задаче 
	 * @param integer $taskid
	 */
	public function TaskUserRole($taskid){
		/*
		$w = 0; $r = 0; 
		$rows = BotaskQuery::UserRole($this->db, $taskid, $this->userid);
		while (($row = $this->db->fetch_array($rows))){
			$r = $row['r'] || $r;
			$w = $row['w'] || $w;
		}
		return array('r'=>$r, 'w'=>$w);
		/**/
	}

	public function TaskUserList($taskid, $retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$rows = BotaskQuery::TaskUserList($this->db, $taskid);
		if (!$retarray){ return $rows; }
		return $this->ToArray($rows);
	}
	
	public function Task($taskid){
		$taskid = intval($taskid);
		if (!$this->IsViewRole()){ return null; }
		
		$task = new stdClass();
		// идентификатор проекта
		$task->id = $taskid;
		// заголовок проекта
		$task->tl = "";
		// контент проекта
		$task->bd = "";
		// идентификатор контента
		$task->ctid = 0;

		// автор проекта
		$projec->unm = '';
		$projec->fnm = '';
		$projec->lnm = '';

		// дата создания проекта
		$projec->dl = 0;
		
		$task->users = array();
		
		if ($taskid > 0){
			$pbd = BotaskQuery::Task($this->db, $taskid, true);
			
			if ($pbd['uid'] != $this->userid){
				return null;
				/*
				$role = $this->ProjectUserRole($taskid);
				if ($role['w'] == 0 && $role['r'] == 0){ return null; }
				$task->r = $role['r'];
				$task->w = $role['w'];
				/**/
			}
			$task->users = array();
			$users = $this->TaskUserList($taskid, true);
			foreach ($users as $user){
				array_push($task->users, $user['id']);
			}
			//  = $this->ToArray(BotaskQuery::ProjectUserList($this->db, $taskid));
			// $task->groups = $this->ToArray(BotaskQuery::ProjectGroupList($this->db, $taskid));
			
			$task->tl = $pbd['tl'];
			$task->bd = $pbd['bd'];
			$task->ctid = $pbd['ctid'];
			$task->unm = $pbd['unm'];
			$task->fnm = $pbd['fnm'];
			$task->lnm = $pbd['lnm'];
			$task->dl = $pbd['dl'];
		}else{
			// попытка получить проект по шаблону, а есть ли права?
			if (!$this->IsWriteRole()){ return null; }
			// $task->users = $this->ToArray(BotaskQuery::ProjectUserListDefault($this->db, $taskid));
			// $task->groups = $this->ToArray(BotaskQuery::ProjectGroupListDefault($this->db, $taskid));
			$task->users = array();
		}
		
		return $task;
	}
	

}

?>