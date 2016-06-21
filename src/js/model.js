var Component = new Brick.Component();
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        SYS = Brick.mod.sys,
        UID = Brick.env.user.id | 0;

    NS.Task = Y.Base.create('task', SYS.AppModel, [], {
        structureName: 'Task'
    }, {
        ATTRS: {
            status: {
                readOnly: true,
                getter: function(){
                    var val = this.get('iStatus');
                    return NS.Task.STATUS[val];
                }
            },
            type: {
                readOnly: true,
                getter: function(){
                    var val = this.get('iType');
                    return NS.Task.TYPE[val];
                }
            },
            parent: {
                readOnly: true,
                getter: function(){
                    var parentid = this.get('parentid');
                    return this.get('taskList').getById(parentid);
                }
            },
            taskList: {
                readOnly: true,
                getter: function(){
                    return this.appInstance.get('taskList');
                }
            },
            childs: {
                readOnly: true,
                getter: function(){
                    var childs = new NS.TaskList({
                        appInstance: this.appInstance
                    });
                    this.get('taskList').each(function(task){
                        if (task.get('parentid') === this.get('id')){
                            childs.add(task);
                        }
                    }, this);
                    return childs;
                }
            },
            userRole: {
                readOnly: true,
                getter: function(){
                    if (this._userRole){
                        return this._userRole;
                    }
                    this.get('users').each(function(userRole){
                        if (userRole.get('userid') === UID){
                            this._userRole = userRole;
                        }
                    }, this);
                    return this._userRole;
                }
            }
        },
        STATUS: {
            1: 'opened',
            2: 'reopened',
            3: 'closed',
            4: 'accepted',
            5: 'assigned',
            6: 'removed',
            7: 'arhived',
        },
        TYPE: {
            1: 'folder',
            2: 'project',
            3: 'task'
        }
    });

    NS.TaskList = Y.Base.create('taskList', SYS.AppModelList, [], {
        appItem: NS.Task,
    }, {
        ATTRS: {
            userIds: {
                readOnly: true,
                getter: function(){
                    var users = {};
                    this.each(function(task){
                        task.get('users').each(function(userRole){
                            var userid = userRole.get('userid') | 0;
                            users[userid] = users[userid] || {count: 0};
                            users[userid].count++;
                        }, this);
                    }, this);

                    var ret = [];
                    for (var userid in users){
                        ret[ret.length] = userid;
                    }
                    return ret;
                }
            }
        }
    });

    NS.UserRole = Y.Base.create('userRole', SYS.AppModel, [], {
        structureName: 'UserRole'
    }, {
        ATTRS: {
            user: {
                readOnly: true,
                getter: function(){
                    var userid = this.get('userid');
                    return this.appInstance.getApp('uprofile').get('userList').getById(userid);
                }
            }
        }
    });

    NS.UserRoleList = Y.Base.create('userRoleList', SYS.AppModelList, [], {
        appItem: NS.UserRole,
    });
};
