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

    var LNG = this.language;

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

    NS.ProjectViewWidget = Y.Base.create('ProjectViewWidget', SYS.AppWidget, [], {
        buildTData: function(){
            var task = this.get('task');

            if (!task){
                return; // TODO: show 404 (task not found)
            }

            return {
                id: task.id,
                tl: task.title
            };
        },
        onInitAppWidget: function(err, appInstance, options){
            var task = this.get('task');

            this._firstRender = true;

            // Подписаться на событие изменений в задачах
            NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
            NS.taskManager.userConfigChangedEvent.subscribe(this.onUserConfigChanged, this, true);

            this.drawListWidget = null;

            appInstance.task(task.id, function(err, result){
                this.renderTask();
            }, this)
        },
        destructor: function(){
            if (!this.get('task')){
                return;
            }

            NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
            NS.taskManager.userConfigChangedEvent.unsubscribe(this.onUserConfigChanged);

            if (this.drawListWidget){
                this.drawListWidget.destroy();
            }
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
        renderTask: function(){
            var tp = this.template,
                task = this.get('task');

            tp.show('bimgsave');
            tp.setHTML('taskbody', task.descript);

            if (this._firstRender){ // первичная рендер
                this._firstRender = false;

                this._commentsWidget = new Brick.mod.comment.CommentTreeWidget({
                    srcNode: tp.gel('comments'),
                    commentOwner: {
                        module: 'botask',
                        type: 'content',
                        ownerid: task.id
                    },
                    readOnly: !NS.roles.isWrite
                });

                this.checklist = new NS.ChecklistWidget(tp.gel('checklist'), task);
                this.attachListWidget = new Brick.mod.filemanager.AttachmentListWidget(tp.gel('ftable'));

                var mPT = Brick.mod.pictab;
                if (mPT && mPT.ImageListWidget && L.isArray(task.images) && task.images.length > 0){
                    tp.show('imgwidget');
                    this.drawListWidget = new mPT.ImageListWidget(tp.gel('images'), task.images, true);
                    this.drawListWidget.changedEvent.subscribe(this.onCanvasChanged, this, true);
                }
                task.isNewCmt = false;

                this.extinfo = new NS.ExtInfo({
                    srcNode: tp.gel('extinfo'),
                    task: task
                });
            }
            this.checklist.update();

            tp.setHTML({
                status: LNG['project']['status'][task.status],
                taskid: task.id
            });
            return;

            // Автор
            var user = NS.taskManager.users.get(task.userid);
            gel('author').innerHTML = TM.replace('user', {
                uid: user.get('id'), unm: user.get('viewName')
            });
            // Создана
            gel('dl').innerHTML = Brick.dateExt.convert(task.date, 3, true);
            gel('dl').title = Brick.dateExt.convert(task.date, 4);

            // закрыть все кнопки, открыть те, что соответсуют статусу задачи
            TM.elHide('panel.bopen,beditor,bremove,brestore,barhive');

            // статус
            switch (task.status) {
                case TST.OPEN:
                case TST.REOPEN:
                    TM.elShow('panel.bremove');
                    break;
                case TST.ACCEPT:
                    TM.elShow('panel.bremove');
                    break;
                case TST.REMOVE:
                    TM.elShow('panel.brestore');
                    break;
            }

            // показать прикрепленные файлы
            this.attachListWidget.setFiles(task.files);
            if (task.files.length > 0){
                TM.elShow('panel.files');
            } else {
                TM.elHide('panel.files');
            }

            // Избранное
            if (task.favorite){
                Dom.addClass(gel('favi'), 'fav-checked');
            } else {
                Dom.removeClass(gel('favi'), 'fav-checked');
            }

        },
        onClick: function(el){
            var tp = this._TId['panel'];
            switch (el.id) {

                case tp['biadd']:
                    NS.navigator.add(this.get('task').id);
                    return true;

                case tp['fav']:
                case tp['favi']:
                    this.taskFavorite();
                    return true;

                case tp['bremove']:
                    this.taskRemove();
                    return true;
                case tp['brestore']:
                    this.taskRestore();
                    return true;
                case tp['barhive']:
                    this.taskArhive();
                    return true;

                case tp['bopen']:
                    this.taskOpen();
                    return true;

                case tp['biedit']:
                case tp['beditor']:
                    NS.navigator.projectEdit(this.get('task').id);
                    return true;

                case tp['bimgsave']:
                    this.saveImages();
                    return true;

            }
            return false;
        },
        _shLoading: function(show){
            var TM = this._TM;
            TM.elShowHide('panel.buttons', !show);
            TM.elShowHide('panel.bloading', show);
        },
        taskFavorite: function(){
            var task = this.get('task');
            NS.taskManager.taskFavorite(task.id);
            task.favorite = !task.favorite;
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
            taskid: {
                value: 0
            },
            task: {
                readOnly: true,
                getter: function(){
                    var taskid = this.get('taskid');
                    return NS.taskManager.getTask(taskid);
                }
            }
        },
        CLICKS: {},
        parseURLParam: function(args){
            args = args || [];
            return {
                taskid: (args[0] | 0)
            };
        }
    });

    return; // TODO: remove old functions

    var ProjectRemovePanel = function(taskid, callback){
        this.taskid = taskid;
        this.callback = L.isFunction(callback) ? callback : function(){
        };
        ProjectRemovePanel.superclass.constructor.call(this, {fixedcenter: true});
    };
    YAHOO.extend(ProjectRemovePanel, Brick.widget.Dialog, {
        initTemplate: function(){
            buildTemplate(this, 'tkremovepanel');
            return this._TM.replace('tkremovepanel');
        },
        onClick: function(el){
            var tp = this._TId['tkremovepanel'];
            switch (el.id) {
                case tp['bcancel']:
                    this.close();
                    return true;
                case tp['bremove']:
                    this.taskRemove();
                    return true;
            }

            return false;
        },
        taskRemove: function(){
            var TM = this._TM, gel = function(n){
                    return TM.getEl('tkremovepanel.' + n);
                },
                instance = this;
            Dom.setStyle(gel('btns'), 'display', 'none');
            Dom.setStyle(gel('bloading'), 'display', '');
            NS.taskManager.taskRemove(this.taskid, function(){
                instance.close();
                instance.callback();
            });
        }
    });
    NS.ProjectRemovePanel = ProjectRemovePanel;
};