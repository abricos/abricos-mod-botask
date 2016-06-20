<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskApp
 *
 * @property BotaskManager $manager
 */
class BotaskApp extends AbricosApplication {

    protected function GetClasses(){
        return array(
            "Task" => "BotaskTask",
            "TaskList" => "BotaskTaskList",
            "UserRole" => "BotaskUserRole",
            "UserRoleList" => "BotaskUserRoleList",
        );
    }

    protected function GetStructures(){
        return 'Task,UserRole';
    }

    public function IsAdminRole(){
        return $this->manager->IsAdminRole();
    }

    public function IsWriteRole(){
        return $this->manager->IsWriteRole();
    }

    public function IsViewRole(){
        return $this->manager->IsViewRole();
    }

    public function ResponseToJSON($d){
        switch ($d->do){
            case 'taskList':
                return $this->TaskListToJSON();

            case 'boardData':
                return $this->BoardDataToJSON($d->hlid);
            case 'task':
                return $this->TaskToJSON($d->taskid);
            case 'taskSave':
                return $this->TaskSaveToJSON($d->data);
            case 'taskSetExec':
                return $this->TaskSetExecToJSON($d->taskid);
            case 'taskUnsetExec':
                return $this->TaskUnsetExecToJSON($d->taskid);
            case 'taskClose':
                return $this->TaskCloseToJSON($d->taskid);
            case 'taskRemove':
                return $this->TaskRemoveToJSON($d->taskid);
            case 'taskRestore':
                return $this->TaskRestoreToJSON($d->taskid);
            case 'taskArhive':
                return $this->TaskArhiveToJSON($d->taskid);
            case 'taskOpen':
                return $this->TaskOpenToJSON($d->taskid);
            case 'taskFavorite':
                return $this->TaskFavoriteToJSON($d->taskid, $d->value);
            case 'taskVoting':
                return $this->TaskVotingToJSON($d->taskid, $d->value);
            case 'taskExpand':
                return $this->TaskExpandToJSON($d->taskid, $d->value);
            case 'taskShowComments':
                return $this->TaskShowCommentsToJSON($d->taskid, $d->value);
            case 'checkListSave':
                return $this->CheckListSaveToJSON($d->taskid, $d->data);
            case 'customStatusSave':
                return $this->CustomStatusSaveToJSON($d->taskid, $d->value);
            case 'customStatusFullList':
                return $this->CustomStatusFullListToJSON();
        }
        return null;
    }

    public function TaskListToJSON(){
        $res = $this->TaskList();
        return $this->ResultToJSON('taskList', $res);
    }

    public function TaskList(){
        if (!$this->manager->IsViewRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskTaskList $list */
        $list = $this->InstanceClass('TaskList');

        $rows = BotaskQuery::TaskList($this->db);
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('Task', $d));
        }

        /** @var CommentApp $commentApp */
        $commentApp = Abricos::GetApp('comment');

        $taskIds = $list->Ids();
        $commentStatList = $commentApp->StatisticList('botask', 'task', $taskIds);
        $list->SetCommentStatistics($commentStatList);

        $rows = BotaskQuery::UserRoleList($this->db, $taskIds);
        while (($d = $this->db->fetch_array($rows))){
            $task = $list->Get($d['taskid']);
            $task->users->Add($this->InstanceClass('UserRole', $d));
        }

