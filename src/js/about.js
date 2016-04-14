var Component = new Brick.Component();
Component.requires = {
    mod: [
        {name: 'sys', files: ['container.js']},
        {name: '{C#MODNAME}', files: ['lib.js']}
    ]
};
Component.entryPoint = function(NS){

    var Dom = YAHOO.util.Dom,
        E = YAHOO.util.Event,
        L = YAHOO.lang;

    var buildTemplate = this.buildTemplate;

    var AboutWidget = function(container){
        this.init(container);
    };
    AboutWidget.prototype = {
        init: function(container){
            buildTemplate(this, 'widget');
            container.innerHTML = this._TM.replace('widget');
        }
    };
    NS.AboutWidget = AboutWidget;

    var AboutPanel = function(){
        AboutPanel.superclass.constructor.call(this, {
            fixedcenter: true, width: '790px', height: '400px'
        });
    };
    YAHOO.extend(AboutPanel, Brick.widget.Panel, {
        initTemplate: function(){
            buildTemplate(this, 'panel');
            return this._TM.replace('panel');
        },
        onLoad: function(){
            this.gmenu = new NS.GlobalMenuWidget(this._TM.getEl('panel.gmenu'), 'about');

            this.aboutWidget = new NS.AboutWidget(this._TM.getEl('panel.widget'));
        }
    });
    NS.AboutPanel = AboutPanel;

    var _activeAboutPanel = null;
    NS.API.showAboutPanel = function(){
        if (Y.Lang.isNull(_activeAboutPanel) || _activeAboutPanel.isDestroy()){
            _activeAboutPanel = new AboutPanel();
        }
        return _activeAboutPanel;
    };
};