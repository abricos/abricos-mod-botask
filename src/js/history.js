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

    NS.HistoryWidget = Y.Base.create('HistoryWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt
    ], {
        onInitAppWidget: function(err, appInstance, options){
            this.renderHistory();
        },
        destructor: function(){
        },
        renderHistory: function(){
            var tp = this.template,
                task = this.get('task'),
                page = this.get('page'),
                limit = this.get('limit') * page,
                i18n = this.language,
                isFull = false,
                counter = 0, user, action,
                lst = "";

            task.get('histories').each(function(history){
                if (counter >= limit){
                    return;
                }

                user = history.get('user');
                action = history.get('action');

                if (!isFull){
                    isFull = history.get('isFirst');
                }

                lst += tp.replace('item', {
                    action: i18n.get('action.' + action),
                    date: Brick.dateExt.convert(history.get('date')),
                    uid: user.get('id'),
                    unm: user.get('viewName')
                });

                counter++;
            }, this);

            tp.setHTML('list', lst);
            tp.toggleView(!isFull, 'more');
        },
        loadMore: function(){
            var page = this.get('page') + 1;

            this.set('page', page);

            this.renderHistory();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget,item'},
            task: {value: null},
            page: {value: 1},
            limit: {value: 3},
        },
        CLICKS: {
            loadMore: 'loadMore'
        },
    });

};