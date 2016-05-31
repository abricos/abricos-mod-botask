var Component = new Brick.Component();
Component.requires = {};
Component.entryPoint = function(NS){

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