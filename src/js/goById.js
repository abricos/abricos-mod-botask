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

    NS.GoByIdWidget = Y.Base.create('GoByIdWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
        },
        destructor: function(){
        },
        _goClick: function(){
            var tp = this.template,
                app = this.get('appInstance'),
                number = tp.getValue('number') | 0,
                task = app.get('taskList').getById(number);

            tp.toggleView(!task, 'error');
            tp.setHTML('numberView', number);

            if (!task){
                return;
            }

            this.go(task.get('type') + '.view', number);
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
        },
        CLICKS: {
            go: '_goClick'
        },
    });
};