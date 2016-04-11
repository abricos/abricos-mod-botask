var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: 'botask', files: ['history.js', 'lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var TST = NS.TaskStatus;

    var buildTemplate = this.buildTemplate;

    // var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}'])
    var LNG = this.language;


    var TaskTableWidget = function(container, taskList, config){
        this.init(container, taskList, config);
    };
    TaskTableWidget.prototype = {
        init: function(elTaskTable, taskList, config){
            this.elTaskTable = elTaskTable;
            this.list = taskList;
            this.setConfig(config);
            this.t = {};

            buildTemplate(this.t, 'table,row,rcolname,rcolddl,rcolprt,rcolfav,rcolvot,rcolwork,rcolexec,hcolname,hcolddl,hcolprt,hcolfav,hcolvot,hcolwork,hcolexec');

            this.vtMan = null;
            this._timeSelectedRow = 0;

            // Подписаться на событие изменений в задачах
            NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
            NS.taskManager.newTaskReadEvent.subscribe(this.onNewTaskRead, this, true);
            NS.taskManager.taskUserChangedEvent.subscribe(this.onTaskUserChanged, this, true);
            NS.taskManager.userConfigChangedEvent.subscribe(this.onUserConfigChanged, this, true);

            var __self = this;
            E.on(elTaskTable, 'click', function(e){
                if (__self._onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });

            E.on(elTaskTable, 'mouseout', function(e){
                __self.onMouseOut(E.getTarget(e));
            });
        },
        setConfig: function(config){
            this.cfg = L.merge({
                'columns': 'name,deadline,priority,favorite,voting', // executant
                'showflagnew': true,
                'globalsort': false,
                'limit': 0,
                'sortclick': true,
                'tasksort': 'deadline',
                'tasksortdesc': false,
                'childs': true, // показывать древовидную структуру
                'showwork': false, // показать колонку затраченного времени
                'workuserid': 0 // затрачено времени конкретного пользователя
            }, config || {});

            var a = this.cfg['columns'].split(',');
            this._columns = {};
            for (var i = 0; i < a.length; i++){
                var n = L.trim(a[i]);
                this._columns[n] = true;
            }
        },
        buildNewInfo: function(){
            var tnew = {};
            this.list.foreach(function(tk){
                if (tk.isNew){
                    tnew[tk.id] = tnew[tk.id] || {};
                    tnew[tk.id]['n'] = true;
                    if (!L.isNull(tk.parent)){
                        tnew[tk.parent.id] = tnew[tk.parent.id] || {};
                        tnew[tk.parent.id]['cn'] = true;
                    }
                }
            });
            this.tnew = tnew;
        },
        isRenderTask: function(task){ // проверка возможности отрисовки задачи
            return true;
        },
        isRenderChild: function(tk){ // проверка возможности отрисовки списка подзадач
            return tk.childs.count() > 0 && tk.expanded;
        },
        isChildExpanded: function(task){ // проверка, есть ли у задачи подзадачи, и если есть, нужно ли их раскрывать
            if (!this.cfg['childs'] || task.childs.count() == 0){
                return null;
            }
            return task.expanded;
        },
        renderRow: function(tk, data){
            return this.t._TM.replace('row', data);
        },
        buildRow: function(tk, level){
            if (!this.isRenderTask(tk)){
                return "";
            }

            level = level || 0;
            var TM = this.t._TM, ddl = "", cfg = this.cfg;
            if (!L.isNull(tk.deadline)){
                ddl = Brick.dateExt.convert(tk.deadline.getTime() / 1000, 0, !tk.ddlTime);
            }

            var author = NS.taskManager.users.get(tk.userid);

            var expd = this.isChildExpanded(tk);
            var chcls = L.isNull(expd) ? 'nochild' : (expd ? 'expanded' : '');

            var tnew = this.tnew[tk.id] || {};
            var n = tk.order;

            var enCols = this._columns,
                sCols = "";

            if (enCols['name']){
                var sViewLink = 'taskview';
                if (tk.type == 'folder'){
                    sViewLink = 'folderview';
                } else if (tk.type == 'project'){
                    sViewLink = 'projectview';
                }
                sCols += TM.replace('rcolname', {
                    'id': tk.id,
                    'viewlink': sViewLink,
                    'aunm': L.isNull(author) ? 'null' : author.getUserName(),
                    'tl': tk.title == "" ? LNG['nottitle'] : tk.title,
                    'dl': Brick.dateExt.convert(tk.date.getTime() / 1000),
                    'udl': Brick.dateExt.convert(tk.uDate.getTime() / 1000)
                });
            }

            if (enCols['deadline']){
                sCols += TM.replace('rcolddl', {
                    'ddl': ddl
                });
            }

            if (enCols['priority']){
                sCols += TM.replace('rcolprt', {
                    'prts': LNG['priority'][tk.priority]
                });
            }

            if (enCols['executant']){

                var sExec = "";
                if (tk.isInWorked() && tk.stUserId * 1 > 0){
                    var exec = NS.taskManager.users.get(tk.stUserId);
                    sExec = exec.getUserName();
                }
                // 'aunm': author.getUserName(),
                // 'auid': author.id,

                sCols += TM.replace('rcolexec', {
                    'exec': sExec
                });
            }

            if (enCols['favorite']){
                sCols += TM.replace('rcolfav', {
                    'id': tk.id,
                    'fav': tk.favorite ? 'fav-checked' : ''
                });
            }

            if (enCols['voting']){
                sCols += TM.replace('rcolvot', {
                    'id': tk.id,
                    'fav': tk.favorite ? 'fav-checked' : '',
                    'ord': n != 0 ? ((n > 0 ? '+' : '') + n) : '&mdash;'
                });
            }

            if (enCols['work']){
                var hr = '';

                if (!L.isNull(tk.work)){
                    if (cfg['workuserid'] * 1 > 0){
                        var ti = tk.work.users[cfg['workuserid']];
                        if (ti){
                            hr = ti['sm'];
                        }
                    } else {
                        hr = tk.work.seconds;
                    }
                }
                var shr = '';
                var ahr = [];
                if (hr != ''){
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
                    shr = ahr.join(' ');
                }

                sCols += TM.replace('rcolwork', {
                    'work': shr
                });
            }

            var sRow = this.renderRow(tk, {
                'id': tk.id,
                'prt': tk.priority,
                'expired': tk.isExpired() ? 'expired' : '',
                'closed': tk.isClosed() ? 'closed' : '',
                'removed': tk.isRemoved() ? 'removed' : '',
                'tnew': cfg['showflagnew'] && tnew['n'] ? 'tnew' : '',
                'tchnew': tnew['cn'] ? 'tchnew' : '',
                'level': level,
                'classch': chcls,
                'tl': tk.title == "" ? LNG['nottitle'] : tk.title,
                'aunm': L.isNull(author) ? 'null' : author.getUserName(),
                'auid': L.isNull(author) ? 'null' : author.id,
                'cols': sCols
            });

            if (this.isRenderChild(tk)){
                sRow += this.buildRows(tk.childs, level + 1);
            }

            return sRow;
        },
        buildRows: function(list, level){
            level = level || 0;
            var lst = "", __self = this,
                cfg = this.cfg;

            this.buildNewInfo();

            list.foreach(function(tk){
                    lst += __self.buildRow(tk, level);
                },
                cfg['childs'],
                cfg['tasksort'],
                cfg['tasksortdesc'],
                cfg['globalsort'],
                cfg['limit']
            );

            return lst;
        },
        render: function(){
            var TM = this.t._TM,
                lst = this.buildRows(this.list, 0),
                cfg = this.cfg;

            var enCols = this._columns,
                sCols = "";

            if (enCols['name']){
                sCols += TM.replace('hcolname', {
                    'sortname': (cfg['tasksort'] != 'name') ? '' : (cfg['tasksortdesc'] ? 'sb' : 'sa')
                });
            }
            if (enCols['deadline']){
                sCols += TM.replace('hcolddl', {
                    'sortdeadline': (cfg['tasksort'] != 'deadline') ? '' : (cfg['tasksortdesc'] ? 'sb' : 'sa')
                });
            }
            if (enCols['priority']){
                sCols += TM.replace('hcolprt', {
                    'sortpriority': (cfg['tasksort'] != 'priority') ? '' : (cfg['tasksortdesc'] ? 'sb' : 'sa')
                });
            }
            if (enCols['executant']){
                sCols += TM.replace('hcolexec', {
                    'sortexecutant': (cfg['tasksort'] != 'executant') ? '' : (cfg['executantdesc'] ? 'sb' : 'sa')
                });
            }
            if (enCols['favorite']){
                sCols += TM.replace('hcolfav', {
                    'sortfavorite': (cfg['tasksort'] != 'favorite') ? '' : (cfg['tasksortdesc'] ? 'sb' : 'sa')
                });
            }
            if (enCols['voting']){
                sCols += TM.replace('hcolvot', {
                    'sortvoting': (cfg['tasksort'] != 'voting') ? '' : (cfg['tasksortdesc'] ? 'sb' : 'sa')
                });
            }
            if (enCols['work']){
                sCols += TM.replace('hcolwork', {
                    'sortwork': (cfg['tasksort'] != 'work') ? '' : (cfg['tasksortdesc'] ? 'sb' : 'sa')
                });
            }

            var d = {
                'cols': sCols,
                'rows': lst
            };


            d['sort' + cfg['tasksort']] = cfg['tasksortdesc'] ? 'sb' : 'sa';
            this.elTaskTable.innerHTML = TM.replace('table', d);

            if (this._timeSelectedRow * 1 > 0){
                var taskid = this._timeSelectedRow;

                this._timeSelectedRow = 0;
                var elRow = Dom.get(TM.getElId('row.id') + '-' + taskid);
                Dom.addClass(elRow, 'row-hover');
                setTimeout(function(){
                    Dom.removeClass(elRow, 'row-hover');
                }, 500);
            }
        },
        _onClick: function(el){
            var TId = this.t._TId;
            if (this.cfg['sortclick']){
                switch (el.id) {
                    case TId['hcolname']['sortname']:
                        this.sort('name');
                        return true;
                    case TId['hcolddl']['sortdeadline']:
                        this.sort('deadline');
                        return true;
                    case TId['hcolprt']['sortpriority']:
                        this.sort('priority');
                        return true;
                    case TId['hcolfav']['sortfavorite']:
                        this.sort('favorite');
                        return true;
                    case TId['hcolvot']['sortvoting']:
                        this.sort('voting');
                        return true;
                }
            }

            var prefix = el.id.replace(/([0-9]+$)/, ''),
                taskid = el.id.replace(prefix, "");

            switch (prefix) {
                case (TId['row']['exp'] + '-'):
                    this.shChilds(taskid);
                    return true;
                case (TId['rcolvot']['up'] + '-'):
                    this.taskVoting(taskid, 1);
                    return true;
                case (TId['rcolvot']['down'] + '-'):
                    this.taskVoting(taskid, -1);
                    return true;
                case (TId['rcolfav']['fav'] + '-'):
                case (TId['rcolfav']['favi'] + '-'):
                    this.taskFavorite(taskid);
                    return true;
            }

            return false;
        },
        _parseId: function(el){
            if (!el.id){
                return null;
            }
            var prefix = el.id.replace(/([0-9]+$)/, ''),
                taskid = el.id.replace(prefix, "");

            return [prefix, taskid];
        },
        sort: function(field){
            var cfg = NS.taskManager.userConfig,
                desc = cfg['tasksort'] == field;

            this.cfg['tasksort'] = cfg['tasksort'] = field;
            this.cfg['tasksortdesc'] = cfg['tasksortdesc'] = desc ? !cfg['tasksortdesc'] : false;

            NS.taskManager.userConfigSave();
            this.render();
        },

        taskFavorite: function(taskid){
            NS.taskManager.taskFavorite(taskid);
            var task = NS.taskManager.list.find(taskid);
            task.favorite = !task.favorite;
            this.render();
        },
        onMouseOut: function(el){
            if (L.isNull(this.vtMan)){
                return;
            }

            var psid = this._parseId(el);
            if (L.isNull(psid)){
                return;
            }

            var TM = this.t._TM, TId = this.t._TId;

            var prefix = psid[0], tp = TId['rcolvot'];
            if (!((tp['up'] + '-') == prefix || (tp['down'] + '-') == prefix)){
                return;
            }

            var vtMan = this.vtMan, taskid = psid[1], __self = this;
            this.vtMan = null;
            if (vtMan.task.id * 1 != taskid * 1){
                return;
            }

            this._isVotingProcess = true;
            var elList = TM.getEl('list.id');
            Dom.addClass(elList, 'voting-process');
            NS.taskManager.taskSetOrder(taskid, vtMan['n'], function(){
                __self._isVotingProcess = false;
                __self._timeSelectedRow = taskid;
                Dom.removeClass(elList, 'voting-process');
            });
        },
        taskVoting: function(taskid, inc){
            if (this._isVotingProcess){
                return;
            }

            if (L.isNull(this.vtMan)){
                var task = NS.taskManager.getTask(taskid);
                this.vtMan = {'task': task, 'n': task.order};
            }
            var vtMan = this.vtMan;
            vtMan['n'] += inc;

            var elRow = Dom.get(this.t._TM.getElId('rcolvot.vot') + '-' + taskid);
            var n = vtMan['n'];

            elRow.innerHTML = n != 0 ? ((n > 0 ? '+' : '') + n) : '&mdash;';
        },
        shChilds: function(taskid){
            var task = NS.taskManager.getTask(taskid);
            if (L.isNull(task)){
                return;
            }
            var TM = this.t._TM;

            var elRow = Dom.get(TM.getElId('row.id') + '-' + taskid);
            if (L.isNull(elRow)){
                return;
            }
            if (task.childs.count() == 0){
                Dom.removeClass(elRow, 'expanded');
                Dom.addClass(elRow, 'nochild');
                return;
            }
            NS.taskManager.taskExpand(taskid);
            task.expanded = !task.expanded;

            this.render();
        },
        destroy: function(){
            NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
            NS.taskManager.newTaskReadEvent.unsubscribe(this.onNewTaskRead);
            NS.taskManager.taskUserChangedEvent.unsubscribe(this.onTaskUserChanged);
            NS.taskManager.userConfigChangedEvent.unsubscribe(this.onUserConfigChanged);
        },
        _isHistoryChanged: function(list, ids){
            var __self = this, find = false;
            list.foreach(function(tk){
                for (var id in ids){
                    if (tk.id * 1 == id * 1){
                        find = true;
                        return true;
                    }
                }
                if (tk.childs.count() > 0 && tk.expanded){
                    if (__self._isHistoryChanged(tk.childs, ids)){
                        find = true;
                        return true;
                    }
                }
            }, true);
            return find;
        },

        onTaskUserChanged: function(type, args){
            this.render();
        },

        onHistoryChanged: function(type, args){
            this.render();
        },
        onNewTaskRead: function(type, args){
            this.render();
        },
        onUserConfigChanged: function(type, args){
            this.render();
        }
    };
    NS.TaskTableWidget = TaskTableWidget;

    var TaskListWidget = function(container, ptaskid, config){
        ptaskid = ptaskid || 0;

        var list = null,
            tman = NS.taskManager;
        if (ptaskid == 0){
            list = tman.list;
        } else {
            var task = tman.list.find(ptaskid);
            list = task.childs;
        }

        TaskListWidget.superclass.constructor.call(this, container, list, config);
    };
    YAHOO.extend(TaskListWidget, TaskTableWidget, {
        init: function(container, list, config){

            buildTemplate(this, 'list');

            var TM = this._TM;

            container.innerHTML = TM.replace('list');

            TaskListWidget.superclass.init.call(this, TM.getEl('list.table'), list, config);

            var __self = this;
            E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });

            this.tabPage = {
                'opened': {
                    'name': 'opened',
                    'el': TM.getEl('list.opened')
                },
                'arhive': {
                    'name': 'arhive',
                    'el': TM.getEl('list.arhive')
                },
                'removed': {
                    'name': 'removed',
                    'el': TM.getEl('list.removed')
                },
                'favorite': {
                    'name': 'favorite',
                    'el': TM.getEl('list.favorite')
                }
            };
            this.selectTabPage('opened');
        },

        selectTabPage: function(pagename){
            var page = this.tabPage[pagename];
            if (!page){
                return;
            }
            this.selectedTabPage = page;

            for (var n in this.tabPage){
                Dom.removeClass(this.tabPage[n]['el'], 'current');
            }
            Dom.addClass(page['el'], 'current');

            this.cfg['childs'] = pagename == 'opened';

            this.render();
        },
        isRenderChild: function(tk){
            if (this.selectedTabPage['name'] == 'opened'){
                return TaskListWidget.superclass.isRenderChild.call(this, tk);
            }
            return false;
        },
        isChildExpanded: function(tk){
            if (this.selectedTabPage['name'] == 'opened'){
                var find = false;
                tk.childs.foreach(function(ctk){
                    if (!ctk.isRemoved() && !ctk.isArhive()){
                        find = true;
                        return true;
                    }
                }, true);
                if (!find){
                    return null;
                }
            }
            return TaskListWidget.superclass.isChildExpanded.call(this, tk);
        },
        isRenderTask: function(tk){
            var selTPage = this.selectedTabPage['name'];
            if (selTPage == 'opened'){
                if (tk.isRemoved() || tk.isArhive()){
                    return false;
                }
            } else {
                if ((selTPage == 'closed' && tk.status == TST.CLOSE) ||
                    (selTPage == 'arhive' && tk.status == TST.ARHIVE) ||
                    (selTPage == 'removed' && tk.status == TST.REMOVE) ||
                    (selTPage == 'favorite' && tk.favorite)){
                    return true;
                }
                return false;
            }
            return true;
        },
        onClick: function(el){
            var tp = this._TId['list'];
            switch (el.id) {
                case tp['opened']:
                    this.selectTabPage('opened');
                    return true;
                case tp['arhive']:
                    this.selectTabPage('arhive');
                    return true;
                case tp['removed']:
                    this.selectTabPage('removed');
                    return true;
                case tp['favorite']:
                    this.selectTabPage('favorite');
                    return true;
            }
            return false;
        }
    });
    NS.TaskListWidget = TaskListWidget;

};