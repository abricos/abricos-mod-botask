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
    ], {
        old_renderTask: function(){
            var tp = this.template,
                taskid = this.get('taskid'),
                task = this.get('appInstance').get('taskList').getById(taskid);

            tp.show('bimgsave');


            // закрыть все кнопки, открыть те, что соответсуют статусу задачи
            tp.hide('bopen,beditor,bremove,brestore,barhive');

            // статус
            switch (task.get('status')) {
                case 'opened':
                case 'reopened':
                    tp.show('bremove');
                    break;
                case 'accepted':
                    tp.show('bremove');
                    break;
                case 'removed':
                    tp.show('brestore');
                    break;
            }

            // показать прикрепленные файлы
            // this.getWidget('attacheFiles').setFiles(task.files);
            // tp.toggleView(task.files.length > 0, 'files');

        },

        onCanvasChanged: function(type, args){
            this.template.show('bimgsave');
        },
        onHistoryChanged: function(type, args){
            var history = args[0];

            var task = this.get('task'), isRTask = false;
            history.foreach(function(item){
                if (item.taskid == task.id){
                    isRTask = true;
                    return true;
                }
            });
            if (isRTask){
                this.renderTask();
            }
        },
        onUserConfigChanged: function(type, args){
            this.renderTask();
        },

        taskFavorite: function(){
        },
        taskRemove: function(){
            new NS.ProjectRemovePanel(this.get('task').id, function(){
                NS.navigator.taskHome();
            });
        },
        taskRestore: function(){
            var instance = this;
            this._shLoading(true);
            NS.taskManager.taskRestore(this.get('task').id, function(){
                instance._shLoading(false);
            });
        },
        taskArhive: function(){
            var instance = this;
            this._shLoading(true);
            NS.taskManager.taskArhive(this.get('task').id, function(){
                instance._shLoading(false);
            });
        },
        taskOpen: function(){ // открыть задачу повторно
            var instance = this;
            this._shLoading(true);
            NS.taskManager.taskOpen(this.get('task').id, function(){
                instance._shLoading(false);
            });
        },
        saveImages: function(){
            this._shLoading(true);
            var newdata = {
                'onlyimage': true,
                'images': this.drawListWidget.toSave()
            };
            var instance = this;
            NS.taskManager.taskSave(this.get('task'), newdata, function(){
                instance._shLoading(false);
            });
        },
    }, {
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