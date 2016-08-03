var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'comment', files: ['tree.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['taskList.js', 'checklist.js', 'history.js', 'resolution.js']},
        {name: 'pictab', files: ['draw.js']}
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var PicTabWidget = Brick.mod.pictab ? Brick.mod.pictab.PicTabWidget : null;

    var aTargetBlank = function(el){
        if (el.tagName == 'A'){
            el.target = "_blank";
        } else if (el.tagName == 'IMG'){
            el.style.maxWidth = "100%";
            el.style.height = "auto";
        }
        var chs = el.childNodes;
        for (var i = 0; i < chs.length; i++){
            if (chs[i]){
                aTargetBlank(chs[i]);
            }
        }
    };

    var ItemViewWidgetExt = function(){
    };
    ItemViewWidgetExt.prototype = {
        buildTData: function(){
            return {
                id: this.get('taskid')
            };
        },
        onInitAppWidget: function(err, appInstance){
            var taskid = this.get('taskid'),
                task = appInstance.get('taskList').getById(taskid);

            if (!task){
                // TODO: show 404
                return;
            }

            this.set('waiting', true);

            appInstance.task(taskid, this._onLoadItem, this)
        },
        _onLoadItem: function(){
            this.set('waiting', false);

            var tp = this.template,
                appInstance = this.get('appInstance'),
                taskid = this.get('taskid'),
                task = appInstance.get('taskList').getById(taskid);


            if (tp.one('commentTreeWidget')){
                this.addWidget('commentTree', new Brick.mod.comment.CommentTreeWidget({
                    srcNode: tp.gel('commentTreeWidget'),
                    commentOwner: {
                        module: 'botask',
                        type: 'task',
                        ownerid: taskid
                    },
                    readOnly: !NS.roles.isWrite
                }));
            }

            if (tp.one('checkListWidget')){
                this.addWidget('checkList', new NS.CheckListWidget({
                    srcNode: tp.one('checkListWidget'),
                    task: task
                }));
            }

            if (tp.one('historyWidget')){
                this.addWidget('history', new NS.HistoryWidget({
                    srcNode: tp.one('historyWidget'),
                    task: task,
                }));
            }

            if (tp.one('resolutionWidget')){
                this.addWidget('resolution', new NS.ResolutionWidget({
                    srcNode: tp.one('resolutionWidget'),
                    task: task
                }));
            }

            if (tp.one('attacheFiles') && task.get('files').size() > 0){
                tp.show('fileListPanel');
                var arr = [];
                task.get('files').each(function(file){
                    arr[arr.length] = file.getAttrs();
                }, this);

                this.addWidget('attacheFiles', new Brick.mod.filemanager.AttachmentListWidget(
                    tp.gel('attacheFiles'), arr
                ));
            }

            var images = task.get('images');

            if (tp.one('pictabWidget') && PicTabWidget
                && images && images.size() > 0){

                tp.show('pictabPanel');

                var pictabWidget = this.addWidget('pictab', new PicTabWidget({
                    srcNode: tp.one('pictabWidget'),
                    imageList: images,
                    editMode: false
                }));

                pictabWidget.on('canvasChanged', function(){
                    tp.show('pictabSaveButton');
                }, this);
            }

            this.renderItem();
        },
        renderItem: function(){
            var tp = this.template,
                taskid = this.get('taskid'),
                task = this.get('appInstance').get('taskList').getById(taskid);

            var author = task.get('author');

            tp.setHTML({
                status: task.get('statusTitle'),
                taskid: task.get('id'),
                author: tp.replace('user', {
                    uid: author.get('id'),
                    unm: author.get('viewName')
                }),
                date: Brick.dateExt.convert(task.get('date'), 3, true),
                title: task.get('title'),
                descript: task.get('descript'),
            });

            tp.one('date').set('title', Brick.dateExt.convert(task.get('date'), 4));

            tp.toggleView(task.isFavorite(), 'removeFromFavoriteButton', 'addToFavoriteButton');
        },
        showRemovePanel: function(){
            this.template.show('removePanel');
        },
        closeRemovePanel: function(){
            this.template.hide('removePanel');
        },
        removeItem: function(){
            this.set('waiting', true);
            var taskid = this.get('taskid');
            this.get('appInstance').taskRemove(taskid, function(err, result){
                this.set('waiting', false);
                if (!err){
                    this.go('ws');
                }
            }, this);
        },
        pictabSave: function(){
            var taskid = this.get('taskid'),
                data = this.getWidget('pictab').toJSON();

            this.template.hide('pictabSaveButton');

            this.set('waiting', true);
            this.get('appInstance').imageListSave(taskid, data, function(err, result){
                this.set('waiting', false);
            }, this);
        },
        onClick: function(e){
            var task = this.get('task');
            switch (e.dataClick) {
                case 'addToFavorite':
                    task.addToFavorite();
                    this.renderItem();
                    return true;
                case 'removeFromFavorite':
                    task.removeFromFavorite();
                    this.renderItem();
                    return true;
                case 'showRemovePanel':
                    this.showRemovePanel();
                    return true;
                case 'closeRemovePanel':
                    this.closeRemovePanel();
                    return true;
                case 'removeItem':
                    this.removeItem();
                    return true;
                case 'pictabSave':
                    this.pictabSave();
                    return true;
            }
        }
    };
    NS.ItemViewWidgetExt = ItemViewWidgetExt;
};