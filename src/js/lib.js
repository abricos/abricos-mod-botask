var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['application.js']},
        {name: '{C#MODNAME}', files: ['old_lib.js']}
    ]
};
Component.entryPoint = function(NS){

    NS.roles = new Brick.AppRoles('{C#MODNAME}', {
        isAdmin: 50,
        isWrite: 30,
        isView: 10
    });

    var COMPONENT = this,
        SYS = Brick.mod.sys;

    SYS.Application.build(COMPONENT, {}, {
        initializer: function(){
            var instance = this;
            NS.roles.load(function(){
                Brick.mod.filemanager.roles.load(function(){
                    instance.initCallbackFire();
                });
            });
        }
    }, [], {
        APPS: {
            uprofile: {},
            comment: {},
        },
        REQS: {
            boardData: {
                args: ['hlid'],
                attribute: false,
                onResponse: function(data){

                    return function(callback, context){
                        this.getApp('uprofile').userListByIds(data.users, function(err, result){

                            callback.call(context || null);
                        }, context);
                    };
                }
            }
        },
        ATTRS: {
            isLoadAppStructure: {value: false},
        },
        URLS: {
            ws: "#app={C#MODNAMEURI}/wspace/ws/",
            folder: {
                create: function(){
                },
                edit: function(id){
                },
                view: function(id){
                }
            },
        }
    });
};