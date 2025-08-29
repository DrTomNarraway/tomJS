
class Experiment {
	
	constructor(args={}) {		
		this.subject  = Date.now();
		this.date     = new Date().toDateString();
		this.browser  = navigator.appCodeName;
		this.platform = navigator.platform;
		this.file	  = null;
		
		// create canvas
		this.width = window.innerWidth - 16;
		this.height = window.innerHeight - 16;
		this.canvas = document.createElement('canvas');
		this.canvas.id = "canvas";
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.canvas.style.position = "absolute";
		this.canvas.style.backgroundColor = "black";
		this.canvas.style.color = "white";
		document.body.appendChild(this.canvas);
		this.context = this.canvas.getContext("2d");
		
		// controls
		this.key_left  = args.key_left  ?? 'f';
        this.key_right = args.key_right ?? 'j';
        this.key_quit  = args.key_quit  ?? 'Escape';
        this.key_back  = args.key_back  ?? 'Backspace';
		this.keys      = [null, null]
		
		// feedback information
		this.feedback_colors = args.feedback_colors ?? {'Correct':'white', 'Incorrect':'white', 'Fast':'white', 'Slow':'white', 'Censored':'white'};
        this.feedback_texts  = args.feedback_texts ?? {'Correct':'Correct', 'Incorrect':'Incorrect', 'Fast':'Too Fast', 'Slow':' Too Slow', 'Censored':'Too Slow'};
		
		// demographics
        this.gather_demographics   = args.gather_demographics ?? true;
        this.demographics_language = args.demographics_language ?? 'en';
		this.demographics          = {};
        if (this.gather_demographics) {
			this.demographics.age    = window.prompt(demographics_prompts.age[this.demographics_language], '')
			this.demographics.gender = window.prompt(demographics_prompts.gender[this.demographics_language], '')
			this.demographics.hand   = window.prompt(demographics_prompts.hand[this.demographics_language], '')
		};
		
		// timing
        this.now   = Date.now();
        this.frame = 0;
		
		// timeline
        this.running  = true;
        this.timeline = [];
        this.time_pos = 0;
        this.stimuli  = {};

        // timeline identifiers
        this.trial  = 0;
        this.block  = 0;
        this.trials = 0;
        this.blocks = 0;
		
		// debugging
		this.pilot = args.pilot ?? false;
		this.verbose = args.verbose ?? false;
	}	
	
	appendToTimeline (new_state) {
		this.timeline.push(new_state);
	}
	
	appendOneTrial (trial_class, args={}) {        
        let _new_trial = new trial_class(args)
        this.appendToTimeline(_new_trial)
        this.trials += 1
	}
	
	flushKeys () {
		this.keys = [null, null];
	}
	
	nextState () {
        let _end = this.timeline.length - 1;
        let _new_position = this.time_pos + 1;
        if (_new_position > _end) {
            console.log('at end of timeline, ending experiment');
            this.timeline[this.time_pos].onExit();
            this.running = false;
		} else {
            this.timeline[this.time_pos].onExit();
            this.time_pos = _new_position;
            this.timeline[this.time_pos].onEnter();
			if (this.verbose) console.log('entering '+this.timeline[this.time_pos].id);
		};
	}
	
	resetCanvas () {
		this.context.fillStyle = "rgb(0,0,0)";
		this.context.fillRect(0, 0, this.width, this.height);
	}
	
	update () {
        if (this.timeline[this.time_pos].ready_to_exit) this.nextState()
        else this.timeline[this.time_pos].update()
	}
	
	writeToCanvas (text, args={}) {
		// Write text to the canvas with a relative position (0.5 being center).
		tomJS.context.fillStyle = args.fillStyle ?? "white";
		tomJS.context.textAlign = args.textAlign ?? "center";
		let _pt = args.pt ?? 24;
		let tf = args.font ?? "Arial";
		let _font = _pt+ "px " + tf;
		tomJS.context.font = _font;
		let _x = args.x ?? 0.5;
		let _y = args.y ?? 0.5;
		let pos_x = tomJS.canvas.width * _x;
		let pos_y = tomJS.canvas.height * _y;
		tomJS.context.fillText(text, pos_x, pos_y);
	}
	
	run = () => {
		if (!this.running) return;
		this.resetCanvas();
		this.now = Date.now();
		this.frame += 1;
		this.update();
		requestAnimationFrame(this.run);
	}
	
}

// states ---------------------------------------------------------------------

class State {

	constructor (args={}) {
		this.id = 'State';
		this.ready_to_exit = false;
		this.is_virgin = true;
	}
	
	update () {
		if (this.is_virgin) this.onEnter();
		this.onUpdate();
	}
	
	onEnter () {  
        this.ready_to_exit = false;
		this.is_virgin = false;
	}
    
    onUpdate () {
		// does nothing
	}
	
	onExit () {
		// does nothing
	}
	
}

