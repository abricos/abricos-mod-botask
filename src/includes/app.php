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
        return array();
    }

    protected function GetStructures(){
        return '';
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
            case 'boardData':
                return $this->BoardDataToJSON($d->hlid);
            case 'task':
                return $this->TaskToJSON($d->taskid);
        }
        return null;
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

    public function CustatusList($taskid){
        if (!$this->TaskAccess($taskid)){
            return null;
        }
        $ret = new stdClass();
        $ret->list = $this->ToArrayById(BotaskQuery::CustatusList($this->db, $taskid));
        $ret->my = $this->ToArray(BotaskQuery::CustatusListByUser($this->db, Abricos::$user->id));

        return $ret;
    }

    public function CustatusSave($sd){
        if (!$this->TaskAccess($sd->taskid)){
            return null;
        }

        $parser = Abricos::TextParser(true);
        $sd->title = $parser->Parser($sd->title);
        BotaskQuery::CustatusSave($this->db, $sd->taskid, Abricos::$user->id, $sd->title);

        return $this->CustatusList($sd->taskid);
    }

    /**
     * Список статусов всех пользователей общих проектов
     */
    public function CustatusFullList(){
        if (!$this->IsViewRole()){
            return null;
        }


        $rows = BotaskQuery::CustatusFullList($this->db, Abricos::$user->id);
        return $this->ToArray($rows);
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

    public function CheckListSave($taskid, $checkList, $history = null){

        if (!$this->IsWriteRole()){
            return null;
        }
        if (!$this->TaskAccess($taskid)){
            return null;
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

            if (($isNew && !empty($ch->ch)) || $ch->ch != $fch['ch']){
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
        $task['custatus'] = $this->CustatusList($taskid);

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

}
