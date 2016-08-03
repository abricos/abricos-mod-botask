<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskManager
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
