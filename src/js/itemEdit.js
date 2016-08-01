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

    var PicTabWidget = Brick.mod.pictab ? Brick.mod.pictab.PicTabWidget : null;

    var ItemEditWidgetExt = function(){
    };
    ItemEditWidgetExt.prototype = {
        onInitAppWidget: function(err, appInstance){
            var taskid = this.get('taskid'),
                task = this.get('task');

            if (!task){
                return;
            }

            if (taskid === 0){
                task.set('type', this.get('itemType'));

                return this._onLoadItem();
            }

            this.set('waiting', true);
            appInstance.task(taskid, this._onLoadItem, this)
        },
        _onLoadItem: function(){
            this.set('waiting', false);

            var tp = this.template,
                taskid = this.get('taskid') | 0,
                task = this.get('task');

            tp.setValue({
                title: task.get('title')
            });

            this.addWidget('parentSelect', new NS.TaskTreeSelectWidget({
                srcNode: tp.one('parentSelectWidget'),
                taskid: taskid,
                parentTaskId: task.parent ? task.parent.id : 0
            }));

            this.addWidget('editor', new SYS.Editor({
                appInstance: this.get('appInstance'),
                srcNode: tp.gel('editor'),
                content: task.descript,
                toolbar: SYS.Editor.TOOLBAR_MINIMAL
            }));

            if (tp.one('checkListWidget')){
                this.addWidget('checkList', new NS.CheckListWidget({
                    srcNode: tp.one('checkListWidget'),
                    task: task,
                }));
            }

            if (PicTabWidget && tp.one('pictabWidget')){
                this.addWidget('pictab', new PicTabWidget({
                    srcNode: tp.one('pictabWidget'),
                    images: task.get('images'),
                    editMode: true
                }));
            } else {
                tp.hide('pictabPanel');
            }

            if (Brick.mod.filemanager.roles.isWrite){
                this.addWidget('files', new Brick.mod.filemanager.AttachmentWidget(tp.gel('fileListWidget'), task.files));
            } else {
                this.filesWidget = null;
                tp.hide('rfiles');
            }

            if (tp.one('usersWidget')){
                var users = task.get('users').toArray('userid');
                if (taskid === 0 && task.get('parentid') > 0){
                    var parentTask = this.get('appInstance').get('taskList').getById(task.get('parentid'));
                    if (parentTask){
                        users = parentTask.get('users').toArray('userid');
                    }
                }

                this.addWidget('users', new Brick.mod.uprofile.UserSelectWidget({
                    // srcNode: tp.append('usersWidget', '<div></div>'),
                    srcNode: tp.one('usersWidget'),
                    users: users
                }));
            }

            tp.one('title').focus();
        },
        save: function(){
            var tp = this.template,
                task = this.get('task'),
                editorWidget = this.getWidget('editor'),
                parentSelectWidget = this.getWidget('parentSelect'),
                checkListWidget = this.getWidget('checkList'),
                pictabWidget = this.getWidget('pictab'),
                filesWidget = this.getWidget('files'),
                usersWidget = this.getWidget('users');

            var data = {
                id: task.get('id'),
                type: this.get('itemType'),
                title : tp.getValue('title'),
                body: editorWidget.get('content'),
                checks: checkListWidget ? checkListWidget.toJSON() : null,
                images: pictabWidget ? pictabWidget.toJSON() : null
            };

            console.log(data);

            return;


            users[users.length] = Brick.env.user.id;

            if (drawListWidget){
                images = drawListWidget.toSave();
            }

            var data = {
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
        onClick: function(e){
            switch (e.dataClick) {
                case 'save':
                    this.save();
                    return true;
            }
        }
    };
    NS.ItemEditWidgetExt = ItemEditWidgetExt;
};