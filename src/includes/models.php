<?php

/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskType
 */
class BotaskType {
    const FOLDER = 1;
    const PROJECT = 2;
    const TASK = 3;
}


/**
 * Статус задачи
 */
class BotaskStatus {

    /**
     * Открытая задача
     *
     * @var integer
     */
    const TASK_OPEN = 1;

    /**
     * Открытая задача повторно
     *
     * @var integer
     */
    const TASK_REOPEN = 2;

    /**
     * Завершенная (закрытая) задача
     *
     * @var integer
     */
    const TASK_CLOSE = 3;

    /**
     * Задача в работе. Принятая самостоятельно.
     *
     * @var integer
     */
    const TASK_ACCEPT = 4;

    /**
     * Задача в работе. Назначенная конкретному лицу.
     *
     * @var integer
     */
    const TASK_ASSIGN = 5;

    /**
     * Задача удалена.
     *
     * @var integer
     */
    const TASK_REMOVE = 6;

    /**
     * Задача в архиве.
     *
     * @var integer
     */
    const TASK_ARHIVE = 7;
}


/**
 * Class BotaskTask
 *
 * @property int $parentid
 * @property int $iType
 * @property int $userid
 * @property int $iStatus
 * @property int $statusDate
 * @property string $title
 * @property string $descript
 * @property int $date
 * @property int $updateDate
 * @property int $removeDate
 * @property int $deadline
 * @property bool $deadlineTime
 * @property BotaskUserRoleList $users
 * @property BotaskResolutionInTaskList $resolutions
 * @property BotaskFileList $files
 * @property BotaskImageList $images
 * @property BotaskCheckList $checks
 */
class BotaskTask extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Task';

    private $_commentOwner;

    public function GetCommentOwner(){
        if (!empty($this->_commentOwner)){
            return $this->_commentOwner;
        }
        return $this->_commentOwner = Abricos::GetApp('comment')->InstanceClass('Owner', array(
            "module" => "botask",
            "type" => "task",
            "ownerid" => $this->id
        ));
    }

}

/**
 * Class BotaskTaskList
 *
 * @method BotaskTask Get(int $id)
 * @method BotaskTask GetByIndex(int $i)
 */
class BotaskTaskList extends AbricosModelList {

    /**
     * @param CommentStatisticList $list
     */
    public function SetCommentStatistics($list){
        $cnt = $list->Count();
        for ($i = 0; $i < $cnt; $i++){
            $stat = $list->GetByIndex($i);
            $task = $this->Get($stat->id);
            if (empty($task)){
                continue; // what is it? %)
            }
            $task->commentStatistic = $stat;
        }
    }
}

/**
 * Class BotaskUserRole
 *
 * @property int $userid
 * @property int $taskid
 * @property int $viewdate
 * @property bool $favorite
 * @property bool $expanded
 * @property bool $readed
 * @property int $readdate
 */
class BotaskUserRole extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'UserRole';
}

/**
 * Class BotaskUserRoleList
 *
 * @method BotaskUserRole Get(int $id)
 * @method BotaskUserRole GetByIndex(int $i)
 */
class BotaskUserRoleList extends AbricosModelList {

}

/**
 * Class BotaskResolution
 *
 * @property int $userid
 * @property string $title
 */
class BotaskResolution extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Resolution';
}

/**
 * Class BotaskResolutionList
 *
 * @method BotaskResolution Get(int $id)
 * @method BotaskResolution GetByIndex(int $i)
 */
class BotaskResolutionList extends AbricosModelList {
}

/**
 * Class BotaskResolutionInTask
 *
 * @property int $taskid
 * @property int $userid
 * @property int $resolutionid
 * @property int $dateline
 */
class BotaskResolutionInTask extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'ResolutionInTask';
}

/**
 * Class BotaskResolutionInTaskList
 *
 * @method BotaskResolutionInTask GetBy(string $name, mixed $value)
 */
class BotaskResolutionInTaskList extends AbricosModelList {
}

class BotaskFile extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'File';
}

class BotaskFileList extends AbricosModelList {
}

/**
 * Class BotaskImage
 *
 * @property int $userid
 * @property string $title
 * @property string $data
 * @property int $date
 */
class BotaskImage extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Image';
}

/**
 * Class BotaskImageList
 *
 * @method BotaskImage Get(int $id)
 * @method BotaskImage GetByIndex(int $i)
 */
class BotaskImageList extends AbricosModelList {
}

/**
 * Class BotaskCheck
 *
 * @property int $userid
 * @property int $date
 * @property int $updateDate
 * @property int $updateUserId
 * @property int $removeDate
 * @property int $removeUserId
 * @property bool $checked
 * @property int $checkedDate
 * @property int $checkedUserId
 * @property string $title
 * @property int $order
 */
class BotaskCheck extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Check';
}

/**
 * Class BotaskCheckList
 *
 * @method BotaskCheck Get(int $id)
 * @method BotaskCheck GetByIndex(int $i)
 */
class BotaskCheckList extends AbricosModelList {

    public $taskid = 0;

    public function ToJSON(){
        $ret = parent::ToJSON();
        $ret->taskid = $this->taskid;
        return $ret;
    }

}

/**
 * Class BotaskHistory
 *
 * @property int $taskid
 * @property int $userid
 * @property int $date
 *
 * @property int $iParentStatus
 * @property int $iStatus
 * @property int $statusUserId
 *
 * @property int $parentid
 * @property bool $parentChanged
 *
 * @property int $priority
 * @property bool $priorityChanged
 *
 * @property string $title
 * @property bool $titleChanged
 *
 * @property string $body
 * @property bool $bodyChanged
 *
 * @property string $imageData
 * @property bool $imageDataChanged
 *
 * @property string $checks
 * @property bool $checksChanged
 *
 * @property int $deadline
 * @property bool $deadlineChanged
 *
 * @property int $deadlineByTime
 * @property bool $deadlineByTimeChanged
 *
 * @property string $userAdded
 * @property string $userRemoved
 */
class BotaskHistory extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'History';

    public $isNewTask = false;
}

class BotaskHistoryList extends AbricosModelList {
}
