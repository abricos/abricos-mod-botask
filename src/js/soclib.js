/*
 @copyright Copyright (C) 2011 Abricos All rights reserved.
 @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 */

var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'uprofile', files: ['users.js']}
    ]
};
Component.entryPoint = function(){

    // TODO: remove
    var NS = Brick.mod.social = Brick.mod.social || {};
    var UP = Brick.mod.uprofile;
    var L = YAHOO.lang;


    // Элемент коллекции (абстрактный класс)
    var Item = function(di){
        this.init(di);
    };
    Item.prototype = {
        init: function(di){
            this.id = di['id'];
            this.update(di);
        },
        update: function(di){
        }
    };
    NS.Item = Item;

    var List = function(data){
        this.init(data);
    };
    List.prototype = {
        init: function(data){
            this._list = [];
        },
        foreach: function(f){
            if (!L.isFunction(f)){
                return;
            }

            var lst = this._list;

            var item;
            for (var i = 0; i < lst.length; i++){
                item = lst[i];
                if (f(item)){
                    break;
                }
                ;
            }
        },

        getByIndex: function(index){
            index = index || 0;
            if (index < 0 || index >= this.count()){
                return null;
            }
            return this._list[index];
        },

        get: function(itemid){
            return this.find(itemid);
        },

        find: function(itemid){
            var fItem = null;
            this.foreach(function(item){
                if (item.id == itemid){
                    fItem = item;
                    return true;
                }
            });
            return fItem;
        },
        exist: function(itemid){
            return !L.isNull(this.find(itemid));
        },
        add: function(item){
            if (this.exist(item.id)){
                return;
            }
            this._list[this._list.length] = item;
        },
        remove: function(itemid){
            var nlist = [];

            this.foreach(function(item){
                if (item.id != itemid){
                    nlist[nlist.length] = item;
                }
            });
            this._list = nlist;
        },
        clear: function(){
            this._list = [];
        },
        count: function(){
            return this._list.length;
        }
    };
    NS.List = List;

    var User = function(di){
        User.superclass.constructor.call(this, di);
    };
    YAHOO.extend(User, Item, {
        update: function(di){
            this.userName = di['unm'];
            this.firstName = di['fnm'];
            this.lastName = di['lnm'];
            this.avatar = di['avt'];
        },
        getData: function(){
            return {
                'id': this.id,
                'unm': this.userName,
                'fnm': this.firstName,
                'lnm': this.lastName,
                'avt': this.avatar
            };
        },
        getUserName: function(scr){
            return UP.builder.getUserName(this.getData(), scr);
        },
        avatar24: function(isUrl){
            return UP.avatar.get24(this.getData(), isUrl);
        },
        avatar45: function(isUrl){
            return UP.avatar.get45(this.getData(), isUrl);
        }

    });
    NS.User = User;

    var UserList = function(data){
        UserList.superclass.constructor.call(this, data);
    };
    YAHOO.extend(UserList, List, {
        init: function(data){
            UserList.superclass.init.call(this);
            this.update(data);
        },
        update: function(data){
            data = data || {};
            for (var id in data){
                this.add(this.itemInstance(data[id]));
            }
        },
        itemInstance: function(di){
            return new User(di);
        }
    });
    NS.UserList = UserList;

    // Пользовательские настройки (абстрактный класс)
    var UserConfig = function(d){
        this.init(d);
    };
    UserConfig.prototype = {
        init: function(d){
            this.update(d);
        },
        update: function(d){
        },
        toAjax: function(){
            return {};
        }
    };
    NS.UserConfig = UserConfig;

    var HistoryItem = function(di){
        HistoryItem.superclass.constructor.call(this, di);
    };
    YAHOO.extend(HistoryItem, Item, {
        init: function(di){
            HistoryItem.superclass.init.call(this, di);

            this.id = di['id'] * 1;
            this.socid = di['sid'];		// идентификатор социального объекта
            this.userid = di['uid'];	// идентификатор пользователя
            this.dl = di['dl'] * 1;		// дата/время действия (в unix)
            this.date = NS.dateToClient(di['dl']); // дата/время действия (в Date)

            this.userAdded = di['usad'];
            this.userRemoved = di['usrm'];
        }
    });
    NS.HistoryItem = HistoryItem;


    var hSort = function(a, b){
        if (a.id > b.id){
            return -1;
        }
        else if (a.id < b.id){
            return 1;
        }
        return 0;
    };
    var hSortDesc = function(a, b){
        return hSort(b, a);
    };

    // Менеджер истории (абстрактный класс)
    var History = function(data){
        History.superclass.constructor.call(this, data);
    };
    YAHOO.extend(History, List, {
        init: function(data){
            History.superclass.init.call(this);

            // последний загруженный идентификатор в этой коллекции
            this.firstLoadedId = 0;
            this.isFullLoaded = false;

            // this.update(data);
        },
        setFirstLoadedId: function(id){
            if (this.firstLoadedId == 0){
                this.firstLoadedId = id;
            }
            this.firstLoadedId = Math.min(this.firstLoadedId, id * 1);
        },
        foreach: function(f, desc){
            if (!L.isFunction(f)){
                return;
            }
            var lst = this._list;
            if (desc){ // сортировка по дате
                lst = lst.sort(hSortDesc);
            }
            for (var i = 0; i < lst.length; i++){
                if (f(lst[i])){
                    break;
                }
                ;
            }
        },
        add: function(item){
            if (this.exist(item.id)){
                return;
            }
            var lst = this._list;
            lst[lst.length] = item;
            this._list = lst.sort(hSort);
        },
        lastTime: function(){ // последнее время изменений
            var time = 0;
            this.foreach(function(hst){
                time = Math.max(time, hst.dl);
            });
            return time;
        },
        lastId: function(){ // последний идентификатор действия в истории
            var id = 0;
            this.foreach(function(hst){
                id = Math.max(id, hst.id);
            });
            return id;
        },
        itemInstance: function(di){
            return new HistoryItem(di);
        }
    });
    NS.History = History;

    var SocialItem = function(di){
        SocialItem.superclass.constructor.call(this, di);
    };
    YAHOO.extend(SocialItem, Item, {
        init: function(di){
            SocialItem.superclass.init.call(this, di);
            this.history = null;
        },
        update: function(di){
            this.title = d['tl'];
            this.userid = d['uid'];				// идентификатор автора
            this.users = d['users'];			// участники задачи
        }
    });
    NS.SocialItem = SocialItem;

    var SocialItemList = function(data){
        SocialItemList.superclass.constructor.call(this, data);
    };
    YAHOO.extend(SocialItemList, List, {});
    NS.SocialItemList = SocialItemList;


    NS.getDate = function(){
        return new Date();
    };

    var lz = function(num){
        var snum = num + '';
        return snum.length == 1 ? '0' + snum : snum;
    };

    var TZ_OFFSET = NS.getDate().getTimezoneOffset();
    TZ_OFFSET = 0;

    NS.dateToServer = function(date){
        if (L.isNull(date)){
            return 0;
        }
        var tz = TZ_OFFSET * 60 * 1000;
        return (date.getTime() - tz) / 1000;
    };
    NS.dateToClient = function(unix){
        unix = unix * 1;
        if (unix == 0){
            return null;
        }
        var tz = TZ_OFFSET * 60;
        return new Date((tz + unix) * 1000);
    };

    NS.dateToTime = function(date){
        return lz(date.getHours()) + ':' + lz(date.getMinutes());
    };

    var DPOINT = '.';
    NS.dateToString = function(date){
        if (L.isNull(date)){
            return '';
        }
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();
        return lz(day) + DPOINT + lz(month) + DPOINT + year;
    };
    NS.stringToDate = function(str){
        str = str.replace(/,/g, '.').replace(/\//g, '.');
        var aD = str.split(DPOINT);
        if (aD.length != 3){
            return null;
        }
        var day = aD[0] * 1, month = aD[1] * 1 - 1, year = aD[2] * 1;
        if (day > 31 || day < 0){
            return null;
        }
        if (month > 11 || month < 0){
            return null;
        }
        return new Date(year, month, day);
    };

    NS.timeToString = function(date){
        if (L.isNull(date)){
            return '';
        }
        return lz(date.getHours()) + ':' + lz(date.getMinutes());
    };
    NS.parseTime = function(str){
        var a = str.split(':');
        if (a.length != 2){
            return null;
        }
        var h = a[0] * 1, m = a[1] * 1;
        if (!(h >= 0 && h <= 23 && m >= 0 && m <= 59)){
            return null;
        }
        return [h, m];
    };

    // кол-во дней, часов, минут (параметр в секундах)
    NS.timeToSSumma = function(hr){
        var ahr = [];
        var d = Math.floor(hr / (60 * 60 * 24));
        if (d > 0){
            hr = hr - d * 60 * 60 * 24;
            ahr[ahr.length] = d + 'д';
        }
        var h = Math.floor(hr / (60 * 60));
        if (h > 0){
            hr = hr - h * 60 * 60;
            ahr[ahr.length] = h + 'ч';
        }
        var m = Math.floor(hr / 60);
        if (m > 0){
            hr = hr - m * 60;
            ahr[ahr.length] = m + 'м';
        }
        return ahr.join(' ');
    };

};