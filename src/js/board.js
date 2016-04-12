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

                // easyList: new NS.EasyListWidget(tp.gel('easylist'), tp.gel('boxfav'))
            };

            /*
             this.wsw['teamUsers'].userSelectChangedEvent.subscribe(this.onTeamUserSelectChanged, this, true);
             /**/
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'}
        },
        CLICKS: {}
    });
};