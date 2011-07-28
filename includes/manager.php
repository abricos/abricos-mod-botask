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
require_once 'history.php';

class BotaskManager extends ModuleManager {
	
	/**
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
	
	private function _AJAX($d){
		switch($d->do){
			case 'task': return $this->Task($d->taskid);
			case 'sync': return $this->Sync();
			case 'tasksave': return $this->TaskSave($d->task);
			case 'tasksetexec': return $this->TaskSetExec($d->taskid);
			case 'taskunsetexec': return $this->TaskUnsetExec($d->taskid);
			case 'taskclose': return $this->TaskClose($d->taskid);
			case 'taskremove': return $this->TaskRemove($d->taskid);
			case 'taskrestore': return $this->TaskRestore($d->taskid);
			case 'taskarhive': return $this->TaskArhive($d->taskid);
			case 'taskopen': return $this->TaskOpen($d->taskid);
			case 'taskvoting': return $this->TaskVoting($d->taskid, $d->val);
			case 'taskfavorite': return $this->TaskFavorite($d->taskid, $d->val);
			case 'taskexpand': return $this->TaskExpand($d->taskid, $d->val);
			case 'taskshowcmt': return $this->TaskShowComments($d->taskid, $d->val);
			case 'history': return $this->History($d->socid, $d->firstid);
			case 'usercfgupdate': return $this->UserConfigUpdate($d->cfg);
			case 'lastcomments': return $this->CommentList();
			case 'towork': return $this->ToWork();
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
		$ret->changes = $this->BoardData($d->hlid);
		
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
	
	public function Sync(){
		return TIMENOW;
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
		
		if ($lastHId == 0){
			$ret->cfg = $this->UserConfigList();
		}
		
		$nusers = array();
		
		$lastupdate = 0;
		// история изменений, последнии 15 записей, если не указан $lastHId
		$rows = BotaskQuery::BoardHistory($this->db, $this->userid, $lastHId);
		while (($row = $this->db->fetch_array($rows))){
			if ($lastupdate == 0){
				$lastupdate = $row['dl'];
			}
			$lastupdate = min($lastupdate, $row['dl']*1);
			array_push($ret->hst, $row);
			if ($lastHId > 0 && !empty($row['usad'])){
				$urs = explode(",", $row['usad']);
				foreach ($urs as $ur){
					$nusers[intval($ur)] = true;
				}
			}
		}
		if ($lastHId > 0 && count($ret->hst) == 0){ // нет изменений
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
			$userid = $row['id'];
			if ($userid == $this->userid && $lastHId > 0){
				// нет смыслка каждый раз к списку пользователей добавлять информацию
				// этого пользователя, лучше это сделать один раз при инициализации данных
				continue;
			}
			if ($lastHId == 0 || ($lastHId>0 && $nusers[intval($userid)])){
				$ret->users[$userid] = $row;
			}
		}
		if ($lastHId == 0 && count($ret->users) == 0){
			// если доска не содержит задач, то и таблица пользователей будет пуста
			// при создании новой задачи, список пользователей в истории придет без информации
			// по текущему пользователю что приведет к ошибкам
			// этот запрос исключает эти ошибки
			$ret->users[$this->userid] = BotaskQuery::MyUserData($this->db, $this->userid, true);
		}
		return $ret;
	}

	public function TaskUserList($taskid, $retarray = false){
		if (!$this->IsViewRole()){ return null; }
		$rows = BotaskQuery::TaskUserList($this->db, $taskid);
		if (!$retarray){ return $rows; }
		return $this->ToArray($rows);
	}
	
	private function TaskUserListForNotify($taskid, $retarray = false){
		$rows = BotaskQuery::TaskUserListForNotify($this->db, $taskid);
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
	 * Принять задачу на исполнение
	 * 
	 * @param integer $taskid
	 */
	public function TaskSetExec($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		
		if ($task['st'] != BotaskStatus::TASK_OPEN && $task['st'] != BotaskStatus::TASK_REOPEN){
			return null;
		}
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, BotaskStatus::TASK_ACCEPT, $this->userid);
		$history->Save();
		BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_ACCEPT, $this->userid);
		
		return $this->Task($taskid);
	}

	/**
	 * Отказаться от выполнения данной задачи
	 * 
	 * @param integer $taskid
	 */
	public function TaskUnsetExec($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		
		if ($task['st'] != BotaskStatus::TASK_ACCEPT){ return null; }
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, BotaskStatus::TASK_OPEN, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskUnsetStatus($this->db, $taskid);
		
		return $this->Task($taskid);
	}
	
	/**
	 * Завершить задачу
	 * 
	 * @param integer $taskid
	 */
	public function TaskClose($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		// сначало закрыть все подзадачи
		$rows = BotaskQuery::Board($this->db, $this->userid, 0, $taskid);
		while (($row = $this->db->fetch_array($rows))){
			$this->TaskClose($row['id']);
		}
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		
		if ($task['st'] == BotaskStatus::TASK_CLOSE){ return null; }
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, BotaskStatus::TASK_CLOSE, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_CLOSE, $this->userid);
		
		return $this->Task($taskid);
	}
	
	/**
	 * Удалить задачу
	 * 
	 * @param integer $taskid
	 */
	public function TaskRemove($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		// сначало закрыть все подзадачи
		$rows = BotaskQuery::Board($this->db, $this->userid, 0, $taskid);
		while (($row = $this->db->fetch_array($rows))){
			$this->TaskRemove($row['id']);
		}
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		
		if ($task['st'] == BotaskStatus::TASK_REMOVE){ return null; }
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, BotaskStatus::TASK_REMOVE, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE, $this->userid);
		
		return $this->Task($taskid);
	}
	
	/**
	 * Восстановить удаленную задачу
	 */
	public function TaskRestore($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		if ($task['st'] != BotaskStatus::TASK_REMOVE){ return null; }
		
		// восстановить задачу
		$rows = BotaskQuery::TaskHistory($this->db, $taskid);
		$i=0; 
		$prevStatus=BotaskStatus::TASK_OPEN;
		while (($row = $this->db->fetch_array($rows))){
			if ($i == 1){
				$prevStatus = $row['st'];
				break;
			}
			$i++;
		}
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, $prevStatus, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskSetStatus($this->db, $taskid, $prevStatus, $this->userid);
		
		return $this->Task($taskid);
	}
	
	/**
	 * Открыть задачу повторно
	 * 
	 * @param integer $taskid
	 */
	public function TaskOpen($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		
		if ($task['st'] != BotaskStatus::TASK_CLOSE &&  
			$task['st'] != BotaskStatus::TASK_REMOVE ){ 
			return null; 
		}
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, BotaskStatus::TASK_REOPEN, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REOPEN, $this->userid);
		
		return $this->Task($taskid);
	}
	
	/**
	 * Переместить задачу в архив
	 * 
	 * @param integer $taskid
	 */
	public function TaskArhive($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
		
		if ($task['st'] != BotaskStatus::TASK_CLOSE){ return null; }
		
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, BotaskStatus::TASK_ARHIVE, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_ARHIVE, $this->userid);
		
		return $this->Task($taskid);
	}
	
	public function TaskVoting($taskid, $value){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		BotaskQuery::TaskVoting($this->db, $taskid, $this->userid, $value);
		
		return $value;
	}
	
	public function TaskFavorite($taskid, $value){
		if (!$this->TaskAccess($taskid)){ return null; }
		
		BotaskQuery::TaskFavorite($this->db, $taskid, $this->userid, $value);
		
		return $value;
	}

	public function TaskExpand($taskid, $value){
		if (!$this->TaskAccess($taskid)){ return null; }
		BotaskQuery::TaskExpand($this->db, $taskid, $this->userid, $value);
		return $value;
	}
	
	public function TaskShowComments($taskid, $value){
		if (!$this->TaskAccess($taskid)){ return null; }
		BotaskQuery::TaskShowComments($this->db, $taskid, $this->userid, $value);
		return $value;
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
		$sendNewNotify = false;
		
		$publish = false;
		if ($tk->id == 0){
			$tk->uid = $this->userid;
			$pubkey = md5(time().$this->userid);
			$tk->id = BotaskQuery::TaskAppend($this->db, $tk, $pubkey);
			
			$history->SetNewStatus($tk->id);
			$sendNewNotify = true;
		}else{
			
			// является ли пользователь участником этой задача, если да, то он может делать с ней все что хошь
			if (!$this->TaskAccess($tk->id)){ return null; }
			
			$info = BotaskQuery::Task($this->db, $tk->id, $this->userid, true);
			
			if ($info['st'] == BotaskStatus::TASK_CLOSE ||
				$info['st'] == BotaskStatus::TASK_REMOVE ){ 
				return null; 
			}
			
			BotaskQuery::TaskUpdate($this->db, $tk, $this->userid);
			
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
		$taskid = $tk->id;
		$task = $this->Task($tk->id);
		
		if ($sendNewNotify){
	
			$brick = Brick::$builder->LoadBrickS('botask', 'templates', null, null);
			$v = $brick->param->var;
			$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
			$plnk = "http://".$host."/bos/#app=botask/taskview/showTaskViewPanel/".$task['id']."/";
			
			$users = $this->TaskUserListForNotify($taskid, true);
			foreach($users as $user){
				if ($user['id'] == $this->userid){ continue; }
				
				$email = $user['email'];
				if (empty($email)){ continue; }
				
				$subject = Brick::ReplaceVarByData($v['newprojectsubject'], array(
					"tl" => $task['tl']
				));
				$body = Brick::ReplaceVarByData($v['newprojectbody'], array(
					"tl" => $task['tl'],
					"plnk" => $plnk,
					"unm" => $this->UserNameBuild($this->user->info),
					"prj" => $task['bd'],
					"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
				));
				CMSRegistry::$instance->GetNotification()->SendMail($email, $subject, $body);
			}
		}
		
		
		return $task;
	}
	
	public function Task($taskid){
		if (!$this->IsViewRole()){ return null; }
		
		if (!$this->TaskAccess($taskid)){ return null; }

		BotaskQuery::TaskUpdateLastView($this->db, $taskid, $this->userid);
		
		$task = BotaskQuery::Task($this->db, $taskid, $this->userid, true);
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

	public function History($taskid, $firstHId){
		if (!$this->IsViewRole()){ return null; }
		
		$taskid = intval($taskid);
		if ($taskid > 0){
			if (!$this->TaskAccess($taskid)){ return null; }
			$rows = BotaskQuery::TaskHistory($this->db, $taskid, $firstHId);
		}else{
			$rows = BotaskQuery::BoardHistory($this->db, $this->userid, 0, $firstHId);
		}
		$hst = array();
		while (($row = $this->db->fetch_array($rows))){
			array_push($hst, $row);
		}
		return $hst;
	}
	
	private function UserConfigCheckVarName($name){
		if (!$this->IsViewRole()){ return false; }
		switch($name){
			case "tasksort": return true;
			case "tasksortdesc": return true;
			case "taskviewchild": return true;
			case "taskviewcmts": return true;
		}
		return false;
	}
	
	public function UserConfigList(){
		if (!$this->IsViewRole()){ return false; }
		
		$ret = new stdClass();
		$rows = CMSRegistry::$instance->user->GetManager()->UserConfigList($this->userid, 'botask');
		while (($row = $this->db->fetch_array($rows))){
			if ($this->UserConfigCheckVarName($row['nm'])){
				$ret->$row['nm'] = $row['vl'];
			}
		}
		
		return $ret;
	}
	
	public function UserConfigUpdate($newcfg){
		if (!$this->IsViewRole()){ return null; }
		
		$uman = CMSRegistry::$instance->user->GetManager();
		
		$rows = $uman->UserConfigList($this->userid, 'botask');
		$arr = $this->ToArray($rows);
		
		$names = array("tasksort", "tasksortdesc", "taskviewchild", "taskviewcmts");
		
		foreach($names as $name){
			$find = null;
			foreach ($arr as $cfgid => $crow){
				if ($name == $crow['nm']){
					$find = $crow;
					break;
				}
			}
			if (is_null($find)){
				$uman->UserConfigAppend($this->userid, 'botask', $name, $newcfg->$name);
			}else{
				$uman->UserConfigUpdate($this->userid, $cfgid, $newcfg->$name);
			}
		}
		return $this->UserConfigList();
	}
	
	public function CommentList(){
		if (!$this->IsViewRole()){ return null; }
		
		$rows = BotaskQuery::CommentList($this->db, $this->userid);
		return $this->ToArray($rows);
	}

	/**
	 * Отчет по участникам
	 */
	public function ToWork(){
		if (!$this->IsViewRole()){ return null; }
		
		$fromtime = TIMENOW - 60*60*24*31;
		
		$rows = BotaskQuery::ToWork($this->db, $this->userid, $fromtime);
		return $this->ToArray($rows);
	}
	
	////////////////////////////// комментарии /////////////////////////////
	
	public function IsCommentList($contentid){
		if (!$this->IsViewRole()){ return null; }
		$task = BotaskQuery::TaskByContentId($this->db, $this->userid, $contentid, true);
		if (!$this->TaskAccess($task['id'])){ return false; }
		return true;
	}
	
	public function IsCommentAppend($contentid){
		if (!$this->IsViewRole()){ return null; }
		
		$task = BotaskQuery::TaskByContentId($this->db, $this->userid, $contentid, true);
		if (!$this->TaskAccess($task['id'])){ return false; }
		return true;
	}
	
	private function UserNameBuild($user){
		$firstname = !empty($user['fnm']) ? $user['fnm'] : $user['firstname']; 
		$lastname = !empty($user['lnm']) ? $user['lnm'] : $user['lastname']; 
		$username = !empty($user['unm']) ? $user['unm'] : $user['username'];
		return (!empty($firstname) && !empty($lastname)) ? $firstname." ".$lastname : $username;
	}
	
	
	/**
	 * Отправить уведомление о новом комментарии.
	 * 
	 * @param object $data
	 */
	public function CommentSendNotify($data){
		if (!$this->IsViewRole()){ return; }
		
		// данные по комментарию:
		// $data->id	- идентификатор комментария
		// $data->pid	- идентификатор родительского комментария
		// $data->uid	- пользователь оставивший комментарий
		// $data->bd	- текст комментария
		// $data->cid	- идентификатор контента

		$task = BotaskQuery::TaskByContentId($this->db, $this->userid, $data->cid, true);
		if (empty ($task) || !$this->TaskAccess($task['id'])){ return; }

		$brick = Brick::$builder->LoadBrickS('botask', 'templates', null, null);
		$v = &$brick->param->var;
		$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
		$plnk = "http://".$host."/bos/#app=botask/taskview/showTaskViewPanel/".$task['id']."/";
		
		$emails = array();
		$users = $this->TaskUserListForNotify($task['id'], true);

		// уведомление "комментарий на комментарий"
		if ($data->pid > 0){
			$parent = CommentQuery::Comment($this->db, $data->pid, $data->cid, true);
			if (!empty($parent) && $parent['uid'] != $this->userid){
				$user = UserQuery::User($this->db, $parent['uid']);
				$email = $user['email'];
				if (!empty($email)){
					$emails[$email] = true;
					$subject = Brick::ReplaceVarByData($v['cmtemlanssubject'], array(
						"tl" => $task['tl']
					));
					$body = Brick::ReplaceVarByData($v['cmtemlansbody'], array(
						"tl" => $task['tl'],
						"plnk" => $plnk,
						"unm" => $this->UserNameBuild($this->user->info),
						"cmt1" => $parent['bd']." ",
						"cmt2" => $data->bd." ",
						"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
					));
					CMSRegistry::$instance->GetNotification()->SendMail($email, $subject, $body);
				}
			}
		}
		
		// уведомление автору
		if ($task['uid'] != $this->userid){
			$autor = UserQuery::User($this->db, $task['uid']);
			$email = $autor['email'];
			if (!empty($email) && !$emails[$email]){
				$emails[$email] = true;
				$subject = Brick::ReplaceVarByData($v['cmtemlautorsubject'], array(
					"tl" => $task['tl']
				));
				$body = Brick::ReplaceVarByData($v['cmtemlautorbody'], array(
					"tl" => $task['tl'],
					"plnk" => $plnk,
					"unm" => $this->UserNameBuild($this->user->info),
					"cmt" => $data->bd." ",
					"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
				));
				CMSRegistry::$instance->GetNotification()->SendMail($email, $subject, $body);
			}
		}
		
		// уведомление подписчикам
		foreach ($users as $user){
			$email = $user['email'];
			
			if (empty($email) || $emails[$email] || $user['id'] == $this->userid){
				continue;
			}
			$emails[$email] = true;
			$subject = Brick::ReplaceVarByData($v['cmtemlsubject'], array(
				"tl" => $task['tl']
			));
			$body = Brick::ReplaceVarByData($v['cmtemlbody'], array(
				"tl" => $task['tl'],
				"plnk" => $plnk,
				"unm" => $this->UserNameBuild($this->user->info),
				"cmt" => $data->bd." ",
				"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
			));
			CMSRegistry::$instance->GetNotification()->SendMail($email, $subject, $body);
		}
	}	
	
}

?>