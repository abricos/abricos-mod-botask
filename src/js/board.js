var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'botask', files: ['users.js', 'easylist.js', 'explore.js', 'history.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.BoardWidget = Y.Base.create('BoardWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){

            this.set('waiting', true);

            var instance = this;
            NS.buildTaskManager(function(){
                instance.onBuildTaskManager();
            });
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
                explore: this.wsw['explore'] = new NS.ExploreWidget(tp.gel('explore')),
                // easyList: new NS.EasyListWidget(tp.gel('easylist'), tp.gel('boxfav'))
            };

            /*
             this.wsw['teamUsers'] = new NS.TeamUserListWidget(tp.gel('teamusers'));
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