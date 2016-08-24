var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['taskList.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.TaskListBoxWidget = Y.Base.create('TaskListBoxWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template,
                mode = this.get('mode'),
                i18n = this.language;

            if (!this.get('taskList')){
                this.set('taskList', appInstance.get('taskList'));
            }

            switch (mode) {
                case 'isFavorite':
                    this.set('boxTitle', i18n.get('boxTitle.' + mode));
                    this.set('columns', 'title,favorite');
                    this.set('filterFn', function(task){
                        return task.isFavorite();
                    });
                    break;
                case 'isNew':
                    this.set('boxTitle', i18n.get('boxTitle.' + mode));
                    this.set('columns', 'title,favorite');
                    this.set('filterFn', function(task){
                        return task.isNew();
                    });
                    break;
                case 'isChanged':
                    this.set('boxTitle', i18n.get('boxTitle.' + mode));
                    this.set('columns', 'title,favorite');
                    this.set('filterFn', function(task){
                        return task.isChanged();
                    });
                    break;
                case 'isNewComment':
                    this.set('boxTitle', i18n.get('boxTitle.' + mode));
                    this.set('columns', 'title,favorite');
                    this.set('filterFn', function(task){
                        return task.isNewComment();
                    });
                    break;
                case 'isNotReaded':
                    this.set('boxTitle', i18n.get('boxTitle.' + mode));
                    this.set('columns', 'title,updateDate|sort=asc');
                    this.set('filterFn', function(task){
                        if (task.isNew()){
                            return false;
                        }
                        return !task.isReaded();
                    });
                    break;
            }

            tp.setHTML({
                tl: this.get('boxTitle')
            });

            var tableWidget = this.addWidget('table', new NS.TaskTableWidget({
                srcNode: tp.one('table'),
                taskList: this.get('taskList'),
                columns: this.get('columns'),
                filterFn: this.get('filterFn'),
            }));
            this._onTableRenderList();

            tableWidget.on('renderList', this._onTableRenderList, this);
        },
        _onTableRenderList: function(){
            var tp = this.template,
                tableWidget = this.getWidget('table'),
                countRows = tableWidget.get('renderRowCount');

            tp.toggleView(countRows > 0, 'tlist', 'empty');
            tp.toggleView(true, 'countlabel');
            tp.setHTML({
                cnt: countRows
            });
        },
        renderList: function(){
            this.getWidget('table').renderList();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'boxitem'},
            taskList: {value: null},
            mode: {value: ""},
            boxTitle: {value: ""},
            columns: 'title,favorite',
            filterFn: {value: null},
        },
        CLICKS: {},
        parseURLParam: function(args){
            args = args || [];
            return {
                mode: args[0]
            };
        }
    });

    NS.EasyListWidget = Y.Base.create('EasyListWidget', SYS.AppWidget, [
        NS.ContainerWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                taskList = appInstance.get('taskList');


            this.addWidget('isNewList', new NS.TaskListBoxWidget({
                srcNode: tp.gel('isNewList'),
                taskList: taskList,
                mode: 'isNew',
            }));

            this.addWidget('isNotReadedList', new NS.TaskListBoxWidget({
                srcNode: tp.gel('isNotReadedList'),
                taskList: taskList,
                mode: 'isNotReaded',
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