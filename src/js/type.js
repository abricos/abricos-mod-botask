var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.TypeSelectWidget = Y.Base.create('TypeSelectWidget', SYS.AppWidget, [], {
        buildTData: function(){
            return {
                parentTaskId: this.get('parentTaskId')
            };
        },
        onInitAppWidget: function(err, appInstance){
        },
        destructor: function(){
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            parentTaskId: {value: 0}
        },
        CLICKS: {},
        parseURLParam: function(args){
            args = args || [];
            return {
                parentTaskId: (args[0] | 0)
            };
        }
    });
};