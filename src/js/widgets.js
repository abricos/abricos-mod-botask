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

    NS.TaskTreeSelectWidget = Y.Base.create('TaskTreeSelectWidget', SYS.AppWidget, [], {
        buildTData: function(){
            var tp = this.template,
                taskid = this.get('taskid');

            // путь
            var getPT = function(task){
                var tl = task.get('title'),
                    parent = task.get('parent');
                if (parent){
                    tl = getPT(parent) + " / " + tl;
                }
                return tl;
            };
            
            var isChild = function(task){
                if (task.get('id') == taskid){
                    return true;
                }
                var parent = task.get('parent');
                if (parent){
                    return isChild(parent);
                }
                return false;
            };

            var lst = "";

            NS.appInstance.get('taskList').each(function(task){
                var parent = task.get('parent');

                if (!parent && task.get('parentid') > 0){
                    return;
                }
                if (task.isClosed() || task.isRemoved() || task.isArhived()){
                    return;
                }
                if (task.get('id') == taskid || isChild(task)){
                    return;
                }
                lst += tp.replace('node', {
                    'id': task.get('id'),
                    'tl': getPT(task)
                });
            }, this, NS.TaskList.COMPARE.title);

            return {'rows': lst};
        },
        onInitAppWidget: function(err, appInstance){
            this.setValue(this.get('parentTaskId'));
        },
        setValue: function(val){
            this.template.setValue('id', val);
        },
        getValue: function(){
            return this.template.getValue('id');
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'tree,node'},
            taskid: {value: 0},
            parentTaskId: {value: 0}
        },
        CLICKS: {},
    });
};