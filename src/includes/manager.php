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
            case 'task':
                return $this->Task($d->taskid);
            case 'sync':
                return $this->Sync();
            case 'tasksave':
                return $this->TaskSave($d->task);
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
            case 'checklistsave':
                return $this->CheckListSave($d->taskid, $d->checklist);
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


    /**
     * Сохранить задачу
     *
     * @param object $tk
     */
    public function TaskSave($tk){
        if (!$this->IsWriteRole()){
            return null;
        }

        $tk->id = intval($tk->id);
        if (!$this->IsAdminRole()){
            // порезать теги и прочие гадости
            $utmanager = Abricos::TextParser();
            $tk->tl = $utmanager->Parser($tk->tl);
            $tk->bd = $utmanager->Parser($tk->bd);
        }


        // родительская задача, есть ли доступ сохранения в нее
        $parentid = $tk->pid * 1;

        $history = new BotaskHistory(Abricos::$user->id);
        $sendNewNotify = false;

        if ($tk->type == 'folder'){
            $tk->typeid = 1;
        } else if ($tk->type == 'project'){
            $tk->typeid = 2;
        } else {
            $tk->typeid = 3;
        }

        $publish = false;
        if ($tk->id == 0){

            if ($parentid > 0){
                if (!$this->TaskAccess($parentid)){
                    // ОПС! попытка добавить подзадачу туда, куда нету доступа
                    return null;
                }
            }

            $tk->uid = Abricos::$user->id;
            $pubkey = md5(time().Abricos::$user->id);
            $tk->id = BotaskQuery::TaskAppend($this->db, $tk, $pubkey);

            $history->SetNewStatus($tk->id);
            $sendNewNotify = true;
        } else {

            // является ли пользователь участником этой задача, если да, то он может делать с ней все что хошь
            if (!$this->TaskAccess($tk->id)){
                return null;
            }

            $info = BotaskQuery::Task($this->db, $tk->id, Abricos::$user->id, true);
            if ($info['pid'] * 1 != $parentid){ // попытка сменить раздел каталога
                if ($info['pid'] * 1 > 0 && !$this->TaskAccess($info['pid'])){ // разрешено ли его забрать из этой надзадачи?
                    $tk->pid = $info['pid']; // не будем менять родителя
                } else if ($parentid > 0 && !$this->TaskAccess($parentid)){ // разрешено ли поместить его в эту подзадачу
                    $tk->pid = $info['pid']; // не будем менять родителя
                }
            }

            if ($info['st'] == BotaskStatus::TASK_CLOSE || $info['st'] == BotaskStatus::TASK_REMOVE
            ){
                return null;
            }

            if (!$tk->onlyimage){
                BotaskQuery::TaskUpdate($this->db, $tk, Abricos::$user->id);
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
        } else if ($task['tp'] == 3){
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
            } else if ($task['tp'] == 3){
                $tppfx = "task";
                $plnk = "http://".$host."/bos/#app=botask/ws/showWorkspacePanel/taskview/".$task['id']."/";
            } else {
                return;
            }

            $users = $this->TaskUserListForNotify($taskid, true);
            foreach ($users as $user){
                if ($user['id'] == Abricos::$user->id){
                    continue;
                }

                $email = $user['email'];
                if (empty($email)){
                    continue;
                }

                $subject = Brick::ReplaceVarByData($v[$tppfx.'newprojectsubject'], array(
                    "tl" => $task['tl']
                ));
                $body = Brick::ReplaceVarByData($v[$tppfx.'newprojectbody'], array(
                    "email" => $email,
                    "tl" => $task['tl'],
                    "plnk" => $plnk,
                    "unm" => $this->UserNameBuild($this->user->info),
                    "prj" => $task['bd'],
                    "sitename" => SystemModule::$instance->GetPhrases()->Get('site_name')
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
                BotaskQuery::TaskFileAppend($this->db, $tk->id, $file->id, Abricos::$user->id);
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
            } else {
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



    public function History($taskid, $firstHId){
        if (!$this->IsViewRole()){
            return null;
        }

        $taskid = intval($taskid);
        if ($taskid > 0){
            if (!$this->TaskAccess($taskid)){
                return null;
            }
            $rows = BotaskQuery::TaskHistory($this->db, $taskid, $firstHId);
        } else {
            $rows = BotaskQuery::BoardHistory($this->db, Abricos::$user->id, 0, $firstHId);
        }
        $hst = array();
        while (($row = $this->db->fetch_array($rows))){
            $hst[] = $row;
        }
        return $hst;
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
