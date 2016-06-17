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
                tl: config.boxtitle
            });

            this.addWidget('table', new NS.TaskTableWidget({
                    srcNode: tp.one('table'),
                    config: config,
                    taskList: this.get('taskList'),
                    onBeforeRenderListFn: function(){
                        this.countRows = 0;
                    },
                    isRenderChildFn: function(tk){
                        return false;
                    },
                    isChildExpandedFn: function(tk){
                        return null;
                    },
                    isRenderTaskFn: function(tk){
                        var isr = this.get('config').funcfilter(tk);
                        if (isr){
                            this.countRows++;
                        }
                        return isr;
                    },
                    onAfterRenderListFn: function(){
                        var cfg = this.get('config');

                        tp.toggleView(this.countRows > 0, 'tlist', 'empty');
                        tp.toggleView(!cfg['hidecountlabel'], 'countlabel');
                        tp.setHTML({
                            cnt: config['countlabeltext'] != '' ? config['countlabeltext'] : this.countRows
                        });
                    }
                })
            );
        },
        renderList: function(){
            this.get('table').renderList();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'boxitem'},
            taskList: {
                value: null
            },
            config: {
                value: {},
                setter: function(val){
                    return Y.merge({
                        boxstate: '',
                        boxtitle: '',
                        countlabeltext: '',
                        funcfilter: function(){
                            return false;
                        }
                    }, val || {});
                }
            }
        },
        CLICKS: {},

    });

    NS.EasyListWidget = Y.Base.create('EasyListWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template;

            this.addWidget('tasknew', new NS.TaskListBoxWidget({
                    srcNode: tp.gel('boxnew'),
                    taskList: NS.taskManager.list,
                    config: {
                        columns: 'name,deadline,priority,favorite',
                        globalsort: true,
                        tasksort: 'date',
                        childs: false,
                        showflagnew: false,
                        boxtitle: LNG['boxtitle']['new'],
                        funcfilter: function(tk){
                            return tk.isNew;
                        }
                    }
                })
            );

            this.addWidget('cmtnew', new NS.TaskListBoxWidget({
                    srcNode: tp.gel('boxcmt'),
                    taskList: NS.taskManager.list,
                    config: {
                        columns: 'name,deadline,priority,favorite',
                        childs: false,
                        showflagnew: false,
                        boxtitle: LNG['boxtitle']['comment'],
                        funcfilter: function(tk){
                            return tk.isNewCmt && !tk.isNew;
                        }
                    }
                })
            );

            this.addWidget('work', new NS.TaskListBoxWidget({
                    srcNode: tp.gel('boxwork'),
                    taskList: NS.taskManager.list,
                    config: {
                        sortclick: false,
                        columns: 'name,deadline,priority,favorite,executant',
                        childs: false,
                        globalsort: true,
                        showflagnew: false,
                        boxtitle: LNG['boxtitle']['work'],
                        funcfilter: function(tk){
                            return tk.isInWorked() && !tk.isNew;
                        }
                    }
                })
            );
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