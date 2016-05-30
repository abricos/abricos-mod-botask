var Component = new Brick.Component();
Component.requires = {};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.ChecklistWidget = Y.Base.create('ChecklistWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            this.hideRecycle = true;
            this.list = [];

            this.publish('changedEvent');
        },
        destructor: function(){
        },
        onClick: function(e){
            switch (e.dataClick) {
                case 'add':
                    this.addCheck();
                    return true;
                case 'save':
                    this.save();
                    return true;
                case 'cancel':
                    this.cancel();
                    return true;
                case 'recshow':
                    this.recShow();
                    return true;
                case 'rechide':
                    this.recHide();
                    return true;
            }
        },
        recHide: function(){
            this.hideRecycle = true;
            this.updateRecShowHide();
        },
        recShow: function(){
            this.hideRecycle = false;
            this.updateRecShowHide();
        },
        updateRecShowHide: function(){
            var tp = this.template,
                hd = this.hideRecycle;

            tp.toggleView(!hd, 'rectable,brechide', 'brecshow');
        },
        addCheck: function(check){
            check = check || {};
            var tp = this.template,
                list = this.list,
                srcTp = check['ddl'] * 1 > 0 ? 'rectable' : 'table',
                ch = new NS.CheckRowWidget({
                    srcNode: tp.append(srcTp, '<div></div>'),
                    owner: this,
                    check: check
                });

            list[list.length] = ch;

            return ch;
        },
        _shButtons: function(show){
            if (this.get('config')['hidebtn']){
                show = false;
            }
            this.template.toggleView(show, 'btnlst');
        },
        onChanged: function(){
            this.fire('changedEvent');
            this._shButtons(true);
        },
        foreach: function(f){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this.list;
            for (var i = 0; i < lst.length; i++){
                if (f(lst[i])){
                    return;
                }
            }
        },
        toJSON: function(){
            var sd = [];
            this.foreach(function(ch){
                sd[sd.length] = ch.get('check');
            });
            return sd;
        },
        save: function(){
            this._shButtons();

            var sd = this.toJSON();

            this.get('appInstance').checkListSave(this.get('task').id, sd, function(err, result){
                this._shLoading(false);
            }, this);
        },
        cancel: function(){
            this._shButtons();
            this.update();
        },
        update: function(){
            // обновить список
            this.foreach(function(ch){
                ch.destroy();
            });
            this.list = [];

            var tp = this.template,
                checks = this.get('task').checks,
                reccnt = 0;

            for (var n in checks){
                var ch = this.addCheck(checks[n]);
                if (ch.isRemoved()){
                    reccnt++;
                }
            }
            tp.toggleView(reccnt > 0, 'recycle');
            tp.setHTML('reccnt', reccnt);
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            task: {},
            config: {
                value: {},
                setter: function(val){
                    return Y.merge({
                        'hidebtn': false,
                        'hideinfo': false
                    }, val || {});
                }
            }
        },
        CLICKS: {},
    });

    NS.CheckRowWidget = Y.Base.create('CheckRowWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){

            var tp = this.template,
                userList = appInstance.getApp('uprofile').get('userList'),
                owner = this.get('owner'),
                check = this.get('check'),
                cfg = owner.get('config'),
                de = Brick.dateExt,
                nUser = userList.getById(check['uid']), // создал
                uUser = userList.getById(check['uuid']), // изменил
                cUser = userList.getById(check['cuid']), // выполнил
                dUser = userList.getById(check['duid']); // удалил

            tp.setHTML({
                info: cfg['hideinfo'] ? '' : tp.replace('info', {
                    'inew': de.convert(check['dl']) + ', ' + nUser.get('viewName'),

                    'diupdate': !uUser ? 'none' : 'block',
                    'iupdate': !uUser ? '' : (de.convert(check['udl']) + ', ' + uUser.get('viewName')),

                    'dicheck': !cUser ? 'none' : 'block',
                    'icheck': !cUser ? '' : (de.convert(check['cdl']) + ', ' + cUser.get('viewName')),

                    'diremove': !dUser ? 'none' : 'block',
                    'iremove': !dUser ? '' : (de.convert(check['ddl']) + ', ' + dUser.get('viewName'))
                }),
                text: check['tl']
            });

            tp.setValue('checkbox', check['ch'] > 0);

            this.updateCheckView();
            this.updateRemoveView();

            this._isEditMode = false;
            if (check['id'] * 1 == 0){
                this.setEditMode();
            }
        },
        cancel: function(){
            this.setViewMode(true);
        },
        isChecked: function(){
            return !!this.template.getValue('checkbox');
        },
        onChecked: function(){
            this.updateCheckView();
            this.get('check')['ch'] = this.isChecked();
            this.owner.onChanged();
        },
        remove: function(){
            if (this.get('check')['id'] * 1 == 0){
                this.destroy();
            } else {
                this.get('check')['duid'] = Brick.env.user.id;
                this.get('check')['ddl'] = Math.round((new Date()).getTime() / 1000);
                this.updateRemoveView();
                this.owner.onChanged();
            }
        },
        restore: function(){
            this.get('check')['duid'] = 0;
            this.get('check')['ddl'] = 0;
            this.updateRemoveView();
            this.owner.onChanged();
        },
        isRemoved: function(){
            var check = this.get('check');
            return check.duid > 0 && check.ddl > 0;
        },
        isDestroyed: function(){
            return this._destroyed;
        },
        updateRemoveView: function(){
            var tp = this.template;

            if (this.isRemoved()){
                tp.addClass('bg', 'removed');
            } else {
                tp.removeClass('bg', 'removed');
            }
        },
        onKeyPress: function(e, el){
            if (el.id != this._TIcheck['row']['input']){
                return false;
            }
            if (e.keyCode != 13){
                return false;
            }
            this.setViewMode();
            return true;
        },
        updateCheckView: function(){
            var tp = this.template;

            if (this.isChecked()){
                tp.replaceClass('bg', 'uncheck', 'check');
            } else {
                tp.replaceClass('bg', 'check', 'uncheck');
            }
        },
        setEditMode: function(){ // установить режим редактирования
            if (this.isRemoved() || this._isEditMode){
                return;
            }
            this._isEditMode = true;

            var tp = this.template;

            var str = tp.gel('row.text').innerHTML;
            this._oldText = str;
            str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
            str = str.replace(/<br \/>/gi, '\n');
            str = str.replace(/<br\/>/gi, '\n');
            str = str.replace(/<br>/gi, '\n');

            var rg = tp.one('text').get('region'),
                h = Math.max(rg.height, 10);

            tp.setValue('input', str);

            tp.toggleView(true, 'action', 'text,btnsc');
            tp.one('input').setStyle('height', h + 'px');

            try {
                tp.one('input').focus();
            } catch (e) {
            }

            tp.one('input').on('blur', this.onBlur, this);
        },
        onBlur: function(){
            this.setViewMode();
        },
        setViewMode: function(cancel){
            if (!this._isEditMode){
                return;
            }
            this._isEditMode = false;

            var tp = this.template,
                owner = this.get('owner');

            var str = tp.getValue('input');
            str = str.replace(/</gi, '&lt;').replace(/>/gi, '&gt;').replace(/\n/gi, '<br />');

            var changed = false;
            if (!cancel){
                tp.setHTML('text', str);
                changed = this._oldText != str;
            }

            tp.toggleView(true, 'text,btnsc', 'action');
            tp.one('input').detach("blur", this.onBlur);

            try {
                owner.template.one('badd').focus();
            } catch (e) {
            }

            if (changed){
                owner.onChanged();
            }

            this.get('check')['tl'] = str;

            if (this.get('check')['id'] * 1 == 0 && str.length == 0){
                this.remove();
            }
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'row,info'},
            check: {
                value: {},
                setter: function(val){
                    val = Y.merge({
                        'id': 0,
                        uid: Brick.env.user.id,
                        'dl': Math.round((new Date()).getTime() / 1000),
                        'ch': 0,
                        'cuid': 0,
                        'cdl': 0,
                        'udl': 0,
                        'uuid': 0,
                        'tl': '',
                        'o': 0,
                        'ddl': 0,
                        'duid': 0

                    }, val || {});

                    var no = {};
                    for (var n in val){
                        no[n] = val[n];
                    }
                    return no;
                }
            },
            owner: {}
        },
        CLICKS: {
            text: 'setEditMode',
            cancel: 'cancel',
            save: 'setViewMode',
            checkbox: 'onChecked',
            remove: 'remove',
            restore: 'restore',
        },
    });

};