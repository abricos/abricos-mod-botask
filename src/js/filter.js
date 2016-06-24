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

    NS.FilterByCustomStatusWidget = Y.Base.create('FilterByCustomStatusWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt,
        NS.UProfileWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                isUsers = {},
                lstUsers = "";

            appInstance.get('resolutionList').each(function(resolution){
                var user = resolution.get('user');
                if (!user || isUsers[user.get('id')]){
                    return;
                }
                isUsers[user.get('id')] = true;

                lstUsers += tp.replace('option', {
                    id: user.get('id'),
                    title: user.get('viewName')
                });

            }, this);

            tp.setHTML({
                users: lstUsers
            });

            this._renderStatusList();

            tp.one('users').on('change', this._renderStatusList, this);

            var instance = this;
            this.addWidget('list', new NS.TaskListBoxWidget({
                srcNode: tp.gel('listWidget'),
                columns: 'title,favorite',
                boxTitle: this.language.get('boxTitle'),
                filterFn: function(task){
                    return instance._checkTask(task);
                }
            }));
        },
        destructor: function(){
            var tp = this.template;
            tp.one('users').detachAll();
        },
        _renderStatusList: function(){
            var tp = this.template,
                userid = tp.getValue('users') | 0,
                lst = "";

            this.get('appInstance').get('resolutionList').each(function(resolution){
                if (resolution.get('userid') !== userid){
                    return;
                }
                lst += tp.replace('option', {
                    id: resolution.get('id'),
                    title: resolution.get('title')
                });
            }, this);

            tp.setHTML({
                resolutions: lst
            });
        },
        _applyFilter: function(){
            this.getWidget('list').renderList();
        },
        _checkTask: function(task){
            var tp = this.template,
                resolutionid = tp.getValue('resolutions') | 0,
                find = false;

            task.get('resolutions').some(function(resolutionInTask){
                if (resolutionInTask.get('resolutionid') === resolutionid){
                    return find = true;
                }
            }, this);

            return find;
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,option'},
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