        return $list;
    }


    /**
     * Очистить удаленные задачи из системы
     */
    public function RecycleClear(){
        $rows = BotaskQuery::TaskRemovedClearList($this->db, 10);

        while (($row = $this->db->fetch_array($rows))){
            $this->TaskRemovedClear($row);
        }
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
            $ret[] = $row;
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

    public function BoardDataToJSON($lastHId = 0){
        $res = $this->BoardData($lastHId);
        return $this->ResultToJSON('boardData', $res);
    }

    /**
     * Получить структуру доски задач
     */
    public function BoardData($lastHId = 0){
        if (!$this->IsViewRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        // очистить корзину
        $this->RecycleClear();

        $ret = new stdClass();
        $ret->hst = array();
        $ret->board = array();
        $ret->users = array();

        // авторы
        $autors = array();

        $nusers = array();

        $lastupdate = 0;
        // история изменений, последнии 15 записей, если не указан $lastHId
        $rows = BotaskQuery::BoardHistory($this->db, Abricos::$user->id, $lastHId);
        while (($row = $this->db->fetch_array($rows))){
            if ($lastupdate == 0){
                $lastupdate = $row['dl'];
            }
            $lastupdate = min($lastupdate, $row['dl'] * 1);
            $ret->hst[] = $row;
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

        $rows = BotaskQuery::Board($this->db, Abricos::$user->id, $lastupdate);
        while (($row = $this->db->fetch_array($rows))){
            $row['users'] = array();
            $ret->board[$row['id']] = $row;
            $autors[$row['uid']] = true;
        }

        $rows = BotaskQuery::BoardTaskUsers($this->db, Abricos::$user->id, $lastupdate);
        while (($row = $this->db->fetch_array($rows))){
            $ret->board[$row['tid']]['users'][] = $row['uid'];
            $autors[$row['uid']] = true;
        }

        foreach ($autors as $uid => $v){
            $ret->users[] = $uid;
        }

        /*

        $rows = BotaskQuery::BoardUsers($this->db, Abricos::$user->id, $lastupdate, $autors);
        while (($row = $this->db->fetch_array($rows))){
            $userid = $row['id'];
            if ($userid == Abricos::$user->id && $lastHId > 0){
                // нет смыслка каждый раз к списку пользователей добавлять информацию
                // этого пользователя, лучше это сделать один раз при инициализации данных
                continue;
            }
            if ($lastHId == 0 || ($lastHId > 0 && $nusers[intval($userid)])){
                $ret->users[$userid] = $row;
            }
        }
        /*
        if ($lastHId == 0 && count($ret->users) == 0){
            // если доска не содержит задач, то и таблица пользователей будет пуста
            // при создании новой задачи, список пользователей в истории придет без информации
            // по текущему пользователю что приведет к ошибкам
            // этот запрос исключает эти ошибки
            $ret->users[Abricos::$user->id] = BotaskQuery::MyUserData($this->db, Abricos::$user->id, true);
        }
        /**/
        return $ret;
    }

    public function TaskAccess($taskid){
        if (!$this->IsViewRole()){
            return false;
        }
        $row = BotaskQuery::UserRole($this->db, $taskid, Abricos::$user->id, true);
        $isAccess = !empty($row);

        return $isAccess;
    }

    public function TaskUserList($taskid, $retarray = false){
        if (!$this->IsViewRole()){
            return null;
        }
        $rows = BotaskQuery::TaskUserList($this->db, $taskid);
        if (!$retarray){
            return $rows;
        }
        return $this->ToArrayById($rows);
    }

    public function ImageList($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }
        $rows = BotaskQuery::ImageList($this->db, $taskid);
        $ret = array();
        while (($row = $this->db->fetch_array($rows))){
            $row['d'] = json_decode($row['d']);
            $ret[] = $row;
        }
        return $ret;
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
        foreach ($d->canvas->ls as $lr){
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

    public function CheckList($taskid, $retarray = false, $notCheckTaskAccess = false){
        if (!$this->IsViewRole()){
            return null;
        }
        if (!$notCheckTaskAccess){
            if (!$this->TaskAccess($taskid)){
                return null;
            }
        }
        $rows = BotaskQuery::CheckList($this->db, $taskid);
        return $retarray ? $this->ToArrayById($rows) : $rows;
    }

    public function CheckListSaveToJSON($taskid, $d){
        $res = $this->CheckListSave($taskid, $d);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('checkListSave', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function CheckListSave($taskid, $checkList, $history = null){
        if (!$this->IsWriteRole() || !$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $chListDb = $this->CheckList($taskid, true, true);

        $utmanager = Abricos::TextParser();
        $isAdmin = $this->IsAdminRole();
        $userid = Abricos::$user->id;

        $hstChange = false;
        // новые
        foreach ($checkList as $ch){

            $title = $isAdmin ? $ch->tl : $utmanager->Parser($ch->tl);
            $isNew = false;
            if ($ch->id == 0){ // новый
                $ch->id = BotaskQuery::CheckListAppend($this->db, $taskid, $userid, $title);
                $hstChange = true;
                $isNew = true;
            } else {
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

            if (($isNew && !empty($ch->ch)) || (!empty($fch) && $ch->ch != $fch['ch'])){
                BotaskQuery::CheckListCheck($this->db, $userid, $ch->id, $ch->ch);
                $hstChange = true;
            }
        }
        if ($hstChange){
            if (is_null($history)){
                $history = new BotaskHistory(Abricos::$user->id);
                $history->SaveCheckList($taskid, json_encode($chListDb));
                $history->Save();
            } else {
                $history->SaveCheckList($taskid, json_encode($chListDb));
            }
        }

        return $this->Task($taskid);
    }

    public function TaskToJSON($taskid){
        $res = $this->Task($taskid);
        return $this->ResultToJSON('task', $res);
    }

    public function Task($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        BotaskQuery::TaskUpdateLastView($this->db, $taskid, Abricos::$user->id);

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);
        $task['users'] = array();
        $users = $this->TaskUserList($taskid, true);
        foreach ($users as $user){
            $task['users'][] = $user['id'];
        }

        $task['files'] = array();
        $files = $this->TaskFiles($taskid, true);
        foreach ($files as $file){
            $task['files'][] = $file;
        }

        $task['images'] = $this->ImageList($taskid, true);

        $task['custatus'] = new stdClass();
        $task['custatus']->list = $this->ToArrayById(BotaskQuery::CustatusList($this->db, $taskid));
        $task['custatus']->my = $this->ToArray(BotaskQuery::CustatusListByUser($this->db, Abricos::$user->id));

        $hst = array();

        $rows = BotaskQuery::TaskHistory($this->db, $taskid);
        while (($row = $this->db->fetch_array($rows))){
            $hst[] = $row;
        }
        $task['hst'] = $hst;

        // чек-лист
        $task['chlst'] = $this->CheckList($taskid, true, true);

        return $task;
    }

    public function TaskSaveToJSON($d){
        $res = $this->TaskSave($d);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskSave', $res),
            $this->TaskToJSON($res->taskid)
        ));
    }

    public function TaskSave($d){
        if (!$this->IsWriteRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $d->id = intval($d->id);
        if (!$this->IsAdminRole()){
            // порезать теги и прочие гадости
            $utmanager = Abricos::TextParser();
            $d->tl = $utmanager->Parser($d->tl);
            $d->bd = $utmanager->Parser($d->bd);
        }


        // родительская задача, есть ли доступ сохранения в нее
        $parentid = intval($d->pid);

        $history = new BotaskHistory(Abricos::$user->id);
        $sendNewNotify = false;

        if ($d->type == 'folder'){
            $d->typeid = 1;
        } else if ($d->type == 'project'){
            $d->typeid = 2;
        } else {
            $d->typeid = 3;
        }

        if ($d->id == 0){
            if ($parentid > 0){
                if (!$this->TaskAccess($parentid)){
                    // ОПС! попытка добавить подзадачу туда, куда нету доступа
                    return AbricosResponse::ERR_BAD_REQUEST;
                }
            }

            $d->uid = Abricos::$user->id;
            $pubkey = md5(time().Abricos::$user->id);
            $d->id = BotaskQuery::TaskAppend($this->db, $d, $pubkey);

            $history->SetNewStatus($d->id);
            $sendNewNotify = true;
        } else {

            // является ли пользователь участником этой задача, если да, то он может делать с ней все что хошь
            if (!$this->TaskAccess($d->id)){
                return AbricosResponse::ERR_FORBIDDEN;
            }

            $info = BotaskQuery::Task($this->db, $d->id, Abricos::$user->id, true);
            if ($info['pid'] * 1 != $parentid){ // попытка сменить раздел каталога
                if ($info['pid'] * 1 > 0 && !$this->TaskAccess($info['pid'])){ // разрешено ли его забрать из этой надзадачи?
                    $d->pid = $info['pid']; // не будем менять родителя
                } else if ($parentid > 0 && !$this->TaskAccess($parentid)){ // разрешено ли поместить его в эту подзадачу
                    $d->pid = $info['pid']; // не будем менять родителя
                }
            }

            if ($info['st'] == BotaskStatus::TASK_CLOSE
                || $info['st'] == BotaskStatus::TASK_REMOVE
            ){
                return AbricosResponse::ERR_BAD_REQUEST;
            }

            if (!$d->onlyimage){
                BotaskQuery::TaskUpdate($this->db, $d, Abricos::$user->id);
            }

            $history->CompareTask($d, $info);
        }

        $users = $this->TaskUserList($d->id, true);

        if (!$d->onlyimage){ // производиться полное редактирование
            $this->TaskSaveUsersUpdate($d, $users, $history);

            // сохранить чеклист
            $this->CheckListSave($d->id, $d->checks, $history);

            // обновить информацию по файлам, если есть на это роль
            $this->TaskSaveFilesUpdate($d, $history);
        }

        // сохранить картинки
        $this->TaskSaveImagesUpdate($d, $history);

        $history->Save();
        $taskid = $d->id;
        $task = $this->Task($taskid);

        /*
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
        /**/

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
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

    public function TaskFavoriteToJSON($taskid, $value){
        $res = $this->TaskFavorite($taskid, $value);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskFavorite', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskFavorite($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        BotaskQuery::TaskFavorite($this->db, $taskid, Abricos::$user->id, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;
    }

    public function TaskSetExecToJSON($taskid){
        $res = $this->TaskSetExec($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskSetExec', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskSetExec($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_OPEN && $task['st'] != BotaskStatus::TASK_REOPEN){
            return AbricosResponse::ERR_BAD_REQUEST;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_ACCEPT, Abricos::$user->id);
        $history->Save();
        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_ACCEPT, Abricos::$user->id);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskUnsetExecToJSON($taskid){
        $res = $this->TaskUnsetExec($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskUnsetExec', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskUnsetExec($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_ACCEPT){
            return AbricosResponse::ERR_BAD_REQUEST;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_OPEN, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskUnsetStatus($this->db, $taskid);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskCloseToJSON($taskid){
        $res = $this->TaskClose($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskClose', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskClose($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        // сначало закрыть все подзадачи
        $rows = BotaskQuery::Board($this->db, Abricos::$user->id, 0, $taskid);
        while (($row = $this->db->fetch_array($rows))){
            $this->TaskClose($row['id']);
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] == BotaskStatus::TASK_CLOSE){
            return AbricosResponse::ERR_BAD_REQUEST;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_CLOSE, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_CLOSE, Abricos::$user->id);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskRemoveToJSON($taskid){
        $res = $this->TaskRemove($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskRemove', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskRemove($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        // сначало закрыть все подзадачи
        $rows = BotaskQuery::Board($this->db, Abricos::$user->id, 0, $taskid);
        while (($row = $this->db->fetch_array($rows))){
            $this->TaskRemove($row['id']);
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] == BotaskStatus::TASK_REMOVE){
            return AbricosResponse::ERR_BAD_REQUEST;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_REMOVE, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE, Abricos::$user->id);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskRestoreToJSON($taskid){
        $res = $this->TaskRestore($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskRestore', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskRestore($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);
        if ($task['st'] != BotaskStatus::TASK_REMOVE){
            return AbricosResponse::ERR_BAD_REQUEST;
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

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskOpenToJSON($taskid){
        $res = $this->TaskOpen($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskOpen', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskOpen($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_CLOSE && $task['st'] != BotaskStatus::TASK_REMOVE
        ){
            return AbricosResponse::ERR_BAD_REQUEST;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_REOPEN, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REOPEN, Abricos::$user->id);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskArhiveToJSON($taskid){
        $res = $this->TaskArhive($taskid);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskArhive', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskArhive($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $task = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if ($task['st'] != BotaskStatus::TASK_CLOSE){
            return AbricosResponse::ERR_BAD_REQUEST;
        }

        $history = new BotaskHistory(Abricos::$user->id);
        $history->SetStatus($task, BotaskStatus::TASK_ARHIVE, Abricos::$user->id);
        $history->Save();

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_ARHIVE, Abricos::$user->id);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    public function TaskVotingToJSON($taskid, $value){
        $res = $this->TaskVoting($taskid, $value);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskVoting', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskVoting($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        BotaskQuery::TaskVoting($this->db, $taskid, Abricos::$user->id, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;
    }

    public function TaskExpandToJSON($taskid, $value){
        $res = $this->TaskExpand($taskid, $value);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskExpand', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskExpand($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }
        BotaskQuery::TaskExpand($this->db, $taskid, Abricos::$user->id, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;

    }

    public function TaskShowCommentsToJSON($taskid, $value){
        $res = $this->TaskShowComments($taskid, $value);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('taskShowComments', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function TaskShowComments($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }
        BotaskQuery::TaskShowComments($this->db, $taskid, Abricos::$user->id, $value);
        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;
    }

    /* * * * * * * * * * * * * * * Custom Status * * * * * * * * * * * * */

    public function CustomStatusSaveToJSON($taskid, $value){
        $res = $this->CustomStatusSave($taskid, $value);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('customStatusSave', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function CustomStatusSave($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return null;
        }

        $parser = Abricos::TextParser(true);
        $value = $parser->Parser($value);
        BotaskQuery::CustatusSave($this->db, $taskid, Abricos::$user->id, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;

        return $ret;
    }

    public function CustomStatusFullListToJSON(){
        $res = $this->CustomStatusFullList();
        return $this->ResultToJSON('customStatusFullList', $res);
    }

    /**
     * Список статусов всех пользователей общих проектов
     */
    public function CustomStatusFullList(){
        if (!$this->IsViewRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $rows = BotaskQuery::CustatusFullList($this->db, Abricos::$user->id);
        return $this->ToArray($rows);
    }

    /* * * * * * * * * * * * * * * * * History * * * * * * * * * * * * * * */

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

    private function UserNameBuild($user){
        $firstname = !empty($user['fnm']) ? $user['fnm'] : $user['firstname'];
        $lastname = !empty($user['lnm']) ? $user['lnm'] : $user['lastname'];
        $username = !empty($user['unm']) ? $user['unm'] : $user['username'];
        return (!empty($firstname) && !empty($lastname)) ? $firstname." ".$lastname : $username;
    }


    ////////////////////////////// Comments /////////////////////////////

    public function Comment_IsList($type, $ownerid){
        if (!$this->IsViewRole() || $type !== 'task'){
            return false;
        }

        return $this->TaskAccess($ownerid);
    }

    public function Comment_IsWrite($type, $ownerid){
        if (!$this->IsViewRole() || $type !== 'task'){
            return false;
        }
        return $this->TaskAccess($ownerid);
    }

    private function TaskUserListForNotify($taskid, $retarray = false){
        $rows = BotaskQuery::TaskUserListForNotify($this->db, $taskid);
        if (!$retarray){
            return $rows;
        }
        return $this->ToArrayById($rows);
    }

    /**
     * @param string $type
     * @param Comment $comment
     * @param Comment $parentComment
     */
    public function Comment_SendNotify($type, $ownerid, $comment, $parentComment){
        if (!$this->IsViewRole() || $type !== 'task' || !$this->TaskAccess($ownerid)){
            return;
        }

        $task = $this->Task($ownerid);
        $host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];

        /** @var NotifyApp $notifyApp */
        $notifyApp = Abricos::GetApp('notify');

        if ($task['tp'] == 2){
            $templateSuffix = "Proj";
            $itemLink = "http://".$host."/bos/#app=botask/wspace/ws/projectview/ProjectViewWidget/".$task['id']."/";
        } else if ($task['tp'] == 3){
            $templateSuffix = "Task";
            $itemLink = "http://".$host."/bos/#app=botask/wspace/ws/taskview/TaskViewWidget/".$task['id']."/";
        } else {
            return;
        }

        $emails = array();

        // уведомление "комментарий на комментарий"
        if (!empty($parentComment) && $parentComment->userid != Abricos::$user->id){

            $brick = Brick::$builder->LoadBrickS('botask', 'notifyCmtAns'.$templateSuffix, null, null);
            $v = &$brick->param->var;

            $user = UserQuery::User($this->db, $parentComment->userid);
            $email = $user['email'];
            if (!empty($email)){
                $emails[$email] = true;

                $mail = $notifyApp->MailByFields(
                    $email,
                    Brick::ReplaceVarByData($v['subject'], array("tl" => $task['tl'])),
                    Brick::ReplaceVarByData($brick->content, array(
                        "sitename" => SystemModule::$instance->GetPhrases()->Get('site_name'),
                        "email" => $email,
                        "unm" => $this->UserNameBuild($user),
                        "plnk" => $itemLink,
                        "tl" => $task['tl'],
                        "parentComment" => $parentComment->body." ",
                        "comment" => $comment->body." ",
                    ))
                );

                $notifyApp->MailSend($mail);
            }
        }

        $users = $this->TaskUserListForNotify($task['id'], true);

        // уведомление автору и подписчикам
        foreach ($users as $user){
            $email = $user['email'];

            if (empty($email) || $emails[$email]){
                continue;
            }
            $emails[$email] = true;

            $brick = Brick::$builder->LoadBrickS('botask', 'notifyCmt'.$templateSuffix, null, null);
            $v = &$brick->param->var;

            $mail = $notifyApp->MailByFields(
                $email,
                Brick::ReplaceVarByData($v['subject'], array("tl" => $task['tl'])),
                Brick::ReplaceVarByData($brick->content, array(
                    "sitename" => SystemModule::$instance->GetPhrases()->Get('site_name'),
                    "email" => $email,
                    "unm" => $this->UserNameBuild($user),
                    "plnk" => $itemLink,
                    "tl" => $task['tl'],
                    "comment" => $comment->body." ",
                ))
            );

            $notifyApp->MailSend($mail);
        }
    }
}
