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
        SYS.AppWorkspace,
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var wsPage = new SYS.AppWorkspacePage(options.arguments[0].workspacePage),
                tp = this.template;

            this.set('waiting', true);

            appInstance.taskList(function(err, res){

                appInstance.boardData(0, function(err, res){
                    this.set('waiting', false);

                    NS.taskManager = new NS.TaskManager(res.boardData);

                    this.addWidget('explore', new NS.ExploreWidget({
                        srcNode: tp.gel('explore')
                    }));

                    this.addWidget('teamUsers', new NS.TeamUserListWidget({
                        srcNode: tp.gel('teamusers')
                    }));

                    this.showWorkspacePage(!wsPage.isEmpty() ? wsPage : null);
                }, this);
            }, this);
        },
        destructor: function(){
            // this.get('appInstance').detach('appResponses', this._onAppResponses, this);
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
