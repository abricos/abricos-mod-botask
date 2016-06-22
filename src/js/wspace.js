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
                this.set('waiting', false);

                this.addWidget('explore', new NS.ExploreWidget({
                    srcNode: tp.gel('explore')
                }));

                this.addWidget('teamUsers', new NS.TeamUserListWidget({
                    srcNode: tp.gel('teamusers')
                }));

                this.showWorkspacePage(!wsPage.isEmpty() ? wsPage : null);
            }, this);
        },
        destructor: function(){
        },
        renderWidget: function(){

            var tp = this.template,
                favoriteCount = 0,
                newCount = 0,
                changedCount = 0,
                newCommentCount = 0;

            this.get('appInstance').get('taskList').each(function(task){
                if (task.get('type') === 'folder'){
                    return;
                }

                newCount += task.isNew() ? 1 : 0;

            }, this);

            tp.setHTML({
                favoriteCount: favoriteCount,
                newCount: newCount,
                changedCount: changedCount,
                newCommentCount: newCommentCount
            });
        }
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
