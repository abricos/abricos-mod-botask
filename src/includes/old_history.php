<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskHistory
 */
class old_BotaskHistory {

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

    public $imagedata = "";
    public $imagedatac = false;

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
        if ($ot['st'] * 1 == $newStatus * 1){
            return;
        }
        $this->change = true;
        $this->prevstatus = $ot['st'];
        $this->status = $newStatus;
        $this->statuserid = $statUserId;
        $this->taskid = $ot['id'];
    }

    public function CompareTask($nt, $ot, $onlyimage = false){

        $this->taskid = $nt->id;
        if (!$onlyimage){
            if ($nt->tl != $ot['tl']){
                $this->title = $ot['tl'];
                $this->titlec = true;
                $this->change = true;
            }

        }
    }

    public function ImagesChange($oldImages){
        $this->imagedata = json_encode_ext($oldImages);
        $this->imagedatac = true;
        $this->change = true;
    }

    public function SaveCheckList($taskid, $checklist){
        $this->taskid = $taskid;
        $this->change = true;
        $this->checkc = true;
        $this->check = $checklist;
    }

    public function UserAdd($uid){
        $this->userAddArray[] = $uid;
        $this->useradded = implode(",", $this->userAddArray);
        $this->change = true;
    }

    public function UserRemove($uid){
        $this->userRemoveArray[] = $uid;
        $this->userremoved = implode(",", $this->userRemoveArray);
        $this->change = true;
    }

    public function Save(){
        if (!$this->change){
            return;
        }
        BotaskQuery::HistoryAppend(Abricos::$db, $this);
    }
}
