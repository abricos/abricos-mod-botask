<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'history.php';

class BotaskManager extends Ab_ModuleManager {

    public function IsAdminRole(){
        return $this->IsRoleEnable(BotaskAction::ADMIN);
    }

    public function IsWriteRole(){
        return $this->IsRoleEnable(BotaskAction::WRITE);
    }

    public function IsViewRole(){
        return $this->IsRoleEnable(BotaskAction::VIEW);
    }

    public function AJAX($d){
        return $this->GetApp()->AJAX($d);
    }

    private function _AJAX($d){
        switch ($d->do){
            case 'sync':
                return $this->Sync();
            case 'custatsave':
                return $this->CustatusSave($d->custat);
            case 'custatfull':
                return $this->CustatusFullList();
            case 'tasksetexec':
                return $this->TaskSetExec($d->taskid);
            case 'taskunsetexec':
                return $this->TaskUnsetExec($d->taskid);
            case 'taskclose':
                return $this->TaskClose($d->taskid);
            case 'taskremove':
                return $this->TaskRemove($d->taskid);
            case 'taskrestore':
                return $this->TaskRestore($d->taskid);
            case 'taskarhive':
                return $this->TaskArhive($d->taskid);
            case 'taskopen':
                return $this->TaskOpen($d->taskid);
            case 'taskvoting':
                return $this->TaskVoting($d->taskid, $d->val);
            case 'taskfavorite':
                return $this->TaskFavorite($d->taskid, $d->val);
            case 'taskexpand':
                return $this->TaskExpand($d->taskid, $d->val);
            case 'taskshowcmt':
                return $this->TaskShowComments($d->taskid, $d->val);
            case 'history':
                return $this->History($d->socid, $d->firstid);
            case 'lastcomments':
                return $this->CommentList();
            case 'towork':
                return $this->ToWork();
        }
        return null;
    }

    public function old_AJAX($d){
        if ($d->do == "boardData"){
            return $this->BoardData(0);
        }
        $ret = new stdClass();
        $ret->u = Abricos::$user->id;
        $ret->r = $this->_AJAX($d);
        $ret->changes = $this->BoardData($d->hlid);

        return $ret;
    }

    public function User_OptionNames(){
        return array(
            "tasksort",
            "tasksortdesc",
            "taskviewchild",
            "taskviewcmts"
        );
    }

    public function Bos_OnlineData(){
        if (!$this->IsViewRole()){
            return null;
        }

        $rows = BotaskQuery::BoardOnline($this->db, Abricos::$user->id);
        return $this->ToArray($rows);
    }

    /**
     * Список знакомых пользователй
     */
    public function UProfile_UserFriendList(){
        if (!$this->IsViewRole()){
            return null;
        }

        $users = array();
        $rows = BotaskQuery::BoardUsers($this->db, Abricos::$user->id);
        while (($row = $this->db->fetch_array($rows))){
            if ($row['id'] * 1 == Abricos::$user->id * 1){
                continue;
            }
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

    public function TaskSetExec($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_OPEN && $task['st'] != BotaskStatus::TASK_REOPEN){
            return null;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_ACCEPT, Abricos::$user->id);
        $history->Save();
        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_ACCEPT, Abricos::$user->id);

        return $this->Task($taskid);
    }

