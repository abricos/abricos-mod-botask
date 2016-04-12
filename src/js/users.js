var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    // var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}', '{C#COMNAME}']);
    var LNG = this.language['{C#COMNAME}'];

    NS.TeamUserListWidget = Y.Base.create('TeamUserListWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            this.selectedUserId = null;
            this.filter = null;
            this._users = [];

            this.publish('userSelectChangedEvent');

            this.renderWidget();
        },
        destructor: function(){
        },
        renderWidget: function(){
            var tp = this.template,
                users = {},
                isFilter = !Y.Lang.isNull(this.filter);

            var fetchUsers = function(tk){
                for (var i = 0; i < tk.users.length; i++){
                    var uid = tk.users[i] | 0;
                    users[uid] = !users[uid] ? 1 : users[uid] + 1;
                }
            };

            if (!isFilter){
                NS.taskManager.list.foreach(function(tk){
                    fetchUsers(tk);
                }, false);
            } else {
                fetchUsers(this.filter);
            }

            var a = [];
            for (var n in users){
                if (isFilter || (!isFilter && Brick.env.user.id * 1 != n * 1)){
                    a[a.length] = {uid: n, 'count': users[n]};
                }
            }
            a = a.sort(function(u1, u2){
                if (u1.count > u2.count){
                    return -1;
                }
                if (u1.count < u2.count){
                    return 1;
                }
                return 0;
            });
            this._users = a;

            var lst = "";
            for (var i = 0; i < a.length; i++){
                var user = NS.taskManager.users.get(a[i]['uid']);
                lst += tp.replace('user', {
                    avatar: user.get('avatarSrc24'),
                    uid: user.get('id'),
                    unm: user.get('viewName')
                });
            }

            tp.setHTML({
                table: lst,
                cnt: a.length,
                tl: LNG['boxtitle'][isFilter ? 'filter' : 'all']
            });

            tp.toggleView(lst === "", 'empty');
        },
        onClick: function(e){
            var tp = this.template,
                node = e.defineTarget ? e.defineTarget : e.target,
                id = node.getData('id') | 0,
                inputNode = tp.one('user.intask-' + id);

            if (!inputNode){
                return false;
            }

            var checked = inputNode.get('checked');

            if (e.dataClick === 'selectUserByCheck'){
                this.selectUser(checked ? id : null);
                return false;
            } else {
                this.selectUser(!checked ? id : null);
            }

            return true;
        },
        selectUser: function(userid){
            userid = userid | 0;

            if (this.selectedUserId === userid){
                return;
            }

            var tp = this.template,
                a = this._users;

            for (var i = 0; i < a.length; i++){
                var uid = a[i]['uid'] | 0,
                    elCheck = tp.one('user.intask-' + uid);

                elCheck.set('checked', uid === userid);
            }

            this.selectedUserId = userid;
            this.fire('userSelectChangedEvent', userid);
        },
        setFilter: function(task){
            this.selectUser(null);
            this.filter = task;
            this.renderWidget();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,user'},
            config: {}
        },
        CLICKS: {}
    });


};