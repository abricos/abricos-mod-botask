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

    NS.TaskListBoxWidget = Y.Base.create('TaskListBoxWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template,
                config = this.get('config');

            tp.setHTML({
                tl: config.boxtitle
            });

            this.taskTableWidget = new NS.TaskTableWidget({
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
            });
        },
        destructor: function(){
            if (this.taskTableWidget){
                this.taskTableWidget.destroy();
                this.taskTableWidget = null;
            }
        },
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
        CLICKS: {}
    });


    NS.EasyListWidget = Y.Base.create('EasyListWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template;

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
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            srcFavorite: {}
        },
        CLICKS: {}
    });

    return; // TODO: remove old functions

    NS.API.taskCommentsBoxWidget = function(container){
        return new NS.TaskListBoxWidget(container, NS.taskManager.list, {
            'columns': 'name,favorite,voting',
            'globalsort': true,
            'tasksort': 'voting',
            'childs': false,
            'showflagnew': false,
            'boxtitle': LNG['boxtitle']['comment'],
            'funcfilter': function(tk){
                return tk.isNewCmt && !tk.isNew;
            }
        });
    };
    NS.API.taskUpdatingBoxWidget = function(container){
        return new NS.TaskListBoxWidget(container, NS.taskManager.list, {
            'columns': 'name,favorite,voting',
            'globalsort': true,
            'tasksort': 'udate',
            'childs': false,
            'showflagnew': false,
            'boxtitle': LNG['boxtitle']['update'],
            'funcfilter': function(tk){
                return tk.vDate < tk.uDate && !tk.isNew;
            }
        });
    };
    NS.API.taskIncomingBoxWidget = function(container){
        return new NS.TaskListBoxWidget(container, NS.taskManager.list, {
            'columns': 'name,favorite,voting',
            'globalsort': true,
            'tasksort': 'date',
            'childs': false,
            'showflagnew': false,
            'boxtitle': LNG['boxtitle']['new'],
            'funcfilter': function(tk){
                return tk.isNew;
            }
        });
    };
    NS.API.taskFavoriteBoxWidget = function(container){
        return new NS.TaskListBoxWidget(container, NS.taskManager.list, {
            'columns': 'name,favorite,voting',
            'globalsort': true,
            'tasksort': 'voting',
            'childs': false,
            'showflagnew': false,
            'boxtitle': LNG['boxtitle']['favorite'],
            'funcfilter': function(tk){
                return tk.favorite;
            }
        });
    };
    NS.API.taskJournalBoxWidget = function(container){
        return new NS.TaskListBoxWidget(container, NS.taskManager.list, {
            'sortclick': false,
            'columns': 'name,deadline,priority,favorite',
            'countlabeltext': LNG['boxtitle']['journalext'],
            'globalsort': true,
            'limit': 10,
            'tasksort': 'vdate',
            'tasksortdesc': true,
            'childs': false,
            'showflagnew': false,
            'boxtitle': LNG['boxtitle']['journal'],
            'funcfilter': function(tk){
                return !Y.Lang.isNull(tk.vDate);
            }
        });
    };
    /**/
};