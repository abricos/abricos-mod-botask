var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['tasklist.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var LNG = this.language['{C#COMNAME}'];

    NS.TaskListBoxWidget = Y.Base.create('TaskListBoxWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template,
                config = this.get('config');

            tp.setHTML({
                tl: this.get('boxTitle')
            });

            var tableWidget = this.addWidget('table', new NS.TaskTableWidget({
                srcNode: tp.one('table'),
                taskList: this.get('taskList'),
                columns: this.get('columns'),
                filterFn: this.get('filterFn'),
            }));

            var countRows = tableWidget.get('renderRowCount');

            tp.toggleView(countRows > 0, 'tlist', 'empty');
            tp.toggleView(true, 'countlabel');
            tp.setHTML({
                cnt: countRows
            });

        },
        renderList: function(){
            this.get('table').renderList();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'boxitem'},
            boxTitle: {value: ""},
            taskList: {value: null},
            columns: 'title,favorite',
            filterFn: {value: null},
        },
        CLICKS: {},
    });

    NS.EasyListWidget = Y.Base.create('EasyListWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template,
                taskList = appInstance.get('taskList');

            this.addWidget('tasknew', new NS.TaskListBoxWidget({
                srcNode: tp.gel('boxnew'),
                taskList: taskList,
                boxTitle: LNG['boxtitle']['new'],
                columns: 'title,favorite',
                filterFn: function(task){
                    return task.isNew();
                },
            }));

            this.addWidget('cmtnew', new NS.TaskListBoxWidget({
                srcNode: tp.gel('boxcmt'),
                taskList: taskList,
                boxTitle: LNG['boxtitle']['comment'],
                columns: 'title,favorite',
                filterFn: function(task){
                    // return task.isNewCmt && !task.isNew;
                }
            }));

            this.addWidget('work', new NS.TaskListBoxWidget({
                srcNode: tp.gel('boxwork'),
                taskList: taskList,
                columns: 'title,favorite',
                boxTitle: LNG['boxtitle']['work'],
                filterFn: function(task){
                    //return task.isInWorked() && !task.isNew;
                }
            }));
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            srcFavorite: {}
        },
        CLICKS: {}
    });

};