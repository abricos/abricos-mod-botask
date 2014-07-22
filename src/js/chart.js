/*
@version $Id$
@package Abricos
@copyright Copyright (C) 2011 Abricos All rights reserved.
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
        {name: 'uprofile', files: ['users.js']},
		{name: 'chart', files: ['lib.js']},
        {name: 'botask', files: ['lib.js']}
	]
};
Component.entryPoint = function(){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NS = this.namespace, 
		TMG = this.template,
		API = NS.API,
		R = NS.roles;
	
	var UP = Brick.mod.uprofile,
		LNG = Brick.util.Language.getc('mod.botask');
	
	var NSChart = Brick.mod.chart;
	
	function colorToHex(color) {
	    if (color.substr(0, 1) === '#') {
	        return color;
	    }
	    var digits = /(.*?)rgb\((\d+), (\d+), (\d+)\)/.exec(color);
	    
	    var red = parseInt(digits[2]);
	    var green = parseInt(digits[3]);
	    var blue = parseInt(digits[4]);
	    
	    var rgb = blue | (green << 8) | (red << 16);
	    return digits[1] + '#' + rgb.toString(16);
	};
	
	var COLORS = [];
	// COLORS[COLORS.length] = {'border': '#D96666', 'body': '#CC3333'};
	COLORS[COLORS.length] = {'border': '#DD4477', 'body': '#E67399'};
	COLORS[COLORS.length] = {'border': '#994499', 'body': '#B373B3'};
	COLORS[COLORS.length] = {'border': '#6633CC', 'body': '#8C66D9'};
	COLORS[COLORS.length] = {'border': '#336699', 'body': '#668CB3'};
	COLORS[COLORS.length] = {'border': '#3366CC', 'body': '#668CD9'};
	COLORS[COLORS.length] = {'border': '#22AA99', 'body': '#59BFB3'};
	COLORS[COLORS.length] = {'border': '#329262', 'body': '#65AD89'};
	COLORS[COLORS.length] = {'border': '#109618', 'body': '#4CB052'};
	COLORS[COLORS.length] = {'border': '#66AA00', 'body': '#8CBF40'};
	COLORS[COLORS.length] = {'border': '#AAAA11', 'body': '#BFBF4D'};
	COLORS[COLORS.length] = {'border': '#D6AE00', 'body': '#E0C240'};
	COLORS[COLORS.length] = {'border': '#EE8800', 'body': '#F2A640'};
	COLORS[COLORS.length] = {'border': '#DD5511', 'body': '#E6804D'};
	COLORS[COLORS.length] = {'border': '#A87070', 'body': '#BE9494'};
	COLORS[COLORS.length] = {'border': '#8C6D8C', 'body': '#A992A9'};
	COLORS[COLORS.length] = {'border': '#627487', 'body': '#8997A5'};
	COLORS[COLORS.length] = {'border': '#7083A8', 'body': '#94A2BE'};
	COLORS[COLORS.length] = {'border': '#5C8D87', 'body': '#85AAA5'};
	COLORS[COLORS.length] = {'border': '#898951', 'body': '#A7A77D'};
	COLORS[COLORS.length] = {'border': '#B08B59', 'body': '#C4A883'};
	COLORS[COLORS.length] = {'border': '#9F3501', 'body': '#C7561E'};
	COLORS[COLORS.length] = {'border': '#8A2D38', 'body': '#B5515D'};
	COLORS[COLORS.length] = {'border': '#962181', 'body': '#C244AB'};
	COLORS[COLORS.length] = {'border': '#402175', 'body': '#603F99'};
	COLORS[COLORS.length] = {'border': '#30487E', 'body': '#536CA6'};
	COLORS[COLORS.length] = {'border': '#182186', 'body': '#3640AD'};
	COLORS[COLORS.length] = {'border': '#1F753C', 'body': '#3C995B'};
	COLORS[COLORS.length] = {'border': '#3D8215', 'body': '#5CA632'};
	COLORS[COLORS.length] = {'border': '#5A9A08', 'body': '#7EC225'};
	COLORS[COLORS.length] = {'border': '#81910B', 'body': '#A7B828'};
	COLORS[COLORS.length] = {'border': '#9D7000', 'body': '#CF9911'};
	COLORS[COLORS.length] = {'border': '#AA5A00', 'body': '#D47F1E'};
	COLORS[COLORS.length] = {'border': '#8D4500', 'body': '#B56414'};
	COLORS[COLORS.length] = {'border': '#743500', 'body': '#914D14'};
	COLORS[COLORS.length] = {'border': '#870B50', 'body': '#AB2671'};
	COLORS[COLORS.length] = {'border': '#70237F', 'body': '#9643A5'};
	COLORS[COLORS.length] = {'border': '#25617D', 'body': '#4585A3'};
	COLORS[COLORS.length] = {'border': '#515151', 'body': '#737373'};
	COLORS[COLORS.length] = {'border': '#227F63', 'body': '#41A587'};
	COLORS[COLORS.length] = {'border': '#A59114', 'body': '#D1BC36'};
	COLORS[COLORS.length] = {'border': '#871111', 'body': '#AD2D2D'};
	
    var buildTemplate = this.buildTemplate;

	// линия на графике
	var TaskBarFeature = function(cfg){
		cfg = L.merge({
			'color': '#3f72bf'
		}, cfg || {});
		cfg['background'] = cfg['background'] || cfg['color'];
		
		TaskBarFeature.superclass.constructor.call(this, cfg);
	};
	YAHOO.extend(TaskBarFeature, NSChart.Feature, {
		draw: function(chart, points){
			var g = chart.graphics, __self = this, cfg = this.cfg;
			
			var offset = chart.cfg.offset,
				vScale = chart.vScale,
				hScale = chart.hScale,
				w = chart.getWidth(),
				h = chart.getHeight(),
				y = h+offset.top-1;
			
			var wbar = Math.floor(hScale.transform(hScale.cfg['min'] + hScale.cfg['step']) - hScale.transform(hScale.cfg['min']));
			wbar = wbar-wbar*.3;
			
			var days = cfg['worker']['days'],
				from = cfg['worker']['from'],
				to = cfg['worker']['to'],
				oneday = 60*60*24,
				tkColors = cfg['worker']['tkColors'],
				__self = this;

			var tkColMan = new TaskColumnManager();
			
			var barList = g.set();
			
			for (var i=0;i<days.length;i++){
				var day = days[i];
				rday = from*oneday+i*oneday;
				
				tkColMan.calculate(day, function(tk, pd, index, count){
					var wobar = wbar / count;

					var m1 = L.isNull(pd[0]) ? cfg['worker']['minTime'] : pd[0],
						m2 = L.isNull(pd[1]) ? cfg['worker']['maxTime'] : pd[1];
					
					var px = hScale.transform(rday),
						py1 = vScale.transform(m1),
						py2 = vScale.transform(m2);
					
					var y1 = Math.min(py1, py2),
						y2 = Math.max(py1, py2);

					var hbar = Math.max(Math.abs(y2-y1), 1);
					
					var dx = wobar*index;
					
					var clr = tkColors[tk.id];

					barList.push(g.rect(px-wbar/2+dx, y1, wobar, hbar).attr({
						'stroke': clr['border'], 'stroke-width': 1,
						'fill': clr['body'],
						'cursor': 'pointer'
					}));
					var rect = barList[barList.length-1];
					
					var prv = {'rect': rect, 'tk':tk, 'rday':rday, 'pd':pd};
					
					rect.click(function(evt){__self._barClickHandle(evt, prv);});
					rect.mouseover(function(evt){__self._barMouseHandle(evt, prv);});
					rect.mouseout(function(evt){__self._barMouseHandle(evt, prv);});
					rect.mousemove(function(evt){__self._barMouseHandle(evt, prv);});
				});
			}
			barList.toFront();
		},
		_barMouseHandle: function(evt, p){
			var rect=p.rect, tk=p.tk, rday=p.rday, pd=p.pd;
			
			var cfg = this.cfg,
				tooltip = cfg['tooltip'],
			x = evt.layerX, y = evt.layerY+22;
			
			switch(evt.type){
			case 'mouseover':
				tooltip.show(x, y, tk, rday, pd);
				rect.attr({'opacity': .8});
				break;
			case 'mouseout':
				tooltip.hide();
				rect.attr({'opacity': 1});
				break;
			case 'mousemove':
				tooltip.move(x, y);
				break;
			}
		},
		_barClickHandle: function(evt, prv){
			window.location.href = "#app=botask/taskview/showTaskViewPanel/"+prv.tk.id+"/";
		}
	});
	NS.TaskBarFeature = TaskBarFeature;
	
	var TaskColumnManager = function(){
		this.init();
	};
	TaskColumnManager.prototype = {
		init: function(){
			this.columns = [];
		},
		calculate: function(day, f){
			
			this.columns = [];
			
			for (var id in day['tk']){
				var tk = day['tk'][id]['task'];
				var pds = day['tk'][id]['pds'];

				for (var ii=0;ii<pds.length;ii++){
					this.add(tk, pds[ii]);
				}
			}
			
			var cols = this.columns;

			for (var i=0;i<cols.length;i++){
				var tasks = cols[i].tasks;
				for (var ii=0;ii<tasks.length;ii++){
					f(tasks[ii]['tk'], tasks[ii]['pd'], i, cols.length);
				}
			}
		},
		add: function(tk, pd){
			var cols = this.columns;
			
			for (var i=0;i<cols.length;i++){
				if (cols[i].add(tk, pd)){
					return;
				}
			}
			cols[cols.length] = new TaskColumn(tk, pd);
		}
	};
	
	var TaskColumn = function(tk, pd){
		this.init(tk, pd);
	};
	TaskColumn.prototype = {
		init: function(tk, pd){
			this.tasks = [];
			this.add(tk, pd);
		},
		add: function(tk, pd){
			var ts = this.tasks;
			for (var i=0;i<ts.length;i++){
				var cpd = ts[i]['pd'];

				var p0 = L.isNull(pd[0]) ? 0 : pd[0],
					p1 = L.isNull(pd[1]) ? 1440 : pd[1],
					c0 = L.isNull(cpd[0]) ? 0 : cpd[0],
					c1 = L.isNull(cpd[1]) ? 1440 : cpd[1];
				
				if (!(p1<c0 || p0>c1) || (p0 >= c0 && p1<=c1) || (c0>=p0 && c1<=p1)){
					// в эту колонку не влезает
					return false;
				}
			}
			ts[ts.length] = {'tk': tk, 'pd': pd};
			return true;
		}
	};
	
	var WorkChartWidget = function(container, taskList, userid){
		this.init(container, taskList, userid);
	};
	WorkChartWidget.prototype = {
		init: function(container, taskList, userid){
			this.taskList = taskList;
			this.userid = userid;
			buildTemplate(this, 'work');
			container.innerHTML = this._TM.replace('work');
			this.render();
		},
		
		buildDays: function(tasks, gmin, gmax){
			var userid = this.userid;
		
			var oneday = 60*60*24,
				rbd = function(val){ return Math.floor(val/oneday); };
			
			var from = rbd(gmin), to = rbd(gmax)+1;
			var days = [], tkColors = {}, tkClrLength = 0;
		
			if (from >= to){ return; }
		
			var getColor = function(taskid){
				if (tkColors[taskid]){ return tkColors[taskid]; }
				
				if (tkClrLength >= COLORS.length-1){
					tkClrLength = 0;
				}
				tkColors[taskid] = COLORS[tkClrLength++];
				return tkColors[taskid];
			};
			
			var TIMEZONE = (new Date()).getTimezoneOffset()*60;
			
			var minTime = 1440, maxTime = 0;
			for (var day=from; day<=to; day++){
				var wks = {
						'tk': {},
						'count': 0
					}, rday = day*oneday;
				
				// были ли у этого пользователя работы в этот день? если да, то какие?
				for (var i=0;i<tasks.length;i++){
					var tk = tasks[i];
					var pds = tk.work.users[userid]['pd'];
					
					for (var ii=0;ii<pds.length;ii++){
						
						var t1 = pds[ii][0]-TIMEZONE, t2 = pds[ii][1]-TIMEZONE;
						
						if ((t1 <= rday && t2 > rday) || (t1 >= rday && t1 < rday+oneday)){  // в этом дне была работа над этой задачей
							var mt1 = Math.floor((t1 - rday)/60),
								mt2 = Math.floor((t2 - rday)/60);
							
							var m1 = null, m2 = null;
							
							if (mt1 >= 0 && mt1 <= 1440){
								m1 = mt1;
								minTime = Math.min(minTime, mt1);
								maxTime = Math.max(maxTime, mt1);
							}
							
							if (mt2 >= 0 && mt2 <= 1440){
								m2 = mt2;
								minTime = Math.min(minTime, mt2);
								maxTime = Math.max(maxTime, mt2);
							}
							
							if (!wks['tk'][tk.id]){
								wks['tk'][tk.id] = {'color': getColor(tasks[i].id), 'task': tasks[i], 'pds': []};
								wks['count']++;
							}
							// в минутах с начало дня шкалы времени
							wks['tk'][tk.id]['pds'][wks['tk'][tk.id]['pds'].length] = [m1, m2];
						}
					}
				}
				days[days.length] = wks;
			}
			
			if (minTime<maxTime){
				minTime = Math.max(minTime-60, 0);
				maxTime = Math.min(maxTime+60, 1440);
			}else{
				minTime = 0;
				maxTime = 1440;
			}
			return {
				'days': days,
				'from': from,
				'to': to,
				'minTime': minTime,
				'maxTime': maxTime,
				'tkColors': tkColors
			};
		},

		render: function(){
			var tasks = [], userid = this.userid, taskList = this.taskList;
			
			var gmin = 0, gmax = 0;
			taskList.foreach(function(tk){
				// if (tk.id*1 != 48){ return; }
				var pds = tk.work.users[userid]['pd'];
				if (!pds || pds.length == 0){ return; }
				tasks[tasks.length] = tk;
				
				var min = pds[0][0], max = pds[pds.length-1][1];
				
				if (gmin == 0){
					gmin = min;
					gmax = max;
				}else{
					gmin = Math.min(gmin, min);
					gmax = Math.max(gmax, max);
				}
			}, true);
			
			var days = this.buildDays(tasks, gmin, gmax);

			var points = [];
			points[points.length] = [gmin, days['minTime']];
			points[points.length] = [gmax, days['maxTime']];
			
			var TM = this._TM;
			
			new NSChart.LineChart(this._TM.getEl('work.id'), {
				'offset': {
					'left': 90
				},
				'scale': {
					'color': '999999',
					'x': {
						'manager': new NSChart.DateScale({ 
							'unix': true, // числовой ряд даты в unix формате
							'period': 'day', // среднее арифметическое: day || week || month || year || custom?,
							'round': true,
							'average': false
						})
					},
					'y': {
						'manager': new NSChart.TimeScale({
							'min': days['minTime'],
							'max': days['maxTime']
						})
					}
				},
				'grid': {
					'x': true, 'y': true
				},
				'features': [
		             new TaskBarFeature({
						'worker': days,
						'color': '#FF0000',
						'background': "#FFF",
						'points': points,
		 				'tooltip': new TaskBarTooltipWidget(TM.getEl('work.tooltip'))
		             })
				]
			});
		}
	};
	NS.WorkChartWidget = WorkChartWidget;
	
	var TaskBarTooltipWidget = function(element){
		this.init(element);
	};
	TaskBarTooltipWidget.prototype = {
		init: function(element){
			this.element = element;
			this.hide();
			buildTemplate(this, 'tooltip');
		},
		show: function(x, y, task, rday, pd){
			var el = this.element;
			this.move(x, y);
			if (this._isShow){ return; }
			this._isShow = true;
			
			var zr = function(n){return n<10 ? '0'+n: n;};
			var toTime = function(t){
				var h = Math.floor(t/60);
				var m = t-h*60;
				return zr(h)+':'+zr(m);
			};
			el.innerHTML = this._TM.replace('tooltip', {
				'tl': task.title,
				'dl': Brick.dateExt.convert(rday, 2),
				'tfrom': L.isNull(pd[0]) ? '...' : toTime(pd[0]),
				'tto': L.isNull(pd[1]) ? '...' : toTime(pd[1]),
				'hm': (L.isNull(pd[0]) || L.isNull(pd[1])) ? '...' : NS.timeToSSumma((pd[1]*1-pd[0]*1)*60)
			});
			
			Dom.setStyle(el, 'display', '');
		},
		move: function(x, y){
			var el = this.element;

			Dom.setStyle(el, 'left', x+'px');
			Dom.setStyle(el, 'top', y+'px');
		},
		hide: function(){
			this._isShow = false;
			Dom.setStyle(this.element, 'display', 'none');
		}
	};
	
};