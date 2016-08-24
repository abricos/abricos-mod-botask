var Component = new Brick.Component();
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        SYS = Brick.mod.sys,
        UID = Brick.env.user.id | 0,
        I18N = this.language;

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
        var v1 = tk1.get('priority'), v2 = tk2.get('priority');
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
        var t1 = Y.Lang.isNull(tk1.get('deadline')) || tk1.isClosed() ? 9999999999999 : tk1.get('deadline').getTime();
        var t2 = Y.Lang.isNull(tk2.get('deadline')) || tk2.isClosed() ? 9999999999999 : tk2.get('deadline').getTime();

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
        v = sortDate(tk1.get('date'), tk2.get('date'));
        if (v != 0){
            return v;
        }

        return sortDate(tk1.stDate, tk2.stDate);
    };

    var sortUpdateDate = function(item1, item2){
        var v1 = item1.get('updateDate').getTime(),
            v2 = item2.get('updateDate').getTime();

        if (v1 > v2){
            return 1;
        } else if (v1 < v2){
            return -1;
        }
        return 0;
    };

    var sortUpdateDateDesc = function(item1, item2){
        return sortUpdateDate(item2, item1);
    };

    NS.Task = Y.Base.create('task', SYS.AppModel, [], {
        structureName: 'Task',
        isNew: function(){
            if (this.get('type') === 'folder'){
                return false;
            }
            var role = this.get('userRole');
            return !role.get('viewdate');
        },
        isFavorite: function(){
            var role = this.get('userRole');
            return role.get('favorite');
        },
        _favoriteChange: function(favorite){
            favorite = !!favorite;
            if (favorite === this.isFavorite()){
                return;
            }
            var appInstance = this.appInstance,
                role = this.get('userRole');

            role.set('favorite', favorite);

            appInstance.taskFavorite(this.get('id'), favorite);
        },
        addToFavorite: function(){
            this._favoriteChange(true);
        },
        removeFromFavorite: function(){
            this._favoriteChange(false);
        },
        setReaded: function(){
            var appInstance = this.appInstance,
                role = this.get('userRole');

            role.set('readed', true);

            appInstance.taskReaded(this.get('id'));
        },
        isExpired: function(){

        },
        isInWorked: function(){

        },
        isClosed: function(){
            return this.get('status') === 'closed';
        },
        isArhived: function(){
            return this.get('status') === 'arhived';
        },
        isRemoved: function(){
            return this.get('status') === 'removed';
        },
        isNewComment: function(){
            if (this.get('type') === 'folder'){
                return false;
            }
            var stat = this.get('commentStatistic');
            if (!stat){
                return false;
            }
            return stat.get('lastid') > stat.get('viewid');
        },
        isChanged: function(){
            if (this.get('type') === 'folder'){
                return false;
            }
            var viewdate = this.get('userRole').get('viewdate');
            if (!viewdate){
                return;
            }
            return viewdate < this.get('updateDate');
        },
        isReaded: function(){
            if (this.get('type') === 'folder'){
                return false;
            }
            return this.get('userRole').get('readed');
        }
    }, {
        ATTRS: {
            author: {
                readOnly: true,
                getter: function(){
                    var userid = this.get('userid');
                    return this.appInstance.getApp('uprofile').get('userList').getById(userid);
                }
            },
            status: {
                getter: function(){
                    var val = this.get('iStatus');
                    return NS.Task.STATUS[val];
                },
                setter: function(val){
                    var iStatus = NS.Task.ISTATUS[val] | 0;
                    if (iStatus === 0){
                        return;
                    }
                    this.set('iStatus', iStatus);
                }
            },
            statusTitle: {
                readOnly: true,
                getter: function(){
                    return I18N.get('model.status.' + this.get('status'));
                }
            },
            type: {
                readOnly: true,
                getter: function(){
                    var val = this.get('iType');
                    return NS.Task.TYPE[val];
                }
            },
            priorityTitle: {
                readOnly: true,
                getter: function(){
                    return I18N.get('model.priority.' + this.get('priority'));
                }
            },
            parent: {
                readOnly: true,
                getter: function(){
                    var parentid = this.get('parentid');
                    return this.get('taskList').getById(parentid);
                }
            },
            taskList: {
                readOnly: true,
                getter: function(){
                    return this.appInstance.get('taskList');
                }
            },
            childs: {
                readOnly: true,
                getter: function(){
                    var childs = new NS.TaskList({
                        appInstance: this.appInstance
                    });
                    this.get('taskList').each(function(task){
                        if (task.get('parentid') === this.get('id')){
                            childs.add(task);
                        }
                    }, this);
                    return childs;
                }
            },
            userRole: {
                readOnly: true,
                getter: function(){
                    if (this._userRole){
                        return this._userRole;
                    }
                    this.get('users').each(function(userRole){
                        if (userRole.get('userid') === UID){
                            this._userRole = userRole;
                        }
                    }, this);
                    return this._userRole;
                }
            },
            userIds: {
                readOnly: true,
                getter: function(){
                    var users = {};
                    this.get('users').each(function(userRole){
                        var userid = userRole.get('userid') | 0;
                        users[userid] = users[userid] || {count: 0};
                        users[userid].count++;
                    }, this);

                    var ret = [];
                    for (var userid in users){
                        ret[ret.length] = userid;
                    }
                    return ret;
                }
            },
        },
        STATUS: {
            1: 'opened',
            2: 'reopened',
            3: 'closed',
            4: 'accepted',
            5: 'assigned',
            6: 'removed',
            7: 'arhived',
        },
        ISTATUS: {
            opened: 1,
            reopened: 2,
            closed: 3,
            accepted: 4,
            assigned: 5,
            removed: 6,
            arhived: 7,
        },
        TYPE: {
            1: 'folder',
            2: 'project',
            3: 'task'
        }
    });

    NS.TaskList = Y.Base.create('taskList', SYS.AppModelList, [], {
        appItem: NS.Task,
    }, {
        ATTRS: {
            userIds: {
                readOnly: true,
                getter: function(){
                    var users = {};
                    this.each(function(task){
                        var a = task.get('userIds');
                        for (var i = 0, userid; i < a.length; i++){
                            userid = a[i];
                            users[userid] = users[userid] || {count: 0};
                            users[userid].count++;
                        }
                    }, this);

                    var ret = [];
                    for (var userid in users){
                        ret[ret.length] = userid;
                    }
                    return ret;
                }
            },
            lastHistoryId: {value: 0}
        },
        COMPARE: {
            'default': function(tk1, tk2){ // сортировка: Наименьший срок, наивысший приоритет
                var v = sortClosed(tk1, tk2);
                if (v != 0){
                    return v;
                }

                return sortDCPD(tk1, tk2);
            },
            date: function(tk1, tk2){
                return sortDate(tk1.get('date'), tk2.get('date'));
            },
            dateDesc: function(tk1, tk2){
                return sortDateDesc(tk1.get('date'), tk2.get('date'));
            },
            updateDate: function(tk1, tk2){
                return sortDate(tk1.get('updateDate'), tk2.get('updateDate'));
            },
            updateDateDesc: function(tk1, tk2){
                return sortDateDesc(tk1.get('updateDate'), tk2.get('updateDate'));
            },

            deadline: function(tk1, tk2){
                return NS.TaskList.COMPARE.default(tk1, tk2);
            },
            deadlineDesc: function(tk1, tk2){
                return NS.TaskList.COMPARE.default(tk2, tk1);
            },
            title: function(tk1, tk2){
                var title1 = tk1.get('title'),
                    title2 = tk2.get('title');

                if (title1 == title2){
                    return 0;
                }
                return (title1 < title2) ? -1 : 1;
            },
            titleDesc: function(tk1, tk2){
                return NS.TaskList.COMPARE.title(tk2, tk1);
            },
            priority: function(tk1, tk2){

                var v = sortClosed(tk1, tk2);
                if (v != 0){
                    return v;
                }

                var v1 = tk1.get('priority'), v2 = tk2.get('priority');
                if (v1 < v2){
                    return -1;
                }
                if (v1 > v2){
                    return 1;
                }

                return 0;
            },
            priorityDesc: function(tk2, tk1){
                var v = sortClosed(tk2, tk1);
                if (v != 0){
                    return v;
                }

                var v1 = tk1.get('priority'), v2 = tk2.get('priority');
                if (v1 < v2){
                    return -1;
                }
                if (v1 > v2){
                    return 1;
                }
                return 0;
            },
            favorite: function(tk1, tk2){
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
            favoriteDesc: function(tk1, tk2){
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
            voting: function(tk1, tk2){
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
            votingDesc: function(tk1, tk2){
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
            /*
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
             /**/
        }
    });

    NS.UserRole = Y.Base.create('userRole', SYS.AppModel, [], {
        structureName: 'UserRole'
    }, {
        ATTRS: {
            user: {
                readOnly: true,
                getter: function(){
                    var userid = this.get('userid');
                    return this.appInstance.getApp('uprofile').get('userList').getById(userid);
                }
            }
        }
    });

    NS.UserRoleList = Y.Base.create('userRoleList', SYS.AppModelList, [], {
        appItem: NS.UserRole,
        getUserActivity: function(){
            var ret = {
                list: [],
                date: new Date(1970, 1, 1),
                userid: 0
            };
            this.each(function(role){
                var userid = role.get('userid'),
                    date = role.get('readdate');

                ret.list[ret.list.length] = {
                    uerid: userid,
                    date: date
                };

                if (userid !== UID && date && ret.date.getTime() < date.getTime()){
                    ret.date = date;
                    ret.userid = userid;
                }
            }, this);
            return ret;
        }
    });

    NS.Resolution = Y.Base.create('resolution', SYS.AppModel, [], {
        structureName: 'Resolution'
    }, {
        ATTRS: {
            user: {
                readOnly: true,
                getter: function(){
                    var userid = this.get('userid');
                    return this.appInstance.getApp('uprofile').get('userList').getById(userid);
                }
            }
        }
    });

    NS.ResolutionList = Y.Base.create('resolutionList', SYS.AppModelList, [], {
        appItem: NS.Resolution,
    });

    NS.ResolutionInTask = Y.Base.create('resolutionInTask', SYS.AppModel, [], {
        structureName: 'ResolutionInTask'
    });

    NS.ResolutionInTaskList = Y.Base.create('resolutionInTaskList', SYS.AppModelList, [], {
        appItem: NS.ResolutionInTask,
        getByUserId: function(userid){
            userid = (userid || UID);
            var resolutionList = this.appInstance.get('resolutionList'),
                ret = null;

            this.each(function(inTask){
                var resolution = resolutionList.getById(inTask.get('resolutionid'));

                if (resolution && resolution.get('userid') === userid){
                    ret = resolution;
                }
            }, this);

            return ret;
        }
    });

    NS.File = Y.Base.create('file', SYS.AppModel, [], {
        structureName: 'File'
    }, {
        ATTRS: {
            nm: {
                getter: function(){
                    return this.get('name');
                }
            },
            sz: {
                getter: function(){
                    return this.get('size');
                }
            },
        }
    });

    NS.FileList = Y.Base.create('fileList', SYS.AppModelList, [], {
        appItem: NS.File
    });

    NS.Image = Y.Base.create('image', SYS.AppModel, [], {
        structureName: 'Image'
    });

    NS.ImageList = Y.Base.create('imageList', SYS.AppModelList, [], {
        appItem: NS.Image,
    });

    NS.Check = Y.Base.create('check', SYS.AppModel, [], {
        structureName: 'Check',
        isRemoved: function(){
            return !!this.get('removeDate');
        }
    }, {
        ATTRS: {
            titleSrc: {
                getter: function(){
                    var str = this.get('title');
                    str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
                    str = str.replace(/<br \/>/gi, '\n');
                    str = str.replace(/<br\/>/gi, '\n');
                    str = str.replace(/<br>/gi, '\n');
                    return str;
                },
                setter: function(val){
                    val = val.replace(/</gi, '&lt;').replace(/>/gi, '&gt;').replace(/\n/gi, '<br />');
                    this.set('title', val);
                }
            }
        }
    });

    NS.CheckList = Y.Base.create('checkList', SYS.AppModelList, [], {
        appItem: NS.Check,
    });

    NS.History = Y.Base.create('history', SYS.AppModel, [], {
        structureName: 'History'
    }, {
        ATTRS: {
            status: {
                readOnly: true,
                getter: function(){
                    var val = this.get('iStatus');
                    return NS.Task.STATUS[val];
                }
            },
            parentStatus: {
                readOnly: true,
                getter: function(){
                    var val = this.get('iParentStatus');
                    return NS.Task.STATUS[val];
                }
            },
            isFirst: {
                readOnly: true,
                getter: function(){
                    var status = this.get('status'),
                        parentStatus = this.get('parentStatus');

                    return status === 'opened' && !parentStatus;
                }
            },
            action: {
                readOnly: true,
                getter: function(){
                    var status = this.get('status'),
                        parentStatus = this.get('parentStatus');

                    switch (status) {
                        case 'opened':
                            if (parentStatus === 'accepted'){
                                return 'unaccepted';
                            }
                            return parentStatus ? 'opened' : 'created';
                        case 'reopened':
                        case 'closed':
                        case 'accepted':
                        case 'removed':
                        case 'arhived':
                            return status;
                        default:
                            return 'changed';
                    }

                }
            },
            user: {
                readOnly: true,
                getter: function(){
                    var userid = this.get('userid');
                    return this.appInstance.getApp('uprofile').get('userList').getById(userid);
                }
            },
        }
    });

    NS.HistoryList = Y.Base.create('historyList', SYS.AppModelList, [], {
        appItem: NS.History,
    });

};
