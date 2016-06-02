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
        NS.TaskWidgetExt,
        NS.ContainerWidgetExt,
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
        },
        _onLoadTask: function(){
            var tp = this.template,
                taskid = this.get('taskid'),
                task = this.get('task');

            tp.setValue({
                tl: task.title
            });

            this.addWidget('parentSelect', new NS.TaskTreeSelectWidget({
                srcNode: tp.one('path'),
                taskid: taskid,
                parentTaskId: task.parent ? task.parent.id : 0
            }));

            this.addWidget('editor', new SYS.Editor({
                appInstance: this.get('appInstance'),
                srcNode: tp.gel('editor'),
                content: task.descript,
                toolbar: SYS.Editor.TOOLBAR_MINIMAL
            }));

            this.addWidget('checkList', new NS.ChecklistWidget({
                srcNode: tp.one('checklist'),
                task: task,
                config: {
                    hidebtn: true,
                    hideinfo: true
                }
            })).update();

            if (Brick.mod.filemanager.roles.isWrite){
                this.addWidget('files', new Brick.mod.filemanager.AttachmentWidget(tp.gel('files'), task.files));
            } else {
                this.filesWidget = null;
                tp.hide('rfiles');
            }

            var users = task.id * 1 == 0 && task.parent ? task.parent.users : task.users;

            this.addWidget('users', new Brick.mod.uprofile.UserSelectWidget({
                srcNode: tp.append('users', '<div></div>'),
                users: users
            }));

            if (Brick.mod.pictab && Brick.mod.pictab.ImageListWidget){
                this.addWidget('drawList',
                    new Brick.mod.pictab.ImageListWidget(tp.gel('widget'), task.images)
                );
            } else {
                tp.hide('rimage');
            }
        },
        save: function(){
            var tp = this.template,
                task = this.get('task'),
                usersWidget = this.getWidget('users'),
                users = usersWidget.get('users'),
                images = [],
                drawListWidget = this.get('drawList'),
                filesWidget = this.get('files');

            users[users.length] = Brick.env.user.id;

            if (drawListWidget){
                images = drawListWidget.toSave();
            }

            var data = {
                id: task.id,
                type: 'project',
                tl: tp.getValue('tl'),
                bd: this.getWidget('editor').get('content'),
                checks: this.getWidget('checkList').toJSON(),
                files: !filesWidget ? task.files : filesWidget.files,
                images: images,
                onlyimage: false,
                users: users,
                pid: this.getWidget('parentSelect').getValue(),
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
            parentid: {value: 0},
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
                taskid: (args[0] | 0),
                parentid: (args[1] | 0)
            };
        }
    });
};