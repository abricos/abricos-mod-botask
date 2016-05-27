var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['editor.js']},
        {name: 'widget', files: ['calendar.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['widgets.js', 'checklist.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'pictab', files: ['draw.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    NS.ProjectEditorWidget = Y.Base.create('ProjectEditorWidget', SYS.AppWidget, [
        SYS.WidgetEditorStatus
    ], {
        onInitAppWidget: function(err, appInstance){
            var taskid = this.get('taskid'),
                task = this.get('task');

            if (!task){
                return;
            }

            if (taskid === 0){
                return this._onLoadTask();
            }

            this.set('waiting', true);
            appInstance.task(taskid, function(err, result){
                this.set('waiting', false);

                this._onLoadTask();
            }, this)
        },
        destructor: function(){
            if (this.parentSelectWidget){
                this.parentSelectWidget.destroy();
                this.parentSelectWidget = null;
            }
            if (this.editor){
                this.editor.destroy();
                this.editor = null;
            }
            if (this.checklist){
                this.checklist.destroy();
                this.checklist = null;
            }
        },
        _onLoadTask: function(){
            var tp = this.template,
                taskid = this.get('taskid'),
                task = this.get('task');

            this.parentSelectWidget = new NS.TaskTreeSelectWidget({
                srcNode: tp.one('path'),
                taskid: taskid,
                parentTaskId: task.parent ? task.parent.id : 0
            });

            tp.setValue({
                tl: task.title
            });

            this.editor = new SYS.Editor({
                appInstance: this.get('appInstance'),
                srcNode: tp.gel('editor'),
                content: task.descript,
                toolbar: SYS.Editor.TOOLBAR_MINIMAL
            });

            this.checklist = new NS.ChecklistWidget({
                srcNode: tp.one('checklist'),
                task: task,
                config: {
                    hidebtn: true,
                    hideinfo: true
               }
            });
            this.checklist.update();

        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            taskid: {
                value: 0,
                setter: function(val){
                    return val | 0;
                },
            },
            task: {
                readOnly: true,
                getter: function(){
                    var taskid = this.get('taskid');
                    if (taskid > 0){
                        return NS.taskManager.getTask(taskid);
                    }
                    if (this._taskNewCache){
                        return this._taskNewCache;
                    }
                    return this._taskNewCache = new NS.Task();
                }
            },
            isEdit: {
                getter: function(){
                    return (this.get('taskid') | 0) > 0
                }
            }
        },
        CLICKS: {
            save: 'save'
        },
        parseURLParam: function(args){
            args = args || [];
            return {
                taskid: (args[0] | 0)
            };
        }
    });

    return;
    var ProjectEditorWidget = function(container, task, config){
    };
    ProjectEditorWidget.prototype = {
        init: function(container, task, config){
            this.task = task;
            this.cfg = config;

            var TM = buildTemplate(this, 'widget');

            container.innerHTML = TM.replace('widget', {
                'pid': Y.Lang.isNull(task.parent) ? 0 : task.parent.id,
                'ptitle': Y.Lang.isNull(task.parent) ? '' : task.parent.title
            });
            this.onLoad();
        },
        onLoad: function(){

            if (Brick.mod.filemanager.roles.isWrite){
                this.filesWidget = new Brick.mod.filemanager.AttachmentWidget(gel('files'), task.files);
            } else {
                this.filesWidget = null;
                Dom.setStyle(gel('rfiles'), 'display', 'none');
            }

            var users = task.id * 1 == 0 && !Y.Lang.isNull(task.parent) ? task.parent.users : task.users;
            this.usersWidget = new UP.UserSelectWidget(gel('users'), users);

            this.drawListWidget = null;
            if (Brick.mod.pictab && Brick.mod.pictab.ImageListWidget){
                this.drawListWidget = new Brick.mod.pictab.ImageListWidget(gel('widget'), task.images);
            } else {
                Dom.setStyle(gel('rimage'), 'display', 'none');
            }

            var __self = this;
            E.on(TM.getEl('widget.id'), 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });
        },
        destroy: function(){
            this.editor.destroy();
            var elw = this._TM.getEl('widget.id');
            elw.parentNode.removeChild(elw);
        },
        onClick: function(el){
            var tp = this._TId['widget'];
            switch (el.id) {

                case tp['bimgdis']:
                    this.imageEnable(false);
                    return true;
                case tp['bimgen']:
                    this.imageEnable(true);
                    return true;
                case tp['baddtab']:
                    this.drawListWidget.createTab();
                    return true;

                case tp['bsave']:
                case tp['bsavei']:
                    this.saveTask();
                    return true;
                case tp['bcancel']:
                case tp['bcanceli']:
                    this.close();
                    return true;
            }
            return false;
        },
        imageEnable: function(en){
            this._imageEnabled = en;
            var TM = this._TM;
            TM.elShowHide('widget.bimgdis,baddtab,widget', en);
            TM.elShowHide('widget.bimgen', !en);
        },
        close: function(){
            var cfg = this.cfg;
            if (L.isFunction(cfg['onCancelCallback'])){
                if (cfg['onCancelCallback']()){
                    return;
                }
            }

            var tk = this.task;
            if (tk.id > 0){
                NS.navigator.projectView(tk.id);
            } else if (tk.id == 0 && !Y.Lang.isNull(tk.parent)){
                NS.navigator.projectView(tk.parent.id);
            } else {
                NS.navigator.home();
            }
        },
        saveTask: function(){
            var TM = this._TM,
                gel = function(n){
                    return TM.getEl('widget.' + n);
                },
                __self = this, task = this.task,
                users = this.usersWidget.getSelectedUsers();

            TM.elHide('widget.bsave,bsavei,bcancel,bcanceli');
            TM.elShow('widget.loading,loadingi');

            users[users.length] = Brick.env.user.id;

            var images = [];
            if (!Y.Lang.isNull(this.drawListWidget)){
                images = this.drawListWidget.toSave();
            }

            var newdata = {
                'type': 'project',
                'title': gel('tl').value,
                'descript': this.editor.getContent(),
                'checks': this.checklist.getSaveData(),
                'files': Y.Lang.isNull(this.filesWidget) ? task.files : this.filesWidget.files,
                'images': images,
                'users': users,
                'parentid': this.parentSelectWidget.getValue()
            };
            NS.taskManager.taskSave(task, newdata, function(d){
                d = d || {};
                __self.onSaveProject(d);
            });
        },
        onSaveProject: function(d){
            var cfg = this.cfg;
            if (L.isFunction(cfg['onSaveCallback'])){
                if (cfg['onSaveCallback'](d)){
                    return;
                }
            }

            var taskid = (d['id'] || 0) * 1;
            setTimeout(function(){
                NS.navigator.projectView(taskid);
            }, 500);
        }
    };
    NS.ProjectEditorWidget = ProjectEditorWidget;

};