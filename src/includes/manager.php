<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Botask
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'dbquery.php';
require_once 'history.php';

class BotaskManager extends Ab_ModuleManager {
	
	/**
	 * @var BotaskModule
	 */
	public $module = null;
	
	/**
	 * @var BotaskManager
	 */
	public static $instance = null; 
	
	public function __construct(BotaskModule $module){
		parent::__construct($module);
		
		BotaskManager::$instance = $this;
	}
	
	public function IsAdminRole(){
		return $this->IsRoleEnable(BotaskAction::ADMIN);
	}
	
	public function IsWriteRole(){
		return $this->IsRoleEnable(BotaskAction::WRITE);
	}
	
	public function IsViewRole(){
		return $this->IsRoleEnable(BotaskAction::VIEW);
	}
	
	private function _AJAX($d){
		switch($d->do){
			case 'task': return $this->Task($d->taskid);
			case 'sync': return $this->Sync();
			case 'tasksave': return $this->TaskSave($d->task);
			case 'custatsave': return $this->CustatusSave($d->custat);
			case 'custatfull': return $this->CustatusFullList();
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
			case 'checklistsave': return $this->CheckListSave($d->taskid, $d->checklist);
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
	
	public function ToArrayById($rows, $field = "id"){
		$ret = array();
		while (($row = $this->db->fetch_array($rows))){
			$ret[$row[$field]] = $row;
		}
		return $ret;
	}
	
	public function ToArray($rows, &$ids1 = "", $fnids1 = 'uid', &$ids2 = "", $fnids2 = '', &$ids3 = "", $fnids3 = ''){
		$ret = array();
		while (($row = $this->db->fetch_array($rows))){
			array_push($ret, $row);
			if (is_array($ids1)){
				$ids1[$row[$fnids1]] = $row[$fnids1];
			}
			if (is_array($ids2)){
				$ids2[$row[$fnids2]] = $row[$fnids2];
			}
			if (is_array($ids3)){
				$ids3[$row[$fnids3]] = $row[$fnids3];
			}
		}
		return $ret;
	}
	
	
	public function Bos_OnlineData(){
		if (!$this->IsViewRole()){
			return null;
		}
	
		$rows = BotaskQuery::BoardOnline($this->db, $this->userid);
		return $this->ToArray($rows);
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
	
	public function Sync(){
		return TIMENOW;
	}

	/**
	 * Получить структуру доски задач
	 */
	public function BoardData($lastHId = 0){
		if (!$this->IsViewRole()){ return null; }
		
		// очистить корзину
		$this->RecycleClear();
		
		$ret = new stdClass();
		$ret->hst = array();
		$ret->board = array();
		$ret->users = array();
		
		// авторы
		$autors = array();
		
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
			$autors[$row['uid']] = true;
		}
		
		$rows = BotaskQuery::BoardTaskUsers($this->db, $this->userid, $lastupdate);
		while (($row = $this->db->fetch_array($rows))){
			array_push($ret->board[$row['tid']]['users'], $row['uid']);
		}

		$rows = BotaskQuery::BoardUsers($this->db, $this->userid, $lastupdate, $autors);
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
		return $this->ToArrayById($rows);
	}
	
	private function TaskUserListForNotify($taskid, $retarray = false){
		$rows = BotaskQuery::TaskUserListForNotify($this->db, $taskid);
		if (!$retarray){ return $rows; }
		return $this->ToArrayById($rows);
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
		
		$row = BotaskQuery::TaskHistoryPrevStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE);
		$st=BotaskStatus::TASK_OPEN;
		if (!empty($row)){
			$st = $row['st'];
		}
		$history = new BotaskHistory($this->userid);
		$history->SetStatus($task, $st, $this->userid);
		$history->Save();
		
		BotaskQuery::TaskSetStatus($this->db, $taskid, $st, $this->userid);
		
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
			$utmanager = Abricos::TextParser();
			$tk->tl = $utmanager->Parser($tk->tl);
			$tk->bd = $utmanager->Parser($tk->bd);
		}
		
		
		// родительская задача, есть ли доступ сохранения в нее
		$parentid = $tk->pid*1;

		$history = new BotaskHistory($this->userid);
		$sendNewNotify = false;
		
		if ($tk->type == 'folder'){
			$tk->typeid = 1;
		}else if ($tk->type == 'project'){
			$tk->typeid = 2;
		}else{
			$tk->typeid = 3;
		}
		
		$publish = false;
		if ($tk->id == 0){
			
			if ($parentid > 0) {
				if (!$this->TaskAccess($parentid)){
					// ОПС! попытка добавить подзадачу туда, куда нету доступа
					return null;
				}
			}
			
			$tk->uid = $this->userid;
			$pubkey = md5(time().$this->userid);
			$tk->id = BotaskQuery::TaskAppend($this->db, $tk, $pubkey);
			
			$history->SetNewStatus($tk->id);
			$sendNewNotify = true;
		}else{
			
			// является ли пользователь участником этой задача, если да, то он может делать с ней все что хошь
			if (!$this->TaskAccess($tk->id)){ return null; }
			
			$info = BotaskQuery::Task($this->db, $tk->id, $this->userid, true);
			if ($info['pid']*1 != $parentid){ // попытка сменить раздел каталога
				if ($info['pid']*1 > 0 && !$this->TaskAccess($info['pid'])){ // разрешено ли его забрать из этой надзадачи?
					$tk->pid = $info['pid']; // не будем менять родителя
				}else if ($parentid > 0 && !$this->TaskAccess($parentid)){ // разрешено ли поместить его в эту подзадачу
					$tk->pid = $info['pid']; // не будем менять родителя
				}
			}
			
			if ($info['st'] == BotaskStatus::TASK_CLOSE ||
				$info['st'] == BotaskStatus::TASK_REMOVE ){ 
				return null; 
			}
			
			if (!$tk->onlyimage){
				BotaskQuery::TaskUpdate($this->db, $tk, $this->userid);
			}
			
			$history->CompareTask($tk, $info);
		}
		
		$users = $this->TaskUserList($tk->id, true);
		$arr = $tk->users;
		
		if (!$tk->onlyimage){ // производиться полное редактирование
			
			$this->TaskSaveUsersUpdate($tk, $users, $history);
			
			// сохранить чеклист
			$this->CheckListSave($tk->id, $tk->checks, $history);
			
			// обновить информацию по файлам, если есть на это роль
			$this->TaskSaveFilesUpdate($tk, $history);
		}
		
		// сохранить картинки
		$this->TaskSaveImagesUpdate($tk, $history);
		
		$history->Save();
		$taskid = $tk->id;
		$task = $this->Task($tk->id);

		$tppfx = "";
		if ($task['tp'] == 2){
			$tppfx = "proj";
		}else if ($task['tp'] == 3){
			$tppfx = "task";
		}
		
		if ($sendNewNotify && !empty($tppfx)){
			
			$brick = Brick::$builder->LoadBrickS('botask', 'templates', null, null);
			$v = $brick->param->var;
			$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
			$plnk = "http://".$host."/bos/#app=botask/taskview/showTaskViewPanel/".$task['id']."/";
			
			$tppfx = "";
			if ($task['tp'] == 2){
				$tppfx = "proj";
				$plnk = "http://".$host."/bos/#app=botask/ws/showWorkspacePanel/projectview/".$task['id']."/";
			}else if ($task['tp'] == 3){
				$tppfx = "task";
				$plnk = "http://".$host."/bos/#app=botask/ws/showWorkspacePanel/taskview/".$task['id']."/";
			}else{
				return;
			}
			
			$users = $this->TaskUserListForNotify($taskid, true);
			foreach($users as $user){
				if ($user['id'] == $this->userid){ continue; }
				
				$email = $user['email'];
				if (empty($email)){ continue; }
				
				$subject = Brick::ReplaceVarByData($v[$tppfx.'newprojectsubject'], array(
					"tl" => $task['tl']
				));
				$body = Brick::ReplaceVarByData($v[$tppfx.'newprojectbody'], array(
					"email" => $email,
					"tl" => $task['tl'],
					"plnk" => $plnk,
					"unm" => $this->UserNameBuild($this->user->info),
					"prj" => $task['bd'],
					"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
				));
				Abricos::Notify()->SendMail($email, $subject, $body);
			}
		}
		return $task;
	}
	
