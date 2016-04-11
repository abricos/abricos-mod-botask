var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'botask', files: ['tasklist.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    // var LNG = Brick.util.Language.geta(['mod', '{C#MODNAME}', '{C#COMNAME}']);
    var LNG = this.language['{C#COMNAME}'];

    var buildTemplate = this.buildTemplate;

    var TaskInWorkInfoWidget = function(container){
        this.init(container);
    };
    TaskInWorkInfoWidget.prototype = {
        init: function(container){
            buildTemplate(this, 'inwork');
            container.innerHTML = this._TM.replace('inwork');
            this.render();
        },
        render: function(){

        }
    };
    NS.TaskInWorkInfoWidget = TaskInWorkInfoWidget;

    var TaskListBoxWidget = function(container, list, config){
        config = L.merge({
            'boxstate': '',
            'boxtitle': '',
            'countlabeltext': '',
            'funcfilter': function(){
                return false;
            }
        }, config || {});
        TaskListBoxWidget.superclass.constructor.call(this, container, list, config);
    };
    YAHOO.extend(TaskListBoxWidget, NS.TaskTableWidget, {
        init: function(container, list, config){

            buildTemplate(this, 'boxitem');
            var TM = this._TM;
            container.innerHTML = TM.replace('boxitem');
            TM.getEl('boxitem.tl').innerHTML = config['boxtitle'];

            var __self = this;
            E.on(container, 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });

            TaskListBoxWidget.superclass.init.call(this, TM.getEl('boxitem.table'), list, config);
            this.render();

            if (config['boxstate'] == 'hide'){
                this.shBox();
            }
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
    });
    NS.TaskListBoxWidget = TaskListBoxWidget;

    var EasyListWidget = function(container, contFavorite){
        this.init(container, contFavorite);
    };
    EasyListWidget.prototype = {
        init: function(container, contFavorite){

            buildTemplate(this, 'widget');
            var TM = this._TM,
                gel = function(name){
                    return TM.getEl('widget.' + name);
                };
            container.innerHTML = TM.replace('widget');

            this.widgets = [];

            this.widgets['work'] = new NS.TaskListBoxWidget(gel('boxwork'), NS.taskManager.list, {
                'sortclick': false,
                'columns': 'name,deadline,priority,favorite,executant',
                'childs': false,
                'globalsort': true,
                'showflagnew': false,
                'boxtitle': LNG['boxtitle']['work'],
                'funcfilter': function(tk){
                    return tk.isInWorked() && !tk.isNew;
                }
            });

            this.widgets['tasknew'] = new NS.TaskListBoxWidget(gel('boxnew'), NS.taskManager.list, {
                'columns': 'name,deadline,priority,favorite',
                'globalsort': true,
                'tasksort': 'date',
                'childs': false,
                'showflagnew': false,
                'boxtitle': LNG['boxtitle']['new'],
                'funcfilter': function(tk){
                    return tk.isNew;
                }
            });

            this.widgets['cmtnew'] = new NS.TaskListBoxWidget(gel('boxcmt'), NS.taskManager.list, {
                'columns': 'name,deadline,priority,favorite',
                'childs': false,
                'showflagnew': false,
                'boxtitle': LNG['boxtitle']['comment'],
                'funcfilter': function(tk){
                    return tk.isNewCmt && !tk.isNew;
                }
            });

            this.widgets['journal'] = NS.API.taskJournalBoxWidget(contFavorite);
        },
        changeContainer: function(container){
            var el = this._TM.getEl('widget.id');
            el.parentNode.removeChild(el);
            container.appendChild(el);
        },
        destroy: function(){
            var ws = this.widgets;
            for (var n in ws){
                ws[n].destroy();
            }
        }
    };
    NS.EasyListWidget = EasyListWidget;

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
                return !L.isNull(tk.vDate);
            }
        });
    };
};