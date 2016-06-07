var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['easylist.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var LNG = this.language['{C#COMNAME}'];

    NS.FilterByCustomStatusWidget = Y.Base.create('FilterByCustomStatusWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt,
        NS.UProfileWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance){
            this.set('waiting', true);
            appInstance.customStatusFullList(function(err, result){
                this.set('waiting', false);
                if (err){
                    return;
                }
                this.set('statuses', result.customStatusFullList);
                this._onLoadStatusesList();
            }, this);
        },
        _onLoadStatusesList: function(){
            var instance = this,
                tp = this.template,
                isUsers = {},
                lstUsers = "";

            NS.taskManager.list.foreach(function(tk){
                for (var i = 0; i < tk.users.length; i++){
                    var userid = tk.users[i] | 0;
                    if (isUsers[userid]){
                        continue;
                    }
                    isUsers[userid] = true;
                    var user = instance.getUser(userid);
                    if (!user){
                        continue;
                    }

                    lstUsers += tp.replace('option', {
                        id: userid,
                        title: user.get('viewName')
                    });
                }
            }, false);

            tp.setHTML({
                users: lstUsers
            });

            this._renderStatusList();

            tp.one('users').on('change', this._renderStatusList, this);

            this.addWidget('list', new NS.TaskListBoxWidget({
                    srcNode: tp.gel('listWidget'),
                    taskList: NS.taskManager.list,
                    config: {
                        sortclick: false,
                        columns: 'name,favorite',
                        childs: false,
                        globalsort: true,
                        showflagnew: false,
                        boxtitle: LNG.boxtitle,
                        funcfilter: function(tk){
                            return instance._checkTask(tk);
                        }
                    }
                })
            );

            this._applyFilter();
        },
        destructor: function(){
            var tp = this.template;
            tp.one('users').detachAll();
        },
        _renderStatusList: function(){
            var tp = this.template,
                userid = tp.getValue('users') | 0,
                statuses = this.get('statuses'),
                lst = "";

            for (var i = 0, stat; i < statuses.length; i++){
                stat = statuses[i];
                stat.uid = stat.uid | 0;
                if (stat.uid !== userid){
                    continue;
                }
                lst += tp.replace('option', {
                    id: stat.tl,
                    title: stat.tl
                });
            }
            tp.setHTML({
                statuses: lst
            });
        },
        _applyFilter: function(){
            var tp = this.template,
                userid = tp.getValue('users') | 0,
                status = tp.getValue('statuses'),
                statuses = this.get('statuses'),
                tasks = {};

            for (var i = 0, sti; i < statuses.length; i++){
                sti = statuses[i];
                if ((sti.uid | 0) === userid && status === sti.tl){
                    tasks[sti.tid | 0] = true;
                }
            }
            this._filterTasks = tasks;

            this.getWidget('list').renderList();
        },
        _checkTask: function(tk){
            return this._filterTasks && this._filterTasks[tk.id|0];
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,option'},
            statuses: {value: null}
        },
        CLICKS: {
            applyFilter: '_applyFilter'
        },
        parseURLParam: function(args){
            args = args || [];
            return {
                userid: (args[0] | 0)
            };
        }
    });
};