    /**
     * Отказаться от выполнения данной задачи
     *
     * @param integer $taskid
     */
    public function TaskUnsetExec($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_ACCEPT){
            return null;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_OPEN, Abricos::$user->id);
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
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        // сначало закрыть все подзадачи
        $rows = BotaskQuery::Board($this->db, Abricos::$user->id, 0, $taskid);
        while (($row = $this->db->fetch_array($rows))){
            $this->TaskClose($row['id']);
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] == BotaskStatus::TASK_CLOSE){
            return null;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_CLOSE, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_CLOSE, Abricos::$user->id);

        return $this->Task($taskid);
    }

    /**
     * Удалить задачу
     *
     * @param integer $taskid
     */
    public function TaskRemove($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        // сначало закрыть все подзадачи
        $rows = BotaskQuery::Board($this->db, Abricos::$user->id, 0, $taskid);
        while (($row = $this->db->fetch_array($rows))){
            $this->TaskRemove($row['id']);
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] == BotaskStatus::TASK_REMOVE){
            return null;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_REMOVE, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE, Abricos::$user->id);

        return $this->Task($taskid);
    }

    /**
     * Восстановить удаленную задачу
     */
    public function TaskRestore($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);
        if ($task['st'] != BotaskStatus::TASK_REMOVE){
            return null;
        }

        // восстановить задачу

        $row = BotaskQuery::TaskHistoryPrevStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE);
        $st = BotaskStatus::TASK_OPEN;
        if (!empty($row)){
            $st = $row['st'];
        }
        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, $st, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, $st, Abricos::$user->id);

        return $this->Task($taskid);
    }

    /**
     * Открыть задачу повторно
     *
     * @param integer $taskid
     */
    public function TaskOpen($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_CLOSE && $task['st'] != BotaskStatus::TASK_REMOVE
        ){
            return null;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_REOPEN, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REOPEN, Abricos::$user->id);

        return $this->Task($taskid);
    }

    /**
     * Переместить задачу в архив
     *
     * @param integer $taskid
     */
    public function TaskArhive($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_CLOSE){
            return null;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_ARHIVE, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_ARHIVE, Abricos::$user->id);

        return $this->Task($taskid);
    }

    public function TaskVoting($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        BotaskQuery::TaskVoting($this->db, $taskid, Abricos::$user->id, $value);

        return $value;
    }

    public function TaskFavorite($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        BotaskQuery::TaskFavorite($this->db, $taskid, Abricos::$user->id, $value);

        return $value;
    }

    public function TaskExpand($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return null;
        }
        BotaskQuery::TaskExpand($this->db, $taskid, Abricos::$user->id, $value);
        return $value;
    }

    public function TaskShowComments($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return null;
        }
        BotaskQuery::TaskShowComments($this->db, $taskid, Abricos::$user->id, $value);
        return $value;
    }




    /*
    public function UserOptionList() {
        if (!$this->IsViewRole()) {
            return false;
        }

        $pMan = UserModule::$instance->GetManager()->GetPersonalManager();
        $list = $pMan->UserOptionList('botask', $this->UserOptionVarNames());

        return $list;
    }

    public function UserOptionListToAJAX() {
        $list = $this->UserOptionList();
        if (empty($list)) {
            return null;
        }
        return $list->ToAJAX();
    }

    public function UserOptionUpdate($newcfg) {
        if (!$this->IsViewRole()) {
            return null;
        }

        $uman = Abricos::$user->GetManager();

        $rows = $uman->UserOptionList(Abricos::$user->id, 'botask');
        $arr = $this->ToArrayById($rows);

        $names = array(
            "tasksort",
            "tasksortdesc",
            "taskviewchild",
            "taskviewcmts"
        );

        foreach ($names as $name) {
            $find = null;
            foreach ($arr as $cfgid => $crow) {
                if ($name == $crow['nm']) {
                    $find = $crow;
                    break;
                }
            }
            if (is_null($find)) {
                $uman->UserOptionAppend(Abricos::$user->id, 'botask', $name, $newcfg->$name);
            } else {
                $uman->UserOptionUpdate(Abricos::$user->id, $cfgid, $newcfg->$name);
            }
        }
        return $this->UserOptionList();
    }/**/

    public function CommentList(){
        if (!$this->IsViewRole()){
            return null;
        }

        $rows = BotaskQuery::CommentList($this->db, Abricos::$user->id);
        return $this->ToArrayById($rows);
    }

    /**
     * Отчет по участникам
     */
    public function ToWork(){
        if (!$this->IsViewRole()){
            return null;
        }

        $fromtime = TIMENOW - 60 * 60 * 24 * 31;

        $rows = BotaskQuery::ToWork($this->db, Abricos::$user->id, $fromtime);
        return $this->ToArrayById($rows);
    }

    public function Bos_MenuData(){
        if (!$this->IsAdminRole()){
            return null;
        }
        $i18n = $this->module->I18n();
        return array(
            array(
                "name" => "botask",
                "group" => "personal",
                "title" => $i18n->Translate('bosmenu.botask'),
                "icon" => "/modules/botask/images/botask-24.png",
                "url" => "botask/wspace/ws"
            )
        );
    }
}
