var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: '{C#MODNAME}', files: ['history.js', 'lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var LNG = this.language;

    NS.TaskTableWidget = Y.Base.create('TaskTableWidget', SYS.AppWidget, [
        NS.AppResponsesHelperExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            this.publish('renderList');

            this.renderList();

            this.bindResponsesEvent();
        },
        onTaskUpdated: function(){
            this.renderList();
        },
        _eachColumn: function(fn){
            var aviable = 'title,deadline,priority,updateDate,readDate,favorite'.split(','),
                columns = this.get('columns'),
                name, isSort;

            for (var i = 0; i < aviable.length; i++){
                name = aviable[i];

                if (!columns.list[name] || !columns.list[name].visible){
                    continue;
                }
                isSort = columns.sort !== name;

                fn.call(this, name, isSort, columns.desc);
            }
        },
        renderList: function(){
            this._renderList();
            this.fire('renderList', {
                renderRowsCount: this.get('renderRowsCount')
            });
        },
        _renderList: function(){
            this._renderRowsCount = 0;

            var tp = this.template,
                headCols = "",
                rows = "";

            this._eachColumn(function(name, isSort, isDesc){
                headCols += tp.replace('hcol' + name, {
                    sort: isSort ? '' : (isDesc ? 'sb' : 'sa')
                });
            });

            var filterFn = this.get('filterFn');
            filterFn = Y.Lang.isFunction(filterFn) ? filterFn : function(){
                return true;
            };

            this.get('taskList').each(function(task){
                if (!filterFn.call(this, task)){
                    return;
                }

                rows += this._buildRow(task);
                this._renderRowsCount++;
            }, this, this.get('compareFn'));


            tp.setHTML({
                table: tp.replace('table', {
                    cols: headCols,
                    rows: rows
                })
            });

            this.appURLUpdate();
        },
        _buildRow: function(task){
            var tp = this.template,
                author = task.get('author'),
                val,
                lst = "";

            this._eachColumn(function(name, isSort, isDesc){
                if (name === 'title'){
                    lst += tp.replace('rcol' + name, {
                        id: task.get('id'),
                        type: task.get('type'),
                        aunm: !author ? 'null' : author.get('viewName'),
                        tl: task.get('title') == "" ? LNG['nottitle'] : task.get('title'),
                        dl: Brick.dateExt.convert(task.get('date')),
                        udl: Brick.dateExt.convert(task.get('updateDate'))
                    });
                } else if (name === 'deadline'){
                    lst += tp.replace('rcol' + name, {
                        'ddl': this.get('deadline') ? Brick.dateExt.convert(task.get('deadline').getTime() / 1000, 0, !task.get('deadlineTime')) : ""
                    });
                } else if (name === 'updateDate'){
                    val = task.get('updateDate');
                    lst += tp.replace('rcol' + name, {
                        'updateDate': val ? Brick.dateExt.convert(val.getTime() / 1000) : ""
                    });
                } else if (name === 'readDate'){
                    val = task.get('userRole').get('readdate');
                    lst += tp.replace('rcol' + name, {
                        'readDate': val ? Brick.dateExt.convert(val) : LNG.tasklist.notReaded
                    });
                } else if (name === 'priority'){
                    lst += tp.replace('rcol' + name, {
                        prts: task.get('priorityTitle')
                    });
                } else if (name === 'favorite'){
                    lst += tp.replace('rcol' + name, {
                        id: task.get('id'),
                        fav: task.get('favorite') ? 'fav-checked' : ''
                    });
                } else if (name === 'voting'){
                    lst += tp.replace('rcol' + name, {
                        id: task.get('id'),
                        fav: task.favorite ? 'fav-checked' : '',
                        // ord: n != 0 ? ((n > 0 ? '+' : '') + n) : '&mdash;'
                    });
                }
            });

            return tp.replace('row', {
                id: task.get('id'),
                prt: task.get('priority'),
                expired: task.isExpired() ? 'expired' : '',
                closed: task.isClosed() ? 'closed' : '',
                removed: task.isRemoved() ? 'removed' : '',
                tl: task.get('title') == "" ? LNG['nottitle'] : task.get('title'),
                aunm: !author ? 'null' : author.get('viewName'),
                auid: !author ? 'null' : author.get('id'),
                cols: lst
            });

            /*
             if (enCols['executant']){
             var sExec = "";
             if (task.get('isInWorked') && task.stUserId * 1 > 0){
             var exec = NS.taskManager.users.get(task.stUserId);
             sExec = exec.getUserName();
             }
             sCols += tp.replace('rcolexec', {
             'exec': sExec
             });
             }

             if (enCols['work']){
             var hr = '';

             if (!Y.Lang.isNull(task.work)){
             if (cfg['workuserid'] * 1 > 0){
             var ti = task.work.users[cfg['workuserid']];
             if (ti){
             hr = ti['sm'];
             }
             } else {
             hr = task.work.seconds;
             }
             }

             var shr = '',
             ahr = [];
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

             sCols += tp.replace('rcolwork', {
             'work': shr
             });
             }

             return sRow;
             /**/
        },

        _isHistoryChanged: function(list, ids){
            var instance = this, find = false;
            list.foreach(function(task){
                for (var id in ids){
                    if (task.get('id') * 1 == id * 1){
                        find = true;
                        return true;
                    }
                }
                if (task.childs.count() > 0 && task.expanded){
                    if (instance._isHistoryChanged(task.childs, ids)){
                        find = true;
                        return true;
                    }
                }
            }, true);
            return find;
        },
        _setSortByClick: function(name){
            var columns = this.get('columns');
            if (columns.sort === name){
                columns.desc = !columns.desc;
            } else {
                columns.sort = name;
                columns.desc = false;
            }
            this.renderList();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {
                value: 'widget,table,row' +
                ',hcoltitle,hcoldeadline,hcolpriority,hcolfavorite,hcolvoting,hcolwork,hcolexec,hcolupdateDate,hcolreadDate' +
                ',rcoltitle,rcoldeadline,rcolpriority,rcolfavorite,rcolvoting,rcolwork,rcolexec,rcolupdateDate,rcolreadDate'
            },
            taskList: {value: null},
            filterFn: {value: null},
            columns: {
                value: 'title|sort=asc,deadline,priority,favorite,voting', // executant
                setter: function(val){
                    if (!Y.Lang.isString(val)){
                        return val;
                    }
                    var a = val.split(','),
                        ret = {
                            sort: 'title',
                            desc: false,
                            list: {}
                        };

                    for (var i = 0, name, pa, paa, ii; i < a.length; i++){
                        name = Y.Lang.trim(a[i]);
                        if (name === ''){
                            continue;
                        }
                        pa = name.split('|');
                        name = pa[0];
                        ret.list[name] = {
                            visible: true
                        };
                        for (ii = 1; ii < pa.length; ii++){
                            paa = pa[ii].split('=');
                            if (paa.length > 1 && paa[0] === 'sort'){
                                if (paa[0] === 'sort'){
                                    ret.sort = name;
                                }
                            }
                        }
                    }
                    return ret;
                }
            },
            compareFn: {
                readOnly: true,
                getter: function(){
                    var columns = this.get('columns'),
                        compareName = columns.sort;

                    if (columns.desc){
                        compareName += 'Desc';
                    }

                    return NS.TaskList.COMPARE[compareName];
                }
            },
            renderRowCount: {
                readOnly: true,
                getter: function(){
                    return this._renderRowsCount;
                }
            }
        },
        CLICKS: {
            sortTitle: {
                event: function(){
                    this._setSortByClick('title');
                }
            },
            sortFavorite: {
                event: function(){
                    this._setSortByClick('favorite');
                }
            },
            sortUpdateDate: {
                event: function(){
                    this._setSortByClick('updateDate');
                }
            },
            sortReadDate: {
                event: function(){
                    this._setSortByClick('readDate');
                }
            },
            favorite: {
                event: function(e){
                    var appInstance = this.get('appInstance'),
                        taskid = e.defineTarget.getData('id'),
                        task = this.get('taskList').getById(taskid),
                        userRole = task.get('userRole'),
                        favorite = !userRole.get('favorite');

                    userRole.set('favorite', favorite);

                    appInstance.taskFavorite(taskid, favorite);

                    this.renderList();
                }
            }
        }
    });

};