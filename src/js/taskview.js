var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['tasklist.js', 'checklist.js']},
        {name: 'pictab', files: ['draw.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var buildTemplate = this.buildTemplate;

    var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}']);

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

    var TaskViewWidget = function(container, task){
        if (L.isString(task) || L.isNumber(task)){
            task = NS.taskManager.getTask(task);
        }
        this.init(container, task);
    };
    TaskViewWidget.prototype = {
        init: function(container, task){
            this.task = task;
            if (Y.Lang.isNull(task)){
                container.innerHTML = buildTemplate(this, 'empty').replace('empty');
                return;
            }

            buildTemplate(this, 'panel,user');

            var TM = this._TM;

            container.innerHTML = TM.replace('panel', {
                'id': task.id,
                'tl': task.title
            });
            this.onLoad();

            var __self = this;
            E.on(TM.getEl('panel.id'), 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });
        },
        onLoad: function(){
            var task = this.task, __self = this;

            this._firstRender = true;

            // Подписаться на событие изменений в задачах
            NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
            NS.taskManager.userConfigChangedEvent.subscribe(this.onUserConfigChanged, this, true);

            this.drawListWidget = null;

            // запросить дополнительные данные по задаче (описание, история)
            NS.taskManager.taskLoad(task.id, function(){
                __self.renderTask();
            });
        },
        destroy: function(){
            if (Y.Lang.isNull(this.task)){
                return;
            }

            NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
            NS.taskManager.userConfigChangedEvent.unsubscribe(this.onUserConfigChanged);

            if (!Y.Lang.isNull(this.drawListWidget)){
                this.drawListWidget.destroy();
            }

            var elw = this._TM.getEl('panel.id');
            elw.parentNode.removeChild(elw);
        },
        onCanvasChanged: function(type, args){
            Dom.setStyle(this._TM.getEl('panel.bimgsave'), 'display', '');
        },
        onHistoryChanged: function(type, args){
            var history = args[0];

            var task = this.task, isRTask = false;
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
            var TM = this._TM, task = this.task;
            var gel = function(nm){
                return TM.getEl('panel.' + nm);
            };

            Dom.setStyle(gel('bimgsave'), 'display', 'none');

            gel('taskbody').innerHTML = task.descript;
            if (this._firstRender){ // первичная рендер
                this._firstRender = false;

                // Инициализировать менеджер комментариев
                Brick.ff('comment', 'comment', function(){
                    Brick.mod.comment.API.buildCommentTree({
                        'container': TM.getEl('panel.comments'),
                        'dbContentId': task.ctid,
                        'config': {
                            'onLoadComments': function(){
                                aTargetBlank(TM.getEl('panel.taskbody'));
                                aTargetBlank(TM.getEl('panel.comments'));
                            }
                            // ,
                            // 'readOnly': project.w*1 == 0,
                            // 'manBlock': L.isFunction(config['buildManBlock']) ? config.buildManBlock() : null
                        },
                        'instanceCallback': function(b){
                        }
                    });
                });

                this.checklist = new NS.ChecklistWidget(TM.getEl('panel.checklist'), task);
                this.attachListWidget = new Brick.mod.filemanager.AttachmentListWidget(TM.getEl('panel.ftable'));

                var mPT = Brick.mod.pictab;
                if (mPT && mPT.ImageListWidget){
                    this.drawListWidget = new mPT.ImageListWidget(TM.getEl('panel.images'), task.images, true);
                    this.drawListWidget.changedEvent.subscribe(this.onCanvasChanged, this, true);
                }
                task.isNewCmt = false;
            }
            this.checklist.update();

            gel('taskid').innerHTML = task.id;

            // Статус
            gel('status').innerHTML = LNG['status'][task.status];

            // Приоритет
            gel('priority').innerHTML = LNG['priority'][task.priority];

            // Автор
            var user = NS.taskManager.users.get(task.userid);
            gel('author').innerHTML = TM.replace('user', {
                uid: user.get('id'), unm: user.get('viewName')
            });
            // Создана
            gel('dl').innerHTML = Brick.dateExt.convert(task.date, 3, true);
            gel('dl').title = Brick.dateExt.convert(task.date, 4);

            // Исполнитель
            var s = "";
            if (task.stUserId * 1 > 0){
                user = NS.taskManager.users.get(task.stUserId);
                s = TM.replace('user', {
                    uid: user.get('id'), unm: user.get('viewName')
                });
            }
            gel('exec').innerHTML = s;

            var sddl = "", sddlt = "";
            // срок исполнения
            if (!Y.Lang.isNull(task.deadline)){
                sddl = Brick.dateExt.convert(task.deadline, 3, true);
                if (task.ddlTime){
                    sddlt = Brick.dateExt.convert(task.deadline, 4);
                }
            }
            gel('ddl').innerHTML = sddl;
            gel('ddlt').innerHTML = sddlt;

            // закрыть все кнопки, открыть те, что соответсуют статусу задачи
            TM.elHide('panel.bsetexec,bunsetexec,bclose,bclosens,bopen,beditor,bremove,brestore,barhive');

            // статус
            switch (task.status) {
                case TST.OPEN:
                case TST.REOPEN:
                    TM.elShow('panel.bsetexec,bclosens,beditor,bremove');
                    break;
                case TST.ACCEPT:
                    TM.elShow('panel.bclose,bunsetexec,beditor,bremove');
                    break;
                case TST.CLOSE:
                    TM.elShow('panel.bopen,barhive');
                    break;
                case TST.REMOVE:
                    TM.elShow('panel.brestore,vbieditor,vbiadd');
                    break;
            }

            // скрыть/показать подзадачи
            var view = NS.taskManager.userConfig['taskviewchild'];
            Dom.setStyle(gel('ptlist'), 'display', view ? '' : 'none');
            Dom.setStyle(gel('ptlisthide'), 'display', view ? '' : 'none');
            Dom.setStyle(gel('ptlistshow'), 'display', view ? 'none' : '');

            this.renderComments();

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
        renderComments: function(){
            var TM = this._TM;
            // скрыть/показать комментарии
            var view = NS.taskManager.userConfig['taskviewcmts'];
            Dom.setStyle(TM.getEl('panel.comments'), 'display', view ? '' : 'none');
            Dom.setStyle(TM.getEl('panel.cmthide'), 'display', view ? '' : 'none');
            Dom.setStyle(TM.getEl('panel.cmtshow'), 'display', view ? 'none' : '');
        },
        onClick: function(el){
            var tp = this._TId['panel'];
            switch (el.id) {

                case tp['biadd']:
                    NS.navigator.taskCreate(this.task.id);
                    return true;

                case tp['biedit']:
                    NS.navigator.taskEdit(this.task.id);
                    return true;

                case tp['fav']:
                case tp['favi']:
                    this.taskFavorite();
                    return true;

                case tp['bsetexec']:
                    this.setExecTask();
                    return true;
                case tp['bunsetexec']:
                    this.unsetExecTask();
                    return true;

                case tp['bclose']:
                case tp['bclosens']:
                    this.taskClose();
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
                case tp['beditor']:
                    this.taskEditorShow();
                    return true;

                case tp['cmthide']:
                case tp['cmtshow']:
                    this.showHideComments();
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
            var task = this.task;
            NS.taskManager.taskFavorite(task.id);
            task.favorite = !task.favorite;
            this.renderTask();
        },
        taskRemove: function(){
            new NS.TaskRemovePanel(this.task.id, function(){
                NS.navigator.taskHome();
            });
        },
        taskRestore: function(){
            var __self = this;
            this._shLoading(true);
            NS.taskManager.taskRestore(this.task.id, function(){
                __self._shLoading(false);
            });
        },
        taskArhive: function(){
            var __self = this;
            this._shLoading(true);
            NS.taskManager.taskArhive(this.task.id, function(){
                __self._shLoading(false);
            });
        },
        taskClose: function(){ // закрыть задачу
            new NS.TaskClosePanel(this.task.id, function(){
                NS.navigator.taskHome();
            });
        },
        taskOpen: function(){ // открыть задачу повторно
            var __self = this;
            this._shLoading(true);
            NS.taskManager.taskOpen(this.task.id, function(){
                __self._shLoading(false);
            });
        },
        setExecTask: function(){ // принять задачу в работу
            var __self = this;
            this._shLoading(true);
            NS.taskManager.taskSetExec(this.task.id, function(){
                __self._shLoading(false);
            });
        },
        unsetExecTask: function(){ // отказаться от выполнения данной задачи
            var __self = this;
            this._shLoading(true);
            NS.taskManager.taskUnsetExec(this.task.id, function(){
                __self._shLoading(false);
            });
        },
        showHideComments: function(){
            var cfg = NS.taskManager.userConfig;
            cfg['taskviewcmts'] = !cfg['taskviewcmts'];
            NS.taskManager.userConfigSave();
            this.renderTask();
        },
        taskEditorShow: function(){
            var taskid = this.task.id;
            Brick.ff('botask', 'taskeditor', function(){
                NS.API.showTaskEditorPanel(taskid);
            });
        },
        saveImages: function(){
            this._shLoading(true);
            var newdata = {
                'onlyimage': true,
                'images': this.drawListWidget.toSave()
            };
            var __self = this;
            NS.taskManager.taskSave(this.task, newdata, function(){
                __self._shLoading(false);
            });
        }
    };
    NS.TaskViewWidget = TaskViewWidget;

    var TaskRemovePanel = function(taskid, callback){
        this.taskid = taskid;
        this.callback = L.isFunction(callback) ? callback : function(){
        };
        TaskRemovePanel.superclass.constructor.call(this, {fixedcenter: true});
    };
    YAHOO.extend(TaskRemovePanel, Brick.widget.Dialog, {
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
                __self = this;
            Dom.setStyle(gel('btns'), 'display', 'none');
            Dom.setStyle(gel('bloading'), 'display', '');
            NS.taskManager.taskRemove(this.taskid, function(){
                __self.close();
                __self.callback();
            });
        }
    });
    NS.TaskRemovePanel = TaskRemovePanel;

    var TaskClosePanel = function(taskid, callback){
        this.taskid = taskid;
        this.callback = L.isFunction(callback) ? callback : function(){
        };
        TaskClosePanel.superclass.constructor.call(this, {fixedcenter: true});
    };
    YAHOO.extend(TaskClosePanel, Brick.widget.Dialog, {
        initTemplate: function(){
            buildTemplate(this, 'tkclosepanel');
            return this._TM.replace('tkclosepanel');
        },
        onClick: function(el){
            var tp = this._TId['tkclosepanel'];
            switch (el.id) {
                case tp['bcancel']:
                    this.close();
                    return true;
                case tp['bremove']:
                    this.taskClose();
                    return true;
            }

            return false;
        },
        taskClose: function(){
            var TM = this._TM, gel = function(n){
                    return TM.getEl('tkremovepanel.' + n);
                },
                __self = this;
            Dom.setStyle(gel('btns'), 'display', 'none');
            Dom.setStyle(gel('bloading'), 'display', '');
            NS.taskManager.taskClose(this.taskid, function(){
                __self.close();
                __self.callback();
            });
        }
    });
    NS.TaskClosePanel = TaskClosePanel;

    NS.API.showTaskViewPanel = function(taskid){
        Brick.Page.reload('#app=botask/ws/showWorkspacePanel/taskview/' + taskid + '/');
    };

};