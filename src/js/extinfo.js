var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['history.js']}
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var UID = Brick.env.user.id | 0;

    NS.ExtInfo = Y.Base.create('ExtInfo', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                task = this.get('task');

            this.historyWidget = new NS.HistoryWidget({
                srcNode: tp.one('history'),
                history: task.history,
                config: {
                    pagerow: 3,
                    taskid: task.id
                }
            });

            this.custatusWidget = new NS.CustomStatusWidget({
                srcNode: tp.one('custatus'),
                task: task
            });
        },
        destructor: function(){
            this.historyWidget.destroy();
            this.custatusWidget.destroy();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'extinfo'},
            task: {}
        },
        CLICKS: {},
    });

    NS.CustomStatusWidget = Y.Base.create('CustomStatusWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt
    ], {
        buildTData: function(){
            var tp = this.template,
                task = this.get('task'),
                user = this.getUser(UID);
            return {
                uid: UID,
                avatar: user.get('avatarSrc24'),
                unm: user.get('viewName'),
                saveButton: task.id > 0 ? tp.replace('saveButton') : ''
            };
        },
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                tk = this.get('task'),
                lst = "";

            for (var i = 0; i < tk.users.length; i++){
                var userid = tk.users[i] | 0,
                    user = this.getUser(userid),
                    status = this.getStatusFromTask(userid).tl;

                if (userid === UID || status === ''){
                    continue;
                }

                lst += tp.replace('user', {
                    avatar: user.get('avatarSrc24'),
                    uid: user.get('id'),
                    unm: user.get('viewName'),
                    'status': user.get('id') == UID ? tp.replace('editor') : status
                });

            }
            tp.setHTML('list', lst);

            this._updateStatus();

            tp.one('input').on('keyup', this._onInputChange, this);
        },
        destructor: function(){
            this.template.one('input').detachAll();
        },
        _onInputChange: function(){
            var tp = this.template,
                value = this.getStatusFromTask(UID).tl,
                curValue = tp.getValue('input');

            tp.one('saveButton').set('disabled', value === curValue ? 'disabled' : '');
        },
        _updateStatus: function(){
            var tp = this.template,
                status = this.getStatusFromTask(UID);

            tp.setValue('input', status.tl);
            this._onInputChange();

            var lst = tp.replace('noStatus'),
                task = this.get('task'),
                mys = task.custatus.my;

            for (var i = 0, title; i < mys.length; i++){
                title = mys[i]['tl'];
                if (title === ''){
                    continue;
                }

                lst += tp.replace('option', {
                    id: title,
                    title: title
                });
            }
            tp.setHTML('select', lst);
            tp.setValue('select', status.tl);
        },
        getStatusFromTask: function(uid){
            return this.get('task').custatus.list[uid] || {tl: ''};
        },
        showSelect: function(){
            this.template.toggleView(true, 'selectPanel', 'editorPanel');
        },
        hideSelect: function(){
            this.template.toggleView(false, 'selectPanel', 'editorPanel');
        },
        select: function(){
            var tp = this.template,
                title = tp.getValue('select');

            this.hideSelect();
            tp.setValue('input', title);
            this.save();
        },
        save: function(){
            var tp = this.template,
                task = this.get('task');

            this.set('waiting', true);
            this.get('appInstance').customStatusSave(task.id, tp.getValue('input'), function(){
                this.set('waiting', false);
                this._updateStatus();
            }, this);
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'customStatusList,user,noStatus,option,saveButton'},
            task: {}
        },
        CLICKS: {
            showSelect: 'showSelect',
            hideSelect: 'hideSelect',
            select: 'select',
            save: 'save',
        },
    });
};