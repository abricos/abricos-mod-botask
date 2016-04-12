var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['widgets.js']}
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

    var FolderViewWidget = function(container, task){
        if (L.isString(task) || L.isNumber(task)){
            task = NS.taskManager.getTask(task);
        }
        this.init(container, task);
    };
    FolderViewWidget.prototype = {
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
            var task = this.task,
                __self = this;

            this._firstRender = true;

            // Подписаться на событие изменений в задачах
            NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
            NS.taskManager.userConfigChangedEvent.subscribe(this.onUserConfigChanged, this, true);

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

            var elw = this._TM.getEl('panel.id');
            elw.parentNode.removeChild(elw);
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

            gel('taskid').innerHTML = task.id;

            gel('taskbody').innerHTML = task.descript;

            // Статус
            gel('status').innerHTML = LNG['project']['status'][task.status];

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
                    TM.elShow('panel.beditor,bremove');
                    break;
                case TST.ACCEPT:
                    TM.elShow('panel.beditor,bremove');
                    break;
                case TST.REMOVE:
                    TM.elShow('panel.brestore');
                    break;
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
                    NS.navigator.folderEdit(this.task.id);
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
            new NS.FolderRemovePanel(this.task.id, function(){
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
        }
    };
    NS.FolderViewWidget = FolderViewWidget;

    var FolderRemovePanel = function(taskid, callback){
        this.taskid = taskid;
        this.callback = L.isFunction(callback) ? callback : function(){
        };
        FolderRemovePanel.superclass.constructor.call(this, {fixedcenter: true});
    };
    YAHOO.extend(FolderRemovePanel, Brick.widget.Dialog, {
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
    NS.FolderRemovePanel = FolderRemovePanel;

};