class Slide extends State {
	
	constructor (content=[], can_return=true, args={}) {        
        super();
		this.id         = 'Slide';
        this.content    = content;
        this.can_return = can_return;
	}
	
	// super ------------------------------------------------------------------
	
	onUpdate () {
		for (const _content of this.content) {
			let _text = this.parseText(_content['text']);			
            tomJS.writeToCanvas(_text, _content);
		};
        this.checkBothKeys();
	}
	
	// functions --------------------------------------------------------------
	
	checkBothKeys () {	
        if (tomJS.keys.includes(tomJS.key_left) && tomJS.keys.includes(tomJS.key_right)) {
			this.ready_to_exit = true;
			if (tomJS.verbose) console.log('both keys pressed');
		};
	}
	
	parseText (_text) {
		if (_text.search('~') != -1) {
			let _split = _text.split('~');
			let _eval = eval('tomJS.'+_split[1]);		
			_text = _split[0] + _eval + _split[2];
		};
		return _text;
	}
	
}

class Trial extends State {
	
	constructor (args={}) {        
        super();
		this.id = 'Trial';
		
		this.stimulus = args.stimulus ?? new Stimulus(args);
		
		this.data = {
            'block'                 : args.block ?? tomJS.blocks,
            'trial'                 : args.trial ?? tomJS.trials,
            'condition'             : args.condition ?? null,
            'rt'                    : null,
            'score'                 : null,
            'outcome'               : null,
            'start_frame'           : null,
            'start_time'            : null,
            'fixation_duration'     : args.fixation_duration ?? 1.000,
            'fixation_frames'       : null,
            'fixation_start'        : null,
            'fixation_end'          : null,
            'fixation_on_time'      : null,
            'fixation_off_time'     : null,
            'fixation_on_frame'     : null,
            'fixation_off_frame'    : null,
            'stimulus_duration'     : args.stimulus_duration ?? 3.000,
            'stimulus_fast'         : args.stimulus_fast ?? 0.200,
            'stimulus_slow'         : args.stimulus_slow ?? 3.000,
            'stimulus_frames'       : null,
            'stimulus_start'        : null,
            'stimulus_end'          : null,
            'stimulus_on_time'      : null,
            'stimulus_off_time'     : null,
            'stimulus_on_frame'     : null,
            'stimulus_off_frame'    : null,
            'target'                : args.target ?? null,
            'response_key'          : null,
            'response'              : null,
            'response_frame'        : null,
            'response_given'        : null,
            'feedback_duration'     : args.feedback_duration ?? 1.000,
            'feedback_frames'       : null,
            'feedback_start'        : null,
            'feedback_end'          : null,
            'feedback_on_time'      : null,
            'feedback_off_time'     : null,
            'feedback_on_frame'     : null,
            'feedback_off_frame'    : null,
            'end_frame'             : null,
            'end_time'              : null,
        };
		
		if ('stimulus_duration' in args && ! 'stimulus_slow' in args)
			this.data['stimulus_slow'] = this.data['stimulus_duration'];
		
		this.current_substate = null;
		this.substate_virgin  = true;
		
	}
	
	// super ------------------------------------------------------------------

    onEnter () {
        tomJS.flushKeys();
        // this.updateAllStimuli();
        // this.setTrialStartValues();
        this.queueFirstSubstate();
	}

    onUpdate () {
		if (this.substate_virgin) this.
        this.current_substate();
	}
	
	// substates --------------------------------------------------------------
	
	fixation = {
		enter: this.fixationEnter,
		update: this.fixationUpdate,
		exit: this.fixationExit,		
	}
	
	substates = {
		fixation : this.fixation,
	}
	
	// functions --------------------------------------------------------------
	
	fixationUpdate () {
		return
	}
	
	fixationEnter () {
        this.data['fixation_on_time']  = tomJS.now;
        this.data['fixation_on_frame'] = tomJS.frame;
	}
	
	fixationExit () {
        this.data['fixation_off_time']  = tomJS.now;
        this.data['fixation_off_frame'] = tomJS.frame;
        // this.queueStimulus();
	}
	
	queueFirstSubstate () {
		this.current_substate = this.fixationSubstate;
	}
	
	queueFixation() {		
		// this.data['fixation_frames'] = this.experiment.convertDurationToFrames(self.data['fixation_duration']);
        this.data['fixation_start']  = tomJS.frame + 1;
        this.data['fixation_end']    = this.data['fixation_start'] + self.data['fixation_frames'];
	}
	
}

// stimuli --------------------------------------------------------------------

class Stimulus {    
	
	constructor (args={}) {
		this.id = 'Stimulus' + args.tag ?? '';
        this.properties = args;
	}

    drawStimulus () {}

    resetStimulus () {}
	
	set (key, value, reset=true) {
        this.properties[key] = value;
        if (reset) this.resetStimulus();
	}

}

