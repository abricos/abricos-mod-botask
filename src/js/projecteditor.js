var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['editor.js']},
        {name: 'widget', files: ['calendar.js']},
        {name: 'uprofile', files: ['userSelect.js']},
        {name: '{C#MODNAME}', files: ['widgets.js', 'checklist.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'pictab', files: ['draw.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.ProjectEditorWidget = Y.Base.create('ProjectEditorWidget', SYS.AppWidget, [
        SYS.WidgetEditorStatus
    ], {
        onInitAppWidget: function(err, appInstance){
            var taskid = this.get('taskid'),
                task = this.get('task');

            if (!task){
                return;
            }

            if (taskid === 0){
                return this._onLoadTask();
            }

            this.set('waiting', true);
            appInstance.task(taskid, function(err, result){
                this.set('waiting', false);

                this._onLoadTask();
            }, this)
        },
        destructor: function(){
            if (this.parentSelectWidget){
                this.parentSelectWidget.destroy();
                this.parentSelectWidget = null;
            }
            if (this.editor){
                this.editor.destroy();
                this.editor = null;
            }
            if (this.checklist){
                this.checklist.destroy();
                this.checklist = null;
            }
        },
        _onLoadTask: function(){
            var tp = this.template,
                taskid = this.get('taskid'),
                task = this.get('task');

            this.parentSelectWidget = new NS.TaskTreeSelectWidget({
                srcNode: tp.one('path'),
                taskid: taskid,
                parentTaskId: task.parent ? task.parent.id : 0
            });

            tp.setValue({
                tl: task.title
            });

            this.editor = new SYS.Editor({
                appInstance: this.get('appInstance'),
                srcNode: tp.gel('editor'),
                content: task.descript,
                toolbar: SYS.Editor.TOOLBAR_MINIMAL
            });

            this.checklist = new NS.ChecklistWidget({
                srcNode: tp.one('checklist'),
                task: task,
                config: {
                    hidebtn: true,
                    hideinfo: true
                }
            });
            this.checklist.update();

            if (Brick.mod.filemanager.roles.isWrite){
                this.filesWidget = new Brick.mod.filemanager.AttachmentWidget(tp.gel('files'), task.files);
            } else {
                this.filesWidget = null;
                tp.hide('rfiles');
            }

            var users = task.id * 1 == 0 && task.parent ? task.parent.users : task.users;

            this.usersWidget = new Brick.mod.uprofile.UserSelectWidget({
                srcNode: tp.append('users', '<div></div>'),
                users: users
            });

            this.drawListWidget = null;
            if (Brick.mod.pictab && Brick.mod.pictab.ImageListWidget){
                this.drawListWidget = new Brick.mod.pictab.ImageListWidget(tp.gel('widget'), task.images);
            } else {
                tp.hide('rimage');
            }
        },
        save: function(){
            var tp = this.template,
                task = this.get('task'),
                users = this.usersWidget.get('users');

            users[users.length] = Brick.env.user.id;

            var images = [];
            if (this.drawListWidget){
                images = this.drawListWidget.toSave();
            }

            var data = {
                id: task.id,
                type: 'project',
                tl: tp.getValue('tl'),
                bd: this.editor.get('content'),
                checks: this.checklist.toJSON(),
                files: !this.filesWidget ? task.files : this.filesWidget.files,
                images: images,
                onlyimage: false,
                users: users,
                pid: this.parentSelectWidget.getValue(),
                ddl: NS.dateToServer(null),
                ddlt: 0,
                prt: 3,
            };

            this.get('appInstance').taskSave(data, function(err, result){
                this.set('waiting', false);

                if (!err){
                    this.go('project.view', result.taskSave.taskid);
                }
            }, this);

        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            taskid: {
                value: 0,
                setter: function(val){
                    return val | 0;
                },
            },
            task: {
                readOnly: true,
                getter: function(){
                    var taskid = this.get('taskid');
                    if (taskid > 0){
                        return NS.taskManager.getTask(taskid);
                    }
                    if (this._taskNewCache){
                        return this._taskNewCache;
                    }
                    return this._taskNewCache = new NS.Task();
                }
            },
            isEdit: {
                getter: function(){
                    return (this.get('taskid') | 0) > 0
                }
            }
        },
        CLICKS: {
            save: 'save',
            addImageTab: {
                event: function(){
                    this.drawListWidget.createTab();
                }
            },
            imageEnable: {
                event: function(){
                    this._imageEnabled = true;
                    this.template.toggleView(true, 'imageDisable,addImageTab', 'imageEnable');
                }
            },
            imageDisable: {
                event: function(){
                    this._imageEnabled = false;
                    this.template.toggleView(false, 'imageDisable,addImageTab', 'imageEnable');
                }
            }
        },
        parseURLParam: function(args){
            args = args || [];
            return {
                taskid: (args[0] | 0)
            };
        }
    });
};