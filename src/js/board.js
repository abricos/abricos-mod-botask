var Component = new Brick.Component();
Component.entryPoint = function(NS){
    NS.API.showBoardPanel = function(taskid){
        Brick.Page.reload('#app=botask/ws/showWorkspacePanel/');
    };
};