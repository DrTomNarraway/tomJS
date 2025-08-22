
class Experiment {
	
	constructor(args={}) {
		
		this.subject  = Date.now()
		this.date     = new Date().toDateString()
		this.browser  = navigator.appCodeName
		this.platform = navigator.platform
		this.file	  = null
		
		// controls
		this.key_left  = args.key_left  ?? 'f'
        this.key_right = args.key_right ?? 'j'
        this.key_quit  = args.key_quit  ?? 'Escape'
        this.key_back  = args.key_back  ?? 'Backspace'
		
		// feedback information
		this.feedback_colors = args.feedback_colors ?? {'Correct':'white', 'Incorrect':'white', 'Fast':'white', 'Slow':'white', 'Censored':'white'}
        this.feedback_texts  = args.feedback_texts ?? {'Correct':'Correct', 'Incorrect':'Incorrect', 'Fast':'Too Fast', 'Slow':' Too Slow', 'Censored':'Too Slow'}
		
		// demographics
        this.gather_demographics   = args.gather_demographics ?? true
        this.demographics_language = args.demographics_language ?? 'en'
		this.demographics          = {}
        if (this.gather_demographics) {
			this.demographics.age    = window.prompt(demographics_prompts.age[this.demographics_language], '')
			this.demographics.gender = window.prompt(demographics_prompts.gender[this.demographics_language], '')
			this.demographics.hand   = window.prompt(demographics_prompts.hand[this.demographics_language], '')
		}
		
		// timing
        this.now   = Date.now()
        this.frame = 0
		
		// timeline
        this.running  = true
        this.timeline = []
        this.time_pos = 0
        this.stimuli  = {}
        this.trials   = {}
		
	};	
	
};

function bootTomJS (args={}) {
	// Return an initialized experiment class, plus perform other startup processess.
	console.log('booting tomJS');
	// set body defaults
	document.body.style.backgroundColor = "pink";
	document.body.style.color = "white";
	// create canvas
	let canvas = document.createElement('canvas');
	canvas.id = "canvas";
	canvas.width = window.innerWidth - 16;
	canvas.height = window.innerHeight - 16;
	canvas.style.position = "absolute";
	canvas.style.backgroundColor = "black";
	canvas.style.color = "white";
	document.body.appendChild(canvas);
	// create tomJS object and store data in it
	let tomJS = new Experiment(args);
	tomJS.canvas = canvas;
	tomJS.context = canvas.getContext("2d");
	// add event listener
	document.addEventListener('keydown', processKeypress, true);
	tomJS.keys = [null, null];
	// return the finished tomJS object
	return tomJS;
};

function processKeypress (event) {
	// Accept a listener event and extract the key from it. Also append the key to the tomJS key log.
	let key = event.key;
    tomJS.keys[0] = tomJS.keys[1]; 	// move key from right to left
    tomJS.keys[1] = key;			// store new keypress on the right
};

function writeToBody (text) {
	// Write text to the body of the html page.
	let p = document.createElement("p");
	p.appendChild(document.createTextNode(text));
	document.body.appendChild(p);
};

function writeToCanvas (text, x=0.5, y=0.5, pt=18) {
	// Write text to the canvas with a relative position (50 being center).
	tomJS.context.fillStyle = "white"; 
	tomJS.context.textAlign = "center";
	tomJS.context.font = pt+"px Veranda";
	let pos_x = tomJS.canvas.width * x;
	let pos_y = tomJS.canvas.height * y;
	tomJS.context.fillText(text, pos_x, pos_y);
};

function sampleFromTruncatedExponential(mean, truncation, max) {
	// Draw a random sample from a truncated exponential dsitribution.
	let randomNumber = Math.random();
	let rolledNumber = Math.ceil(Math.log(1 - randomNumber)/(-(1 / mean))) + truncation;
	let cleanedNumber = Math.min(Math.max(parseInt(rolledNumber),truncation),max);
	return cleanedNumber;
};

function sampleFromNormal(mean=100, deviation) {
	// Draw a random sample from a normal distribution.
	let u = v = 0;
	while(u === 0) u = Math.random();
	while(v === 0) v = Math.random();
	let normalNumber = Math.sqrt(-deviation * Math.log(u)) * Math.c(deviation * Math.PI * v);
	normalNumber = normalNumber / 10.0 + 0.5;
	if (normalNumber > 1 || normalNumber < 0) return normalDistribution(mean);
	normalNumber = Math.round(normalNumber * (mean * 2));
	return normalNumber;
};

function shuffleArray (array) {
	// Return a randomly reordered version of an array.
	let currentIndex = array.length, temp, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temp = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temp;
	}
	return array;
};	

function fillArray (source, limit) {
	// Return an extended version of an array.
	array = [];
	let sourceLen = source.length;
	for (var i = 0; i < sourceLen; i++) {
		for (var f = 0; f < (limit) / sourceLen; f++) {
			array.push(source[i]);
		}
	}
	return array;
};

function drawGabor(contrast, orientation, x=0.5, y=0.5, size=0.5, args = {}) {
	// Draw a gabor patch with specified details to the tomJS canvas. Used chatGPT for the maths.
	const w  = tomJS.canvas.width * size;
	const h  = tomJS.canvas.height * size;
	const cx = w / 2, cy = h / 2;
	// Get optional settings
	const phase = args.phase ?? 0;
	const luminance = args.luminance ?? 127.5;
	const sigma = args.sigma ?? 0.2 * Math.min(w, h);
	const sf    = args.sf ?? 15;
	// Calculate maths terms
	const theta = (orientation * Math.PI) / 180;
	const cosT  = Math.cos(theta), sinT = Math.sin(theta);
	const k     = 2 * Math.PI * sf / w;
	const amp   = luminance * Math.max(0, Math.min(contrast, 1));
	// Make image object
	const img  = tomJS.context.createImageData(w, h);
	const data = img.data;
	// Add to img data, written by chatGPT
	let i = 0;
	for (let _y = 0; _y < h; _y++) {
		const dy = _y - cy;
		for (let _x = 0; _x < w; _x++) {
			const dx = _x - cx;
			const xPrime  =  dx * cosT + dy * sinT;
			const yPrime  = -dx * sinT + dy * cosT;
			const gauss   = Math.exp(-(xPrime * xPrime + yPrime * yPrime) / (2 * sigma * sigma));
			const carrier = Math.cos(k * xPrime + phase);
			const L = luminance + amp * carrier;	
			const v = Math.max(0, Math.min(255, L)) | 0;	
			data[i++] = v; // R
			data[i++] = v; // G
			data[i++] = v; // B
			data[i++] = Math.round(255 * gauss); // A
		}
	}
	// Draw
	let pos_x = tomJS.canvas.width * x - (w * 0.5);
	let pos_y = tomJS.canvas.height * y - (h * 0.5);
	tomJS.context.putImageData(img, pos_x, pos_y);
};

// demographics prompts

demographics_prompts = {
	'age' : {
		'en' : 'How old are you?',
		'de' : 'Wie alt bist du?',
	},
	'gender' : {
		'en' : 'What is your gender?',
		'de' : 'Welches Geschlecht hast du?',
	},
	'hand' : {
		'en' : 'Which is your main hand?',
		'de' : 'Welche Händigkeit haben Sie?',
	}
}
