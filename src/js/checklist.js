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
            this.cleanList();
        },
        each: function(f, context){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this.list;
            for (var i = 0; i < lst.length; i++){
                if (f.call(context || this, lst[i])){
                    return;
                }
            }
        },
        cleanList: function(){
            this.each(function(w){
                w.destroy();
            }, this);
            this.list = [];
        },
        setViewModeList: function(){
            this.each(function(w){
                w.setViewMode();
            }, this);
        },
        addCheck: function(check){
            this.setViewModeList();
            check = NS.CheckListRowWidget.checkNormalize(check);

            var tp = this.template,
                list = this.list,
                widget = new NS.CheckListRowWidget({
                    srcNode: tp.append(check.ddl > 0 ? 'recycleTable' : 'table', '<div></div>'),
                    owner: this,
                    check: check
                });

            list[list.length] = widget;
            widget.on('change', this._onRowChange, this);

            return widget;
        },
        _onRowChange: function(){
            var tp = this.template;
            tp.show('btnSave,btnCancel');
            // tp.one('btnAddCheck').focus();
        },
        update: function(){
            this.cleanList();

            var tp = this.template,
                checks = this.get('task').checks,
                removeCount = 0;

            tp.hide('btnSave,btnCancel');

            for (var n in checks){
                var ch = this.addCheck(checks[n]);
                ch.isRemoved() ? removeCount++ : null;

            }
            tp.toggleView(checks.length > 0, 'panelBody');
            tp.toggleView(removeCount > 0, 'recycle');
            tp.setHTML('removeCount', removeCount);
        },
        cancel: function(){
            this.update();
        },
        toJSON: function(){
            var sd = [];
            this.each(function(rowWidget){
                sd[sd.length] = rowWidget.get('check');
            });
            return sd;
        },
        save: function(){
            var task = this.get('task'),
                sd = this.toJSON();

            this.get('appInstance').checkListSave(task.id, sd, function(err, result){
                this.update();
            }, this);
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            task: {},
            config: {
                value: {},
                setter: function(val){
                    return Y.merge({
                        hidebtn: false,
                        hideinfo: false
                    }, val || {});
                }
            }
        },
        CLICKS: {
            add: {
                event: function(){
                    this.addCheck(null);
                }
            },
            save: 'save',
            cancel: 'cancel'
        },
    });

    NS.CheckListRowWidget = Y.Base.create('CheckListRowWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt
    ], {
        buildTData: function(){
            var check = this.get('check'),
                de = Brick.dateExt,
                nUser = this.getUser(check['uid']), // создал
                uUser = this.getUser(check['uuid']), // изменил
                cUser = this.getUser(check['cuid']), // выполнил
                dUser = this.getUser(check['duid']); // удалил

            return {
                inew: de.convert(check['dl']) + ', ' + nUser.get('viewName'),

                diupdate: !uUser ? 'hide' : '',
                iupdate: !uUser ? '' : (de.convert(check['udl']) + ', ' + uUser.get('viewName')),

                dicheck: !cUser ? 'hide' : '',
                icheck: !cUser ? '' : (de.convert(check['cdl']) + ', ' + cUser.get('viewName')),

                diremove: !dUser ? 'hide' : '',
                iremove: !dUser ? '' : (de.convert(check['ddl']) + ', ' + dUser.get('viewName'))
            };
        },
        onInitAppWidget: function(err, appInstance){
            this.publish('change');

            var tp = this.template,
                owner = this.get('owner'),
                cfg = owner.get('config'),
                check = this.get('check');

            tp.toggleView(!cfg.hideinfo, 'btnShowInfo');

            tp.setHTML({
                text: check.tl
            });

            this.set('checked', check.ch > 0);

            tp.toggleView(!this.isRemoved, 'btnRestore', 'btnRemove');

            if (check.id === 0){
                this.setEditMode();
            }
        },
        destructor: function(){
            // this.template.one('blurPanel').detachAll;
            this.setViewMode(true);
        },
        onChange: function(){
            this.fire('change')
        },
        isRemoved: function(){
            var check = this.get('check');
            return check.duid > 0 && check.ddl > 0;
        },
        setEditMode: function(){
            if (this.isRemoved() || this._isEditMode){
                return;
            }
            this._isEditMode = true;

            var tp = this.template,
                str = tp.gel('text').innerHTML,
                rg = tp.one('text').get('region'),
                h = Math.max(rg.height, 20);

            this._oldText = str;
            str = str.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
            str = str.replace(/<br \/>/gi, '\n');
            str = str.replace(/<br\/>/gi, '\n');
            str = str.replace(/<br>/gi, '\n');

            tp.setValue('input', str);

            tp.toggleView(false, 'colView,colViewButtons', 'colInput,colInputButtons');

            var inputNode = tp.one('input');

            try {
                inputNode.focus();
            } catch (e) {
            }

            inputNode.setStyle('height', (h + 0) + 'px');
            inputNode.on('key', this.save, 'enter', this);
        },
        setViewMode: function(isCancel){
            if (!this._isEditMode){
                return;
            }
            this._isEditMode = false;

            var tp = this.template,
                owner = this.get('owner'),
                check = this.get('check'),
                changed = false,
                str = tp.getValue('input');

            str = str.replace(/</gi, '&lt;').replace(/>/gi, '&gt;').replace(/\n/gi, '<br />');

            if (!isCancel){
                tp.setHTML('text', str);
                changed = this._oldText != str;
            }

            tp.toggleView(true, 'colView,colViewButtons', 'colInput,colInputButtons');

            tp.one('input').detachAll();

            check.tl = str;
            if (check.id == 0 && str.length == 0){
                this.remove();
            } else if (changed){
                this.onChange();
            }
        },
        remove: function(){
            var check = this.get('check');
            if (check.id == 0){
                this.destroy();
            } else {
                check.duid = Brick.env.user.id;
                check.ddl = Math.round((new Date()).getTime() / 1000);

                this.onChange();
            }
        },
        restore: function(){
            var check = this.get('check');

            check.duid = 0;
            check.ddl = 0;

            this.onChange();
        },
        cancel: function(){
            this.setViewMode(true);
        },
        save: function(){
            this.setViewMode();
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'row'},
            check: {
                value: {},
                setter: function(val){
                    return NS.CheckListRowWidget.checkNormalize(val);
                }
            },
            checked: {
                value: false,
                setter: function(val){
                    this.template.toggleView(!!val, 'btnUnsetCheck', 'btnSetCheck');
                    return val;
                }
            },
            owner: {},
        },
        CLICKS: {
            text: 'setEditMode',
            cancel: 'cancel',
            save: 'save',
            setCheck: {
                event: function(){
                    this.set('checked', true);
                }
            },
            unsetCheck: {
                event: function(){
                    this.set('checked', false);
                }
            },
            showInfo: {
                event: function(){
                    this.template.toggleView(this._isShowInfo = !this._isShowInfo, 'infoBox');
                }
            },
        },
        checkNormalize: function(val){
            val = Y.merge({
                id: 0,
                uid: Brick.env.user.id,
                dl: Math.round((new Date()).getTime() / 1000),
                ch: 0,
                cuid: 0,
                cdl: 0,
                udl: 0,
                uuid: 0,
                tl: '',
                o: 0,
                ddl: 0,
                duid: 0
            }, val || {});

            var no = {};
            for (var n in val){
                no[n] = val[n];
            }
            val = no;
            val.id = val.id | 0;
            return val;
        },
    });

};