var Component = new Brick.Component();
Component.requires = {};
Component.entryPoint = function(NS){

    // CSS apply
    this.template.build();

    var ContainerWidgetExt = function(){
    };
    ContainerWidgetExt.ATTRS = {};
    ContainerWidgetExt.prototype = {
        initializer: function(){
            this._containerWidget = [];
        },
        destructor: function(){
            this.cleanWidgets();
        },
        eachWidget: function(fn, context){
            var list = this._containerWidget;
            for (var i = 0; i < list.length; i++){
                var wi = list[i];
                fn.call(context || this, wi.widget, wi.name, i);
            }
        },
        addWidget: function(name, widget){
            var curWidget = this.getWidget(name);
            if (curWidget){
                throw new Exception('Widget is exists');
            }
            var list = this._containerWidget;
            list[list.length] = {
                name: name,
                widget: widget
            };
            return widget;
        },
        getWidget: function(name){
            var find = null;
            this.eachWidget(function(w, n){
                if (name === n){
                    find = w;
                }
            });
            return find;
        },
        cleanWidgets: function(){
            this.eachWidget(function(widget){
                widget.destroy();
            }, this)
            this._containerWidget = [];
        }
    };
    NS.ContainerWidgetExt = ContainerWidgetExt;

    var TaskWidgetExt = function(){
    };
    TaskWidgetExt.ATTRS = {
        taskid: {
            value: 0,
            setter: function(val){
                return val | 0;
            }
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
        }
    };
    NS.TaskWidgetExt = TaskWidgetExt;


    var UProfileWidgetExt = function(){
    };
    UProfileWidgetExt.ATTRS = {
        userList: {
            readOnly: true,
            getter: function(){
                if (typeof this._cacheUProfileUserList !== 'undefined'){
                    return this._cacheUProfileUserList;
                }
                var appInstance = NS.appInstance,
                    uprofile = appInstance ? appInstance.getApp('uprofile') : null,
                    userList = uprofile ? uprofile.get('userList') : null;

                return this._cacheUProfileUserList = userList;
            }
        }
    };
    UProfileWidgetExt.prototype = {
        getUser: function(userid){
            var userList = this.get('userList');
            return userList ? userList.getById(userid) : null;
        },
        getUserAttr: function(userid, attr, retNull){
            retNull = retNull || '';
            var user = this.getUser(userid);
            return user ? user.get(attr) : retNull;
        },
    };
    NS.UProfileWidgetExt = UProfileWidgetExt;
};