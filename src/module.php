<?php 
/**
 * @package Abricos
 * @subpackage Botask
 * @license MIT license (https://github.com/abricos/abricos-mod-botask/blob/master/LICENSE)
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

class BotaskModule extends Ab_Module {
	
	public function __construct(){
		$this->version = "0.3";
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
	
	public function UProfile_UserFriendList(){
		return $this->GetManager()->UProfile_UserFriendList();
	}

    public function Bos_IsMenu(){
        return true;
    }
}

class BotaskType {
	const TASK = 0;
	const PROJECT = 1;
	const FOLDER = 2;
}
	

/**
 * Статус задачи
 */
class BotaskStatus {
	
	/**
	 * Открытая задача
	 * @var integer
	 */
	const TASK_OPEN = 1;

	/**
	 * Открытая задача повторно
	 * @var integer
	 */
	const TASK_REOPEN = 2;
	
	/**
	 * Завершенная (закрытая) задача
	 * @var integer
	 */
	const TASK_CLOSE = 3;
	
	/**
	 * Задача в работе. Принятая самостоятельно.
	 * @var integer
	 */
	const TASK_ACCEPT = 4;

	/**
	 * Задача в работе. Назначенная конкретному лицу.
	 * @var integer
	 */
	const TASK_ASSIGN = 5;
	
	/**
	 * Задача удалена.
	 * @var integer
	 */
	const TASK_REMOVE = 6;

	/**
	 * Задача в архиве.
	 * @var integer
	 */
	const TASK_ARHIVE = 7;
}

class BotaskAction {
	const VIEW	= 10;
	const WRITE	= 30;
	const ADMIN	= 50;
}

class BotaskPermission extends Ab_UserPermission {
	
	public function BotaskPermission(BotaskModule $module){
		
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

?>