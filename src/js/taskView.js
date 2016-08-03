var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['itemView.js']},
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.TaskViewWidget = Y.Base.create('TaskViewWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt,
        NS.TaskWidgetExt,
        NS.UProfileWidgetExt,
        NS.ItemViewWidgetExt
    ], {}, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'panel,user,empty'},
        },
        CLICKS: {
            taskFavorite: 'taskFavorite'
        },
        parseURLParam: function(args){
            args = args || [];
            return {
                taskid: (args[0] | 0)
            };
        }
    });
};