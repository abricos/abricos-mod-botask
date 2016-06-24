var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['application.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: '{C#MODNAME}', files: ['base.js', 'model.js']}
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
            Resolution: {value: NS.Resolution},
            ResolutionList: {value: NS.ResolutionList},
            ResolutionInTask: {value: NS.ResolutionInTask},
            ResolutionInTaskList: {value: NS.ResolutionInTaskList},
            File: {value: NS.File},
            FileList: {value: NS.FileList},
            Image: {value: NS.Image},
            ImageList: {value: NS.ImageList},
        },
        REQS: {

            taskList: {
                attribute: true,
                attach: 'resolutionList',
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

            task: {
                args: ['taskid'],
                attribute: false,
                type: 'model:Task',
                onResponse: function(task){
                    var taskList = this.get('taskList'),
                        taskid = task.get('id'),
                        userIds = task.get('userIds');

                    return function(callback, context){
                        this.getApp('uprofile').userListByIds(userIds, function(err, result){

                            taskList.removeById(taskid);
                            taskList.add(task);

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

            resolutionList: {
                attribute: true,
                type: 'modelList:ResolutionList',
            },
        },
        URLS: {
            ws: "#app={C#MODNAMEURI}/wspace/ws/",
            boxList: {
                filter: function(filter){
                    return this.getURL('ws') + 'easylist/TaskListBoxWidget/' + filter + '/';
                },
                isFavorite: function(){
                    return this.getURL('boxList.filter', 'isFavorite');
                },
                isNew: function(){
                    return this.getURL('boxList.filter', 'isNew');
                },
                isChnaged: function(){
                    return this.getURL('boxList.filter', 'isChanged');
                },
                isNewComment: function(){
                    return this.getURL('boxList.filter', 'isNewComment');
                },
            },
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