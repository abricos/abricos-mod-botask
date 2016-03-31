var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['tasklist.js', 'checklist.js', 'extinfo.js']},
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

    var ProjectViewWidget = function(container, task){
        if (L.isString(task) || L.isNumber(task)){
            task = NS.taskManager.getTask(task);
        }
        this.init(container, task);
    };
    ProjectViewWidget.prototype = {
        init: function(container, task){
            this.task = task;
            if (L.isNull(task)){
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
            if (L.isNull(this.task)){
                return;
            }

            NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
            NS.taskManager.userConfigChangedEvent.unsubscribe(this.onUserConfigChanged);

            if (!L.isNull(this.drawListWidget)){
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
            var task = this.task;
            var TM = this._TM, gel = function(nm){
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

                this.checklist = new NS.ChecklistWidget(gel('checklist'), task);
                this.attachListWidget = new Brick.mod.filemanager.AttachmentListWidget(TM.getEl('panel.ftable'));

                var mPT = Brick.mod.pictab;
                if (mPT && mPT.ImageListWidget && L.isArray(task.images) && task.images.length > 0){
                    TM.elShow('panel.imgwidget');
                    this.drawListWidget = new mPT.ImageListWidget(gel('images'), task.images, true);
                    this.drawListWidget.changedEvent.subscribe(this.onCanvasChanged, this, true);
                }
                task.isNewCmt = false;

                this.extinfo = new NS.ExtInfo(gel('extinfo'), task);
            }
            this.checklist.update();

            // Статус
            gel('status').innerHTML = LNG['project']['status'][task.status];

            gel('taskid').innerHTML = task.id;

            // Автор
            var user = NS.taskManager.users.get(task.userid);
            gel('author').innerHTML = TM.replace('user', {
                'uid': user.id, 'unm': user.getUserName()
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
                    NS.navigator.add(this.task.id);
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
                    NS.navigator.projectEdit(this.task.id);
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
            new NS.ProjectRemovePanel(this.task.id, function(){
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
        taskOpen: function(){ // открыть задачу повторно
            var __self = this;
            this._shLoading(true);
            NS.taskManager.taskOpen(this.task.id, function(){
                __self._shLoading(false);
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
    NS.ProjectViewWidget = ProjectViewWidget;

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
                __self = this;
            Dom.setStyle(gel('btns'), 'display', 'none');
            Dom.setStyle(gel('bloading'), 'display', '');
            NS.taskManager.taskRemove(this.taskid, function(){
                __self.close();
                __self.callback();
            });
        }
    });
    NS.ProjectRemovePanel = ProjectRemovePanel;
};