var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'sys', files: ['item.js']},
        {name: '{C#MODNAME}', files: ['soclib.js']}
    ]
};
Component.entryPoint = function(NS){

    NS.roles = new Brick.AppRoles('{C#MODNAME}', {
        isAdmin: 50,
        isWrite: 30,
        isView: 10
    });

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang,
        R = NS.roles;

    var SC = Brick.mod.social;

    var buildTemplate = this.buildTemplate;
    buildTemplate({});

    NS.lif = function(f){
        return L.isFunction(f) ? f : function(){
        };
    };
    NS.life = function(f, p1, p2, p3, p4, p5, p6, p7){
        f = NS.lif(f);
        f(p1, p2, p3, p4, p5, p6, p7);
    };

    var TaskStatus = {
        'OPEN': 1,	// открыта
        'REOPEN': 2,	// открыта повторно
        'CLOSE': 3,	// завершена
        'ACCEPT': 4,	// в работе
        'ASSIGN': 5,	// назначена
        'REMOVE': 6,	// удалена
        'ARHIVE': 7		// в архиве
    };
    NS.TaskStatus = TaskStatus;

    var Old_Task = function(data){
        this.init(data);
    };
    Old_Task.prototype = {
        init: function(d){

            d = L.merge({
                'id': 0,
                'tp': 3,
                'tl': '',
                'dl': 0,
                uid: Brick.env.user.id,
                'users': [Brick.env.user.id],
                'ddl': 0,
                'ddlt': 0,
                'prt': 3,
                'cmt': 0, // последний комментарий
                'cmtv': 0 // последний прочитанный комментарий
            }, d || {});

            this.update(d);
            this.childs = new Old_TaskList();	// подзадачи
            this.parent = null; 			// родительская задача

            this.history = null;
            this.checks = null;				// чек-лист
            this.files = [];
            this.images = [];
            this.custatus = null;

            // была ли загрузка оставшихся данных (описание задачи, история изменений)?
            this.isLoad = false;

            // описание задачи
            this.descript = '';
        },
        update: function(d){
            this.id = d['id'] * 1;				// идентификатор

            switch (d['tp'] * 1) {
                case 1:
                    this.type = 'folder';
                    break;
                case 2:
                    this.type = 'project';
                    break;
                default:
                    this.type = 'task';
                    break;
            }

            this.title = d['tl'];				// заголовок
            this.userid = d['uid'];				// идентификатор автора
            this.date = NS.dateToClient(d['dl']); // дата создания
            this.uDate = NS.dateToClient(d['udl']); // дата обновления

            this.deadline = NS.dateToClient(d['ddl']); // Срок исполнения
            this.ddlTime = d['ddlt'] * 1 > 0;		// уточнено ли время?

            this.users = d['users'];			// участники задачи
            this.parentTaskId = d['pid'] * 1;		// идентификатор родителя

            this.status = d['st'] * 1;
            this.pstatus = d['pst'] * 1;
            this.stUserId = d['stuid'];
            this.stDate = NS.dateToClient(d['stdl']);

            d['cmt'] = Y.Lang.isNull(d['cmt']) ? 0 : d['cmt'];
            d['cmtv'] = Y.Lang.isNull(d['cmtv']) ? 0 : d['cmtv'];

            this.isNewCmt = d['cmt'] > d['cmtv'];

            this.priority = d['prt'] * 1;
            this.order = d['o'] * 1;
            this.favorite = d['f'] * 1 > 0;
            this.expanded = d['e'] * 1 > 0;
            this.showcmt = d['c'] * 1 > 0;

            this.work = null;

            this.vDate = NS.dateToClient(d['vdl']);
            this._updateFlagNew(d);
        },
        setData: function(d){
            this.isLoad = true;
            this.descript = d['bd'];
            this.ctid = d['ctid'];
            this.checks = d['chlst'];
            this.files = d['files'];
            this.images = d['images'];
            this.custatus = d['custatus'];
            this.update(d);
        },
        _updateFlagNew: function(d){
            this.isNew = d['n'] * 1 > 0;
            if (Brick.env.user.id * 1 == this.userid * 1){
                this.isNew = false;
            }
        },
        addHItem: function(hst){
            if (Y.Lang.isNull(this.history)){
                this.history = new History();
            }
            this.history.add(hst);
        },

        isExpired: function(){
            var ddl = this.deadline;
            if (Y.Lang.isNull(ddl)){
                return false;
            }
            return ddl.getTime() < (new Date()).getTime();
        },

        isInWorked: function(){
            return this.status * 1 == NS.TaskStatus.ACCEPT
                || this.status * 1 == NS.TaskStatus.ASSIGN;
        },

        isClosed: function(){
            return this.status * 1 == NS.TaskStatus.CLOSE;
        },

        isRemoved: function(){
            return this.status * 1 == NS.TaskStatus.REMOVE;
        },

        isArhive: function(){
            return this.status * 1 == NS.TaskStatus.ARHIVE;
        },

        toString: function(){
            return "'" + this.title + "', Child: " + this.childs.count();
        }
    };
    NS.Old_Task = Old_Task;


    var Old_TaskList = function(){
        Old_TaskList.superclass.constructor.call(this);
    };
    YAHOO.extend(Old_TaskList, SC.SocialItemList, {

        // пробег по всем элементам, включая дочерний - если nochild==false
        foreach: function(f, nochild, sortMethod, desc, globalsort, limit){
            if (!L.isFunction(f)){
                return;
            }
            nochild = nochild || false;
            limit = limit * 1 > 0 ? limit * 1 : 0;
            if (L.isString(sortMethod)){
                if (desc){
                    sortMethod += 'desc';
                }
                sortMethod = NS.taskSort[sortMethod];
            }
            if (!L.isFunction(sortMethod)){
                sortMethod = NS.taskSort['default'];
            }

            var lst = this._list;

            if (!nochild && globalsort && L.isFunction(sortMethod)){

                var glst = [];

                for (var i = 0; i < lst.length; i++){
                    glst[glst.length] = lst[i];
                    lst[i].childs.foreach(function(ctk){
                        glst[glst.length] = ctk;
                    });
                }
                glst = glst.sort(sortMethod);

                for (var i = 0; i < glst.length; i++){
                    if (limit > 0 && i >= limit){
                        break;
                    }
                    if (f(glst[i])){
                        break;
                    }
                }
            } else {
                if (L.isFunction(sortMethod)){
                    lst = lst.sort(sortMethod);
                }

                var task;
                for (var i = 0; i < lst.length; i++){
                    task = lst[i];
                    if (f(task)){
                        break;
                    }

                    if (!nochild){
                        task.childs.foreach(f);
                    }
                }
            }
        },

    });
    NS.Old_TaskList = Old_TaskList;


    var TaskManager = function(initData){
        initData = L.merge({
            'board': {},
            'users': {},
            'hst': {},
            'cfg': {}
        }, initData || {});

        this.init(initData);
    };
    TaskManager.prototype = {
        init: function(initData){

            this.users = {
                get: function(userid){
                    var userList = NS.appInstance.getApp('uprofile').get('userList');
                    return userList.getById(userid);
                }
            };

            // событие, когда прочитали новую задачу
            this.newTaskReadEvent = new YAHOO.util.CustomEvent("newTaskReadEvent");

            // события внесения изменений пользователя в задачу (добавление в избранное, голосование и т.п.)
            this.taskUserChangedEvent = new YAHOO.util.CustomEvent("taskUserChangedEvent");

            this.taskListChangedEvent = new YAHOO.util.CustomEvent('taskListChangedEvent');

            // this.userConfig = this.initUserConfig(initData['cfg']);
            this.userConfig = {};
            this.userConfigChangedEvent = new YAHOO.util.CustomEvent("userConfigChangedEvent");

            this.list = new Old_TaskList();
            this.socialUpdate(initData['board']);

            // глобальная коллекция истории
            this.history = new History();
            this.historyUpdate(initData['hst'], 0);
            this.historyChangedEvent = new YAHOO.util.CustomEvent("historyChangedEvent");

            this.lastUpdateTime = new Date();

            // система автоматического обновления
            // проверяет по движению мыши в документе, срабатывает по задержке обновления
            // более 5 минут
            // E.on(document.body, 'mousemove', this.onMouseMove, this, true);
        },

        onMouseMove: function(evt){
            var ctime = (new Date()).getTime(), ltime = this.lastUpdateTime.getTime();

            if ((ctime - ltime) / (1000 * 60) < 5){
                return;
            }
            this.lastUpdateTime = new Date();

            // получения времени сервера необходимое для синхронизации
            // и проверка обновлений в задачах
            this.ajax({'do': 'sync'}, function(r){
            });
        },

        _ajaxBeforeResult: function(r){
            if (Y.Lang.isNull(r)){
                return false;
            }
            if (r.u * 1 != Brick.env.user.id){ // пользователь разлогинился
                // Brick.Page.reload();
                return false;
            }
            if (Y.Lang.isNull(r['changes'])){
                return false;
            } // изменения не зафиксированы

            this.users.update(r['changes']['users']);

            return true;
        },

        _ajaxResult: function(r){
            this.socialUpdate(r['changes']['board']);

            var histe = new History(), hsts = r['changes']['hst'];
            this.historyUpdate(hsts, 0);

            // применить изменения зафиксированные сервером
            for (var i = 0; i < hsts.length; i++){
                var item = this.history.get(hsts[i].id);
                histe.add(item);
            }
            this.historyChangedEvent.fire(histe);
        },

        ajax: function(d, callback){
            d['hlid'] = this.history.lastId();

            // все запросы по модулю проходят через этот менеджер.
            // ко всем запросам добавляется идентификатор последнего обновления
            // если на сервере произошли изменения, то они будут
            // зафиксированны у этого пользователя
            var __self = this;
            Brick.ajax('botask', {
                'data': d,
                'event': function(request){
                    if (Y.Lang.isNull(request.data)){
                        return;
                    }
                    var isChanges = __self._ajaxBeforeResult(request.data);
                    // применить результат запроса
                    callback(request.data.r);
                    // применить возможные изменения в истории
                    if (isChanges){
                        __self._ajaxResult(request.data);
                    }
                }
            });
        },


        socialUpdate: function(data){
            // обновить данные по задачам: новые - создать, существующие - обновить
            var objs = {};
            for (var id in data){
                var di = data[id];
                var task = this.list.find(id);
                if (Y.Lang.isNull(task)){ // новая задача
                    task = new Old_Task(di);
                } else {
                    task.update(di);
                }
                objs[id] = task;
            }

            // не тронутые обновлением задачи
            this.list.foreach(function(task){
                if (!objs[task.id]){
                    objs[task.id] = task;
                }
            });

            // очистить информацию для древовидной структуры
            for (var id in objs){
                objs[id].parent = null;
                objs[id].childs.clear();
            }

            // заполнить древовидную структуру
            for (var id in objs){
                var task = objs[id],
                    ptask = objs[task.parentTaskId];

                if (task.parentTaskId * 1 > 0 && ptask){
                    task.parent = ptask;
                    ptask.childs.add(task);
                }
            }

            // все те, что не содержат родителя поместить в корень списка
            this.list.clear();
            for (var id in objs){
                if (Y.Lang.isNull(objs[id].parent)){
                    this.list.add(objs[id]);
                }
            }

            this.taskListChangedEvent.fire();
        },

        historyUpdate: function(data, socid){
            socid = socid * 1 || 0;
            data = data || {};
            var history = this.history;
            for (var id in data){
                var di = data[id];

                var item = history.get(di['id']);
                if (Y.Lang.isNull(item)){
                    item = history.itemInstance(di);
                    history.add(item);
                    if (socid == 0){
                        history.setFirstLoadedId(id);
                    }
                }

                var socitem = this.list.get(item.socid);

                if (!Y.Lang.isNull(socitem)){
                    if (Y.Lang.isNull(socitem.history)){
                        socitem.history = new History();
                    }
                    socitem.history.add(item);
                    if (socid > 0 && item.socid * 1 == socid){
                        socitem.history.setFirstLoadedId(id);
                    }
                }
            }
        },

        userConfigSave: function(callback){

            callback = callback || function(){
                };
            callback();

            /*
            var __self = this;
            this.ajax({'do': 'usercfgupdate', 'cfg': this.userConfig.toAjax()}, function(r){
                callback();
                if (Y.Lang.isNull(r)){
                    return;
                }
                __self.userConfig.update(r);
                __self.userConfigChangedEvent.fire(__self.userConfig);
            });
            /**/
        },

        taskShowComments: function(taskid, callback){
            var task = this.list.find(taskid);
            callback = callback || function(){
                };
            var __self = this;
            this.ajax({'do': 'taskshowcmt', 'taskid': taskid, 'val': (!task.showcmt ? '1' : '0')}, function(r){
                callback();
                if (Y.Lang.isNull(r)){
                    return;
                }
                task.showcmt = r * 1 > 0;
                // __self.taskUserChangedEvent.fire(task);
            });
        },

        taskExpand: function(taskid, callback){
            var task = this.list.find(taskid);
            callback = callback || function(){
                };
            var __self = this;
            this.ajax({'do': 'taskexpand', 'taskid': taskid, 'val': (!task.expanded ? '1' : '0')}, function(r){
                callback();
                if (Y.Lang.isNull(r)){
                    return;
                }
                task.expanded = r * 1 > 0;
                __self.taskUserChangedEvent.fire(task);
            });
        },

        taskSetOrder: function(taskid, value, callback){
            callback = callback || function(){
                };
            var __self = this;
            this.ajax({'do': 'taskvoting', 'taskid': taskid, 'val': value}, function(r){
                callback();
                if (Y.Lang.isNull(r)){
                    return;
                }
                var task = NS.taskManager.list.find(taskid);
                task.order = r * 1;
                __self.taskUserChangedEvent.fire(task);
            });
        },

        _taskAJAX: function(taskid, cmd, callback){
            callback = callback || function(){
                };
            var __self = this;
            this.ajax({'do': cmd, 'taskid': taskid}, function(r){
                __self._setLoadedTaskData(r);
                callback();
            });
        },
        _setLoadedTaskData: function(d){
            if (Y.Lang.isNull(d)){
                return;
            }
            var task = this.list.find(d['id']);
            if (Y.Lang.isNull(task)){
                return;
            }

            var isNew = task.isNew;
            task.setData(d);

            this.historyUpdate(d['hst']);

            if (isNew){
                this.newTaskReadEvent.fire(task);
            }
        },
        checkTaskOpenChilds: function(taskid){ // проверить, есть ли открытые подзадачи
            var task = this.list.find(taskid);
            if (Y.Lang.isNull(task)){
                return false;
            }
            var find = false;
            task.childs.foreach(function(tk){
                if (tk.status != TaskStatus.CLOSE){
                    find = true;
                    return true;
                }
            });
            return find;
        },
        taskRemove: function(taskid, callback){ // удалить задачу
            this._taskAJAX(taskid, 'taskremove', callback);
        },
        taskRestore: function(taskid, callback){ // восстановить удаленную задачу
            this._taskAJAX(taskid, 'taskrestore', callback);
        },
        taskClose: function(taskid, callback){ // закрыть задачу
            this._taskAJAX(taskid, 'taskclose', callback);
        },
        taskArhive: function(taskid, callback){ // Переместить задачу в архив
            this._taskAJAX(taskid, 'taskarhive', callback);
        },
        taskOpen: function(taskid, callback){ // открыть задачу повторно
            this._taskAJAX(taskid, 'taskopen', callback);
        },
        taskSetExec: function(taskid, callback){ // принять на исполнение
            this._taskAJAX(taskid, 'tasksetexec', callback);
        },
        taskUnsetExec: function(taskid, callback){ // отказаться от выполнения данной задачи
            this._taskAJAX(taskid, 'taskunsetexec', callback);
        },
        taskLoad: function(taskid, callback){
            callback = callback || function(){
                };
            var task = this.list.find(taskid);

            if (Y.Lang.isNull(task) || task.isLoad){
                callback();
                return true;
            }
            this._taskAJAX(taskid, 'task', callback);
        },

        custatusSave: function(task, sd, callback){
            // var __self = this;
            this.ajax({
                'do': 'custatsave',
                'custat': sd
            }, function(r){
                if (!Y.Lang.isNull(r)){
                    task.custatus = r;
                }
                callback();
            });
        },

        custatusFullUserLoad: function(callback){
            this.ajax({
                'do': 'custatfull'
            }, function(r){
                NS.life(callback, r);
            });
        },

    };

    NS.parseTime = function(str){
        var a = str.split(':');
        if (a.length != 2){
            return null;
        }
        var h = a[0] * 1, m = a[1] * 1;
        if (!(h >= 0 && h <= 23 && m >= 0 && m <= 59)){
            return null;
        }
        return [h, m];
    };

    // кол-во дней, часов, минут (параметр в секундах)
    NS.timeToSSumma = function(hr){
        var ahr = [];
        var d = Math.floor(hr / (60 * 60 * 24));
        if (d > 0){
            hr = hr - d * 60 * 60 * 24;
            ahr[ahr.length] = d + 'д';
        }
        var h = Math.floor(hr / (60 * 60));
        if (h > 0){
            hr = hr - h * 60 * 60;
            ahr[ahr.length] = h + 'ч';
        }
        var m = Math.floor(hr / 60);
        if (m > 0){
            hr = hr - m * 60;
            ahr[ahr.length] = m + 'м';
        }
        return ahr.join(' ');
    };


};