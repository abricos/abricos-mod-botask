var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: 'uprofile', files: ['users.js']},
        {name: 'comment', files: ['comment.js']},
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var R = NS.roles;

    var buildTemplate = this.buildTemplate;

    var LastCommentsPanel = function(){
        LastCommentsPanel.superclass.constructor.call(this, {
            fixedcenter: true, width: '790px', height: '400px'
        });
    };
    YAHOO.extend(LastCommentsPanel, Brick.widget.Panel, {
        initTemplate: function(){
            buildTemplate(this, 'panel,comment,task');

            return this._TM.replace('panel');
        },
        onLoad: function(){
            var __self = this;
            this.gmenu = new NS.GlobalMenuWidget(this._TM.getEl('panel.gmenu'), 'comments', '');

            this.gmenu.buildTaskManager(function(){
                __self.onBuildTaskManager();
            });
        },
        onBuildTaskManager: function(){
            this.builder = new Brick.mod.comment.CommentManager(true);
            var __self = this;
            NS.taskManager.ajax({'do': 'lastcomments'}, function(r){
                __self.updateList(r);
            });
        },
        updateList: function(r){
            if (!L.isObject(r)){
                return false;
            }

            var TM = this._TM, lst = "";

            var tpath = function(arr, task){

                if (!L.isNull(task.parent)){
                    tpath(arr, task.parent);
                }

                arr[arr.length] = TM.replace('task', {
                    'id': task.id,
                    'tl': task.title
                });
            };

            var cmts = [];
            for (var id in r){
                cmts[cmts.length] = r[id];
            }
            cmts = cmts.sort(function(a, b){
                if (a.de * 1 > b.de * 1){
                    return -1;
                }
                if (a.de * 1 < b.de * 1){
                    return 1;
                }
                return 0;
            });
            for (var i = 0; i < cmts.length; i++){
                var item = cmts[i],
                    task = NS.taskManager.list.find(item['tkid']),
                    arr = [];
                tpath(arr, task);
                lst += TM.replace('comment', {
                    'nav': arr.join(' / '),
                    'cmt': this.builder.buildHTML(item)
                });
            }

            TM.getEl('panel.comments').innerHTML = lst;
        }
    });

    var _activeCommentsPanel = null;
    NS.API.showLastCommentsPanel = function(){
        if (L.isNull(_activeCommentsPanel) || _activeCommentsPanel.isDestroy()){
            _activeCommentsPanel = new LastCommentsPanel();
        }
        return _activeCommentsPanel;
    };

};