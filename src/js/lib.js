var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['application.js']},
        {name: '{C#MODNAME}', files: ['old_lib.js', 'base.js', 'model.js']}
    ]
};
Component.entryPoint = function(NS){

    NS.roles = new Brick.AppRoles('{C#MODNAME}', {
        isAdmin: 50,
        isWrite: 30,
        isView: 10
    });

    var COMPONENT = this,
        SYS = Brick.mod.sys;

    SYS.Application.build(COMPONENT, {}, {
        initializer: function(){
            var instance = this;
            NS.roles.load(function(){
                Brick.mod.filemanager.roles.load(function(){
                    instance.initCallbackFire();
                });
            });
        }
    }, [], {
        APPS: {
            uprofile: {},
            comment: {},
        },
        ATTRS: {
            isLoadAppStructure: {value: true},
            Task: {value: NS.Task},
            TaskList: {value: NS.TaskList},
            UserRole: {value: NS.UserRole},
            UserRoleList: {value: NS.UserRoleList},
        },
        REQS: {

            taskList: {
                attribute: true,
                type: 'modelList:TaskList',
                onResponse: function(taskList){
                    var userIds = taskList.get('userIds');

                    return function(callback, context){
                        this.getApp('uprofile').userListByIds(userIds, function(err, result){
                            callback.call(context || null);
                        }, context);
                    };
                }
            },

            boardData: {
                args: ['hlid'],
                attribute: false,
                onResponse: function(data){
                    return function(callback, context){
                        this.getApp('uprofile').userListByIds(data.users, function(err, result){

                            callback.call(context || null);
                        }, context);
                    };
                }
            },
            task: {
                args: ['taskid'],
                attribute: false,
                onResponse: function(data){
                    if (!data){
                        return;
                    }
                    var task = NS.taskManager.list.find(data.id);
                    if (!task){
                        return;
                    }

                    var isNew = task.isNew;
                    task.setData(data);

                    NS.taskManager.historyUpdate(data['hst']);

                    if (isNew){
                        NS.taskManager.newTaskReadEvent.fire(task);
                    }

                    return function(callback, context){
                        this.getApp('uprofile').userListByIds(data.users, function(err, result){

                            callback.call(context || null);
                        }, context);
                    };
                }
            },
            taskSave: {
                args: ['data']
            },
            taskSetExec: {
                args: ['taskid']
            },
            taskUnsetExec: {
                args: ['taskid']
            },
            taskClose: {
                args: ['taskid']
            },
            taskRemove: {
                args: ['taskid']
            },
            taskRestore: {
                args: ['taskid']
            },
            taskArhive: {
                args: ['taskid']
            },
            taskOpen: {
                args: ['taskid']
            },
            taskFavorite: {
                args: ['taskid', 'value']
            },
            taskVoting: {
                args: ['taskid', 'value']
            },
            taskExpand: {
                args: ['taskid', 'value']
            },
            taskShowComments: {
                args: ['taskid', 'value']
            },
            checkListSave: {
                args: ['taskid', 'data']
            },
            customStatusSave: {
                args: ['taskid', 'value']
            },
            customStatusFullList: {},
        },
        URLS: {
            ws: "#app={C#MODNAMEURI}/wspace/ws/",
            folder: {
                create: function(parentid){
                    return this.getURL('folder.edit', 0, parentid | 0);
                },
                edit: function(id, parentid){
                    return this.getURL('ws') + 'foldereditor/FolderEditorWidget/' + (id | 0) + '/' + (parentid | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'folderview/FolderViewWidget/' + (id | 0) + '/';
                }
            },
            project: {
                create: function(parentid){
                    return this.getURL('project.edit', 0, parentid | 0);
                },
                edit: function(id, parentid){
                    return this.getURL('ws') + 'projecteditor/ProjectEditorWidget/' + (id | 0) + '/' + (parentid | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'projectview/ProjectViewWidget/' + (id | 0) + '/';
                }
            },
            task: {
                create: function(parentid){
                    return this.getURL('task.edit', 0, parentid | 0);
                },
                edit: function(id, parentid){
                    return this.getURL('ws') + 'taskeditor/TaskEditorWidget/' + (id | 0) + '/' + (parentid | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'taskview/TaskViewWidget/' + (id | 0) + '/';
                }
            },
            item: {
                create: function(parentid){
                    return this.getURL('ws') + 'type/TypeSelectWidget/' + (parentid | 0) + '/';
                },
                edit: function(type, id, parentid){
                    return this.getURL(type + '.edit', id, parentid);
                },
                view: function(type, id){
                    return this.getURL(type + '.view', id);
                }
            },
            goById: function(){
                return this.getURL('ws') + 'goById/GoByIdWidget/';
            },
            filter: {
                customStatus: function(){
                    return this.getURL('ws') + 'filter/FilterByCustomStatusWidget/';
                }
            }
        }
    });
};