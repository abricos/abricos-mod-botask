var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'comment', files: ['tree.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['tasklist.js', 'checklist.js', 'extinfo.js']},
        {name: 'pictab', files: ['draw.js']}
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var TST = NS.TaskStatus;

    var aTargetBlank = function(el){
        if (el.tagName == 'A'){
            el.target = "_blank";
        } else if (el.tagName == 'IMG'){
            el.style.maxWidth = "100%";
            el.style.height = "auto";
        }
        var chs = el.childNodes;
        for (var i = 0; i < chs.length; i++){
            if (chs[i]){
                aTargetBlank(chs[i]);
            }
        }
    };

    NS.ProjectViewWidget = Y.Base.create('ProjectViewWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt,
        NS.TaskWidgetExt,
        NS.UProfileWidgetExt
    ], {
        buildTData: function(){
            return {
                id: this.get('taskid')
            };
        },
        onInitAppWidget: function(err, appInstance){
            var taskid = this.get('taskid'),
                task = appInstance.get('taskList').getById(taskid);

            if (!task){
                // TODO: show 404
                return;
            }

            this.set('waiting', true);

            appInstance.task(taskid, this._onLoadTask, this)
        },
        destructor: function(){
        },
        _onLoadTask: function(){
            this.set('waiting', false);

            var tp = this.template,
                appInstance = this.get('appInstance'),
                taskid = this.get('taskid'),
                task = appInstance.get('taskList').getById(taskid);

            this.addWidget('comments',
                new Brick.mod.comment.CommentTreeWidget({
                    srcNode: tp.gel('comments'),
                    commentOwner: {
                        module: 'botask',
                        type: 'task',
                        ownerid: taskid
                    },
                    readOnly: !NS.roles.isWrite
                })
            );

            this.addWidget('checkList', new NS.CheckListWidget({
                srcNode: tp.one('checklist'),
                task: task
            }));

            this.addWidget('extInfo', new NS.ExtInfo({
                srcNode: tp.gel('extinfo'),
                task: task
            }));

            this.addWidget('attacheFiles', new Brick.mod.filemanager.AttachmentListWidget(tp.gel('ftable')));


            /*
             var mPT = Brick.mod.pictab;
             if (mPT && mPT.ImageListWidget && L.isArray(task.images) && task.images.length > 0){
             tp.show('imgwidget');
             this.drawListWidget = new mPT.ImageListWidget(tp.gel('images'), task.images, true);
             this.drawListWidget.changedEvent.subscribe(this.onCanvasChanged, this, true);
             }
             task.isNewCmt = false;
             /**/

            this.renderTask();
        },
        renderTask: function(){
            var tp = this.template,
                taskid = this.get('taskid'),
                task = this.get('appInstance').get('taskList').getById(taskid);

            tp.show('bimgsave');
            tp.setHTML('taskbody', task.get('descript'));

            tp.setHTML({
                status: task.get('statusTitle'),
                taskid: task.get('id')
            });

            var author = task.get('author');

            tp.setHTML({
                author: tp.replace('user', {
                    uid: author.get('id'),
                    unm: author.get('viewName')
                }),
                dl: Brick.dateExt.convert(task.date, 3, true)
            });

            tp.one('dl').set('title', Brick.dateExt.convert(task.date, 4));

            // закрыть все кнопки, открыть те, что соответсуют статусу задачи
            tp.hide('bopen,beditor,bremove,brestore,barhive');

            // статус
            switch (task.get('status')) {
                case 'opened':
                case 'reopened':
                    tp.show('bremove');
                    break;
                case 'accepted':
                    tp.show('bremove');
                    break;
                case 'removed':
                    tp.show('brestore');
                    break;
            }

            // показать прикрепленные файлы
            // this.getWidget('attacheFiles').setFiles(task.files);
            // tp.toggleView(task.files.length > 0, 'files');

            tp.toggleView(task.isFavorite(), 'btnUnsetFavorite', 'btnSetFavorite');
        },

        onCanvasChanged: function(type, args){
            this.template.show('bimgsave');
        },
        onHistoryChanged: function(type, args){
            var history = args[0];

            var task = this.get('task'), isRTask = false;
            history.foreach(function(item){
                if (item.taskid == task.id){
                    isRTask = true;
                    return true;
                }
            });
            if (isRTask){
                this.renderTask();
            }
        },
        onUserConfigChanged: function(type, args){
            this.renderTask();
        },

        taskFavorite: function(){
            var task = this.get('task');
            task.favorite = !task.favorite;
            this.get('appInstance').taskFavorite(task.id, task.favorite);
            this.renderTask();
        },
        taskRemove: function(){
            new NS.ProjectRemovePanel(this.get('task').id, function(){
                NS.navigator.taskHome();
            });
        },
        taskRestore: function(){
            var instance = this;
            this._shLoading(true);
            NS.taskManager.taskRestore(this.get('task').id, function(){
                instance._shLoading(false);
            });
        },
        taskArhive: function(){
            var instance = this;
            this._shLoading(true);
            NS.taskManager.taskArhive(this.get('task').id, function(){
                instance._shLoading(false);
            });
        },
        taskOpen: function(){ // открыть задачу повторно
            var instance = this;
            this._shLoading(true);
            NS.taskManager.taskOpen(this.get('task').id, function(){
                instance._shLoading(false);
            });
        },
        saveImages: function(){
            this._shLoading(true);
            var newdata = {
                'onlyimage': true,
                'images': this.drawListWidget.toSave()
            };
            var instance = this;
            NS.taskManager.taskSave(this.get('task'), newdata, function(){
                instance._shLoading(false);
            });
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'panel,user,empty'},
        },
        CLICKS: {
            taskFavorite: 'taskFavorite'
        },
        parseURLParam: function(args){
            args = args || [];
            return {
                taskid: (args[0] | 0)
            };
        }
    });
};