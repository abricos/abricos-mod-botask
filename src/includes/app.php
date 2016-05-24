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
        }
        return null;
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

}
