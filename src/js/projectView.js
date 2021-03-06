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

    var aTargetBlank = function(el){
        if (el.tagName == 'A'){
            el.target = "_blank";
        } else if (el.tagName == 'IMG'){
            el.style.maxWidth = "100%";
            el.style.height = "auto";
        }
        var chs = el.childNodes;
        for (var i = 0; i < chs.length; i++){
            if (chs[i]){
                aTargetBlank(chs[i]);
            }
        }
    };

    NS.ProjectViewWidget = Y.Base.create('ProjectViewWidget', SYS.AppWidget, [
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