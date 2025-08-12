
class Experiment {
	constructor() {};
};

function bootTomJS () {
	console.log('Booting up tomJS');
	// set body defaults
	document.body.style.backgroundColor = "pink";
	document.body.style.color = "white";
	// create canvas
	var canvas = document.createElement('canvas');
	canvas.id = "canvas";
	canvas.width = 800;
	canvas.height = 800;
	canvas.style.zIndex = 8;
	canvas.style.position = "relative";
	canvas.style.border = "0px solid";
	canvas.style.backgroundColor = "black";
	canvas.style.color = "white";
	document.body.appendChild(canvas);
	// create tomJS object and store data in it
	var tomJS = new Experiment();
	tomJS.canvas = canvas;
	tomJS.context = canvas.getContext("2d");
	return tomJS;
};

function writeToBody (text) {
	var p = document.createElement("p");
	p.appendChild(document.createTextNode(text));
	document.body.appendChild(p);
};

function writeToCanvas (text, x=50, y=50, pt=18) {	
	tomJS.context.fillStyle = "white"; 
	tomJS.context.textAlign = "center";
	tomJS.context.font = pt+"px Veranda";
	var pos_x = tomJS.canvas.width * (x / 100);
	var pos_y = tomJS.canvas.height * (y / 100);
	tomJS.context.fillText(text, pos_x, pos_y);
};

function sampleFromTruncatedExponential(mean, truncation, max) {
	var randomNumber = Math.random();
	var rolledNumber = Math.ceil(Math.log(1 - randomNumber)/(-(1 / mean))) + truncation;
	var cleanedNumber = Math.min(Math.max(parseInt(rolledNumber),truncation),max);
	return cleanedNumber;
};

function sampleFromNormal(mean=100, deviation) {
	var u = 0, v = 0;
	while(u === 0) u = Math.random();
	while(v === 0) v = Math.random();
	var normalNumber = Math.sqrt(-deviation * Math.log(u)) * Math.c(deviation * Math.PI * v);
	normalNumber = normalNumber / 10.0 + 0.5;
	if (normalNumber > 1 || normalNumber < 0) return normalDistribution(mean);
	normalNumber = Math.round(normalNumber * (mean * 2));
	return normalNumber;
};
