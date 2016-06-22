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

    NS.TaskTableWidget = Y.Base.create('TaskTableWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            this.renderList();
        },
        destructor: function(){
        },
        _eachColumn: function(fn){
            var aviable = 'title,deadline,priority,favorite'.split(','),
                columns = this.get('columns'),
                name, isSort, isDesc;

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
            var tp = this.template,
                headCols = "",
                rows = "";

            this._eachColumn(function(name, isSort, isDesc){
                headCols += tp.replace('hcol' + name, {
                    sort: isSort ? '' : (isDesc ? 'sb' : 'sa')
                });
            });

            this.get('taskList').each(function(task){
                rows += this._buildRow(task);
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
                } else if (name === 'priority'){
                    lst += tp.replace('rcol' + name, {
                        prts: LNG['priority'][task.get('priority')]
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

        /*
         onClick: function(e){
         var node = e.defineTarget ? e.defineTarget : e.target,
         taskid = node.getData('id'),
         taskType = node.getData('type');

         switch (e.dataClick) {
         case 'sortname':
         this.sort('name');
         return true;
         case 'sortdeadline':
         this.sort('deadline');
         return true;
         case 'sortpriority':
         this.sort('priority');
         return true;
         case 'sortfavorite':
         this.sort('favorite');
         return true;
         case 'sortvoting':
         this.sort('voting');
         return true;
         case 'favorite':
         this.taskFavorite(taskid);
         return true;
         case 'itemView':
         return false;
         }
         },
         /**/
        sort: function(field){
            var cfg = NS.taskManager.userConfig,
                desc = cfg.tasksort == field;

            this.get('config')['tasksort'] = cfg.tasksort = field;
            this.get('config')['tasksortdesc'] = cfg['tasksortdesc'] = desc ? !cfg['tasksortdesc'] : false;

            NS.taskManager.userConfigSave();
            this.renderList();
        },
        taskFavorite: function(taskid){
            NS.taskManager.taskFavorite(taskid);
            var task = NS.taskManager.list.find(taskid);
            task.favorite = !task.favorite;
            this.renderList();
        },
        shChilds: function(taskid){
            var task = NS.taskManager.getTask(taskid);
            if (Y.Lang.isNull(task)){
                return;
            }
            var TM = this.t._TM;

            var elRow = Dom.get(TM.getElId('row.id') + '-' + taskid);
            if (Y.Lang.isNull(elRow)){
                return;
            }
            if (task.childs.count() == 0){
                Dom.removeClass(elRow, 'expanded');
                Dom.addClass(elRow, 'nochild');
                return;
            }
            NS.taskManager.taskExpand(taskid);
            task.expanded = !task.expanded;

            this.renderList();
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
                ',hcoltitle,hcoldeadline,hcolpriority,hcolfavorite,hcolvoting,hcolwork,hcolexec' +
                ',rcoltitle,rcoldeadline,rcolpriority,rcolfavorite,rcolvoting,rcolwork,rcolexec'
            },
            taskList: {
                value: null
            },
            columns: {
                value: 'title,deadline,priority,favorite,voting', // executant
                setter: function(val){
                    if (!Y.Lang.isString(val)){
                        return val;
                    }
                    var a = val.split(','),
                        ret = {
                            sort: 'date',
                            desc: false,
                            list: {}
                        };

                    for (var i = 0, name; i < a.length; i++){
                        name = Y.Lang.trim(a[i]);
                        if (name === ''){
                            continue;
                        }
                        ret.list[name] = {
                            visible: true
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
        },
        CLICKS: {
            sortTitle: {
                event: function(){
                    this._setSortByClick('title');
                }
            }
        }
    });

};