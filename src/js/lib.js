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
            Check: {value: NS.Check},
            CheckList: {value: NS.CheckList},
            History: {value: NS.History},
            HistoryList: {value: NS.HistoryList},
            lastUpdateDate: {
                value: new Date(1970, 1, 1)
            },
            taskList: {
                readOnly: true,
                getter: function(){
                    if (!this._taskList){
                        this._taskList = new NS.TaskList({appInstance: this});
                    }
                    return this._taskList;
                }
            }
        },
        CRONS: {
            sync: {
                interval: 5 * 60,
                event: function(){
                    var lastUpdateDate = this.get('lastUpdateDate').getTime() / 1000;
                    this.sync(lastUpdateDate);
                }
            }
        },
        REQS: {
            sync: {
                args: ['lastUpdateDate'],
                onResponse: function(data){
                    this.set('lastUpdateDate', new Date(data.date * 1000));
                }
            },

            taskList: {
                attribute: false,
                attach: 'resolutionList',
                type: 'modelList:TaskList',
                onResponse: function(taskList){
                    var cacheTaskList = this.get('taskList'),
                        lastUpdateDate = this.get('lastUpdateDate');

                    taskList.each(function(task){
                        var taskid = task.get('id'),
                            taskUpdateDate = task.get('updateDate');

                        if (taskUpdateDate.getTime() > lastUpdateDate.getTime()){
                            lastUpdateDate = taskUpdateDate;
                        }

                        if (cacheTaskList.getById(taskid)){
                            cacheTaskList.removeById(taskid);
                        }
                        cacheTaskList.add(task);
                    }, this);

                    this.set('lastUpdateDate', lastUpdateDate);

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

            taskFavorite: {
                args: ['taskid', 'value']
            },
            taskReaded: {
                args: ['taskid', 'value']
            },
            taskRemove: {
                args: ['taskid'],
                onResponse: function(result){
                    var taskList = this.get('taskList'),
                        ids = result.taskids;

                    for (var i = 0, task; i < ids.length; i++){
                        task = taskList.getById(ids[i]);
                        if (!task){
                            continue;
                        }
                        task.set('status', 'removed');
                    }
                }
            },

            itemSave: {
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
            taskRestore: {
                args: ['taskid']
            },
            taskArhive: {
                args: ['taskid']
            },
            taskOpen: {
                args: ['taskid']
            },
            taskVoting: {
                args: ['taskid', 'value']
            },
            taskExpand: {
                args: ['taskid', 'value']
            },

            checkList: {
                type: 'modelList:CheckList',
                onResponse: function(result, data){
                    var taskList = this.get('taskList'),
                        task = taskList.getById(data.taskid);

                    task ? task.set('checks', result) : null;
                }
            },
            checkListSave: {
                args: ['taskid', 'data']
            },

            imageList: {
                type: 'modelList:ImageList',
                onResponse: function(result, data){
                    var taskList = this.get('taskList'),
                        task = taskList.getById(data.taskid);

                    task ? task.set('images', result) : null;
                }
            },
            imageListSave: {
                args: ['taskid', 'data']
            },

            resolutionList: {
                attribute: true,
                type: 'modelList:ResolutionList',
            },
            resolutionSave: {
                args: ['taskid', 'value']
            }
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
                isChanged: function(){
                    return this.getURL('boxList.filter', 'isChanged');
                },
                isNewComment: function(){
                    return this.getURL('boxList.filter', 'isNewComment');
                },
                isNotReaded: function(){
                    return this.getURL('boxList.filter', 'isNotReaded');
                },
            },
            folder: {
                create: function(parentid){
                    return this.getURL('folder.edit', 0, parentid | 0);
                },
                edit: function(id, parentid){
                    return this.getURL('ws') + 'folderEditor/FolderEditorWidget/' + (id | 0) + '/' + (parentid | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'folderView/FolderViewWidget/' + (id | 0) + '/';
                }
            },
            project: {
                create: function(parentid){
                    return this.getURL('project.edit', 0, parentid | 0);
                },
                edit: function(id, parentid){
                    return this.getURL('ws') + 'projectEditor/ProjectEditorWidget/' + (id | 0) + '/' + (parentid | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'projectView/ProjectViewWidget/' + (id | 0) + '/';
                }
            },
            task: {
                create: function(parentid){
                    return this.getURL('task.edit', 0, parentid | 0);
                },
                edit: function(id, parentid){
                    return this.getURL('ws') + 'taskEditor/TaskEditorWidget/' + (id | 0) + '/' + (parentid | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'taskView/TaskViewWidget/' + (id | 0) + '/';
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