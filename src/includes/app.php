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
            "Resolution" => "BotaskResolution",
            "ResolutionList" => "BotaskResolutionList",
            "ResolutionInTask" => "BotaskResolutionInTask",
            "ResolutionInTaskList" => "BotaskResolutionInTaskList",
            "File" => "BotaskFile",
            "FileList" => "BotaskFileList",
            "Image" => "BotaskImage",
            "ImageList" => "BotaskImageList",
            "Check" => "BotaskCheck",
            "CheckList" => "BotaskCheckList",
            "History" => "BotaskHistory",
            "HistoryList" => "BotaskHistoryList",
        );
    }

    protected function GetStructures(){
        return 'Task,UserRole,Resolution,ResolutionInTask,File,Image,Check,History';
    }

    public function ResponseToJSON($d){
        switch ($d->do){
            case 'itemSave':
                return $this->ItemSaveToJSON($d->data);
            case 'taskList':
                return $this->TaskListToJSON();
            case 'resolutionList':
                return $this->ResolutionListToJSON();
            case 'task':
                return $this->TaskToJSON($d->taskid);
            case 'taskFavorite':
                return $this->TaskFavoriteToJSON($d->taskid, $d->value);
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
            case 'taskVoting':
                return $this->TaskVotingToJSON($d->taskid, $d->value);
            case 'taskExpand':
                return $this->TaskExpandToJSON($d->taskid, $d->value);
            case 'taskShowComments':
                return $this->TaskShowCommentsToJSON($d->taskid, $d->value);
            case 'checkListSave':
                return $this->CheckListSaveToJSON($d->taskid, $d->data);
            case 'imageListSave':
                return $this->ImageListSaveToJSON($d->taskid, $d->data);
        }
        return null;
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

    public function TaskAccess($taskid){
        if (!$this->IsViewRole()){
            return false;
        }

        if (!isset($this->_cache['TaskAccess'])){
            $this->_cache['TaskAccess'] = array();
        }
        if (isset($this->_cache['TaskAccess'][$taskid])){
            return $this->_cache['TaskAccess'][$taskid];
        }

        $d = BotaskQuery::UserRole($this->db, $taskid);

        return $this->_cache['TaskAccess'][$taskid] = !empty($d);
    }

    public function TaskListToJSON(){
        $res = $this->TaskList();
        return $this->ResultToJSON('taskList', $res);
    }

    public function TaskList(){
        if (!$this->manager->IsViewRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        if (isset($this->_cache['TaskList'])){
            return $this->_cache['TaskList'];
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

        $rows = BotaskQuery::ResolutionInTaskList($this->db, $taskIds);
        while (($d = $this->db->fetch_array($rows))){
            $task = $list->Get($d['taskid']);
            $task->resolutions->Add($this->InstanceClass('ResolutionInTask', $d));
        }

        $d = BotaskQuery::HistoryLastId($this->db);
        $list->lastHistoryId = empty($d) ? 0 : $d['id'];

        return $this->_cache['TaskList'] = $list;
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

        $d = BotaskQuery::Task($this->db, $taskid, Abricos::$user->id, true);

        if (empty($d)){
            return AbricosResponse::ERR_NOT_FOUND;
        }

        /** @var BotaskTask $task */
        $task = $this->InstanceClass('Task', $d);

        /** @var CommentApp $commentApp */
        $commentApp = Abricos::GetApp('comment');
        $task->commentStatistic = $commentApp->Statistic($task->GetCommentOwner());

        $task->users = $this->TaskUserRoleList($taskid);

        $rows = BotaskQuery::ResolutionInTaskList($this->db, array($taskid));
        while (($d = $this->db->fetch_array($rows))){
            $task->resolutions->Add($this->InstanceClass('ResolutionInTask', $d));
        }

        $task->files = $this->FileList($taskid);
        $task->images = $this->ImageList($taskid);
        $task->checks = $this->CheckList($taskid);
        $task->histories = $this->HistoryList($taskid);

        return $task;
    }

    /**
     * @param $taskid
     * @return BotaskUserRoleList
     */
    private function TaskUserRoleList($taskid){
        /** @var BotaskUserRoleList $list */
        $list = $this->InstanceClass('UserRoleList');

        $rows = BotaskQuery::UserRoleList($this->db, array($taskid));
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('UserRole', $d));
        }

        return $list;
    }

    public function TaskFavoriteToJSON($taskid, $value){
        $res = $this->TaskFavorite($taskid, $value);
        return $this->ResultToJSON('taskFavorite', $res);
    }

    public function TaskFavorite($taskid, $value){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        BotaskQuery::TaskFavoriteUpdate($this->db, $taskid, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;
    }

    public function TaskRemoveToJSON($taskid){
        $res = $this->TaskRemove($taskid);
        return $this->ResultToJSON('taskRemove', $res);
    }

    private function TaskRemoveMethod($taskid){
        $ret = array();

        $taskList = $this->TaskList();
        $count = $taskList->Count();
        for ($i = 0; $i < $count; $i++){
            $cTask = $taskList->GetByIndex($i);
            if ($cTask->parentid !== $taskid){
                continue;
            }
            $ret = array_merge($ret, $this->TaskRemoveMethod($cTask->id));
        }

        $task = $taskList->Get($taskid);
        if ($task->iStatus === BotaskStatus::TASK_REMOVE){
            return $ret;
        }

        $this->TaskStatusUpdateMethod($taskid, BotaskStatus::TASK_REMOVE);

        array_push($ret, $taskid);

        return $ret;
    }

    public function TaskRemove($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $ids = $this->TaskRemoveMethod($taskid);

        $this->CacheClear();

        $ret = new stdClass();
        $ret->taskids = $ids;
        return $ret;
    }


    /* * * * * * * * * * * * * * * * File * * * * * * * * * * * * * * */

    public function FileListToJSON($taskid){
        $res = $this->FileList($taskid);
        return $this->ResultToJSON('fileList', $res);
    }

    public function FileList($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskFileList $list */
        $list = $this->InstanceClass('FileList');

        $rows = BotaskQuery::FileList($this->db, $taskid);
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('File', $d));
        }

        return $list;
    }

    public function FileRemove($taskid, $fileid){
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

    /* * * * * * * * * * * * * * * * PictabList * * * * * * * * * * * * * * */

    public function ImageListToJSON($taskid){
        $res = $this->ImageList($taskid);
        return $this->ResultToJSON('imageList', $res);
    }

    public function ImageList($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskImageList $list */
        $list = $this->InstanceClass('ImageList');

        $rows = BotaskQuery::ImageList($this->db, $taskid);
        while (($d = $this->db->fetch_array($rows))){
            $d['d'] = json_decode($d['d']);
            $list->Add($this->InstanceClass('Image', $d));
        }

        return $list;
    }

    public function ImageRemove($taskid, $image){
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

    public function ImageListSaveToJSON($taskid, $d){
        $res = $this->ImageListSave($taskid, $d);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('imageListSave', $res),
            $this->ImageListToJSON($taskid)
        ));

        return $this->ResultToJSON('imageListSave', $res);
    }


    /**
     * @param $taskid
     * @param $d
     * @param BotaskHistory $history
     * @return int|stdClass
     */
    public function ImageListSave($taskid, $d, $history = null){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $utm = Abricos::TextParser();
        $utmf = Abricos::TextParser(true);
        $isChanged = false;
        $arrUpdated = array();

        $curImageList = $this->ImageList($taskid);

        for ($i = 0; $i < count($d); $i++){
            $dImage = $d[$i];

            $dImage->id = intval($dImage->id);
            $dImage->title = $utmf->Parser($dImage->title);

            $layers = $dImage->data->canvas->ls;

            for ($ii = 0; $ii < count($layers); $ii++){
                $layer = $layers[$ii];

                if ($layer->tp === "cmt"){
                    $layer->t = $utm->Parser($layer->t);
                }
            }

            $sData = json_encode($dImage->data);

            if ($dImage->id === 0){
                BotaskQuery::ImageAppend($this->db, $taskid, $dImage->title, $sData);
                $isChanged = true;
            } else {
                $curImage = $curImageList->Get($dImage->id);
                $arrUpdated[$dImage->id] = true;
                if (!empty($curImage) && ($curImage->title != $dImage->title || $curImage->data != $sData)){
                    BotaskQuery::ImageUpdate($this->db, $dImage->id, $dImage->title, $sData);
                    $isChanged = true;
                }
            }
        }

        // removed image
        for ($i = 0; $i < $curImageList->Count(); $i++){
            $image = $curImageList->GetByIndex($i);
            if ($arrUpdated[$image->id]){
                continue;
            }
            $this->ImageRemove($taskid, $image->id);
        }

        if ($isChanged){
            if (empty($history)){
                $history = $this->InstanceClass('History', array(
                    "taskid" => $taskid,
                    "userid" => Abricos::$user->id,
                    "imageData" => json_encode($d),
                    "imageDataChanged" => true
                ));
                BotaskQuery::HistoryAppend($this->db, $history);
            } else if (!$history->isNewTask){
                $history->imageData = json_encode($d);
                $history->imageDataChanged = true;
            }

            $this->CacheClear();
        }

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }


    /* * * * * * * * * * * * * * * * CheckList * * * * * * * * * * * * * * */

    public function CheckListToJSON($taskid){
        $res = $this->CheckList($taskid);
        return $this->ResultToJSON('checkList', $res);
    }

    public function CheckList($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskCheckList $list */
        $list = $this->InstanceClass('CheckList');
        $list->taskid = $taskid;

        $rows = BotaskQuery::CheckList($this->db, $taskid);
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('Check', $d));
        }

        return $list;
    }

    public function CheckListSaveToJSON($taskid, $d){
        $res = $this->CheckListSave($taskid, $d);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('checkListSave', $res),
            $this->CheckListToJSON($taskid)
        ));

        return $this->ResultToJSON('checkListSave', $res);
    }

    /**
     * @param $taskid
     * @param $data
     * @param BotaskHistory $history
     * @return int|stdClass
     */
    public function CheckListSave($taskid, $data, $history = null){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $utm = Abricos::TextParser();
        $checkListOrig = $this->CheckList($taskid);
        $isHistoryChange = false;

        for ($i = 0; $i < count($data); $i++){
            /** @var BotaskCheck $check */
            $check = $this->InstanceClass('Check', $data[$i]);
            $check->title = $utm->Parser($check->title);

            if ($check->id < 1){
                $check->userid = Abricos::$user->id;
                $check->id = BotaskQuery::CheckAppend($this->db, $taskid, $check);
                $isHistoryChange = true;
            } else {
                $checkOrig = $checkListOrig->Get($check->id);
                if (empty($checkOrig)){
                    continue;
                }

                $isCheckChange = false;

                if ($checkOrig->title !== $check->title){
                    $check->updateDate = TIMENOW;
                    $check->updateUserId = Abricos::$user->id;
                    $isCheckChange = $isHistoryChange = true;
                } else {
                    $check->updateDate = $checkOrig->updateDate;
                    $check->updateUserId = $checkOrig->updateUserId;
                }

                if ($checkOrig->checked !== $check->checked){
                    $check->checkedDate = TIMENOW;
                    $check->checkedUserId = Abricos::$user->id;
                    $isCheckChange = $isHistoryChange = true;
                } else {
                    $check->checkedDate = $checkOrig->checkedDate;
                    $check->checkedUserId = $checkOrig->checkedUserId;
                }

                if ($checkOrig->removeDate === 0 && $check->removeDate > 0){
                    $check->removeDate = TIMENOW;
                    $check->removeUserId = Abricos::$user->id;
                    $isCheckChange = $isHistoryChange = true;
                } else if ($checkOrig->removeDate > 0 && $check->removeDate === 0){
                    $check->removeDate = 0;
                    $check->removeUserId = 0;
                    $isCheckChange = $isHistoryChange = true;
                } else {
                    $check->removeDate = $checkOrig->removeDate;
                    $check->removeUserId = $checkOrig->removeUserId;
                }

                if ($isCheckChange){
                    BotaskQuery::CheckUpdate($this->db, $taskid, $check);
                }
            }
        }

        if ($isHistoryChange){
            if (empty($history)){
                $history = $this->InstanceClass('History', array(
                    "taskid" => $taskid,
                    "userid" => Abricos::$user->id,
                    "checks" => json_encode($data),
                    "checksChanged" => true
                ));
                BotaskQuery::HistoryAppend($this->db, $history);
            } else if (!$history->isNewTask){
                $history->checks = json_encode($data);
                $history->checksChanged = true;
            }

            $this->CacheClear();
        }

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    /* * * * * * * * * * * * * * * Resolutions * * * * * * * * * * * * */

    public function ResolutionListToJSON(){
        $res = $this->ResolutionList();
        return $this->ResultToJSON('resolutionList', $res);
    }

    public function ResolutionList(){
        if (!$this->IsViewRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskResolutionList $list */
        $list = $this->InstanceClass('ResolutionList');

        $rows = BotaskQuery::ResolutionList($this->db);
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('Resolution', $d));
        }

        return $list;
    }

    public function ResolutionSaveToJSON($taskid, $value){
        $res = $this->ResolutionSave($taskid, $value);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('resolutionSave', $res),
            $this->TaskToJSON($taskid)
        ));
    }

    public function ResolutionSave($taskid, $value){
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

    /* * * * * * * * * * * * * * * * * History * * * * * * * * * * * * * * */

    public function HistoryListToJSON($taskid){
        $res = $this->HistoryList($taskid);
        return $this->ResultToJSON('historyList', $res);
    }

    public function HistoryList($taskid){
        if (!$this->TaskAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskHistoryList $list */
        $list = $this->InstanceClass('HistoryList');

        $rows = BotaskQuery::HistoryList($this->db, $taskid);
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('History', $d));
        }

        return $list;
    }

    private function TaskStatusUpdateMethod($taskid, $iStatus){
        $iStatus = intval($iStatus);
        $taskList = $this->TaskList();
        $task = $taskList->Get($taskid);

        if (empty($task) || $task->iStatus === $iStatus){
            return;
        }

        $history = $this->InstanceClass('History', array(
            "taskid" => $taskid,
            "userid" => Abricos::$user->id,
            "iStatus" => $iStatus,
            "statusUserId" => Abricos::$user->id,
            "iParentStatus" => $task->iStatus
        ));

        BotaskQuery::HistoryAppend($this->db, $history);

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE, Abricos::$user->id);
    }


    /* * * * * * * * * * * * * * * * To Refactoring * * * * * * * * * * * * * * */


    /**
     * Очистить удаленные задачи из системы
     */
    public function RecycleClear(){
        $rows = BotaskQuery::TaskRemovedClearList($this->db, 10);

        while (($row = $this->db->fetch_array($rows))){
            $this->TaskRemovedClear($row);
        }
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
            $this->ImageRemove($taskid, $row);
        }

        // удалить роли пользвотелей на проект
        BotaskQuery::UserRoleAllRemove($this->db, $taskid);

        // TODO: удалить историю. Необходимо зачищать историю через месяц после удаления проекта

        // удалить сам проект
        BotaskQuery::TaskRemovedClear($this->db, $taskid);
    }


    public function ItemSaveToJSON($d){
        $res = $this->ItemSave($d);
        if (AbricosResponse::IsError($res)){
            return $res;
        }
        return $this->ImplodeJSON(array(
            $this->ResultToJSON('itemSave', $res),
            $this->TaskToJSON($res->taskid)
        ));
    }

    public function ItemSave($d){
        if (!$this->IsWriteRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $utm = Abricos::TextParser();
        $utmf = Abricos::TextParser(true);

        $d->id = intval($d->id);
        $d->title = $utmf->Parser($d->title);
        $d->body = $utm->Parser($d->body);
        $d->parentid = intval($d->parentid);

        switch ($d->type){
            case 'folder':
                $d->typeid = 1;
                break;
            case 'project':
                $d->typeid = 2;
                break;
            default:
                $d->typeid = 3;
                break;
        }

        $d->deadline = isset($d->deadline) ? intval($d->deadline) : 0;
        $d->deadlineTime = isset($d->deadlineTime) ? intval($d->deadlineTime) : 0;
        $d->priority = isset($d->priority) ? intval($d->priority) : 0;

        if ($d->id === 0){
            if ($d->parentid > 0){
                if (!$this->TaskAccess($d->parentid)){
                    // ОПС! попытка добавить элемент туда, куда нету доступа
                    return AbricosResponse::ERR_BAD_REQUEST;
                }
            }
            $pubkey = md5(time().Abricos::$user->id);

            $d->id = BotaskQuery::ItemAppend($this->db, $d, $pubkey);

            /** @var BotaskHistory $history */
            $history = $this->InstanceClass('History', array(
                "taskid" => $d->id,
                "userid" => Abricos::$user->id,
                "iStatus" => BotaskStatus::TASK_OPEN,
                "iParentStatus" => 0
            ));
            $history->isNewTask = true;
        } else {

            // является ли пользователь участником этой задача, если да, то он может делать с ней все что хошь
            if (!$this->TaskAccess($d->id)){
                return AbricosResponse::ERR_FORBIDDEN;
            }

            $task = $this->Task($d->id);
            if ($task->parentid != $d->parentid){// попытка сменить раздел каталога
                if ($task->parentid > 0 && !$this->TaskAccess($task->parentid)){ // разрешено ли его забрать из этой надзадачи?
                    $d->parentid = $task->parentid; // не будем менять родителя
                } else if ($d->parentid > 0 && !$this->TaskAccess($d->parentid)){ // разрешено ли поместить его в эту подзадачу
                    $d->parentid = $task->parentid; // не будем менять родителя
                }
            }

            if ($task->iStatus == BotaskStatus::TASK_CLOSE
                || $task->iStatus == BotaskStatus::TASK_REMOVE
            ){
                return AbricosResponse::ERR_BAD_REQUEST;
            }

            BotaskQuery::TaskUpdate($this->db, $d);

            /** @var BotaskHistory $history */
            $history = $this->InstanceClass('History', array(
                "taskid" => $d->id,
                "userid" => Abricos::$user->id,
            ));
            if ($d->title !== $task->title){
                $history->title = $task->title;
                $history->titleChanged = true;
            }
            if ($d->body != $task->body){
                $history->body = $task->body;
                $history->bodyChanged = true;
            }
            if ($d->parentid != $task->parentid){
                $history->parentid = $task->parentid;
                $history->parentChanged = true;
            }
            if ($d->deadline != $task->deadline){
                $history->deadline = $task->deadline;
                $history->deadlineChanged = true;
            }
            if ($d->deadlineTime != $task->deadlineTime){
                $history->deadlineTime = $task->deadlineTime;
                $history->deadlineTimeChanged = true;
            }
            if ($d->priority != $task->priority){
                $history->priority = $task->priority;
                $history->priorityChanged = true;
            }
        }

        $taskid = $d->id;

        $this->ItemUsersUpdate($taskid, $d->users, $history);

        // сохранить чеклист
        $this->CheckListSave($d->id, $d->checks, $history);

        // сохранить картинки
        $this->ImageListSave($d->id, $d->images, $history);

        BotaskQuery::HistoryAppend($this->db, $history);

        $this->CacheClear();

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret; //////////////////////////


        // обновить информацию по файлам, если есть на это роль
        $this->TaskSaveFilesUpdate($d, $history);


        $history->Save();

        $this->CacheClear();
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

    }

    private function ItemUsersUpdate($taskid, $users, BotaskHistory $history){
        $curUserList = $this->TaskUserRoleList($taskid);

        $users[] = Abricos::$user->id;
        $checker = array();

        /** @var UProfileManager $uprofileManager */
        $uprofileManager = Abricos::GetModule('uprofile')->GetManager();

        for ($i = 0; $i < count($users); $i++){
            $userid = $users[$i];
            $checker[$userid] = true;

            $curUser = $curUserList->GetBy('userid', $userid);
            if (!empty($curUser)){
                continue;
            }

            if (Abricos::$user->id != $userid && !$uprofileManager->UserPublicityCheck($userid)){
                continue;
            }

            BotaskQuery::UserRoleAppend($this->db, $taskid, $userid);

            $a = explode(',', $history->userAdded);
            $a[] = $userid;
            $history->userAdded = implode(',', $a);
        }

        // обновить информацию по правам пользователей
        for ($i = 0; $i < $curUserList->Count(); $i++){
            $curUser = $curUserList->GetByIndex($i);
            if (!isset($checker[$curUser->userid])){
                BotaskQuery::UserRoleRemove($this->db, $taskid, $curUser->userid);

                $a = explode(',', $history->userRemoved);
                $a[] = $userid;
                $history->userRemoved = implode(',', $a);
            }
        }
        $this->CacheClear();
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
