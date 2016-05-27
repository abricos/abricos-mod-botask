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
        onBuildTData: function(){
            var tp = this.template,
                taskid = this.get('taskid');

            // путь
            var getPT = function(tk){
                var tl = tk.title;
                if (tk.parent){
                    tl = getPT(tk.parent) + " / " + tl;
                }
                return tl;
            };
            var isChild = function(tk){
                if (tk.id == taskid){
                    return true;
                }
                if (tk.parent){
                    return isChild(tk.parent);
                }
                return false;
            };

            var lst = "";
            NS.taskManager.list.foreach(function(tk){
                if (!tk.parent && tk.parentTaskId > 0){
                    return;
                }
                if (tk.isClosed() || tk.isRemoved() || tk.isArhive()){
                    return;
                }
                if (tk.id == taskid || isChild(tk)){
                    return;
                }
                lst += tp.replace('node', {
                    'id': tk.id,
                    'tl': getPT(tk)
                });
            }, false, NS.taskSort['name']);

            return tp.replace('tree', {'rows': lst});
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