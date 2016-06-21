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
 */
class BotaskTask extends AbricosModel {
    protected $_structModule = 'botask';
    protected $_structName = 'Task';
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