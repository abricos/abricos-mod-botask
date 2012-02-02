<?php
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Botask
 * @copyright Copyright (C) 2011 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

class BotaskHistory {
	
	public $userid = 0;
	private $hitype = 0; // временно
	public $taskid = 0;
	
	public $parenttaskid = 0;
	public $parenttaskidc = false;
	
	public $status = 0;
	public $prevstatus = 0;
	public $statuserid = 0;
	
	public $priority = 0;
	public $priorityc = false;
	
	public $title = "";
	public $titlec = false;
	
	public $body = "";
	public $bodyc = false;
	
	public $check = "";
	public $checkc = false;
	
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
	
	public function SetNewStatus($taskid){
		$this->taskid = $taskid;
		$this->change = true;
		$this->prevstatus = 0;
		$this->status = BotaskStatus::TASK_OPEN;
	}
	
	public function SetStatus($ot, $newStatus, $statUserId){
		if ($ot['st']*1 == $newStatus*1){ return; }
		$this->change = true;
		$this->prevstatus = $ot['st'];
		$this->status = $newStatus;
		$this->statuserid = $statUserId;
		$this->taskid = $ot['id'];
	}
	
	public function CompareTask($nt, $ot){
		
		$this->taskid = $nt->id;
		
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
		if (intval($nt->prt) != intval($ot['prt'])){
			$this->priority = $ot['prt'];
			$this->priorityc = true;
			$this->change = true;
		}
	}
	
	public function SaveCheckList($taskid, $checklist){
		$this->taskid = $taskid;
		$this->change = true;
		$this->checkc = true;
		$this->check = $checklist;
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
		if (!$this->change){ return; }
		BotaskQuery::HistoryAppend(Abricos::$db, $this);
	}
}

?>