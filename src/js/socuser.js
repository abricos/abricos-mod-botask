var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: 'uprofile', files: ['viewer.js', 'profile.js']},
        {name: 'social', files: ['lib.js']}
    ]
};
Component.entryPoint = function(){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var NS = this.namespace,
        TMG = this.template,
        API = NS.API,
        UP = Brick.mod.uprofile;

    var buildTemplate = this.buildTemplate;

    var UserProfilePanel = function(userid){
        this.userid = userid;
        UserProfilePanel.superclass.constructor.call(this, {
            fixedcenter: true, width: '790px', height: '400px'
        });
    };
    YAHOO.extend(UserProfilePanel, Brick.widget.Panel, {
        initTemplate: function(){
            buildTemplate(this, 'panel,runm,rbirthday,rdescript,rlv,rdl');
            return this._TM.replace('panel', {
                uid: this.userid
            });
        },
        onLoad: function(){
            var __self = this;
            UP.viewer.loadUserInfo(this.userid, function(user){
                __self.renderUserInfo(user);
            });
            UP.viewer.userChangedEvent.subscribe(this.onUserChanged, this, true);

            this.avatarUploader = new UP.AvatarUploader(this.userid, function(fileid){
                __self.onAvatarUpload(fileid);
            });
        },
        destroy: function(){
            this.avatarUploader.destroy();
            UP.viewer.userChangedEvent.unsubscribe(this.onUserChanged);
            UserProfilePanel.superclass.destroy.call(this);
        },
        onUserChanged: function(type, args){
            var upuser = args[0];
            if (upuser.get('id') != this.userid){
                return;
            }
            this.renderUserInfo();
        },
        onAvatarUpload: function(fileid){
            UP.viewer.updateUserInfo(this.userid, {
                avatar: fileid
            });
        },
        renderUserInfo: function(user){
            if (!user){
                user = this.user;
            }
            var isMyProfile = Brick.env.user.id * 1 == user.get('id') * 1;

            var TM = this._TM, gel = function(nm){
                return TM.getEl('panel.' + nm);
            };

            Dom.setStyle(gel('wait'), 'display', 'none');
            Dom.setStyle(gel('id'), 'display', '');

            gel('foto').innerHTML = UP.avatar.get180(user);
            gel('fullname').innerHTML = UP.viewer.buildUserName(user);


            var lst = TM.replace('runm', {'value': user['unm']});

            if (user['birthday'] * 1 > 0){
                lst += TM.replace('rbirthday', {'value': NS.dateToString(NS.dateToClient(user['birthday']))});
            }
            if (L.isString(user['descript']) && user['descript'].length > 0){
                lst += TM.replace('rdescript', {'value': user['descript']});
            }
            if (user['dl'] * 1 > 0){
                lst += TM.replace('rdl', {'value': NS.dateToString(NS.dateToClient(user['dl']))});
            }
            lst += TM.replace('rlv', {
                'value': Brick.dateExt.convert(user['lv'])
            });

            gel('list').innerHTML = lst;

            Dom.getElementsByClassName('_ismyprofile', '', gel('id'), function(el){
                Dom.setStyle(el, 'display', (isMyProfile ? '' : 'none'));
            });
            this.user = user;
        },
        onClick: function(el){
            var tp = this._TId['panel'];
            switch (el.id) {
                case tp['fotoupload']:
                    this.avatarUploader.imageUpload();
                    return true;
            }
            return false;
        }
    });
    NS.UserProfilePanel = UserProfilePanel;

    API.showProfilePanel = function(userid){
        return new UserProfilePanel(userid);
    };

    var UserProfileEditPanel = function(userid){
        this.userid = userid;
        UserProfileEditPanel.superclass.constructor.call(this, {
            fixedcenter: true, width: '790px', height: '400px'
        });
    };
    YAHOO.extend(UserProfileEditPanel, Brick.widget.Panel, {
        initTemplate: function(){
            buildTemplate(this, 'editor,yrow');

            var dLst = "", year = new Date().getFullYear(), yLst = "";
            for (var i = year; i > 1900; i--){
                yLst += this._TM.replace('yrow', {'v': i});
            }
            for (var i = 1; i <= 31; i++){
                dLst += this._TM.replace('yrow', {'v': i});
            }

            return this._TM.replace('editor', {
                uid: this.userid,
                'byears': yLst,
                'bdays': dLst
            });
        },
        onLoad: function(){
            var __self = this;
            UP.viewer.loadUserInfo(this.userid, function(user){
                __self.renderUserInfo(user);
            });
            UP.viewer.userChangedEvent.subscribe(this.onUserChanged, this, true);

            this.avatarUploader = new UP.AvatarUploader(this.userid, function(fileid){
                __self.onAvatarUpload(fileid);
            });

        },
        destroy: function(){
            this.avatarUploader.destroy();
            UP.viewer.userChangedEvent.unsubscribe(this.onUserChanged);
            UserProfileEditPanel.superclass.destroy.call(this);
        },
        onUserChanged: function(type, args){
            var upuser = args[0];
            if (upuser.get('id') != this.userid){
                return;
            }
            this.renderUserInfo();
        },
        onAvatarUpload: function(fileid){
            UP.viewer.updateUserInfo(this.userid, {
                avatar: fileid
            });
        },
        renderUserInfo: function(user){
            if (!user){
                user = this.user;
            }
            var TM = this._TM, gel = function(nm){
                return TM.getEl('editor.' + nm);
            };

            Dom.setStyle(gel('wait'), 'display', 'none');
            Dom.setStyle(gel('id'), 'display', '');

            gel('foto').innerHTML = UP.avatar.get180(user);
            gel('unm').innerHTML = user['unm'];
            gel('fnm').value = user['firstname'];
            gel('lnm').value = user['lastname'];
            gel('sex').value = user['sex'];

            var bDate = NS.dateToClient(user['birthday']);
            if (!Y.Lang.isNull(bDate)){
                gel('bdateday').value = bDate.getDate();
                gel('bdatemonth').value = bDate.getMonth() + 1;
                gel('bdateyear').value = bDate.getFullYear();
            }
            gel('site').value = user['site'];
            gel('desc').value = user['descript'];

            this.user = user;
        },
        onClick: function(el){
            var tp = this._TId['editor'];
            switch (el.id) {
                case tp['bsave']:
                    this.save();
                    return true;
                case tp['fotoupload']:
                    this.avatarUploader.imageUpload();
                    return true;
            }
            return false;
        },
        save: function(){
            var TM = this._TM, gel = function(nm){
                return TM.getEl('editor.' + nm);
            };

            Dom.setStyle(gel('bsave'), 'display', 'none');
            Dom.setStyle(gel('loading'), 'display', '');

            var birthday = 0,
                bday = gel('bdateday').value * 1,
                bmonth = gel('bdatemonth').value * 1,
                byear = gel('bdateyear').value * 1;
            if (bday > 0 && bmonth > 0 && byear > 0){
                birthday = new Date(byear, bmonth - 1, bday);
            }

            var sd = {
                'firstname': gel('fnm').value,
                'lastname': gel('lnm').value,
                'sex': gel('sex').value,
                'site': gel('site').value,
                'descript': gel('desc').value,
                'birthday': birthday > 0 ? NS.dateToServer(birthday) : 0
            };
            var userid = this.userid;
            Brick.ajax('social', {
                'data': {
                    'do': 'saveprofile',
                    'userid': userid,
                    'data': sd
                },
                'event': function(request){
                    Dom.setStyle(gel('bsave'), 'display', '');
                    Dom.setStyle(gel('loading'), 'display', 'none');

                    var ui = request.data;
                    if (ui.userid != userid){
                        return;
                    }

                    UP.viewer.updateUserInfo(userid, {
                        'firstname': ui['firstname'],
                        'lastname': ui['lastname'],
                        'sex': ui['sex'],
                        'site': ui['site'],
                        'descript': ui['descript'],
                        'birthday': ui['birthday']
                    });
                }
            });
        }
    });
    NS.UserProfileEditPanel = UserProfileEditPanel;

    API.showEditProfilePanel = function(userid){
        return new UserProfileEditPanel(userid);
    };
};