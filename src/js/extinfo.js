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

    var UID = Brick.env.user.id;

    NS.ExtInfo = Y.Base.create('ExtInfo', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            var tp = this.template,
                task = this.get('task');

            this.historyWidget = new NS.HistoryWidget({
                srcNode: tp.one('history'),
                history: task.history,
                config: {'pagerow': 3}
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

    NS.SelectMyStatusListWidget = Y.Base.create('SelectMyStatusListWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            var tp = this.template,
                task = this.get('task'),
                lst = "",
                mys = task.custatus.my;

            for (var i = 0; i < mys.length; i++){
                lst += tp.replace('myrow', {
                    'id': i,
                    'tl': mys[i]['tl']
                });
            }
            tp.setHTML('myw', {'rows': lst});
        },
        onClick: function(el){
            var prefix = el.id.replace(/([0-9]+$)/, ''),
                numid = el.id.replace(prefix, "");

            switch (prefix) {
                case this._TId['myrow']['id'] + '-':
                    this.onSelect(numid);
                    return true;
            }
        },
        onSelect: function(id){
            var my = this.get('task').custatus.my[id];
            NS.life(this.callback, my);
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'myw,myrow'},
            task: {},
            callback: {}
        },
        CLICKS: {},
    });

    NS.CustomStatusWidget = Y.Base.create('CustomStatusWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            this.myList = null;

            var tp = this.template,
                tk = this.get('task'),
                lst = "",
                userList = appInstance.getApp('uprofile').get('userList');

            var instance = this;

            var buildRow = function(user){
                return tp.replace('user', {
                    avatar: user.get('avatarSrc24'),
                    uid: user.get('id'),
                    unm: user.get('viewName'),
                    'status': user.get('id') == UID ? tp.replace('editor') : instance.getSt(user.get('id'))['tl']
                });
            };

            lst += buildRow(userList.getById(UID));

            for (var i = 0; i < tk.users.length; i++){
                var user = userList.getById(tk.users[i]);
                if (user.get('id') != UID){
                    lst += buildRow(user);
                }
            }
            tp.setHTML('list', lst);
            tp.setValue('editor.val', this.getSt(UID)['tl']);

            tp.one('editor.val').on('keyup', this.onEditorChange, this);
        },
        onClick: function(el){
            var TId = this._TId, tp = TId['cstat'];
            switch (el.id) {
                case tp['bsave']:
                    this.save();
                    return true;
                case tp['bcancel']:
                    this.cancel();
                    return true;
                case TId['editor']['val']:
                    this.onEditorClick(el);
                    return true;
            }

            return false;
        },
        getSt: function(uid){
            return this.get('task').custatus.list[uid] || {'tl': ''};
        },
        shSelect: function(show){
            var TM = this._TM, instance = this, elSel = TM.getEl('cstat.sel');
            Dom.setStyle(elSel, 'display', show ? '' : 'none');

            if (show && Y.Lang.isNull(this.myList)){
                this.myList = new SelectMyStatusListWidget(TM.getEl('cstat.sel'), this.get('task'), function(my){
                    if (!my){
                        return;
                    }
                    TM.getEl('editor.val').value = my['tl'];
                    instance.updateSaveStatus();
                });

                var bodyClick = null;
                bodyClick = function(e){
                    var el = E.getTarget(e),
                        elEd = TM.getEl('editor.val');
                    if (Y.Lang.isNull(elEd)){
                        E.removeListener(document.body, 'click', bodyClick);
                        return;
                    }

                    if (elEd.id == el.id){
                        return;
                    }
                    instance.myList.onClick(el);
                    instance.shSelect(false);
                };

                E.on(document.body, 'click', bodyClick);

            }
        },
        onEditorClick: function(el){
            this.shSelect(true);
        },
        onEditorChange: function(){
            this.updateSaveStatus();
            this.shSelect(false);
        },
        updateSaveStatus: function(){
            var TM = this._TM, el = TM.getEl('editor.val'),
                elBtns = TM.getEl('cstat.btns'),
                tk = this.get('task');

            var cst = tk.custatus.list[UID] || {'tl': ''},
                cval = cst['tl'];

            if (cval != el.value){
                Dom.setStyle(elBtns, 'display', '');
            } else {
                Dom.setStyle(elBtns, 'display', 'none');
            }
        },
        save: function(){
            var TM = this._TM, gel = function(n){
                return TM.getEl('cstat.' + n);
            };
            var instance = this;

            Dom.setStyle(gel('bact'), 'display', 'none');
            Dom.setStyle(gel('saved'), 'display', '');
            var sd = {
                'taskid': this.get('task').id,
                'title': TM.getEl('editor.val').value
            };
            NS.taskManager.custatusSave(this.get('task'), sd, function(){
                Dom.setStyle(gel('bact'), 'display', '');
                Dom.setStyle(gel('saved'), 'display', 'none');
                instance.updateSaveStatus();
            });
        },
        cancel: function(){
            var TM = this._TM;
            TM.getEl('editor.val').value = this.getSt(UID)['tl'];
            this.updateSaveStatus();
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'cstat,user,editor,slrow'},
            task: {}
        },
        CLICKS: {},
    });
};