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

    // дополнить эксперементальными функциями менеджер шаблонов
    /*
     var TMP = Brick.Template.Manager.prototype;
     TMP.elHide = function(els){
     this.elShowHide(els, false);
     };
     TMP.elShow = function(els){
     this.elShowHide(els, true);
     };
     TMP.elShowHide = function(els, show){
     if (L.isString(els)){
     var arr = els.split(','), tname = '';
     els = [];

     for (var i = 0; i < arr.length; i++){
     var arr1 = arr[i].split('.');
     if (arr1.length == 2){
     tname = L.trim(arr1[0]);
     els[els.length] = L.trim(arr[i]);
     } else {
     els[els.length] = tname + '.' + L.trim(arr[i]);
     }
     }
     }
     if (!L.isArray(els)){
     return;
     }
     for (var i = 0; i < els.length; i++){
     var el = this.getEl(els[i]);
     Dom.setStyle(el, 'display', show ? '' : 'none');
     }
     };
     /**/

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

    var sortDate = function(d1, d2){ // Дата в порядке убывания
        var v1 = d1.getTime(), v2 = d2.getTime();
        if (v1 > v2){
            return 1;
        }
        if (v1 < v2){
            return -1;
        }
        return 0;
    };
    var sortDateDesc = function(d1, d2){
        return sortDate(d2, d1);
    };

    var sortPriority = function(tk1, tk2){
        var v1 = tk1.priority, v2 = tk2.priority;
        if (v1 > v2){
            return 1;
        }
        if (v1 < v2){
            return -1;
        }
        return 0;
    };

    var sortClosed = function(tk1, tk2){
        var v1 = tk1.isClosed() ? 1 : 0,
            v2 = tk2.isClosed() ? 1 : 0;

        if (v1 > v2){
            return 1;
        }
        if (v1 < v2){
            return -1;
        }
        return 0;
    };

    var sortOrder = function(tk1, tk2){
        if (tk1.order < tk2.order){
            return 1;
        }
        if (tk1.order > tk2.order){
            return -1;
        }
        return 0;
    };

    var sortDeadline = function(tk1, tk2){
        var t1 = Y.Lang.isNull(tk1.deadline) || tk1.isClosed() ? 9999999999999 : tk1.deadline.getTime();
        var t2 = Y.Lang.isNull(tk2.deadline) || tk2.isClosed() ? 9999999999999 : tk2.deadline.getTime();

        if (t1 < t2){
            return -1;
        }
        if (t1 > t2){
            return 1;
        }
        return 0;
    };

    var sortVDate = function(tk1, tk2){
        var t1 = Y.Lang.isNull(tk1.vDate) ? 0 : tk1.vDate.getTime();
        var t2 = Y.Lang.isNull(tk2.vDate) ? 0 : tk2.vDate.getTime();

        if (t1 < t2){
            return -1;
        }
        if (t1 > t2){
            return 1;
        }
        return 0;
    };

    var sortFavorite = function(tk1, tk2){
        var v1 = tk1.favorite ? 1 : 0, v2 = tk2.favorite ? 1 : 0;

        if (v1 < v2){
            return 1;
        }
        if (v1 > v2){
            return -1;
        }
        return 0;
    };

    var sortDCPD = function(tk1, tk2){
        var v = sortDeadline(tk1, tk2);
        if (v != 0){
            return v;
        }

        v = sortPriority(tk1, tk2);
        if (v != 0){
            return v;
        }
        v = sortOrder(tk1, tk2);
        if (v != 0){
            return v;
        }

        var isClosed = tk1.isClosed() && tk2.isClosed();

        if (!isClosed){
            return sortPriority(tk1, tk2);
        }
        v = sortDate(tk1.date, tk2.date);
        if (v != 0){
            return v;
        }

        return sortDate(tk1.stDate, tk2.stDate);
    };

    NS.taskSort = {
        'default': function(tk1, tk2){ // сортировка: Наименьший срок, наивысший приоритет
            var v = sortClosed(tk1, tk2);
            if (v != 0){
                return v;
            }

            return sortDCPD(tk1, tk2);
        },
        'date': function(tk1, tk2){
            return sortDate(tk1.date, tk2.date);
        },
        'datedesc': function(tk1, tk2){
            return sortDateDesc(tk1.date, tk2.date);
        },

        'udate': function(tk1, tk2){
            return sortDate(tk1.uDate, tk2.uDate);
        },
        'udatedesc': function(tk1, tk2){
            return sortDateDesc(tk1.uDate, tk2.uDate);
        },

        'deadline': function(tk1, tk2){
            return NS.taskSort['default'](tk1, tk2);
        },
        'deadlinedesc': function(tk1, tk2){
            return NS.taskSort['deadline'](tk2, tk1);
        },
        'name': function(tk1, tk2){
            if (tk1.title == tk2.title){
                return 0;
            }
            return (tk1.title < tk2.title) ? -1 : 1;
        },
        'namedesc': function(tk1, tk2){
            return NS.taskSort['name'](tk2, tk1);
        },
        'priority': function(tk1, tk2){

            var v = sortClosed(tk1, tk2);
            if (v != 0){
                return v;
            }

            var v1 = tk1.priority, v2 = tk2.priority;
            if (v1 < v2){
                return -1;
            }
            if (v1 > v2){
                return 1;
            }

            return 0;
        },
        'prioritydesc': function(tk2, tk1){
            var v = sortClosed(tk2, tk1);
            if (v != 0){
                return v;
            }

            var v1 = tk1.priority, v2 = tk2.priority;
            if (v1 < v2){
                return -1;
            }
            if (v1 > v2){
                return 1;
            }
            return 0;
        },
        'favorite': function(tk1, tk2){
            var v = sortClosed(tk1, tk2);
            if (v != 0){
                return v;
            }
            v = sortFavorite(tk1, tk2);
            if (v != 0){
                return v;
            }
            return sortDCPD(tk1, tk2);
        },
        'favoritedesc': function(tk1, tk2){
            var v = sortClosed(tk1, tk2);
            if (v != 0){
                return v;
            }
            v = sortFavorite(tk2, tk1);
            if (v != 0){
                return v;
            }
            return sortDCPD(tk2, tk1);
        },
        'voting': function(tk1, tk2){
            var v = sortClosed(tk1, tk2);
            if (v != 0){
                return v;
            }
            v = sortOrder(tk1, tk2);
            if (v != 0){
                return v;
            }
            return sortDCPD(tk1, tk2);
        },
        'votingdesc': function(tk1, tk2){
            var v = sortClosed(tk1, tk2);
            if (v != 0){
                return v;
            }
            v = sortOrder(tk2, tk1);
            if (v != 0){
                return v;
            }
            return sortDCPD(tk2, tk1);
        },
        'vdate': function(tk1, tk2){
            var v = sortVDate(tk1, tk2);
            if (v != 0){
                return v;
            }
            return sortDCPD(tk1, tk2);
        },
        'vdatedesc': function(tk1, tk2){
            var v = sortVDate(tk2, tk1);
            if (v != 0){
                return v;
            }
            return sortDCPD(tk2, tk1);
        }
    };

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

        // поиск задачи. если nochild=false, то поиск так же в подзадачах
        find: function(taskid, nochild){
            var find = null;
            this.foreach(function(task){
                if (taskid * 1 == task.id * 1){
                    find = task;
                    return true;
                }
            }, nochild);
            return find;
        },

        exist: function(taskid){
            return !Y.Lang.isNull(this.find(taskid, true));
        }
    });
    NS.Old_TaskList = Old_TaskList;


    var HItem = function(di){
        HItem.superclass.constructor.call(this, di);
    };
    YAHOO.extend(HItem, SC.HistoryItem, {
        init: function(d){
            HItem.superclass.init.call(this, d);

            this.taskid = d['tid'] * 1;	// идентификатор задачи

            this.socid = this.taskid;

            this.taskTitle = d['ttl'];

            this.isTitle = d['tlc'] * 1 > 0;
            this.isDescript = d['bdc'] * 1 > 0;
            this.isDeadline = d['ddlc'] * 1 > 0;
            this.isDdlTime = d['ddltc'] * 1 > 0;
            this.isParent = d['ptidc'] * 1 > 0;

            this.isStatus = d['st'] * 1 != d['pst'] * 1;
            this.stUserId = d['stuid'] * 1;
            this.status = d['st'] * 1;
            this.pstatus = d['pst'] * 1;
        }
    });

    // история может быт в трех состояниях:
    // не загружена вовсе, загружена частично (только параметры - что изменено),
    // загружена полностью (параметры + сами данные из истории)
    var History = function(data){
        History.superclass.constructor.call(this, data);
    };
    YAHOO.extend(History, SC.History, {
        itemInstance: function(di){
            return new HItem(di);
        }
    });

    /*
     var UserConfig = function(d){
     this.init(d);
     };
     UserConfig.prototype = {
     init: function(d){
     this.update(d);
     },
     update: function(d){
     d = L.merge({
     'tasksort': 'deadline',
     'tasksortdesc': false,
     'taskviewchild': true,
     'taskviewcmts': true
     }, d || {});

     this.tasksort = NS.taskSort[d['tasksort']] ? d['tasksort'] : 'deadline';
     this.tasksortdesc = d['tasksortdesc'] * 1 > 0;
     this.taskviewchild = d['taskviewchild'] * 1 > 0;
     this.taskviewcmts = d['taskviewcmts'] * 1 > 0;
     },
     toAjax: function(){
     return {
     'tasksort': NS.taskSort[this.tasksort] ? this.tasksort : 'deadline',
     'tasksortdesc': this.tasksortdesc ? 1 : 0,
     'taskviewchild': this.taskviewchild ? 1 : 0,
     'taskviewcmts': this.taskviewcmts ? 1 : 0
     };
     }
     };
     /**/

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

        loadHistory: function(history, socid, callback){
            callback = callback || function(){
                };
            var __self = this;
            this.ajax({
                'do': 'history',
                'socid': socid,
                'firstid': history.firstLoadedId
            }, function(r){
                r = L.isArray(r) ? r : [];
                history.isFullLoaded = r.length == 0;
                __self.historyUpdate(r, socid);
                callback();
            });
        },

        getTask: function(taskid){
            return this.list.find(taskid);
        },

        /*
        taskFavorite: function(taskid, callback){
            var task = this.list.find(taskid);
            callback = callback || function(){
                };
            var __self = this;
            this.ajax({'do': 'taskfavorite', 'taskid': taskid, 'val': (!task.favorite ? '1' : '0')}, function(r){
                callback();
                if (Y.Lang.isNull(r)){
                    return;
                }
                task.favorite = r * 1 > 0;
                __self.taskUserChangedEvent.fire(task);
            });
        },
        /**/

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

        // сохранить задачу (task - задача, newdata - новые данных по задаче)
        /*
        taskSave: function(task, d, callback){
            callback = callback || function(){
                };
            var __self = this;

            d = L.merge({
                'onlyimage': false,
                'id': 0, 'type': 3, 'title': '',
                'descript': '',
                'checks': [],
                'files': [],
                'images': [],
                'users': [Brick.env.user.id],
                'parentid': 0,
                'deadline': null,
                'ddlTime': false,
                'priority': 3
            }, d || {});

            this.ajax({
                'do': 'tasksave',
                'task': {
                    'id': task.id,
                    'pid': d['parentid'],
                    'type': d['type'],
                    'tl': d['title'],
                    'bd': d['descript'],
                    'checks': d['checks'],
                    'files': d['files'],
                    'images': d['images'],
                    'users': d['users'],
                    'pid': d['parentid'],
                    'ddl': NS.dateToServer(d['deadline']),
                    'ddlt': d['ddlTime'] ? 1 : 0,
                    'prt': d['priority'],
                    'onlyimage': d['onlyimage']
                }
            }, function(r){
                __self._setLoadedTaskData(r);
                callback(r);
            });
        }
        /**/
    };
    NS.TaskManager = TaskManager;
    NS.taskManager = null;


    NS.buildTaskManager = function(callback){
        if (!Y.Lang.isNull(NS.taskManager)){
            callback(NS.taskManager);
            return;
        }
        Brick.appFunc('user', 'userOptionList', '{C#MODNAME}', function(err, res){
            Brick.mod.filemanager.roles.load(function(){ // TODO: remove
                R.load(function(){
                    Brick.ajax('botask', {
                        'data': {'do': 'init'},
                        'event': function(request){
                            NS.taskManager = new TaskManager(res.userOptionList, request.data);
                            callback(NS.taskManager);
                        }
                    });
                });
            });
        });
    };

    NS.getDate = function(){
        return new Date();
    };

    var lz = function(num){
        var snum = num + '';
        return snum.length == 1 ? '0' + snum : snum;
    };

    var TZ_OFFSET = NS.getDate().getTimezoneOffset();
    TZ_OFFSET = 0;

    NS.dateToServer = function(date){
        if (Y.Lang.isNull(date)){
            return 0;
        }
        var tz = TZ_OFFSET * 60 * 1000;
        return (date.getTime() - tz) / 1000;
    };
    NS.dateToClient = function(unix){
        unix = unix * 1;
        if (unix == 0){
            return null;
        }
        var tz = TZ_OFFSET * 60;
        return new Date((tz + unix) * 1000);
    };

    NS.dateToTime = function(date){
        return lz(date.getHours()) + ':' + lz(date.getMinutes());
    };

    var DPOINT = '.';
    NS.dateToString = function(date){
        if (Y.Lang.isNull(date)){
            return '';
        }
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        return lz(day) + DPOINT + lz(month) + DPOINT + year;
    };
    NS.stringToDate = function(str){
        str = str.replace(/,/g, '.').replace(/\//g, '.');
        var aD = str.split(DPOINT);
        if (aD.length != 3){
            return null;
        }
        var day = aD[0] * 1, month = aD[1] * 1 - 1, year = aD[2] * 1;
        if (day > 31 || day < 0){
            return null;
        }
        if (month > 11 || month < 0){
            return null;
        }
        return new Date(year, month, day);
    };

    NS.timeToString = function(date){
        if (Y.Lang.isNull(date)){
            return '';
        }
        return lz(date.getHours()) + ':' + lz(date.getMinutes());
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


    var GlobalMenuWidget = function(container, bosapp, page){
        bosapp = L.isString(bosapp) ? bosapp : "";
        page = L.isString(page) ? page : "";
        this.init(container, bosapp, page);
    };
    GlobalMenuWidget.prototype = {
        init: function(container, bosapp, page){

            this.bosapp = bosapp;
            this.page = page;

            var TM = buildTemplate(this, 'gbmenu');
            container.innerHTML = TM.replace('gbmenu');

            var __self = this;
            E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });

            E.on(this._TM.getEl('gbmenu.gmfilter'), 'mouseover', function(e){
                __self.loadFilter();
            });
            E.on(this._TM.getEl('gbmenu.gmfavorite'), 'mouseover', function(e){
                __self.loadFavorite();
            });
            E.on(this._TM.getEl('gbmenu.gmincoming'), 'mouseover', function(e){
                __self.loadingIncoming();
            });
            E.on(this._TM.getEl('gbmenu.gmupdating'), 'mouseover', function(e){
                __self.loadingUpdating();
            });
            E.on(this._TM.getEl('gbmenu.gmcomments'), 'mouseover', function(e){
                __self.loadingComments();
            });

            this.render();
        },
        buildTaskManager: function(callback){
            var __self = this;
            NS.buildTaskManager(function(tm){
                __self.onBuildTaskManager();
                NS.life(callback);
            });
        },
        onBuildTaskManager: function(){
            this.render();
        },
        render: function(){
            var TM = this._TM,
                gel = function(n){
                    return TM.getEl("gbmenu." + n);
                },
                bosapp = this.bosapp,
                page = this.page,
                show = function(name){
                    Dom.setStyle(gel(name), 'display', '');
                };

            show('m' + bosapp);
            show('mi' + bosapp + page);

            Dom.addClass(gel('gm' + bosapp), 'sel');
            Dom.addClass(gel('mi' + bosapp + page), 'current');

            this.updateCountLabel();
        },
        updateCountLabel: function(){
            if (Y.Lang.isNull(NS.taskManager)){
                return;
            }
            var TM = this._TM,
                gel = function(n){
                    return TM.getEl("gbmenu." + n);
                };

            var countFav = 0, countIncom = 0, countUpd = 0, countCmt = 0;
            NS.taskManager.list.foreach(function(tk){
                if (tk.favorite){
                    countFav++;
                }
                if (tk.isNew){
                    countIncom++;
                }
                if (tk.vDate < tk.uDate && !tk.isNew){
                    countUpd++;
                }
                if (tk.isNewCmt && !tk.isNew){
                    countCmt++;
                }
            });

            gel('countfav').innerHTML = countFav;
            gel('countincom').innerHTML = countIncom;
            gel('countupd').innerHTML = countUpd;
            gel('countcmt').innerHTML = countCmt;

            if (countIncom > 0){
                Dom.addClass(gel('countincom'), 'red');
            } else {
                Dom.removeClass(gel('countincom'), 'red');
            }
            if (countUpd > 0){
                Dom.addClass(gel('countupd'), 'red');
            } else {
                Dom.removeClass(gel('countupd'), 'red');
            }
            if (countCmt > 0){
                Dom.addClass(gel('countcmt'), 'red');
            } else {
                Dom.removeClass(gel('countcmt'), 'red');
            }
        },
        onClick: function(el){
            if (el.id == this._TId['gbmenu']['bhome']){
                NS.navigator.taskHome();
                return true;
            }
            return false;
        },
        loadFilter: function(){
            if (this._loadFilter){
                return false;
            }
            this._loadFilter = true;

            var TM = this._TM;
            Brick.ff('botask', 'filter', function(){
                NS.buildTaskManager(function(tm){
                    tm.custatusFullUserLoad(function(sts){
                        new NS.FilterWidget(TM.getEl('gbmenu.filtcont'), sts);
                    });
                });
            });
        },
        loadFavorite: function(){
            if (this._loadFavorite){
                return false;
            }
            this._loadFavorite = true;

            var TM = this._TM;
            Brick.ff('botask', 'easylist', function(){
                NS.buildTaskManager(function(tm){
                    NS.API.taskFavoriteBoxWidget(TM.getEl('gbmenu.favcont'));
                });
            });
        },
        loadingIncoming: function(){
            if (this._loadingIncoming){
                return false;
            }
            this._loadingIncoming = true;

            var TM = this._TM;
            Brick.ff('botask', 'easylist', function(){
                NS.buildTaskManager(function(tm){
                    NS.API.taskIncomingBoxWidget(TM.getEl('gbmenu.incomcont'));
                });
            });
        },
        loadingUpdating: function(){
            if (this._loadingUpdating){
                return false;
            }
            this._loadingUpdating = true;

            var TM = this._TM;
            Brick.ff('botask', 'easylist', function(){
                NS.buildTaskManager(function(tm){
                    NS.API.taskUpdatingBoxWidget(TM.getEl('gbmenu.updcont'));
                });
            });
        },
        loadingComments: function(){
            if (this._loadingComments){
                return false;
            }
            this._loadingComments = true;

            var TM = this._TM;
            Brick.ff('botask', 'easylist', function(){
                NS.buildTaskManager(function(tm){
                    NS.API.taskCommentsBoxWidget(TM.getEl('gbmenu.cmtcont'));
                });
            });
        }
    };
    NS.GlobalMenuWidget = GlobalMenuWidget;

    NS.navigator = {
        'URI': '#app=botask/ws/showWorkspacePanel/',

        'home': function(){
            Brick.Page.reload(this.URI);
        },
        'taskHome': function(){
            Brick.Page.reload(this.URI);
        },
        'add': function(parentid){
            Brick.Page.reload(this.URI + "add/" + parentid + "/");
        },

        'folderCreate': function(parentid){
            Brick.Page.reload(this.URI + "folderadd/" + parentid + "/");
        },
        'folderEdit': function(id){
            Brick.Page.reload(this.URI + "folderedit/" + id + "/");
        },
        'folderView': function(id){
            Brick.Page.reload(this.URI + "folderview/" + id + "/");
        },

        'projectCreate': function(parentid){
            Brick.Page.reload(this.URI + "projectadd/" + parentid + "/");
        },
        'projectEdit': function(id){
            Brick.Page.reload(this.URI + "projectedit/" + id + "/");
        },
        'projectView': function(id){
            Brick.Page.reload(this.URI + "projectview/" + id + "/");
        },

        'taskCreate': function(parenttaskid){
            Brick.Page.reload(this.URI + "taskadd/" + parenttaskid + "/");
        },
        'taskEdit': function(taskid){
            Brick.Page.reload(this.URI + "taskedit/" + taskid + "/");
        },

        'taskView': function(taskid){
            Brick.Page.reload(this.URI + "taskview/" + taskid + "/");
        },
        'taskViewLink': function(tk){
            return this.URI + tk.type + "view/" + tk.id + "/";
        }
    };

};