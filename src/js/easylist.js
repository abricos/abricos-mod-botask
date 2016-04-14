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

            console.log(this.get('taskList'));
            this.taskTableWidget = new NS.TaskTableWidget({
                srcNode: tp.one('table'),
                config: config,
                taskList: this.get('taskList')
            });

            /*
             if (config['boxstate'] == 'hide'){
             this.shBox();
             }
             /**/
        },
        destructor: function(){
        },
        isRenderChild: function(tk){
            return false;
        },
        isChildExpanded: function(tk){
            return null;
        },
        isRenderTask: function(tk){
            var isr = this.cfg['funcfilter'](tk);
            if (isr){
                this.countRows++;
            }
            return isr;
        },
        /*
        render: function(){
            this.countRows = 0;
            TaskListBoxWidget.superclass.render.call(this);

            var TM = this._TM,
                gel = function(nm){
                    return TM.getEl('boxitem.' + nm);
                };

            if (this.countRows > 0){
                Dom.removeClass(gel('tlist'), 'hide');
                Dom.addClass(gel('empty'), 'hide');
            } else {
                Dom.removeClass(gel('empty'), 'hide');
                Dom.addClass(gel('tlist'), 'hide');
            }
            if (this.cfg['hidecountlabel']){
                Dom.addClass(gel('countlabel'), 'hide');
            } else {
                Dom.removeClass(gel('countlabel'), 'hide');
            }

            gel('cnt').innerHTML = this.cfg['countlabeltext'] != '' ? this.cfg['countlabeltext'] : this.countRows;
        },
        /**/
        shBox: function(){
            this._isHide = !this._isHide;

            var TM = this._TM,
                el = TM.getEl('boxitem.id'),
                elBody = TM.getEl('boxitem.boxbody');
            if (this._isHide){
                Dom.replaceClass(el, 'boxstshow', 'boxsthide');
                Dom.setStyle(elBody, 'opacity', 0.9);
            } else {
                Dom.replaceClass(el, 'boxsthide', 'boxstshow');
                Dom.setStyle(elBody, 'opacity', 1);
            }
        },
        onClick: function(el){
            var tp = this._TId['boxitem'];
            switch (el.id) {
                case tp['head']:
                case tp['info']:
                case tp['tl']:
                case tp['shbox']:
                    this.shBox();
                    return true;
            }
            return false;
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
        CLICKS: {}
    });


    NS.EasyListWidget = Y.Base.create('EasyListWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template;

            this.widgets = [];

            this.widgets['work'] = new NS.TaskListBoxWidget({
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
            });

            this.widgets['tasknew'] = new NS.TaskListBoxWidget({
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
            });

            this.widgets['cmtnew'] = new NS.TaskListBoxWidget({
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
            });

            // this.widgets['journal'] = NS.API.taskJournalBoxWidget(this.get('srcFavorite'));
        },
        destructor: function(){
            var ws = this.widgets;
            for (var n in ws){
                ws[n].destroy();
            }
        },
        changeContainer: function(container){
            var el = this._TM.getEl('widget.id');
            el.parentNode.removeChild(el);
            container.appendChild(el);
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            srcFavorite: {}
        },
        CLICKS: {}
    });

    /*
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