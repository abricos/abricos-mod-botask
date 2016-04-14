var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['users.js', 'explore.js', 'history.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.WorkspaceWidget = Y.Base.create('workspaceWidget', SYS.AppWidget, [
        SYS.AppWorkspace
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var wsPage = new SYS.AppWorkspacePage(options.arguments[0].workspacePage);

            this.set('waiting', true);

            Brick.appFunc('user', 'userOptionList', '{C#MODNAME}', function(uErr, uRes){
                appInstance.boardData(0, function(err, res){

                    NS.taskManager = new NS.TaskManager(res.userOptionList, res.boardData);

                    this._onBuildTaskManager();

                    // appInstance.on('appResponses', this._onAppResponses, this);
                    // this.on('workspaceWidgetChange', this._updateSelectedGroup, this);

                    this.showWorkspacePage(!wsPage.isEmpty() ? wsPage : null);
                }, this);
            }, this);
        },
        destructor: function(){
            // this.get('appInstance').detach('appResponses', this._onAppResponses, this);

            var widgets = this._widgets;
            if (widgets){
                for (var n in widgets){
                    widgets[n].destroy();
                }
                this._widgets = null;
            }
        },
        _onBuildTaskManager: function(){
            this.set('waiting', false);
            var tp = this.template;

            this._widgets = {
                explore: new NS.ExploreWidget({
                    srcNode: tp.gel('explore')
                }),
                teamUsers: new NS.TeamUserListWidget({
                    srcNode: tp.gel('teamusers')
                }),
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
            templateBlockName: {value: 'widget'},
            defaultPage: {
                value: {
                    component: 'easylist',
                    widget: 'EasyListWidget'
                }
            }
        }
    });

    NS.ws = SYS.AppWorkspace.build('{C#MODNAME}', NS.WorkspaceWidget);

};
