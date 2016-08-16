<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskModule
 *
 * @method BotaskManager GetManager()
 */
class BotaskModule extends Ab_Module {

    public function __construct(){
        $this->version = "0.3.1";
        $this->name = "botask";
        $this->permission = new BotaskPermission($this);
    }

    public function Bos_IsMenu(){
        return true;
    }

    public function UProfile_IsFriendIds(){
        return true;
    }
}

class BotaskAction {
    const VIEW = 10;
    const WRITE = 30;
    const ADMIN = 50;
}

class BotaskPermission extends Ab_UserPermission {

    public function __construct(BotaskModule $module){

        $defRoles = array(
            new Ab_UserRole(BotaskAction::VIEW, Ab_UserGroup::REGISTERED),
            new Ab_UserRole(BotaskAction::VIEW, Ab_UserGroup::ADMIN),

            new Ab_UserRole(BotaskAction::WRITE, Ab_UserGroup::REGISTERED),
            new Ab_UserRole(BotaskAction::WRITE, Ab_UserGroup::ADMIN),

            new Ab_UserRole(BotaskAction::WRITE, Ab_UserGroup::ADMIN),
            new Ab_UserRole(BotaskAction::ADMIN, Ab_UserGroup::ADMIN),
        );
        parent::__construct($module, $defRoles);
    }

    public function GetRoles(){
        return array(
            BotaskAction::VIEW => $this->CheckAction(BotaskAction::VIEW),
            BotaskAction::WRITE => $this->CheckAction(BotaskAction::WRITE),
            BotaskAction::ADMIN => $this->CheckAction(BotaskAction::ADMIN)
        );
    }
}

Abricos::ModuleRegister(new BotaskModule());
