var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Y = Brick.YUI,
        COMPONENT = this,
        SYS = Brick.mod.sys;

    var LNG = this.language;

    NS.HistoryWidget = Y.Base.create('HistoryWidget', SYS.AppWidget, [], {
        onInitAppWidget: function(err, appInstance, options){
            this.renderHistory();
            NS.taskManager.historyChangedEvent.subscribe(this.onHistoryChanged, this, true);
        },
        destructor: function(){
            NS.taskManager.historyChangedEvent.unsubscribe(this.onHistoryChanged);
        },
        onHistoryChanged: function(type, args){
            var taskid = this.get('config')['taskid'] * 1,
                isRender = taskid == 0;

            if (!isRender){
                args[0].foreach(function(hst){
                    if (hst['taskid'] * 1 == taskid * 1){
                        isRender = true;
                        return true;
                    }
                });
            }
            if (isRender){
                this.renderHistory();
            }
        },
        buildRow: function(hst, ph){
            var tp = this.template,
                appInstance = this.get('appInstance'),
                userList = appInstance.getApp('uprofile').get('userList'),
                user = userList.getById(hst.userid),
                shead = "";

            if (this.get('config')['taskid'] * 1 > 0){
                var sht = "", LNGA = LNG['act'];

                var fa = [];
                if (hst.isStatus){
                    var TS = NS.TaskStatus;
                    if (hst.status == TS.OPEN){
                        if (hst.pstatus * 1 == 0){
                            fa[fa.length] = LNGA['new'];
                        } else {
                            fa[fa.length] = LNGA['open'];
                        }
                    } else if (hst.status == TS.CLOSE){
                        fa[fa.length] = LNGA['close'];
                    } else if (hst.status == TS.ARHIVE){
                        fa[fa.length] = LNGA['arhive'];
                    } else if (hst.status == TS.REMOVE){
                        fa[fa.length] = LNGA['remove'];
                    } else if (hst.status == TS.REOPEN){
                        fa[fa.length] = LNGA['reopen'];
                    } else if (hst.status == TS.ACCEPT){
                        fa[fa.length] = LNGA['st_accept'];
                    } else if (hst.status == TS.OPEN){
                        if (hst.pstatus == TS.ACCEPT){
                            fa[fa.length] = LNGA['st_unaccept'];
                        }
                    }
                } else {
                    if (hst.isTitle){
                        fa[fa.length] = LNGA['title'];
                    }
                    if (hst.isDescript){
                        fa[fa.length] = LNGA['descript'];
                    }
                    if (hst.isDeadline || hst.isDdlTime){
                        fa[fa.length] = LNGA['deadline'];
                    }

                    if (hst.userAdded.length > 0 || hst.userRemoved.length > 0){
                        fa[fa.length] = LNGA['users'];
                    }
                }

                sht = fa.join('<br />');

                shead = tp.replace('fhd', {'ht': sht});
            } else {


                if (!Y.Lang.isNull(ph) &&
                    ph.userid == hst.userid &&
                    ph.status == hst.status &&
                    ph.taskid == hst.taskid){

                    return "";
                }

                var tname = 'act' + hst.status;
                if (!hst.isStatus){
                    tname = 'act9';
                }

                shead = tp.replace('hd', {
                    'act': tp.replace(tname),
                    'tl': hst.taskTitle,
                    'tid': hst.taskid
                });
            }

            return tp.replace('item', {
                'tl': hst.taskTitle,
                'tid': hst.taskid,
                'hd': shead,
                'dl': Brick.dateExt.convert(hst.date.getTime() / 1000),
                uid: user.get('id'),
                unm: user.get('viewName')
            });
        },
        renderHistory: function(){
            var tp = this.template,
                instance = this,
                lst = "",

                prevHst = null,
                cfg = this.get('config'),
                counter = 1,
                limit = cfg['pagerow'] * cfg['page'];

            this.get('history').foreach(function(hst){
                var s = instance.buildRow(hst, prevHst);
                prevHst = hst;
                if (s == ""){
                    return;
                }

                lst += s;

                if (counter >= limit){
                    return true;
                }
                counter++;
            });
            tp.setHTML('list', lst);

            if (this.get('history').isFullLoaded){
                tp.hide('more');
            }
        },
        onClick: function(el){
            if (el.id == this._TId['widget']['bmore']){
                this.loadMore();
                return true;
            }
            return false;
        },
        loadMore: function(){
            var TM = this._TM;
            var elB = TM.getEl('widget.bmore'),
                elL = TM.getEl('widget.load'),
                history = this.get('history');

            var cfg = this.get('config');
            cfg['page']++;

            var counter = 1, limit = cfg['pagerow'] * cfg['page'];

            var isLoad = limit > history.count();

            if (!isLoad && cfg['taskid'] * 1 == 0){

                // кол-во в кеше достаточно, но может быть это кеш кусков загруженных задач?
                history.foreach(function(hst){
                    if (history.firstLoadedId > hst.id){
                        isLoad = true;
                        return true;
                    }
                });
            }

            if (isLoad){
                var instance = this;
                Dom.setStyle(elB, 'display', 'none');
                Dom.setStyle(elL, 'display', '');

                NS.taskManager.loadHistory(history, cfg['taskid'], function(){
                    Dom.setStyle(elB, 'display', '');
                    Dom.setStyle(elL, 'display', 'none');
                    instance.renderHistory();
                });
            } else {
                this.renderHistory();
            }

            // TM.getEl('widget.end').scrollIntoView(true);
        }
    }, {
        ATTRS: {
            component: {value: COMPONENT},
            templateBlockName: {value: 'widget'},
            history: {
                value: null,
                setter: function(val){
                    return val || NS.taskManager.history;

                }
            },
            config: {
                value: {},
                setter: function(val){
                    return Y.merge({
                        'taskid': 0,
                        'pagerow': 5,
                        'page': 1
                    }, val || {});
                }
            },
        },
        CLICKS: {},
    });

    return;
    var HistoryWidget = function(container, history, cfg){
        this.init(container, history, cfg);
    };
    HistoryWidget.prototype = {};
    NS.HistoryWidget = HistoryWidget;
};