class Gabor extends Stimulus {

	constructor (args={}) {
		super(args);
		this.id = 'Gabor' + args.tag ?? '';
        this.properties.contrast = args.gabor_contrast ?? 0.5;
        this.properties.opacity  = args.gabor_opacity  ?? 1.0;
        this.properties.ori      = args.gabor_ori      ?? 25;
        this.properties.x        = args.gabor_x        ?? 0.5;
		this.properties.y        = args.gabor_y        ?? 0.5;
        this.properties.sf       = args.gabor_sf       ?? 15;
        this.properties.size     = args.gabor_size     ?? 0.5;
		this.properties.phase    = args.gabor_phase    ?? 0;
		this.properties.lum      = args.gabor_lum      ?? 127.5;
		this.properties.target   = args.target         ?? 'L';
		if (!this.id in tomJS.stimuli[this.id]) tomJS.stimuli[this.id] = this;		
	}
	
	drawStimulus (args={}) {
		// Draw a gabor patch with specified details to the tomJS canvas. Used chatGPT for the maths.
		const w  = tomJS.canvas.width * this.properties.size;
		const h  = tomJS.canvas.height * this.properties.size;
		const cx = w / 2, cy = h / 2;
		
		// optional arguments
		const sigma = args.sigma ?? 0.2 * Math.min(w, h);
		
		// calculate target direction multiplier
		let dir = 0;
		if (this.properties.target == 'L') dir = -1;
		else dir = 1;
		
		// Calculate maths terms		
		const theta = (this.properties.ori * Math.PI * dir) / 180;
		const cosT  = Math.cos(theta), sinT = Math.sin(theta);
		const k     = 2 * Math.PI * this.properties.sf / w;
		const amp   = this.properties.lum * Math.max(0, Math.min(this.properties.contrast, 1));
		
		// Make image object
		const img  = tomJS.context.createImageData(w, h);
		const data = img.data;
		
		// Add to img data, written by chatGPT
		let i = 0;
		for (let _y = 0; _y < h; _y++) {
			const dy = _y - cy
			for (let _x = 0; _x < w; _x++) {
				const dx = _x - cx;
				const xPrime  =  dx * cosT + dy * sinT;
				const yPrime  = -dx * sinT + dy * cosT;
				const gauss   = Math.exp(-(xPrime * xPrime + yPrime * yPrime) / (2 * sigma * sigma));
				const carrier = Math.cos(k * xPrime + this.properties.phase);
				const L = this.properties.lum + amp * carrier;
				const v = Math.max(0, Math.min(255, L)) | 0;
				data[i++] = v; 							// R
				data[i++] = v; 							// G
				data[i++] = v; 							// B
				data[i++] = Math.round(255 * gauss); 	// A
			}
		}
		
		// Draw
		let pos_x = tomJS.canvas.width * this.properties.x - (w * 0.5);
		let pos_y = tomJS.canvas.height * this.properties.y - (h * 0.5);
		tomJS.context.putImageData(img, pos_x, pos_y);
	}
	
}

// functions ------------------------------------------------------------------

function bootTomJS (args={}) {
	// Return an initialized experiment class, plus perform other startup processess.
	console.log('booting tomJS');
	
	// set body defaults
	document.body.style.backgroundColor = "pink";
	document.body.style.color = "white";
	
	// create tomJS object and store data in it
	let tomJS = new Experiment(args);
	
	// add event listener
	document.addEventListener('keydown', processKeypress, true);
	
	// return the finished tomJS object
	return tomJS;
}

function processKeypress (event) {
	// Accept a listener event and extract the key from it. Also append the key to the tomJS key log.
	let key = event.key;
    tomJS.keys[0] = tomJS.keys[1]; 	// move key from right to left
    tomJS.keys[1] = key;			// store new keypress on the right
}

function writeToBody (text) {
	// Write text to the body of the html page.
	let p = document.createElement("p");
	p.appendChild(document.createTextNode(text));
	document.body.appendChild(p);
}

function sampleFromTruncatedExponential(mean, truncation, max) {
	// Draw a random sample from a truncated exponential dsitribution.
	let randomNumber = Math.random();
	let rolledNumber = Math.ceil(Math.log(1 - randomNumber)/(-(1 / mean))) + truncation;
	let cleanedNumber = Math.min(Math.max(parseInt(rolledNumber),truncation),max);
	return cleanedNumber;
}

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
}

function shuffleArray (array) {
	// Return a randomly reordered version of an array.
	let currentIndex = array.length, temp, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temp = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temp;
	};
	return array;
}	

function fillArray (source, limit) {
	// Return an extended version of an array.
	array = [];
	let sourceLen = source.length;
	for (let i = 0; i < sourceLen; i++) {
		for (let f = 0; f < (limit) / sourceLen; f++) {
			array.push(source[i]);
		};
	};
	return array;
}

// data -----------------------------------------------------------------------

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

