var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['itemEdit.js']},
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.ProjectEditorWidget = Y.Base.create('ProjectEditorWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt,
        NS.TaskWidgetExt,
        SYS.WidgetEditorStatus,
        NS.ItemEditWidgetExt,
    ], {}, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            parentid: {value: 0},
            itemType: {value: 'project'},
            isEdit: {
                getter: function(){
                    return (this.get('taskid') | 0) > 0
                }
            }
        },
        parseURLParam: function(args){
            args = args || [];
            return {
                taskid: (args[0] | 0),
                parentid: (args[1] | 0)
            };
        }
    });
};