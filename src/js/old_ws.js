var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: '{C#MODNAME}', files: ['users.js', 'easylist.js', 'explore.js', 'history.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        L = YAHOO.lang;

    var buildTemplate = this.buildTemplate;

    var WorkspacePanel = function(gConfig){
    };
    YAHOO.extend(WorkspacePanel, Brick.widget.Panel, {
        initTemplate: function(){
            return buildTemplate(this, 'panel').replace('panel');
        },
        onLoad: function(){
            var TM = this._TM, __self = this;

            this.wsMode = '';
            this.wsw = {
                'explore': null,
                'easyList': null,
                'taskEditor': null,
                'taskViewer': null,
                'folderEditor': null,
                'folderView': null,
                'projectEditor': null,
                'projectView': null,
                'teamUsers': null
            };

            this.gmenu = new NS.GlobalMenuWidget(TM.getEl('panel.gmenu'), 'project', '');
            this.gmenu.buildTaskManager(function(){
                __self.onBuildTaskManager();
            });
        },
        foreachWidgets: function(f){
            for (var n in this.wsw){
                f(this.wsw[n], n);
            }
        },
        destroy: function(){
            this.destroyWSWidgets();
            WorkspacePanel.superclass.destroy.call(this);
        },
        destroyWSWidgets: function(nonls){
            nonls = nonls || '';
            var a = nonls.split(','),
                wsw = this.wsw;
            this.foreachWidgets(function(w, n){
                for (var i = 0; i < a.length; i++){
                    if (n == a[i]){
                        return;
                    }
                }
                if (!L.isNull(w) && L.isFunction(w['destroy'])){
                    w['destroy']();
                    wsw[n] = null;
                }
            });
        },
        onBuildTaskManager: function(){
            var TM = this._TM;

            Dom.setStyle(TM.getEl('panel.loading'), 'display', 'none');
            Dom.setStyle(TM.getEl('panel.board'), 'display', '');

            this.wsw['explore'] = new NS.ExploreWidget(TM.getEl('panel.explore'));
            this.wsw['easyList'] = new NS.EasyListWidget(TM.getEl('panel.easylist'), TM.getEl('panel.boxfav'));
            this.wsw['teamUsers'] = new NS.TeamUserListWidget(TM.getEl('panel.teamusers'));

            this.wsw['teamUsers'].userSelectChangedEvent.subscribe(this.onTeamUserSelectChanged, this, true);
            this._renderByGConfig();
        },
        onTeamUserSelectChanged: function(){
            var userid = this.wsw['teamUsers'].selectedUserId;
            this.wsw['explore'].selectUser(userid);
        },
        setGlobalConfig: function(gConfig){
            this.gConfig = gConfig;
            if (!L.isNull(this.wsw['explore'])){
                this._renderByGConfig();
            }
        },
        _renderByGConfig: function(){

            var gcfg = L.merge({
                'go': '', 'p1': '', 'p2': ''
            }, this.gConfig || {});

            var wsMode = gcfg['go'];

            if (wsMode == this.wsMode){
                // return;
            }
            var TM = this._TM, gel = function(name){
                    return TM.getEl('panel.' + name);
                },
                elPage = gel('wspage'),
                wsw = this.wsw,
                wEasyList = wsw['easyList'],
                wExplore = wsw['explore'],
                wTeamUsers = wsw['teamUsers'];

            this.destroyWSWidgets('explore,easyList,teamUsers');

            wExplore.selectPath(null);
            wTeamUsers.setFilter(null);

            if (wsMode == ''){
                wEasyList.changeContainer(gel('easylist'));
                Dom.setStyle(gel('wspagemain'), 'display', '');
            } else {

                var wname = '';

                switch (wsMode) {
                    case 'add':
                        break;
                    case 'projectview':
                        break;
                    case 'folderview':
                        break;
                    case 'taskview':
                        break;

                    case 'taskadd':
                    case 'taskedit':
                        wname = 'taskeditor';
                        break;
                    case 'folderadd':
                    case 'folderedit':
                        wname = 'foldereditor';
                        break;
                    case 'projectadd':
                    case 'projectedit':
                        wname = 'projecteditor';
                        break;
                    default:
                        return;
                }

                wEasyList.changeContainer(gel('easylistcol'));

                Dom.setStyle(gel('wspagemain'), 'display', 'none');
                Dom.setStyle(gel('wspageloading'), 'display', '');

                var hidewait = function(){
                    Dom.setStyle(gel('wspageloading'), 'display', 'none');
                };

                if (wsMode == 'add'){
                    var taskid = gcfg['p1'] * 1,
                        task = NS.taskManager.getTask(taskid);
                    wExplore.selectPath(task);

                    Brick.ff('botask', 'type', function(){
                        hidewait();
                        wsw['add'] = new NS.TypeSelectWidget(elPage, taskid);
                    });

                } else if (wsMode == 'taskadd' || wsMode == 'taskedit' ||
                    wsMode == 'folderadd' || wsMode == 'folderedit' ||
                    wsMode == 'projectadd' || wsMode == 'projectedit'){

                    Brick.ff('botask', wname, function(){
                        var task = null;

                        var showEditor = function(){
                            task = L.isNull(task) ? new NS.Task() : task;
                            hidewait();
                            wExplore.selectPath(task.parent);

                            if (wsMode == 'folderadd' || wsMode == 'folderedit'){
                                wsw['taskEditor'] = new NS.FolderEditorWidget(elPage, task);
                            } else if (wsMode == 'projectadd' || wsMode == 'projectedit'){
                                wsw['taskEditor'] = new NS.ProjectEditorWidget(elPage, task);
                            } else {
                                wsw['taskEditor'] = new NS.TaskEditorWidget(elPage, task);
                            }
                        };

                        if (wsMode == 'taskadd' || wsMode == 'projectadd' || wsMode == 'folderadd'){
                            var ptaskid = gcfg['p1'] * 1;

                            task = new NS.Task();

                            if (ptaskid * 1 > 0){
                                var ptask = NS.taskManager.list.find(ptaskid);
                                task.parent = ptask;
                            }
                            showEditor();
                        } else {
                            task = NS.taskManager.getTask(gcfg['p1'] * 1);
                            if (L.isNull(task)){
                                showEditor();
                            } else {
                                // запросить дополнительные данные по задаче (описание, история)
                                NS.taskManager.taskLoad(task.id, function(){
                                    showEditor();
                                });
                            }
                        }
                    });
                } else if (wsMode == 'taskview' || wsMode == 'projectview' || wsMode == 'folderview'){

                    var task = NS.taskManager.getTask(gcfg['p1'] * 1);
                    wExplore.selectPath(task);

                    Brick.ff('botask', wsMode, function(){
                        hidewait();

                        if (wsMode == 'folderview'){
                            wsw['taskViewer'] = new NS.FolderViewWidget(elPage, task);
                        } else if (wsMode == 'projectview'){
                            wsw['taskViewer'] = new NS.ProjectViewWidget(elPage, task);
                        } else {
                            wsw['taskViewer'] = new NS.TaskViewWidget(elPage, task);
                        }

                        wTeamUsers.setFilter(task);
                    });
                }
            }
            this.wsMode = wsMode;
            this.gmenu.render();
        }
    });
    NS.WorkspacePanel = WorkspacePanel;

    var activeWSPanel = null;
    NS.API.showWorkspacePanel = function(pgo, p1, p2){

        var gConfig = {
            'go': pgo,
            'p1': p1,
            'p2': p2
        };
        if (L.isNull(activeWSPanel) || activeWSPanel.isDestroy()){
            activeWSPanel = new WorkspacePanel(gConfig);
        } else {
            activeWSPanel.setGlobalConfig(gConfig);
        }
        return activeWSPanel;
    };
};