	private function TaskSaveUsersUpdate($tk, $users, $history){
		
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
			if (!$find){ // добавление нового пользователя
				// проверить, а вдруг пользователь не хочет чтоб его добавляли
				$uprofileManager = Abricos::GetModule('uprofile')->GetManager();
				if ($uprofileManager->UserPublicityCheck($uid)){
					BotaskQuery::UserRoleAppend($this->db, $tk->id, $uid);
					$history->UserAdd($uid);
				} 
			}
		}
	}
	
	private function TaskSaveFilesUpdate($tk, $history){
		$mod = Abricos::GetModule('filemanager');
		if (empty($mod) || !FileManagerModule::$instance->GetManager()->IsFileUploadRole()){
			return;
		}
		$files = $this->TaskFiles($tk->id, true);
		$arr = $tk->files;
	
		foreach ($files as $rFileId => $cfile){
			$find = false;
			foreach ($arr as $file){
				if ($file->id == $rFileId){
					$find = true;
					break;
				}
			}
			if (!$find){
				BotaskQuery::TaskFileRemove($this->db, $tk->id, $rFileId);
				// $history->FileRemove($rFileId);
			}
		}
		foreach ($arr as $file){
			$find = false;
			foreach ($files as $rFileId => $cfile){
				if ($file->id == $rFileId){
					$find = true;
					break;
				}
			}
			if (!$find){
				BotaskQuery::TaskFileAppend($this->db, $tk->id, $file->id, $this->userid);
				// $history->FileAdd($uid);
			}
		}
	}
	
	private function TaskSaveImagesUpdate($tk, BotaskHistory $history){
		// TODO: необходимо осуществить проверку в текстовых записях картинки $tk->img дабы исключить проникновения javascript
		// $tk->img = json_encode_ext($tk->img);
		
		$imgchanges = false;
		if (!is_array($tk->images)){
			$tk->images = array();
		}
		
		$cImgs = $this->ImageList($tk->id);
		foreach ($tk->images as $img){
			$img->d = json_encode_ext($img->d);
		
			if ($img->id == 0){ // новое изображение
				BotaskQuery::ImageAppend($this->db, $tk->id, $img->tl, $img->d);
				$imgchanges = true;
			}else{
				$cfimg = null;
				foreach ($cImgs as $cimg){
					if ($cimg['id'] == $img->id){
						$cfimg = $cimg;
						break;
					}
				}
				if (!is_null($cfimg) && ($img->tl != $cimg['tl'] || $img->d != $cimg['d'])){
					BotaskQuery::ImageUpdate($this->db, $img->id, $img->tl, $img->d);
					$imgchanges = true;
				}
			}
		}
		// удаленные изображения
		foreach ($cImgs as $cimg){
			$find = false;
			foreach ($tk->images as $img){
				if ($cimg['id'] == $img->id){
					$find = true;
					break;
				}
			}
			if (!$find){
				$this->TaskImageRemove($tk->id, $cimg);
				// BotaskQuery::ImageRemove($this->db, $cimg['id']);
				$imgchanges = true;
			}
		}
		if ($imgchanges){
			$history->ImagesChange($cImgs);
		}		
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
		
		$task['files'] = array();
		$files = $this->TaskFiles($taskid, true);
		foreach ($files as $file){
			array_push($task['files'], $file);
		}
		
		$task['images'] = $this->ImageList($taskid, true);
		
		$task['custatus'] = $this->CustatusList($taskid);
		
		$hst = array();

		$rows = BotaskQuery::TaskHistory($this->db, $taskid);
		while (($row = $this->db->fetch_array($rows))){
			array_push($hst, $row);
		}
		$task['hst'] = $hst;
		
		// чек-лист
		$task['chlst'] = $this->CheckList($taskid, true, true);

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
		$rows = Abricos::$user->GetManager()->UserConfigList($this->userid, 'botask');
		while (($row = $this->db->fetch_array($rows))){
			if ($this->UserConfigCheckVarName($row['nm'])){
				$ret->$row['nm'] = $row['vl'];
			}
		}
		
		return $ret;
	}
	
	public function UserConfigUpdate($newcfg){
		if (!$this->IsViewRole()){ return null; }
		
		$uman = Abricos::$user->GetManager();
		
		$rows = $uman->UserConfigList($this->userid, 'botask');
		$arr = $this->ToArrayById($rows);
		
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
		return $this->ToArrayById($rows);
	}

	/**
	 * Отчет по участникам
	 */
	public function ToWork(){
		if (!$this->IsViewRole()){ return null; }
		
		$fromtime = TIMENOW - 60*60*24*31;
		
		$rows = BotaskQuery::ToWork($this->db, $this->userid, $fromtime);
		return $this->ToArrayById($rows);
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
		
		$tppfx = "";
		if ($task['tp'] == 2){
			$tppfx = "proj";
			$plnk = "http://".$host."/bos/#app=botask/ws/showWorkspacePanel/projectview/".$task['id']."/";
		}else if ($task['tp'] == 3){
			$tppfx = "task";
			$plnk = "http://".$host."/bos/#app=botask/ws/showWorkspacePanel/taskview/".$task['id']."/";
		}else{
			return;
		}
		
		
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
					$subject = Brick::ReplaceVarByData($v[$tppfx.'cmtemlanssubject'], array(
						"tl" => $task['tl']
					));
					$body = Brick::ReplaceVarByData($v[$tppfx.'cmtemlansbody'], array(
						"email" => $email,
						"tl" => $task['tl'],
						"plnk" => $plnk,
						"unm" => $this->UserNameBuild($this->user->info),
						"cmt1" => $parent['bd']." ",
						"cmt2" => $data->bd." ",
						"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
					));
					Abricos::Notify()->SendMail($email, $subject, $body);
				}
			}
		}
		
		// уведомление автору
		if ($task['uid'] != $this->userid){
			$autor = UserQuery::User($this->db, $task['uid']);
			$email = $autor['email'];
			if (!empty($email) && !$emails[$email]){
				$emails[$email] = true;
				$subject = Brick::ReplaceVarByData($v[$tppfx.'cmtemlautorsubject'], array(
					"tl" => $task['tl']
				));
				$body = Brick::ReplaceVarByData($v[$tppfx.'cmtemlautorbody'], array(
					"email" => $email,
					"tl" => $task['tl'],
					"plnk" => $plnk,
					"unm" => $this->UserNameBuild($this->user->info),
					"cmt" => $data->bd." ",
					"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
				));
				Abricos::Notify()->SendMail($email, $subject, $body);
			}
		}
		
		// уведомление подписчикам
		foreach ($users as $user){
			$email = $user['email'];
			
			if (empty($email) || $emails[$email] || $user['id'] == $this->userid){
				continue;
			}
			$emails[$email] = true;
			$subject = Brick::ReplaceVarByData($v[$tppfx.'cmtemlsubject'], array(
				"tl" => $task['tl']
			));
			$body = Brick::ReplaceVarByData($v[$tppfx.'cmtemlbody'], array(
				"email" => $email,
				"tl" => $task['tl'],
				"plnk" => $plnk,
				"unm" => $this->UserNameBuild($this->user->info),
				"cmt" => $data->bd." ",
				"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
			));
			Abricos::Notify()->SendMail($email, $subject, $body);
		}
	}
	
	public function ImageList($taskid){
		if (!$this->TaskAccess($taskid)){
			return null;
		}
		$rows = BotaskQuery::ImageList($this->db, $taskid);
		$ret = array();
		while (($row = $this->db->fetch_array($rows))){
			$row['d'] = json_decode($row['d']);
			array_push($ret, $row);
		}
		return $ret;
	}
	
	public function CustatusList($taskid){
		if (!$this->TaskAccess($taskid)){ return null; }
		$ret = new stdClass();
		$ret->list = $this->ToArrayById(BotaskQuery::CustatusList($this->db, $taskid));
		$ret->my = $this->ToArray(BotaskQuery::CustatusListByUser($this->db, $this->userid));
		
		return $ret;
	}
	
	public function CustatusSave($sd){
		if (!$this->TaskAccess($sd->taskid)){ return null; }
		
		$parser = Abricos::TextParser(true);
		$sd->title = $parser->Parser($sd->title);
		BotaskQuery::CustatusSave($this->db, $sd->taskid, $this->userid, $sd->title);
		 
		return $this->CustatusList($sd->taskid);
	}
	
	/**
	 * Список статусов всех пользователей общих проектов
	 */
	public function CustatusFullList(){
		if (!$this->IsViewRole()){ return null; }
		
		
		$rows = BotaskQuery::CustatusFullList($this->db, $this->userid);
		return $this->ToArray($rows);
	}

	public function CheckList($taskid, $retarray = false, $notCheckTaskAccess = false){
		if (!$this->IsViewRole()){ return null; }
		if (!$notCheckTaskAccess){
			if (!$this->TaskAccess($taskid)){ return null; }
		}
		$rows = BotaskQuery::CheckList($this->db, $taskid);
		return $retarray ? $this->ToArrayById($rows) : $rows;
	}

	public function CheckListSave($taskid, $checkList, $history = null){
		
		if (!$this->IsWriteRole()){ return null; }
		if (!$this->TaskAccess($taskid)){ return null; }
		
		$chListDb = $this->CheckList($taskid, true, true);
		
		$utmanager = Abricos::TextParser();
		$isAdmin = $this->IsAdminRole();
		$userid = $this->userid;
		
		$hstChange = false;
		// новые
		foreach($checkList as $ch){
			
			$title = $isAdmin ? $ch->tl : $utmanager->Parser($ch->tl);
			$isNew = false;
			if ($ch->id == 0){ // новый
				$ch->id = BotaskQuery::CheckListAppend($this->db, $taskid, $userid, $title);
				$hstChange = true;
				$isNew = true;
			}else{
				$fch = null;
				foreach ($chListDb as $id => $row){
					if ($ch->id == $id){
						$fch = $row;
						break;
					}
				}
				
				if (is_null($fch) || ($ch->duid > 0 && $fch['duid'] == 0)){ // удален
					BotaskQuery::CheckListRemove($this->db, $userid, $ch->id);
					$hstChange = true;
					if (is_null($fch)){
						continue;
					}
				}
				
				if ($ch->duid == 0 && $fch['duid'] > 0){ // восстановлен
					BotaskQuery::CheckListRestore($this->db, $userid, $ch->id);
					$hstChange = true;
				}
				
				if ($fch['tl'] != $title){
					BotaskQuery::CheckListUpdate($this->db, $userid, $ch->id, $title);
					$hstChange = true;
				}
			}
			
			if (($isNew && !empty($ch->ch)) || $ch->ch != $fch['ch']){
				BotaskQuery::CheckListCheck($this->db, $userid, $ch->id, $ch->ch);
				$hstChange = true;
			}
		}
		if ($hstChange){
			if (is_null($history)){
				$history = new BotaskHistory($this->userid);
				$history->SaveCheckList($taskid, json_encode($chListDb));
				$history->Save();
			}else{
				$history->SaveCheckList($taskid, json_encode($chListDb));
			}
		}
		
		return $this->Task($taskid);
	}
	
	public function TaskFiles($taskid, $retarray = false){
		if (!$this->IsViewRole()){
			return null;
		}
		$rows = BotaskQuery::TaskFiles($this->db, $taskid);
		if (!$retarray){
			return $rows;
		}
		return $this->ToArrayById($rows);
	}
	
	/**
	 * Очистить удаленные задачи из системы
	 */
	public function RecycleClear(){
		// return;
		$rows = BotaskQuery::TaskRemovedClearList($this->db, 10);
	
		while (($row = $this->db->fetch_array($rows))){
			$this->TaskRemovedClear($row);
		}
	}
	
	/**
	 * Удалить файл из преокта
	 */
	public function TaskFileRemove($taskid, $fileid){
		Abricos::GetModule('filemanager');
		$fmanager = FileManagerModule::$instance->GetManager();
		$fmanager->RolesDisable();
	
		$finfo = $fmanager->GetFileInfo($fileid);
		$rows = BotaskQuery::TaskUserList($this->db, $taskid);
		$find = false;
		while (($row = $this->db->fetch_array($rows))){
			if ($row['id'] == $finfo['uid']){
				$find = true;
				break;
			}
		}
		if ($find){
			$fmanager->FileRemove($fileid);
			BotaskQuery::TaskFileRemove($this->db, $taskid, $fileid);
		}
		$fmanager->RolesEnable();
	}
	
	public function TaskImageRemove($taskid, $image){
		$d = json_decode($image['d']);
		foreach($d->canvas->ls as $lr){
			foreach ($lr->fs as $fe){
				if ($fe->tp == 'image'){
					$arr = explode("filemanager/i/", $fe->src);
					if (count($arr) == 2){
						$fileid = explode("/", $arr[1]);
						$this->TaskFileRemove($taskid, $fileid[0]);
					}
				}
			}
		}
		BotaskQuery::ImageRemove($this->db, $image['id']);
	}
	
	/**
	 * Вычистить проект из системы
	 * @param array $task
	 */
	private function TaskRemovedClear($task){
		
		$taskid = $task['taskid'];
	
		// сначало зачистка всех дочерних проектов по рекурсии
		$rows = BotaskQuery::TaskRemovedChildList($this->db, $task['taskid']);
		while (($row = $this->db->fetch_array($rows))){
			$this->TaskRemovedClear($row);
		}
	
		// теперь удаление всего что связано с проектом
		// прикрепленные файлы
		$rows = BotaskQuery::TaskFiles($this->db, $taskid);
		while (($file = $this->db->fetch_array($rows))){
			$this->TaskFileRemove($taskid, $file['id']);
		}
	
		// удалить изобрежения во вкладках
		$rows = BotaskQuery::ImageList($this->db, $taskid);
		while (($row = $this->db->fetch_array($rows))){
			$this->TaskImageRemove($taskid, $row);
		}
	
		// удалить роли пользвотелей на проект
		BotaskQuery::UserRoleAllRemove($this->db, $taskid);
	
		// TODO: удалить историю. Необходимо зачищать историю через месяц после удаления проекта
	
		// удалить сам проект
		BotaskQuery::TaskRemovedClear($this->db, $taskid);
	}
	
}

?>