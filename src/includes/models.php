<?php
/**
 * @package Abricos
 * @subpackage Botask
 * @copyright 2012-2016 Alexander Kuzmin
 * @license http://opensource.org/licenses/mit-license.php MIT License
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

/**
 * Class BotaskTask
 *
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
 */
class BotaskUserRole extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'UserRole';
}

class BotaskUserRoleList extends AbricosModelList {
}

class BotaskResolution extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Resolution';
}

class BotaskResolutionList extends AbricosModelList {
}

class BotaskResolutionInTask extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'ResolutionInTask';
}

class BotaskResolutionInTaskList extends AbricosModelList {
}

class BotaskFile extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'File';
}

class BotaskFileList extends AbricosModelList {
}

class BotaskImage extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Image';
}

class BotaskImageList extends AbricosModelList {
}

class BotaskCheck extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Check';
}

class BotaskCheckList extends AbricosModelList {
}
