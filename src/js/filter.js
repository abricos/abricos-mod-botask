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
                            return true;
                        }
                    }
                })
            );
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
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,option'},
            statuses: {value: null}
        },
        CLICKS: {},
        parseURLParam: function(args){
            args = args || [];
            return {
                userid: (args[0] | 0)
            };
        }
    });

    return;

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    // var UID = Brick.env.user.id;
    var LNG = this.language;

    var buildTemplate = this.buildTemplate;

    var CustatusSelectWidget = function(container, stats){
        this.init(container, stats);
    };
    CustatusSelectWidget.prototype = {
        init: function(container, stats){
            this.container = container;
            this.stats = stats;
            this.userid = 0;

            buildTemplate(this, 'sel,opt');
            this.setUserId(0);
        },
        setUserId: function(userid){
            this.userid = userid;
            this.render();
        },
        render: function(){
            var TM = this._TM, lst = "";
            var st = this.stats[this.userid] || {}, dict = {};

            lst += TM.replace('opt', {'id': '', 'v': ''});

            for (var tid in st){
                var ph = st[tid];

                if (ph.length == 0 || dict[ph]){
                    continue;
                }
                dict[ph] = true;

                lst += TM.replace('opt', {
                    'id': ph,
                    'v': ph
                });
            }
            this.container.innerHTML = TM.replace('sel', {
                'rows': lst
            });
            this.ustat = st;
        },
        chickTask: function(tk){
            var ph = this._TM.getEl('sel.id').value;
            var st = this.ustat;
            for (var tid in st){
                if (tk.id == tid && st[tid] == ph){
                    return true;
                }
            }

            return false;
        }
    };

    var FRowWidget = function(container, stats, callback){
        this.init(container, stats, callback);
    };
    FRowWidget.prototype = {
        init: function(container, stats, callback){
            var TM = buildTemplate(this, 'frow,sel,opt'),
                __self = this, lst = "";

            for (var uid in stats){
                var user = NS.taskManager.users.get(uid);
                lst += TM.replace('opt', {
                    'v': user.get('viewName'),
                    'id': user.get('id')
                });
            }

            container.innerHTML = TM.replace('frow', {
                'users': TM.replace('sel', {'rows': lst})
            });

            this.statSelectWidget = new CustatusSelectWidget(TM.getEl('frow.stats'), stats);

            E.on(TM.getEl('sel.id'), 'change', function(e){
                __self.onUserChange();
            });
            this.rebuildStatList();
        },
        onUserChange: function(){
            this.rebuildStatList();
        },
        setUserId: function(userid){
            this._TM.getEl('sel.id').value = userid;
        },
        getUserId: function(){
            return this._TM.getEl('sel.id').value;
        },
        rebuildStatList: function(){
            var uid = this.getUserId();
            this.statSelectWidget.setUserId(uid);
        },
        checkTask: function(tk){
            return this.statSelectWidget.chickTask(tk);
        }
    };


    var FilterWidget = function(container, sts){
        this.init(container, sts);
    };
    FilterWidget.prototype = {
        init: function(container, sts){
            if (!L.isArray(sts)){
                sts = [];
            }
            var TM = buildTemplate(this, 'widget'), gel = function(n){
                return TM.getEl('widget.' + n);
            };
            container.innerHTML = TM.replace('widget');

            var susers = {};
            for (var i = 0; i < sts.length; i++){
                var uid = sts[i]['uid'];
                var su = susers[uid];
                if (!su){
                    su = susers[uid] = {};
                }
                su[sts[i]['tid']] = sts[i]['tl'];
            }

            var myFRow = this.myFRow = new FRowWidget(gel('my'), susers);

            this.listWidget = new NS.TaskListBoxWidget(gel('list'), NS.taskManager.list, {
                'columns': 'name,favorite,voting',
                'globalsort': true,
                'tasksort': 'udate',
                'childs': false,
                'showflagnew': false,
                'boxtitle': LNG['easylist']['boxtitle']['filter'],
                'funcfilter': function(tk){
                    return myFRow.checkTask(tk);
                }
            });

            var __self = this;
            E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });
        },

    };
    NS.FilterWidget = FilterWidget;
};