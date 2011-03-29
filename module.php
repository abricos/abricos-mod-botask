<?php 
/**
 * @version $Id$
 * @package Abricos
 * @subpackage Botask
 * @copyright Copyright (C) 2008 Abricos. All rights reserved.
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin (roosit@abricos.org)
 */

$mod = new BotaskModule();
CMSRegistry::$instance->modules->Register($mod);;

class BotaskModule extends CMSModule {
	
	public function __construct(){
		$this->version = "0.1";
		$this->name = "botask";
		$this->permission = new BotaskPermission($this);
	}
	
	/**
	 * Получить менеджер
	 *
	 * @return BotaskManager
	 */
	public function GetManager(){
		if (is_null($this->_manager)){
			require_once 'includes/manager.php';
			$this->_manager = new BotaskManager($this);
		}
		return $this->_manager;
	}
	
}

class BotaskStatus {
	
	/**
	 * Новая/Открытая задача
	 * @var integer
	 */
	const OPEN = 0;

	/**
	 * Принятая на исполнение задача
	 * @var integer
	 */
	const ACCEPT = 1;
	
	/**
	 * Закрытая задача
	 * @var integer
	 */
	const CLOSE = 9;

}

class BotaskAction {
	const VIEW	= 10;
	const WRITE	= 30;
	const ADMIN	= 50;
}

class BotaskPermission extends AbricosPermission {
	
	public function BotaskPermission(BotaskModule $module){
		
		$defRoles = array(
			new AbricosRole(BotaskAction::VIEW, UserGroup::REGISTERED),
			new AbricosRole(BotaskAction::VIEW, UserGroup::ADMIN),
			
			new AbricosRole(BotaskAction::WRITE, UserGroup::REGISTERED),
			new AbricosRole(BotaskAction::WRITE, UserGroup::ADMIN),
			
			new AbricosRole(BotaskAction::WRITE, UserGroup::ADMIN),
			new AbricosRole(BotaskAction::ADMIN, UserGroup::ADMIN),
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
?>