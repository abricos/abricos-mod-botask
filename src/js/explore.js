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

    var UID = Brick.env.user.id | 0;

    var _titleSortFn = function(tk1, tk2){
        if (tk1.title < tk2.title){
            return -1;
        }
        if (tk1.title > tk2.title){
            return 1;
        }
        return 0;
    };

    NS.ExploreWidget = Y.Base.create('ExploreWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt,
        NS.AppResponsesHelperExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template;

            this.renderWidget();

            tp.one('isArhivedVisible').on('change', function(e){
                var val = tp.getValue('isArhivedVisible');
                this.set('arhivedVisible', val);
                this.renderWidget();
            }, this);

            tp.one('isRemovedVisible').on('change', function(e){
                var val = tp.getValue('isRemovedVisible');
                this.set('removedVisible', val);
                this.renderWidget();
            }, this);

            this.bindResponsesEvent();
        },
        destructor: function(){
        },
        onTaskRemoved: function(){
            this.renderWidget();
        },
        renderWidget: function(){
            var tp = this.template,
                appInstance = this.get('appInstance'),
                taskList = appInstance.get('taskList');

            tp.toggleView(true, 'empty', 'table');

            tp.setHTML({
                table: this._buildRows(taskList)
            });

            this.appURLUpdate();
        },
        _buildRows: function(taskList, level, isUserLevel){
            level = level | 0;

            var tp = this.template,
                appInstance = this.get('appInstance'),
                isArhived = this.get('arhivedVisible'),
                isRemoved = this.get('removedVisible'),
                a = [],
                anp = null;

            taskList.each(function(task){
                var status = task.get('status'),
                    parentid = task.get('parentid'),
                    parent = task.get('parent'),
                    userid = task.get('userid'),
                    user = this.getUser(userid);

                if ((status === 'arhived' && !isArhived) ||
                    (status === 'removed' && !isRemoved)){
                    return;
                }

                if ((level === 0 && userid !== UID)){
                    anp = anp || {};
                    (anp[userid] = anp[userid] || {
                            isUserRow: true,
                            userid: userid,
                            title: user.get('viewName'),
                            childs: new NS.TaskList({
                                appInstance: appInstance
                            })
                        }).childs.add(task);
                } else if ((level === 0 && !parent) || (level > 0 && parent) || isUserLevel){
                    a[a.length] = task;
                }
            }, this);

            if (anp){
                var at = [];
                for (var n in anp){
                    at[at.length] = anp[n];
                }
                at = at.sort(_titleSortFn);
                a = a.concat(at);
            }

            var lst = "",
                isFirst, isLast,
                item, user, childs, userRole,
                userChildsVisible = this.get('userChildsVisible');

            for (var i = 0; i < a.length; i++){
                item = a[i];
                isFirst = i === 0;
                isLast = i === (a.length - 1);

                if (item.isUserRow){
                    user = this.getUser(item.userid);
                    lst += tp.replace('rowuser', {
                        userid: item.userid,
                        avatar: user.get('avatarSrc24'),
                        tl: user.get('viewName'),
                        child: userChildsVisible[item.userid] ? this._buildRows(item.childs, level + 1, true) : '',
                        clst: isLast ? 'ln' : 'tn',
                        chdicon: userChildsVisible[item.userid] ? 'chdcls' : 'chdexpd',
                    });
                } else {
                    childs = item.get('childs');
                    userRole = item.get('userRole');

                    lst += tp.replace('row', {
                        id: item.get('id'),
                        tl: item.get('title'),
                        type: item.get('type'),
                        csstrem: item.get('status') === 'removed' ? 'strem' : '',
                        csstarch: item.get('status') === 'arhived' ? 'starch' : '',
                        cssttype: item.get('type'),
                        child: childs.size() > 0 && userRole.get('expanded')
                            ? this._buildRows(childs, level + 1) : '',
                        clst: isLast ? 'ln' : 'tn',
                        chdicoview: childs.size() == 0 ? 'hide' : 'none',
                        chdicon: userRole.get('expanded') ? 'chdcls' : 'chdexpd'
                    })
                }
            }

            if (lst === ""){
                return "";
            }

            tp.toggleView(false, 'empty', 'table');

            return tp.replace('table', {
                rows: lst
            });
        },

        old_selectPathMethod: function(task){
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

        old_selectPath: function(task){
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
        old_selectUser: function(userid){
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

    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,table,row,rowuser'},
            arhivedVisible: {
                value: false
            },
            removedVisible: {
                value: false
            },
            userChildsVisible: {
                value: {}
            }
        },
        CLICKS: {
            childsVisible: {
                event: function(e){
                    var node = e.defineTarget ? e.defineTarget : e.target,
                        taskid = node.getData('id') | 0,
                        appInstance = this.get('appInstance'),
                        taskList = appInstance.get('taskList'),
                        task = taskList.getById(taskid);

                    if (!task){
                        return;
                    }

                    var role = task.get('userRole'),
                        expaned = !role.get('expanded');
                    role.set('expanded', expaned);
                    this.renderWidget();
                    appInstance.taskExpand(taskid, expaned);
                }
            },
            userChildsVisible: {
                event: function(e){
                    var node = e.defineTarget ? e.defineTarget : e.target,
                        userid = node.getData('id') | 0,
                        userChildsVisible = this.get('userChildsVisible');

                    userChildsVisible[userid] = !userChildsVisible[userid];
                    this.renderWidget();
                }
            },
        }
    });

};