var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['panel.js']},
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.ExploreWidget = Y.Base.create('ExploreWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template,
                cfg = this.get('config');

            tp.setValue({
                showarch: cfg.showArhive,
                showrem: cfg.showRemoved
            });

            this.selectedTask = null;
            this.selectedUserId = null;

            this.renderWidget();

            NS.taskManager.taskListChangedEvent.subscribe(this.onTaskListChanged, this, true);

        },
        destructor: function(){
            NS.taskManager.taskListChangedEvent.unsubscribe(this.onTaskListChanged);
        },
        onTaskListChanged: function(){
            this.renderWidget();
        },
        buildRow: function(tk, level, first, islast){
            this._taskRender[tk.id] = true;

            var tp = this.template,
                cfg = this.get('config'),
                sChild = tk.childs.count() > 0 ? this.buildRows(tk, tk.childs, level + 1) : '';

            if (tk.isUserRow){
                var user = NS.taskManager.users.get(tk.userid);
                return tp.replace('rowuser', {
                    id: tk.id,
                    avatar: user.get('avatarSrc24'),
                    tl: user.get('viewName'),
                    linkview: '#',
                    child: sChild,
                    clst: islast ? 'ln' : 'tn',
                    chdicoview: tk.childs.count() == 0 ? 'hide' : 'none',
                    chdicon: cfg['shUsers'][tk.userid] ? 'chdcls' : 'chdexpd'
                });
            } else {
                return tp.replace('row', {
                    'id': tk.id,
                    'tl': tk.title,
                    type: tk.type,
                    'csstrem': tk.isRemoved() ? 'strem' : '',
                    'csstarch': tk.isArhive() ? 'starch' : '',
                    'cssttype': tk.type,
                    'child': sChild,
                    'clst': islast ? 'ln' : 'tn',
                    'chdicoview': tk.childs.count() == 0 ? 'hide' : 'none',
                    'chdicon': tk.expanded ? 'chdcls' : 'chdexpd'
                });
            }
        },
        buildRows: function(ptk, list, level){
            var appInstance = this.get('appInstance'),
                tp = this.template,
                cfg = this.get('config'),
                a = [],
                anp = null;

            list.foreach(function(tk){
                if ((tk.isArhive() && !cfg.showArhive)
                    || (tk.isRemoved() && !cfg.showRemoved)){
                    return;
                }

                if (level == 0 && ((Y.Lang.isNull(tk.parent) && tk.parentTaskId > 0) || tk.userid != UID)){

                    if (Y.Lang.isNull(anp)){
                        anp = {};
                    }
                    if (!anp[tk.userid]){
                        var user = NS.taskManager.users.get(tk.userid);
                        anp[tk.userid] = {
                            'id': tk.userid,
                            'title': user.get('viewName'),
                            'userid': tk.userid,
                            'isUserRow': true,
                            'childs': new NS.TaskList(),
                            'expanded': cfg['shUsers'][tk.userid]
                        };
                    }
                    anp[tk.userid].childs.add(tk);
                } else {
                    a[a.length] = tk;
                }
            }, true, 'name');

            if (!Y.Lang.isNull(anp)){
                var at = [];
                for (var n in anp){
                    at[at.length] = anp[n];
                }
                at = at.sort(function(tk1, tk2){
                    if (tk1.title < tk2.title){
                        return -1;
                    }
                    if (tk1.title > tk2.title){
                        return 1;
                    }
                    return 0;
                });
                for (var i = 0; i < at.length; i++){
                    a[a.length] = at[i];
                }
                this.urows = anp;
            }

            var lst = "";
            for (var i = 0; i < a.length; i++){
                lst += this.buildRow(a[i], level, i == 0, i == a.length - 1);
            }

            if (lst == ""){
                return "";
            }

            if (this._firstRenderRows){
                this._firstRenderRows = false;

                tp.hide('empty');
                tp.show('table');
            }

            var sRow = {
                'pid': 0,
                'clshide': '',
                'rows': lst
            };
            if (!Y.Lang.isNull(ptk)){
                sRow['pid'] = ptk.id;
                sRow['clshide'] = ptk.expanded ? '' : 'hide';
            }

            return tp.replace('table', sRow);
        },

        renderWidget: function(){
            this.urows = null;
            this._firstRenderRows = true;
            this._taskRender = {};

            var tp = this.template;
            tp.show('empty');
            tp.hide('table');
            tp.setHTML({
                table: this.buildRows(null, NS.taskManager.list, 0)
            });

            this.selectPath(this.selectedTask);

            this.appURLUpdate();
        },
        shChilds: function(taskid){
            var task = NS.taskManager.getTask(taskid);
            if (Y.Lang.isNull(task)){
                return;
            }

            NS.taskManager.taskExpand(taskid);
            task.expanded = !task.expanded;
            this.renderWidget();
        },
        shChildsUser: function(taskid){
            var shUsers = this.get('config')['shUsers'];
            shUsers[taskid] = !shUsers[taskid];

            this.renderWidget();
        },
        onClick: function(e){
            var node = e.defineTarget ? e.defineTarget : e.target,
                id = node.getData('id');

            switch (e.dataClick) {
                case 'shChilds':
                    this.shChilds(id);
                    return true;
                case 'shChildsUser':
                    this.shChildsUser(id);
                    return true;

            }

            return;

            switch (el.id) {
                case tp['showrem']:
                    this.shRemoved();
                    return false;
                case tp['showarch']:
                    this.shArhive();
                    return false;
                case tp['btitle']:
                    NS.navigator.taskHome();
                    return true;

                case tp['badd']:
                case tp['baddc']:
                    NS.navigator.add(0);
                    return true;

                case tp['bgo']:
                case tp['bgoc']:
                    this.showGoByIdPanel();
                    return true;
            }

            tp = TId['row'];
            switch (prefix) {
                case (tp['badd'] + '-'):
                case (tp['baddc'] + '-'):
                    NS.navigator.add(numid);
                    return true;

                case (tp['bedit'] + '-'):
                case (tp['beditc'] + '-'):
                    this.editById(numid);
                    return true;

            }


            return false;
        },
        editById: function(id){
            var task = NS.taskManager.list.get(id);
            if (Y.Lang.isNull(task)){
                return;
            }

            switch (task.type) {
                case 'folder':
                    NS.navigator.folderEdit(id);
                    break;
                case 'project':
                    NS.navigator.projectEdit(id);
                    break;
                case 'task':
                    NS.navigator.taskEdit(id);
                    break;
            }
        },
        shArhive: function(){
            var TM = this._TM, gel = function(n){
                return TM.getEl('widget.' + n);
            };
            this.get('config')['showArhive'] = gel('showarch').checked;
            this.renderWidget();
        },
        shRemoved: function(){
            var TM = this._TM, gel = function(n){
                return TM.getEl('widget.' + n);
            };
            this.get('config')['showRemoved'] = gel('showrem').checked;
            this.renderWidget();
        },

        selectPathMethod: function(task){
            if (Y.Lang.isNull(task)){
                return;
            }
            var TId = this._TId, gel = function(n, id){
                return Dom.get(TId[n]['title'] + '-' + id);
            };
            Dom.addClass(gel('row', task.id), 'select');

            if ((Y.Lang.isNull(task.parent) && task.parentTaskId > 0) || (task.parentTaskId == 0 && task.userid != UID)){
                Dom.addClass(gel('rowuser', task.userid), 'select');
            }

            this.selectPathMethod(task.parent);
        },

        selectPath: function(task){
            this.selectedTask = task;

            var tp = this.template;

            NS.taskManager.list.foreach(function(tk){
                tp.removeClass('row.title-' + tk.id, 'select');
            }, false);

            for (var uid in this.urows){
                var utk = this.urows[uid];
                tp.removeClass('rowuser.title-' + utk.id, 'select');
            }
            this.selectPathMethod(task);
        },

        // выделить все задачи, где участвует этот пользователь
        selectUser: function(userid){
            this.selectedUserId = userid;
            var tp = this.template;

            NS.taskManager.list.foreach(function(tk){
                var find = false;
                for (var i = 0; i < tk.users.length; i++){
                    var uid = tk.users[i];
                    if (userid == uid){
                        find = true;
                        break;
                    }
                }

                if (find){
                    tp.addClass('row.title-' + tk.id, 'seluser');
                } else {
                    tp.removeClass('row.title-' + tk.id, 'seluser');
                }
            }, false);
        },

        showGoByIdPanel: function(){
            new GoByIdPanel(function(task){
                switch (task.type) {
                    case 'folder':
                        NS.navigator.folderView(task.id);
                        break;
                    case 'task':
                        NS.navigator.taskView(task.id);
                        break;
                    case 'project':
                        NS.navigator.projectView(task.id);
                        break;
                }

            });
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,table,row,rowuser'},
            config: {
                value: {
                    showArhive: false,
                    showRemoved: false,
                    shUsers: {}
                }
            }
        },
        CLICKS: {}
    });

    return; // TODO: old functions

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var UID = Brick.env.user.id;

    ExploreWidget.prototype = {};
    NS.ExploreWidget = ExploreWidget;

    NS.GoByIdPanel = Y.Base.create('GoByIdPanel', SYS.Dialog, [], {
        initializer: function(){
            Y.after(this._syncUIGroupEditorDialog, this, 'syncUI');
        },
        _syncUIGroupEditorDialog: function(){
        },
        onClick: function(el){
            var tp = this._TId['gopanel'];
            switch (el.id) {
                case tp['bcancel']:
                    this.close();
                    return true;
                case tp['bok']:
                    this.goById();
                    return true;
            }

            return false;
        },
        goById: function(){
            var TM = this._TM, gel = function(n){
                return TM.getEl('gopanel.' + n);
            };

            var numid = gel('number').value;

            var task = NS.taskManager.getTask(numid);

            if (Y.Lang.isNull(task)){
                gel('num').innerHTML = numid;
                Dom.setStyle(gel('err'), 'display', '');
                return;
            }

            this.close();
            this.callback(task);
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'gopanel'},
            callback: {value: null},
        }
    });

};