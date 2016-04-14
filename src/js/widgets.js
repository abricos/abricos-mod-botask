var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var buildTemplate = this.buildTemplate;

    var TaskTreeSelectWidget = function(container, taskid, ptaskid){
        this.init(container, taskid, ptaskid);
    };
    TaskTreeSelectWidget.prototype = {
        init: function(container, taskid, ptaskid){
            var TM = buildTemplate(this, 'tree,node');

            // путь
            var getPT = function(tk){
                var tl = tk.title;
                if (!Y.Lang.isNull(tk.parent)){
                    tl = getPT(tk.parent) + " / " + tl;
                }
                return tl;
            };
            var isChild = function(tk){
                if (tk.id == taskid){
                    return true;
                }
                if (!Y.Lang.isNull(tk.parent)){
                    return isChild(tk.parent);
                }
                return false;
            };

            var lst = "";
            NS.taskManager.list.foreach(function(tk){
                if (Y.Lang.isNull(tk.parent) && tk.parentTaskId > 0){
                    return;
                }
                if (tk.isClosed() || tk.isRemoved() || tk.isArhive()){
                    return;
                }
                if (tk.id == taskid || isChild(tk)){
                    return;
                }
                lst += TM.replace('node', {
                    'id': tk.id,
                    'tl': getPT(tk)
                });
            }, false, NS.taskSort['name']);

            container.innerHTML = TM.replace('tree', {'rows': lst});
            this.setValue(ptaskid);
        },
        setValue: function(taskid){
            this._TM.getEl('tree.id').value = taskid || 0;
        },
        getValue: function(){
            return this._TM.getEl('tree.id').value;
        }
    };
    NS.TaskTreeSelectWidget = TaskTreeSelectWidget;
};