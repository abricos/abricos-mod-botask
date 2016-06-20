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

    var LNG = this.language['{C#COMNAME}'];

    NS.TeamUserListWidget = Y.Base.create('TeamUserListWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            this.renderWidget();
        },
        destructor: function(){
        },
        renderWidget: function(){
            var tp = this.template,
                appInstance = this.get('appInstance'),
                taskList = appInstance.get('taskList'),
                userIds = taskList.get('userIds');

            var lst = "";
            for (var i = 0; i < userIds.length; i++){
                var user = this.getUser(userIds[i]);
                lst += tp.replace('user', {
                    avatar: user.get('avatarSrc24'),
                    uid: user.get('id'),
                    unm: user.get('viewName')
                });
            }

            tp.setHTML({
                table: lst,
                cnt: userIds.length,
                tl: LNG['boxtitle']['all']
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
            this.renderWidget();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,user'},
        },
        CLICKS: {}
    });


};