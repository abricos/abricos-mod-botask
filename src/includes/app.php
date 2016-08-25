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
            case 'sync':
                return $this->SyncToJSON($d->lastUpdateDate);

            case 'itemSave':
                return $this->ItemSaveToJSON($d->data);
            case 'taskList':
                return $this->TaskListToJSON();
            case 'task':
                return $this->TaskToJSON($d->taskid);

            case 'taskFavorite':
                return $this->TaskFavoriteToJSON($d->taskid, $d->value);
            case 'taskReaded':
                return $this->TaskReadedToJSON($d->taskid);
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
            case 'resolutionList':
                return $this->ResolutionListToJSON();
            case 'resolutionSave':
                return $this->ResolutionSaveToJSON($d->taskid, $d->value);
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

    public function ItemAccess($taskid){
        if (!$this->IsViewRole()){
            return false;
        }

        if (!isset($this->_cache['ItemAccess'])){
            $this->_cache['ItemAccess'] = array();
        }
        if (isset($this->_cache['ItemAccess'][$taskid])){
            return $this->_cache['ItemAccess'][$taskid];
        }

        $d = BotaskQuery::UserRole($this->db, $taskid);

        return $this->_cache['ItemAccess'][$taskid] = !empty($d);
    }

    public function SyncToJSON($lastUpdateDate){
        $res = $this->Sync();

        return $this->ImplodeJSON(array(
            $this->ResultToJSON('sync', $res),
            $this->TaskListToJSON($lastUpdateDate)
        ));

        return $this->ResultToJSON('sync', $res);
    }

    public function Sync(){
        $ret = new stdClass();
        $ret->date = TIMENOW;
        return $ret;
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
                if (!$this->ItemAccess($d->parentid)){
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
            if (!$this->ItemAccess($d->id)){
                return AbricosResponse::ERR_FORBIDDEN;
            }

            $task = $this->Task($d->id);
            if ($task->parentid != $d->parentid){// попытка сменить раздел каталога
                if ($task->parentid > 0 && !$this->ItemAccess($task->parentid)){ // разрешено ли его забрать из этой надзадачи?
                    $d->parentid = $task->parentid; // не будем менять родителя
                } else if ($d->parentid > 0 && !$this->ItemAccess($d->parentid)){ // разрешено ли поместить его в эту подзадачу
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

        $this->TaskUsersUpdate($taskid, $d->users, $history);

        // сохранить чеклист
        $this->CheckListSave($d->id, $d->checks, $history);

        // сохранить картинки
        $this->ImageListSave($d->id, $d->images, $history);

        // сохранить файлы
        $this->FileListSave($d->id, $d->files, $history);

        $this->HistoryAppend($history);

        $this->CacheClear();

        $task = $this->Task($taskid);
        $host = Ab_URI::Site();

        switch ($task->iType){
            case BotaskType::PROJECT:
                $templateSuffix = "Proj";
                $itemLink = $host."/bos/#app=botask/wspace/ws/projectView/ProjectViewWidget/".$task->id."/";
                break;
            case BotaskType::TASK:
                $templateSuffix = "Task";
                $itemLink = "http://".$host."/bos/#app=botask/wspace/ws/taskView/TaskViewWidget/".$task->id."/";
                break;
        }

        if ($history->isNewTask && !empty($templateSuffix)){

            $brick = Brick::$builder->LoadBrickS('botask', 'notifyNew'.$templateSuffix, null, null);
            $v = &$brick->param->var;

            /** @var NotifyApp $notifyApp */
            $notifyApp = Abricos::GetApp('notify');

            /** @var UProfileApp $uprofileApp */
            $uprofileApp = Abricos::GetApp('uprofile');

            $userids = $task->users->ToArray('userid');

            $userList = $uprofileApp->UserListByIds($userids);

            $author = $uprofileApp->User(Abricos::$user->id);
            for ($i = 0; $i < $userList->Count(); $i++){
                $user = $userList->GetByIndex($i);
                if ($user->id == Abricos::$user->id){
                    continue;
                }
                $email = $user->email;
                if (empty($email)){
                    continue;
                }

                $mail = $notifyApp->MailByFields(
                    $email,
                    Brick::ReplaceVarByData($v['subject'], array("tl" => $task->title)),
                    Brick::ReplaceVarByData($brick->content, array(
                        "sitename" => SystemModule::$instance->GetPhrases()->Get('site_name'),
                        "email" => $email,
                        "unm" => $author->GetViewName(),
                        "plnk" => $itemLink,
                        "tl" => $task->title,
                        "prj" => $task->descript,
                    ))
                );

                $notifyApp->MailSend($mail);
            }
        }

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }

    /**
     * @param $taskid
     * @return BotaskUserRoleList
     */
    private function TaskUserRoleList($taskids){
        if (!is_array($taskids)){
            $taskids = array($taskids);
        }
        /** @var BotaskUserRoleList $list */
        $list = $this->InstanceClass('UserRoleList');

        $rows = BotaskQuery::UserRoleList($this->db, $taskids);
        while (($d = $this->db->fetch_array($rows))){
            $list->Add($this->InstanceClass('UserRole', $d));
        }

        return $list;
    }

    public function TaskListToJSON($lastUpdateDate = 0){
        $res = $this->TaskList($lastUpdateDate);
        return $this->ResultToJSON('taskList', $res);
    }

    public function TaskList($lastUpdateDate = 0){
        if (!$this->manager->IsViewRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        if (isset($this->_cache['TaskList'])){
            return $this->_cache['TaskList'];
        }

        /** @var BotaskTaskList $list */
        $list = $this->InstanceClass('TaskList');

        $rows = BotaskQuery::TaskList($this->db, $lastUpdateDate);
        while (($d = $this->db->fetch_array($rows))){
            /** @var BotaskTask $item */
            $item = $this->InstanceClass('Task', $d);
            $list->Add($item);
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
        if (!$this->ItemAccess($taskid)){
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

    public function TaskFavoriteToJSON($taskid, $value){
        $res = $this->TaskFavorite($taskid, $value);
        return $this->ResultToJSON('taskFavorite', $res);
    }

    public function TaskFavorite($taskid, $value){
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        BotaskQuery::TaskFavoriteUpdate($this->db, $taskid, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;
    }

    public function TaskReadedToJSON($taskid){
        $res = $this->TaskReaded($taskid);
        return $this->ResultToJSON('taskReaded', $res);
    }

    public function TaskReaded($taskid){
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        BotaskQuery::TaskReadedUpdate($this->db, $taskid);

        $ret = new stdClass();
        $ret->taskid = $taskid;
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
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $ids = $this->TaskRemoveMethod($taskid);

        $this->CacheClear();

        $ret = new stdClass();
        $ret->taskids = $ids;
        return $ret;
    }


    /* * * * * * * * * * * * * * * * Files * * * * * * * * * * * * * * */

    public function FileListToJSON($taskid){
        $res = $this->FileList($taskid);
        return $this->ResultToJSON('fileList', $res);
    }

    public function FileList($taskid){
        if (!$this->ItemAccess($taskid)){
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

    private function FileListSave($taskid, $d, $history = null){
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var FileManagerModule $mod */
        $fmModule = Abricos::GetModule('filemanager');
        if (empty($fmModule)){
            return AbricosResponse::ERR_BAD_REQUEST;
        }
        /** @var FileManager $fmManager */
        $fmManager = $fmModule->GetManager();
        if (!$fmManager->IsFileUploadRole()){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $curFileList = $this->FileList($taskid);
        $checker = array();

        for ($i = 0; $i < count($d); $i++){
            $dFile = $d[$i];
            $checker[$dFile->id] = true;
            $curFile = $curFileList->Get($dFile->id);

            if (empty($curFile)){
                BotaskQuery::FileAppend($this->db, $taskid, $dFile->id);
            }
        }

        for ($i = 0; $i < $curFileList->Count(); $i++){
            $curFile = $curFileList->GetByIndex($i);
            if (!isset($checker[$curFile->id])){
                BotaskQuery::FileRemove($this->db, $taskid, $curFile->id);
            }
        }

        $this->CacheClear();

        $ret = new stdClass();
        $ret->taskid = $taskid;
        return $ret;
    }


    /* * * * * * * * * * * * * * * * Images * * * * * * * * * * * * * * */

    public function ImageListToJSON($taskid){
        $res = $this->ImageList($taskid);
        return $this->ResultToJSON('imageList', $res);
    }

    public function ImageList($taskid){
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        /** @var BotaskImageList $list */
        $list = $this->InstanceClass('ImageList');

        $rows = BotaskQuery::ImageList($this->db, $taskid);
        while (($d = $this->db->fetch_array($rows))){
            $d['data'] = json_decode($d['data']);
            $list->Add($this->InstanceClass('Image', $d));
        }

        return $list;
    }

    private function ImageRemove($taskid, $image){
        $d = json_decode($image['data']);
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
        BotaskQuery::ImageRemove($this->db, $image['imageid']);
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
        if (!$this->ItemAccess($taskid)){
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
                $this->HistoryAppend($history);
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
                $this->HistoryAppend($history);
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

    /**
     * @return BotaskResolutionList|int
     */
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
            $this->ResolutionListToJSON(),
            $this->TaskToJSON($taskid)
        ));
    }

    public function ResolutionSave($taskid, $value){
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }

        $parser = Abricos::TextParser(true);
        $value = $parser->Parser($value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;

        $task = $this->Task($taskid);
        $resolInTask = $task->resolutions->GetBy('userid', Abricos::$user->id);

        if (!empty($resolInTask)){
            BotaskQuery::ResolutionInTaskRemove($this->db, $taskid, $resolInTask->resolutionid);
        }

        if (empty($value)){
            return $ret;
        }

        $list = $this->ResolutionList();

        $resolid = 0;
        for ($i = 0; $i < $list->Count(); $i++){
            $resol = $list->GetByIndex($i);
            if ($resol->userid === Abricos::$user->id && $resol->title === $value){
                $resolid = intval($resol->id);
                break;
            }
        }

        if ($resolid === 0){
            $resolid = BotaskQuery::ResolutionAppend($this->db, $value);
        }

        BotaskQuery::ResolutionInTaskAppend($this->db, $taskid, $resolid);

        return $ret;
    }

    /* * * * * * * * * * * * * * * * * History * * * * * * * * * * * * * * */

    public function HistoryListToJSON($taskid){
        $res = $this->HistoryList($taskid);
        return $this->ResultToJSON('historyList', $res);
    }

    public function HistoryList($taskid){
        if (!$this->ItemAccess($taskid)){
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

        $this->HistoryAppend($history);

        BotaskQuery::TaskSetStatus($this->db, $taskid, BotaskStatus::TASK_REMOVE, Abricos::$user->id);
    }

    private function HistoryAppend(BotaskHistory $history){
        BotaskQuery::HistoryAppend($this->db, $history);
        $this->TaskReadedClean($history->taskid);
    }

    private function TaskReadedClean($taskid){
        BotaskQuery::TaskUpdateDate($this->db, $taskid);
        BotaskQuery::TaskReadedUpdate($this->db, $taskid);
        BotaskQuery::TaskReadedUsersClean($this->db, $taskid);
    }

    /* * * * * * * * * * * * * * * * * Friends * * * * * * * * * * * * * * */

    public function UProfile_FriendIds(){
        if (!$this->IsViewRole()){
            return null;
        }

        $users = array();
        $rows = BotaskQuery::UserFriendList($this->db);
        while (($row = $this->db->fetch_array($rows))){
            $users[] = intval($row['id']);
        }

        return $users;
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


    private function TaskUsersUpdate($taskid, $users, BotaskHistory $history){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
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
        if (!$this->ItemAccess($taskid)){
            return AbricosResponse::ERR_FORBIDDEN;
        }
        BotaskQuery::TaskExpand($this->db, $taskid, Abricos::$user->id, $value);

        $ret = new stdClass();
        $ret->taskid = $taskid;
        $ret->value = $value;
        return $ret;

    }

    ////////////////////////////// Comments /////////////////////////////

    public function Comment_IsList($type, $ownerid){
        if (!$this->IsViewRole() || $type !== 'task'){
            return false;
        }

        return $this->ItemAccess($ownerid);
    }

    public function Comment_IsWrite($type, $ownerid){
        if (!$this->IsViewRole() || $type !== 'task'){
            return false;
        }
        return $this->ItemAccess($ownerid);
    }

    /**
     * @param string $type
     * @param Comment $comment
     * @param Comment $parentComment
     */
    public function Comment_SendNotify($type, $ownerid, $comment, $parentComment){
        if (!$this->IsViewRole() || $type !== 'task' || !$this->ItemAccess($ownerid)){
            return;
        }

        $task = $this->Task($ownerid);
        $host = Ab_URI::Site();

        $this->TaskReadedClean($task->id);

        /** @var NotifyApp $notifyApp */
        $notifyApp = Abricos::GetApp('notify');
        switch ($task->iType){
            case BotaskType::PROJECT:
                $templateSuffix = "Proj";
                $itemLink = $host."/bos/#app=botask/wspace/ws/projectView/ProjectViewWidget/".$task->id."/";
                break;
            case BotaskType::TASK:
                $templateSuffix = "Task";
                $itemLink = $host."/bos/#app=botask/wspace/ws/taskView/TaskViewWidget/".$task->id."/";
                break;
            default:
                return;
        }

        $emails = array();

        // уведомление "комментарий на комментарий"
        if (!empty($parentComment) && $parentComment->userid != Abricos::$user->id){
            $brick = Brick::$builder->LoadBrickS('botask', 'notifyCmtAns'.$templateSuffix, null, null);
            $v = &$brick->param->var;

            $email = $parentComment->user->email;
            if (!empty($email)){
                $emails[$email] = true;

                $mail = $notifyApp->MailByFields(
                    $email,
                    Brick::ReplaceVarByData($v['subject'], array("tl" => $task->title)),
                    Brick::ReplaceVarByData($brick->content, array(
                        "sitename" => SystemModule::$instance->GetPhrases()->Get('site_name'),
                        "email" => $email,
                        "unm" => $comment->user->GetViewName(),
                        "plnk" => $itemLink,
                        "tl" => $task->title,
                        "parentComment" => $parentComment->body." ",
                        "comment" => $comment->body." ",
                    ))
                );

                $notifyApp->MailSend($mail);
            }
        }

        // уведомление автору и подписчикам
        $rows = BotaskQuery::TaskUserListForNotify($this->db, $task->id);
        while (($user = $this->db->fetch_array($rows))){
            if ($user['id'] == Abricos::$user->id){
                continue;
            }

            $email = $user['email'];

            if (empty($email) || isset($emails[$email])){
                continue;
            }
            $emails[$email] = true;

            $brick = Brick::$builder->LoadBrickS('botask', 'notifyCmt'.$templateSuffix, null, null);
            $v = &$brick->param->var;

            $mail = $notifyApp->MailByFields(
                $email,
                Brick::ReplaceVarByData($v['subject'], array("tl" => $task->title)),
                Brick::ReplaceVarByData($brick->content, array(
                    "sitename" => SystemModule::$instance->GetPhrases()->Get('site_name'),
                    "email" => $email,
                    "unm" => $comment->user->GetViewName(),
                    "plnk" => $itemLink,
                    "tl" => $task->title,
                    "comment" => $comment->body." ",
                ))
            );

            $notifyApp->MailSend($mail);
        }
    }
}
