var Component = new Brick.Component();
Component.requires = {};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.CheckListWidget = Y.Base.create('ChecklistWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance){
            this.publish('change');

            this._list = [];
            this.renderList();
        },
        destructor: function(){
            this.cleanList();
        },
        each: function(f, context){
            if (!Y.Lang.isFunction(f)){
                return;
            }
            var lst = this._list;
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
            this._list = [];
        },
        renderList: function(){
            this.cleanList();

            var tp = this.template,
                checkList = this.get('task').get('checks'),
                removeCount = 0;

            tp.hide('btnSave,btnCancel');

            checkList.each(function(check){
                this.addCheck(check);
                removeCount += check.isRemoved() ? 1 : 0;
            }, this);

            tp.toggleView(checkList.size() > 0, 'panelBody');
            tp.toggleView(removeCount > 0, 'recycle');
            tp.setHTML('removeCount', removeCount);
        },
        addCheck: function(check){
            this.setViewModeList();

            var tp = this.template,
                list = this._list,
                widget = new NS.CheckListRowWidget({
                    srcNode: tp.append(check.isRemoved() ? 'recycleTable' : 'table', '<div></div>'),
                    check: check,
                    infoVisible: this.get('infoVisible'),
                });

            list[list.length] = widget;
            // widget.on('change', this._onRowChange, this);

            return widget;
        },
        setViewModeList: function(){
            this.each(function(w){
                w.setViewMode();
            }, this);
        },
        cancel: function(){
            this.renderList();
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
                this.renderList();
            }, this);
        },
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            task: {value: null},
            infoVisible: {value: true},
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
                nUser = this.getUser(check.get('userid')), // создал
                uUser = this.getUser(check.get('updateUserId')), // изменил
                cUser = this.getUser(check.get('checkedUserId')), // выполнил
                dUser = this.getUser(check.get('removeUserId')); // удалил

            return {
                inew: de.convert(check.get('date')) + ', ' + nUser.get('viewName'),

                direnderList: !uUser ? 'hide' : '',
                irenderList: !uUser ? '' : (de.convert(check.get('updateDate')) + ', ' + uUser.get('viewName')),

                dicheck: !cUser ? 'hide' : '',
                icheck: !cUser ? '' : (de.convert(check.get('checkedDate')) + ', ' + cUser.get('viewName')),

                diremove: !dUser ? 'hide' : '',
                iremove: !dUser ? '' : (de.convert(check.get('removeDate')) + ', ' + dUser.get('viewName'))
            };
        },
        onInitAppWidget: function(err, appInstance){
            this.publish('change');

            var tp = this.template,
                check = this.get('check');

            tp.toggleView(this.get('infoVisible'), 'btnShowInfo');

            tp.setHTML({
                text: check.get('title')
            });

            this.set('checked', check.get('checked'));

            tp.toggleView(!check.isRemoved(), 'btnRestore', 'btnRemove');

            if (check.get('id') === 0){
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

            check.set('title', str);
            if (check.get('id') === 0 && str.length == 0){
                this.remove();
            } else if (changed){
                this.onChange();
            }
        },
        remove: function(){
            var check = this.get('check');
            if (check.get('id') == 0){
                this.destroy();
            } else {
                check.set('removeUserId', Brick.env.user.id);
                check.set('removeDate', new Date());

                this.onChange();
            }
        },
        restore: function(){
            var check = this.get('check');

            check.set('removeUserId', 0);
            check.set('removeDate', null);

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
            check: {value: null},
            checked: {
                value: false,
                setter: function(val){
                    this.template.toggleView(!!val, 'btnUnsetCheck', 'btnSetCheck');
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
        },
    });

};