var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['resolution.js', 'history.js']}
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.ExtInfo = Y.Base.create('ExtInfo', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                task = this.get('task');

            this.historyWidget = new NS.HistoryWidget({
                srcNode: tp.one('history'),
                task: task,
            });

            this.custatusWidget = new NS.ResolutionWidget({
                srcNode: tp.one('custatus'),
                task: task
            });
        },
        destructor: function(){
            this.historyWidget.destroy();
            this.custatusWidget.destroy();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'extinfo'},
            task: {}
        },
        CLICKS: {},
    });

};