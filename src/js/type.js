var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var buildTemplate = this.buildTemplate;

    var TypeSelectWidget = function(container, parentid){
        this.init(container, parentid);
    };
    TypeSelectWidget.prototype = {
        init: function(container, parentid){
            this.parentid = parentid || 0;

            var TM = buildTemplate(this, 'widget');

            container.innerHTML = TM.replace('widget');

            var __self = this;
            E.on(TM.getEl('widget.id'), 'click', function(e){
                if (__self.onClick(E.getTarget(e))){
                    E.preventDefault(e);
                }
            });
        },
        destroy: function(){
            var el = this._TM.getEl('widget.id');
            el.parentNode.removeChild(el);
        },
        onClick: function(el){
            if (el.id == this._TM.getEl('widget.bsave').id){
                this.showNextPage();
            }
            return false;
        },
        showNextPage: function(){
            var TM = this._TM, gel = function(n){
                    return TM.getEl('widget.' + n);
                },
                pid = this.parentid;

            if (gel('tpfolder').checked){
                NS.navigator.folderCreate(pid);
            } else if (gel('tpproject').checked){
                NS.navigator.projectCreate(pid);
            } else if (gel('tptask').checked){
                NS.navigator.taskCreate(pid);
            }
        }
    };
    NS.TypeSelectWidget = TypeSelectWidget;

};