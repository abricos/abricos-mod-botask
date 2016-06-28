var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'comment', files: ['tree.js']},
        {name: 'filemanager', files: ['attachment.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: '{C#MODNAME}', files: ['tasklist.js', 'checklist.js', 'history.js', 'resolution.js']},
        {name: 'pictab', files: ['draw.js']}
    ]
};
Component.entryPoint = function(NS){
    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

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

            if (tp.one('attacheFiles')){
                this.addWidget('attacheFiles', new Brick.mod.filemanager.AttachmentListWidget(tp.gel('attacheFiles')));
            }

            /*
             var mPT = Brick.mod.pictab;
             if (mPT && mPT.ImageListWidget && L.isArray(task.images) && task.images.length > 0){
             tp.show('imgwidget');
             this.drawListWidget = new mPT.ImageListWidget(tp.gel('images'), task.images, true);
             this.drawListWidget.changedEvent.subscribe(this.onCanvasChanged, this, true);
             }
             task.isNewCmt = false;
             /**/

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
            }
        }
    };
    NS.ItemViewWidgetExt = ItemViewWidgetExt;
};