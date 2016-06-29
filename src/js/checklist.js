var Component = new Brick.Component();
Component.requires = {};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var UID = Brick.env.user.id | 0;

    NS.CheckListWidget = Y.Base.create('ChecklistWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            this.publish('change');

            this._cloneCheckList();

            this._wList = [];
            this.renderList();
        },
        destructor: function(){
            this.cleanList();
        },
        _cloneCheckList: function(){
            var appInstance = this.get('appInstance'),
                task = this.get('task'),
                checkList = new NS.CheckList({
                    appInstance: appInstance
                });

            task.get('checks').each(function(check){
                var clone = new NS.Check(Y.merge({
                    appInstance: appInstance
                }, check.toJSON(true)));
                clone._orig = check;

                checkList.add(clone);
            }, this);

            this.set('checkList', checkList);

            this.template.hide('btnSave,btnCancel');
        },
        each: function(f, context){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this._wList;
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
            this._wList = [];
        },
        renderList: function(){
            this.cleanList();

            var tp = this.template,
                checkList = this.get('checkList'),
                removeCount = 0;

            checkList.each(function(check){
                this.addCheck(check);
                removeCount += check.isRemoved() ? 1 : 0;
            }, this);

            tp.toggleView(checkList.size() > 0, 'panelBody');

            this._removeCount = removeCount;
            this._updateRecycleVisible();
        },
        _updateRecycleVisible: function(){
            var tp = this.template,
                removeCount = this._removeCount;

            tp.toggleView(removeCount > 0, 'recycleButtons');
            tp.toggleView(removeCount > 0 && this._recycleTableVisible, 'recycleTable');
            tp.toggleView(this._recycleTableVisible, 'btnHideRecycle', 'btnShowRecycle');
            tp.setHTML('removeCount', removeCount);
        },
        addCheck: function(check){
            if (!check){
                var newCheckId = 0;
                this.get('checkList').each(function(tCheck){
                    newCheckId = Math.min(newCheckId, tCheck.get('id'));
                }, this);

                check = new NS.Check({
                    appInstance: this.get('appInstance'),
                    id: (newCheckId - 1),
                    date: new Date(),
                    userid: UID
                });
            }
            this.setViewModeList();

            var tp = this.template,
                list = this._wList,
                widget = new NS.CheckListRowWidget({
                    srcNode: tp.append(check.isRemoved() ? 'recycleTable' : 'table', '<div></div>'),
                    check: check,
                    infoVisible: this.get('infoVisible'),
                });

            list[list.length] = widget;
            // widget.on('change', this._onRowChange, this);

            widget.on('change', this._onCheckChange, this);
            widget.on('remove', this._onCheckRemove, this);
            widget.on('restore', this._onCheckRestore, this);

            return widget;
        },
        _onCheckChange: function(){
            this.template.show('btnSave,btnCancel');
        },
        _onCheckRemove: function(e){
            var check = e.target.get('check');

            check.set('removeUserId', UID);
            check.set('removeDate', new Date());
            this.renderList();

            this.template.show('btnSave,btnCancel');
        },
        _onCheckRestore: function(e){
            var check = e.target.get('check');

            check.set('removeUserId', 0);
            check.set('removeDate', null);
            this.renderList();

            this.template.show('btnSave,btnCancel');
        },
        setViewModeList: function(){
            this.each(function(w){
                w.setViewMode();
            }, this);
        },
        cancel: function(){
            this._cloneCheckList();
            this.renderList();
        },
        save: function(){
            var task = this.get('task'),
                sd = this.toJSON();

            this.get('appInstance').checkListSave(task.get('id'), sd, function(err, result){
                this._cloneCheckList();
                this.renderList();
            }, this);
        },
        toJSON: function(){
            var sd = [];
            this.each(function(rowWidget){
                sd[sd.length] = rowWidget.toJSON(true);
            });
            return sd;
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            task: {value: null},
            checkList: {value: null},
            infoVisible: {value: true},
        },
        CLICKS: {
            add: {
                event: function(){
                    this.addCheck(null);
                }
            },
            save: 'save',
            cancel: 'cancel',
            showRecycle: {
                event: function(){
                    this._recycleTableVisible = true;
                    this._updateRecycleVisible();
                }
            },
            hideRecycle: {
                event: function(){
                    this._recycleTableVisible = false;
                    this._updateRecycleVisible();
                }
            }
        },
    });

    NS.CheckListRowWidget = Y.Base.create('CheckListRowWidget', SYS.AppWidget, [
        NS.UProfileWidgetExt
    ], {
        buildTData: function(){
            var check = this.get('check'),
                de = Brick.dateExt,
                nUser = this.getUser(check.get('userid')), // создал
                uUser = this.getUser(check.get('updateUserId')), // изменил
                cUser = this.getUser(check.get('checkedUserId')), // выполнил
                dUser = this.getUser(check.get('removeUserId')); // удалил

            return {
                inew: de.convert(check.get('date')) + ', ' + nUser.get('viewName'),

                diupdate: !uUser ? 'hide' : '',
                iupdate: !uUser ? '' : (de.convert(check.get('updateDate')) + ', ' + uUser.get('viewName')),

                dicheck: !cUser ? 'hide' : '',
                icheck: !cUser ? '' : (de.convert(check.get('checkedDate')) + ', ' + cUser.get('viewName')),

                diremove: !dUser ? 'hide' : '',
                iremove: !dUser ? '' : (de.convert(check.get('removeDate')) + ', ' + dUser.get('viewName'))
            };
        },
        onInitAppWidget: function(err, appInstance){
            this.publish('change');
            this.publish('remove');
            this.publish('restore');

            var tp = this.template,
                check = this.get('check');

            tp.toggleView(this.get('infoVisible'), 'btnShowInfo');

            tp.setHTML({
                text: check.get('title')
            });

            this.set('checked', check.get('checked'));

            tp.toggleView(check.isRemoved(), 'btnRestore', 'btnRemove');

            if (check.get('id') < 0){
                this.setEditMode();
            }
        },
        destructor: function(){
            // this.template.one('blurPanel').detachAll;
            this.setViewMode(true);
        },
        onChange: function(){
            this.fire('change');
        },
        onRemove: function(){
            this.fire('remove');
        },
        onRestore: function(){
            this.fire('restore');
        },
        setEditMode: function(){
            var check = this.get('check');

            if (check.isRemoved() || this._isEditMode){
                return;
            }
            this._isEditMode = true;

            var tp = this.template,
                rg = tp.one('text').get('region'),
                h = Math.max(rg.height, 20);

            tp.setValue({
                input: check.get('titleSrc')
            });

            tp.toggleView(false, 'colView,colViewButtons', 'colInput,colInputButtons');

            var inputNode = tp.one('input');

            try {
                inputNode.focus();
            } catch (e) {
            }

            inputNode.setStyle('height', (h + 0) + 'px');
            inputNode.on('key', this.save, 'enter', this);

            this._blurExit = false;
            inputNode.on('blur', this._onInputBlur, this);
        },
        _onInputBlur: function(){
            this._blurExit = true;
            var instance = this;

            setTimeout(function(){
                if (instance._blurExit){
                    instance.setViewMode();
                }
            }, 500);
        },
        setViewMode: function(isCancel){
            if (!this._isEditMode){
                return;
            }
            this._blurExit = false;
            this._isEditMode = false;

            var tp = this.template,
                check = this.get('check'),
                prevVal = check.get('title'),
                val = Y.Lang.trim(tp.getValue('input')),
                changed = false;

            if (!isCancel){
                check.set('titleSrc', val);
                tp.setHTML('text', check.get('title'));
                changed = prevVal != check.get('title');
            }

            tp.toggleView(true, 'colView,colViewButtons', 'colInput,colInputButtons');

            tp.one('input').detachAll();

            if (changed){
                this.onChange();
            }
        },
        remove: function(){
            this.onRemove();
        },
        restore: function(){
            this.onRestore();
        },
        cancel: function(){
            this.setViewMode(true);
        },
        save: function(){
            this.setViewMode();
        },
        toJSON: function(){
            return this.get('check').toJSON(true);
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'row'},
            check: {value: null},
            checked: {
                value: false,
                setter: function(val){
                    val = !!val;
                    var check = this.get('check');
                    check.set('checked', val);

                    if (val){
                        check.set('checkedUserId', UID);
                        check.set('checkedDate', new Date());
                    } else {
                        check.set('checkedUserId', 0);
                        check.set('checkedDate', null);
                    }

                    this.template.toggleView(val, 'btnUnsetCheck', 'btnSetCheck');
                    this.onChange();
                    return val;
                }
            },
            infoVisible: {value: true}
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
            remove: 'remove',
            restore: 'restore'
        },
    });

};