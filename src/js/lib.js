var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['application.js']},
        {name: '{C#MODNAME}', files: ['old_lib.js']}
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
        REQS: {
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
                    var task = NS.taskManager.list.find(data['id']);
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
            }
        },
        ATTRS: {
            isLoadAppStructure: {value: false},
        },
        URLS: {
            ws: "#app={C#MODNAMEURI}/wspace/ws/",
            folder: {
                create: function(){
                    return this.getURL('folder.edit');
                },
                edit: function(id){
                    return this.getURL('ws') + 'foldereditor/FolderEditorWidget/' + (id | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'folderview/FolderViewWidget/' + (id | 0) + '/';
                }
            },
            project: {
                create: function(){
                    return this.getURL('project.edit');
                },
                edit: function(id){
                    return this.getURL('ws') + 'projecteditor/ProjectEditorWidget/' + (id | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'projectview/ProjectViewWidget/' + (id | 0) + '/';
                }
            },
            task: {
                create: function(){
                    return this.getURL('task.edit');
                },
                edit: function(id){
                    return this.getURL('ws') + 'taskeditor/TaskEditorWidget/' + (id | 0) + '/';
                },
                view: function(id){
                    return this.getURL('ws') + 'taskview/TaskViewWidget/' + (id | 0) + '/';
                }
            },
            item: {
                create: function(){
                    return this.getURL('ws') + 'type/TypeSelectWidget/';
                },
                view: function(type, id){
                    return this.getURL(type + '.view', id);
                }
            }
        }
    });
};