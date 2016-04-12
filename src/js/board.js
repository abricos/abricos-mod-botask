var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['users.js', 'easylist.js', 'explore.js', 'history.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.BoardWidget = Y.Base.create('BoardWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){

            this.set('waiting', true);

            Brick.appFunc('user', 'userOptionList', '{C#MODNAME}', function(uErr, uRes){
                appInstance.boardData(0, function(err, res){
                    NS.taskManager = new NS.TaskManager(res.userOptionList, res.boardData);
                    this.onBuildTaskManager();
                }, this);
            }, this);
        },
        destructor: function(){
            var widgets = this._widgets;
            if (!widgets){
                return;
            }
            for (var n in widgets){
                widgets[n].destroy();
            }
            this._widgets = null;
        },
        onBuildTaskManager: function(){
            this.set('waiting', false);
            var tp = this.template;

            this._widgets = {
                explore: new NS.ExploreWidget({
                    srcNode: tp.gel('explore')
                }),
                teamUsers: new NS.TeamUserListWidget({
                    srcNode: tp.gel('teamusers')
                }),

                easyList: new NS.EasyListWidget({
                    srcNode: tp.gel('easylist'),
                    srcFavorite: tp.gel('boxfav')
                })
            };

            this._widgets.teamUsers.on('userSelectChangedEvent', this.onTeamUserSelectChanged, this);
        },
        onTeamUserSelectChanged: function(){
            var ws = this._widgets,
                userid = ws.teamUsers.selectedUserId;
            ws.explore.selectUser(userid);
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'}
        },
        CLICKS: {}
    });
};