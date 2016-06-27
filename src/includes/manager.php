<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

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

    private function old__AJAX($d){
        switch ($d->do){
            case 'sync':
                return $this->Sync();
            case 'custatsave':
                return $this->CustatusSave($d->custat);
            case 'custatfull':
                return $this->CustatusFullList();
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
        if (!$this->IsViewRole()){
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
