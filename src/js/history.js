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

    var LNG = this.language;

    NS.HistoryWidget = Y.Base.create('HistoryWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            this.renderHistory();
            // NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
        },
        destructor: function(){
            // NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
        },
        onHistoryChanged: function(type, args){
            var taskid = this.get('config')['taskid'] | 0,
                isRender = taskid == 0;

            if (!isRender){
                args[0].foreach(function(hst){
                    if (hst['taskid'] * 1 == taskid){
                        isRender = true;
                        return true;
                    }
                });
            }
            if (isRender){
                this.renderHistory();
            }
        },
        renderHistory: function(){
            var tp = this.template,
                task = this.get('task'),
                limit = this.get('limit'),
                i18n = this.language,
                isFull = false,
                lst = "";

            task.get('histories').each(function(history){
                var user = history.get('user'),
                    action = history.get('action');

                if (!isFull && !history.get('parentStatus')){
                    isFull = true;
                }

                lst += tp.replace('item', {
                    action: i18n.get('action.' + action),
                    date: Brick.dateExt.convert(history.get('date')),
                    uid: user.get('id'),
                    unm: user.get('viewName')
                });
            }, this);

            tp.setHTML('list', lst);
            tp.toggleView(!isFull, 'more');
        },
        loadMore: function(){
            var history = this.get('history'),
                cfg = this.get('config'),
                limit = cfg['pagerow'] * cfg['page'],
                isLoad = limit > history.count();

            cfg['page']++;

            if (!isLoad && cfg['taskid'] * 1 == 0){

                // кол-во в кеше достаточно, но может быть это кеш кусков загруженных задач?
                history.foreach(function(hst){
                    if (history.firstLoadedId > hst.id){
                        isLoad = true;
                        return true;
                    }
                });
            }

            if (isLoad){
                var instance = this;
                this.set('waiting', true);

                NS.taskManager.loadHistory(history, cfg['taskid'], function(){
                    instance.set('waiting', true);
                    instance.renderHistory();
                });
            } else {
                this.renderHistory();
            }
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,item,hd,fhd,act1,act2,act3,act4,act5,act6,act7,act8,act9'},
            task: {value: null},
            limit: {value: 3},
        },
        CLICKS: {
            loadMore: 'loadMore'
        },
    });

};