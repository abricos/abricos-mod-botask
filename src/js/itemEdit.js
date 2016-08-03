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

    var SYS = Brick.mod.sys,
        PicTabWidget = Brick.mod.pictab ? Brick.mod.pictab.PicTabWidget : null;

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
                task.set('parentid', this.get('parentid'));

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
                parentid: task.get('parentid')
            }));

            this.addWidget('editor', new SYS.Editor({
                appInstance: this.get('appInstance'),
                srcNode: tp.gel('editor'),
                content: task.get('descript'),
                toolbar: SYS.Editor.TOOLBAR_MINIMAL
            }));

            if (tp.one('deadlineWidget')){
                this.addWidget('deadline', new Brick.mod.widget.DateInputWidget(tp.gel('deadlineWidget'), {
                    date: task.get('deadline'),
                    showTime: task.get('deadlineTime')
                }));
            }

            if (tp.one('priorityWidget')){
                this.addWidget('priority', new NS.PrioritySelectWidget({
                    srcNode: tp.one('priorityWidget'),
                    initValue: task.get('priority')
                }));
            }

            if (tp.one('checkListWidget')){
                this.addWidget('checkList', new NS.CheckListWidget({
                    srcNode: tp.one('checkListWidget'),
                    task: task,
                    editMode: true
                }));
            }

            if (PicTabWidget && tp.one('pictabWidget')){
                this.addWidget('pictab', new PicTabWidget({
                    srcNode: tp.one('pictabWidget'),
                    imageList: task.get('images'),
                    editMode: true
                }));
            } else {
                tp.hide('pictabPanel');
            }

            var FMNS = Brick.mod.filemanager;
            if (FMNS.roles.isWrite && tp.one('fileListWidget')){
                var arr = [];
                task.get('files').each(function(file){
                    arr[arr.length] = file.getAttrs();
                }, this);

                this.addWidget('fileList', new FMNS.AttachmentWidget(
                    tp.gel('fileListWidget'), arr
                ));
            } else {
                tp.hide('filesPanel');
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
                    srcNode: tp.one('usersWidget'),
                    users: users,
                    useFriends: true,
                    hideCurrent: true
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
                filesWidget = this.getWidget('fileList'),
                usersWidget = this.getWidget('users'),
                deadlineWidget = this.getWidget('deadline'),
                priorityWidget = this.getWidget('priority'),
                data = {
                    id: task.get('id'),
                    type: this.get('itemType'),
                    title: tp.getValue('title'),
                    parentid: parentSelectWidget.getValue(),
                    priority: priorityWidget ? priorityWidget.getValue() : 3,
                    deadline: deadlineWidget ? deadlineWidget.getValue() : 0,
                    deadlineTime: deadlineWidget ? deadlineWidget.getTimeVisible() : false,
                    body: editorWidget.get('content'),
                    checks: checkListWidget ? checkListWidget.toJSON() : null,
                    images: pictabWidget ? pictabWidget.toJSON() : null,
                    files: filesWidget ? filesWidget.files : null,
                    users: usersWidget ? usersWidget.toJSON() : null,
                };

            this.get('appInstance').itemSave(data, function(err, result){
                this.set('waiting', false);

                if (!err){
                    this.go('item.view', this.get('itemType'), result.itemSave.taskid);
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