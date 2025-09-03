

class Experiment {
	
	constructor(args = {}) {	
		// Create the experiment plus perform other startup processess.
		console.log('booting tomJS');

		// debugging
		this.pilot = args.pilot ?? false;
		this.verbose = args.verbose ?? false;

		// set body defaults
		document.body.style.backgroundColor = "black";
		document.body.style.color = "white";

		// gather identifying information
		this.subject  = Date.now();
		this.date     = new Date().toDateString();
		this.language = navigator.language;
		this.file = null;	
		if (this.verbose) console.log(this.subject, this.date, this.language, this.file);
		
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
		this.keyboard = new Keyboard();
		this.key_left  = args.key_left  ?? 'f';
        this.key_right = args.key_right ?? 'j';
        this.key_quit  = args.key_quit  ?? 'Escape';
        this.key_back  = args.key_back  ?? 'Backspace';
		this.key = '';
		this.dir = '';
		if (this.verbose) console.log(this.key_left, this.key_right, this.key_quit, this.key_back);
		
		// demographics
        this.gather_demographics   = args.gather_demographics ?? true;
        this.demographics_language = args.demographics_language ?? 'en';
		this.demographics          = {};
        if (this.gather_demographics) {
			this.demographics.age    = window.prompt(demographics_prompts.age[this.demographics_language], '')
			this.demographics.gender = window.prompt(demographics_prompts.gender[this.demographics_language], '')
			this.demographics.hand   = window.prompt(demographics_prompts.hand[this.demographics_language], '')
		};
		if (this.verbose) console.log(this.demographics);
		
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
	}

	
	appendToTimeline (new_state) {
		this.timeline.push(new_state);
	}

	
	appendOneTrial (trial_class, args={}) {        
        let _new_trial = new trial_class(args)
        this.appendToTimeline(_new_trial)
        this.trials += 1
	}


	appendBlock(trial_type, trialwise = {}, additional = {}, trial_reps = 1, start_slide = null, end_slide = null) {
		let _t_cells = returnTotalDictLength(trialwise);
		let _trialwise = returnAllCombinationsFromDict(trialwise);
		_trialwise = returnShuffledArray(_trialwise); // TODO: make it actually shuffle
		let _n_trials = _t_cells * trial_reps;
		if (start_slide != null) this.appendToTimeline(start_slide);
		for (let t = 0; t < _n_trials; t++) {
			let _args = Object.assign({ }, _trialwise[t%_t_cells], additional, {'block':this.blocks, 'trial':t});
			this.appendOneTrial(trial_type, _args);
		};
		if (end_slide != null) this.appendToTimeline(end_slide);
		this.blocks += 1;
	}


	error(message) {
		this.running = false;
		this.context.fillStyle = "rgb(200,0,0)";
		this.context.fillRect(0, 0, this.width, this.height);
		this.writeToCanvas('ERROR: '+message);
	}

	
	flushKeys () {
		this.keys = ['',''];
	}

	
	nextState () {
        let _end = this.timeline.length - 1;
        let _new_position = this.time_pos + 1;
        if (_new_position > _end) {
            this.timeline[this.time_pos].onExit();
            console.log('at end of timeline, ending experiment');
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
		// run current state or move to next?
		if (this.timeline[this.time_pos].ready_to_exit) this.nextState();
		else this.timeline[this.time_pos].update();
	}

	
	writeToCanvas (text, args={}) {
		// Write text to the canvas with a relative position (0.5 being center).
		tomJS.context.fillStyle = args.colour ?? "white";
		tomJS.context.textAlign = args.align  ?? "center";
		let _pt = args.pt ?? 24;
		let _tf = args.font ?? "Arial";
		let _font = _pt+ "px " + _tf;
		tomJS.context.font = _font;
		let _x = args.x ?? 0.5;
		let _y = args.y ?? 0.5;
		let _pos_x = tomJS.canvas.width * _x;
		let _pos_y = tomJS.canvas.height * _y;
		let _width = tomJS.width ?? 1;
		tomJS.context.fillText(text, _pos_x, _pos_y, _width);
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


// states =====================================================================


class State {

	constructor(args = {}) {
		this.id = 'State';
		this.args = args;
		this.ready_to_exit = false;
		this.is_virgin = true;
	}

	update() {
		if (this.is_virgin) this.onEnter();
		this.onUpdate();
	}

	onEnter() {
		this.ready_to_exit = false;
		this.is_virgin = false;
	}

	onUpdate() {
		// does nothing
	}

	onExit() {
		if (tomJS.verbose) console.log(this.data);
	}

}


// trials =====================================================================


class Trial extends State {


	constructor(args={}) {
		super();
		this.id = 'Trial';

		// create new stimulus object
		this.stimulus = new args.stimulus(args) ?? new Stimulus(args);

		// create data object
		this.data = {
			'block'              : args.block ?? tomJS.blocks,
			'trial'              : args.trial ?? tomJS.trials,
			'condition'          : args.condition ?? null,
			'rt'                 : null,
			'score'              : null,
			'outcome'            : null,
			'start_frame'        : null,
			'start_time'         : null,
			'fixation_duration'  : args.fixation_duration ?? 1.000,
			'fixation_frames'    : null,
			'fixation_start'     : null,
			'fixation_end'       : null,
			'fixation_on_time'   : 0,
			'fixation_off_time'  : null,
			'fixation_on_frame'  : null,
			'fixation_off_frame' : null,
			'stimulus_duration'  : args.stimulus_duration ?? 3.000,
			'stimulus_fast'      : args.stimulus_fast ?? 0.200,
			'stimulus_slow'      : args.stimulus_slow ?? 3.000,
			'stimulus_frames'    : null,
			'stimulus_start'     : null,
			'stimulus_end'       : null,
			'stimulus_on_time'   : null,
			'stimulus_off_time'  : null,
			'stimulus_on_frame'  : null,
			'stimulus_off_frame' : null,
			'target'             : args.target ?? null,
			'response_key'       : null,
			'response'           : null,
			'response_frame'     : null,
			'response_given'     : null,
			'feedback_duration'  : args.feedback_duration ?? 1.000,
			'feedback_frames'    : null,
			'feedback_start'     : null,
			'feedback_end'       : null,
			'feedback_on_time'   : null,
			'feedback_off_time'  : null,
			'feedback_on_frame'  : null,
			'feedback_off_frame' : null,
			'feedback_text'      : null,
			'feedback_colour'    : null,
			'end_frame'          : null,
			'end_time'           : null,
		};

		// check that a target was passed to the trial
		if (this.data.target == null) tomJS.error('no target passed to trial');

		// feedback information
		this.feedback_colors = args.feedback_colors ?? { 'Correct': 'white', 'Incorrect': 'white', 'Fast': 'white', 'Slow': 'white', 'Censored': 'white' };
		this.feedback_texts  = args.feedback_texts  ?? { 'Correct': 'Correct', 'Incorrect': 'Incorrect', 'Fast': 'Too Fast', 'Slow': ' Too Slow', 'Censored': 'Too Slow' };

		// ensure too slow response does not override stimulus duration, unless desired
		if ('stimulus_duration' in args && ! 'stimulus_slow' in args)
			this.data.stimulus_slow = this.data.stimulus_duration;

		// variables that current state
		this.substate = null;
		this.substate_virgin = true;

	}


	// super ------------------------------------------------------------------


	onEnter() {
		super.onEnter();
		tomJS.flushKeys();
		this.data.start_time = tomJS.now;
		this.data.start_frame = tomJS.frame;
		this.queueFirstSubstate();
	}


	onExit() {
		super.onExit();
		this.data.end_time = tomJS.now;
		this.data.end_frame = tomJS.frame;
	}


	onUpdate() {
		super.onUpdate();
		this.substate();
	}


	// functions --------------------------------------------------------------


	calculateRT() {
		this.data.rt = (this.data.response_given-this.data.stimulus_on_time)/1000;
	}
        
        
	calculateScore() {
		if (this.data.response == this.data.target) this.data.score = 1;
		else this.data.score = 0;
	}


	determineOutcome() {
		if		(this.data.response == null)				 {this.data.outcome = 'Censored'}
		else if (this.data.rt >= this.data['stimulus_slow']) {this.data.outcome = 'Slow' }
		else if (this.data.rt <= this.data['stimulus_fast']) {this.data.outcome = 'Fast'}
		else if (this.data.response == this.data['target'])  {this.data.outcome = 'Correct'}
        else												 {this.data.outcome = 'Incorrect'}
	}


	feedbackEnter() {
		this.updateFeedbackText()
		this.data.feedback_on_time = tomJS.now;
		this.data.feedback_on_frame = tomJS.frame;
		this.substate_virgin = false;
	}


	feedbackExit() {
		this.data.feedback_off_time = tomJS.now;
		this.data.feedback_off_frame = tomJS.frame;
		this.ready_to_exit = true;
	}


	feedbackUpdate() {
		if (this.substate_virgin) this.feedbackEnter();
		tomJS.writeToCanvas(this.data.feedback_text, { 'colour': this.data.feedback_colour });	
		if (tomJS.frame >= this.data.feedback_end) this.feedbackExit();
	}


	fixationEnter() {
		this.data.fixation_on_time  = tomJS.now;
		this.data.fixation_on_frame = tomJS.frame;
		this.substate_virgin = false;
	}


	fixationExit() {
		this.data.fixation_off_time  = tomJS.now;
		this.data.fixation_off_frame = tomJS.frame;
		this.substate_virgin = true;
		this.queueStimulus();
	}


	fixationUpdate() {
		if (this.substate_virgin) this.fixationEnter();
		tomJS.writeToCanvas('+');
		if (tomJS.frame >= this.data.fixation_end) this.fixationExit();
	}


	queueFirstSubstate() {
		this.queueFixation();
	}


	queueFeedback() {
		this.data.feedback_frames = 60;
		this.data.feedback_start = tomJS.frame + 1;
		this.data.feedback_end = this.data.feedback_start + this.data.feedback_frames;
		this.substate = this.feedbackUpdate;
	}


	queueFixation() {
		this.data.fixation_frames = 60;
		this.data.fixation_start = tomJS.frame + 1;
		this.data.fixation_end = this.data.fixation_start + this.data.fixation_frames;
		this.substate = this.fixationUpdate;
	}


	queueStimulus() {
		this.data.stimulus_frames = 600;
		this.data.stimulus_start = tomJS.frame + 1;
		this.data.stimulus_end = this.data.stimulus_start + this.data.stimulus_frames;
		this.substate = this.stimulusUpdate;
	}

	
	recordResponse() {
		this.data.response_key   = tomJS.key; // key is the last key that was pressed
		this.data.response       = tomJS.dir; // the indicated direction of the last key pressed
		this.data.response_given = tomJS.now;
		this.data.response_frame = tomJS.frame;
	}


	stimulusEnter() {
		this.data.stimulus_on_time = tomJS.now;
		this.data.stimulus_on_frame = tomJS.frame;
		this.substate_virgin = false;
	}


	stimulusExitResponse() {
		this.recordResponse();
		this.calculateRT();
		this.determineOutcome();
		this.calculateScore();
		this.data.stimulus_off_time = tomJS.now;
		this.data.stimulus_off_frame = tomJS.frame;
		this.substate_virgin = true;
		this.queueFeedback();
	}


	stimulusExitTime() {
		this.determineOutcome();
		this.data.stimulus_off_time = tomJS.now;
		this.data.stimulus_off_frame = tomJS.frame;
		this.substate_virgin = true;
		this.queueFeedback();
	}


	stimulusUpdate() {
		if (this.substate_virgin) this.stimulusEnter();
		this.stimulus.drawStimulus(this.args);
		if (tomJS.keyboard.anyKeysPressed(['f', 'j'])) this.stimulusExitResponse();
		if (tomJS.frame >= this.data.stimulus_end)     this.stimulusExitTime();
	}


	updateFeedbackText() {
		this.data.feedback_text   = this.feedback_texts[this.data.outcome];
		this.data.feedback_colour = this.feedback_colors[this.data.outcome];
	}


}


// slides =====================================================================


class Slide extends State {


	constructor(content = [], can_return = true, args = {}) {
		super();
		this.id = 'Slide';
		this.args = args;
		this.content = content;
		this.can_return = can_return;
		this.start_time = null;
		this.force_wait = args.force_wait ?? 1000; // in milliseconds
	}


	// super ------------------------------------------------------------------


	onEnter() {
		this.start_time = tomJS.now;
		if (tomJS.verbose) console.log(this.start_time, this.force_wait, tomJS.now);
		super.onEnter();
	}


	onUpdate() {
		super.onUpdate();
		this.drawContent();
		if (tomJS.now < this.start_time + this.force_wait) return;
		this.checkUserInput();
	}


	// functions --------------------------------------------------------------


	checkUserInput() {
		if (tomJS.keyboard.allKeysPressed(['f', 'j'])) this.ready_to_exit = true;
	}


	drawContent() {
		for (const _content of this.content) {
			switch(_content.class) {
				case 'text':
					let _text = this.parseText(_content['text']);
					tomJS.writeToCanvas(_text, _content);
					break;
				case 'gabor':
					let _args = {..._content,...{'target':this.parseText(_content['target'])}};
					let _gabor = new Gabor(_args);
					_gabor.drawStimulus()
			};
		};
	}


	parseText(_text) {
		while (_text.includes('~')) { 
			if (_text.includes('~')) {
				let _split = _text.split('~');
				let _eval = eval('tomJS.' + _split[1]);
				_text = _split[0] + _eval + _split[2];
			};
		};
		return _text;
	}


}


// stimuli ====================================================================


class Stimulus {


	constructor(args = {}) {
		this.tag = args.tag ?? ''
		this.id = 'Stimulus' + this.tag;
		this.properties = {};
	}

	drawStimulus() {
		// does nothing
	}


	resetStimulus() {
		// does nothing
	}

	
	set(key, value, reset = true) {
		this.properties[key] = value;
		if (reset) this.resetStimulus();
	}


}


class Gabor extends Stimulus {


	constructor(args = {}) {
		if (!'target' in args) tomJS.error('no target passed to gabor stimulus');
		super(args);
		this.id = 'Gabor' + this.tag;
		this.properties.contrast = args.gabor_contrast ?? 0.5;
		this.properties.opacity = args.gabor_opacity ?? 1.0;
		this.properties.ori = args.gabor_ori ?? 25;
		this.properties.x = args.gabor_x ?? 0.5;
		this.properties.y = args.gabor_y ?? 0.5;
		this.properties.sf = args.gabor_sf ?? 15;
		this.properties.size = args.gabor_size ?? 0.5;
		this.properties.phase = args.gabor_phase ?? 0;
		this.properties.lum = args.gabor_lum ?? 127.5;		
		this.properties.target = args.target;
		if (!this.id in tomJS.stimuli) tomJS.stimuli[this.id] = this;
	}


	drawStimulus(args = {}) {
		super.drawStimulus();

		// Draw a gabor patch with specified details to the tomJS canvas. Used chatGPT for the maths.
		const w = tomJS.canvas.width * this.properties.size;
		const h = tomJS.canvas.height * this.properties.size;
		const cx = w / 2, cy = h / 2;

		// optional arguments
		const sigma = args.sigma ?? 0.2 * Math.min(w, h);

		// calculate target direction multiplier
		let dir = null;
		if (this.properties.target == 'L') dir = -1;
		else dir = 1;

		// Calculate maths terms		
		const theta = (this.properties.ori * Math.PI * dir) / 180;
		const cosT = Math.cos(theta), sinT = Math.sin(theta);
		const k = 2 * Math.PI * this.properties.sf / w;
		const amp = this.properties.lum * Math.max(0, Math.min(this.properties.contrast, 1));

		// Make image object
		const img = tomJS.context.createImageData(w, h);
		const data = img.data;

		// Add to img data, written by chatGPT
		let i = 0;
		for (let _y = 0; _y < h; _y++) {
			const dy = _y - cy
			for (let _x = 0; _x < w; _x++) {
				const dx = _x - cx;
				const xPrime = dx * cosT + dy * sinT;
				const yPrime = -dx * sinT + dy * cosT;
				const gauss = Math.exp(-(xPrime * xPrime + yPrime * yPrime) / (2 * sigma * sigma));
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


// utils ======================================================================


function fillArray(source, limit) {
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


function returnAllCombinationsFromDict(_dict) {
	// Return a list of dicts, each containing one argument from each key/value pair in dict.
	let out = [{}];
	for (const [key, values] of Object.entries(_dict)) {
		out = out.flatMap(obj => values.map(v => ({ ...obj, [key]: v })));
	};
	return out;
}


function returnShuffledArray(array) {
	// Return a randomly reordered version of an array.
	let _shuffled = array;
	for (let i = 0; i < _shuffled.length; i++) {
		let rng = Math.floor(Math.random()*_shuffled.length);
		let tmp = _shuffled[i];
		_shuffled[i]   = _shuffled[rng];
		_shuffled[rng] = tmp;
	};
	return _shuffled;
}


function returnTotalDictLength(x) {
	let out = 1;
	for (i in x) { out *= x[i].length };
	return out;
}


function sampleFromNormal(mean = 100, deviation) {
	// Draw a random sample from a normal distribution.
	let u = v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	let normalNumber = Math.sqrt(-deviation * Math.log(u)) * Math.c(deviation * Math.PI * v);
	normalNumber = normalNumber / 10.0 + 0.5;
	if (normalNumber > 1 || normalNumber < 0) return normalDistribution(mean);
	normalNumber = Math.round(normalNumber * (mean * 2));
	return normalNumber;
}


function sampleFromTruncatedExponential(mean, truncation, max) {
	// Draw a random sample from a truncated exponential dsitribution.
	let randomNumber = Math.random();
	let rolledNumber = Math.ceil(Math.log(1 - randomNumber) / (-(1 / mean))) + truncation;
	let cleanedNumber = Math.min(Math.max(parseInt(rolledNumber), truncation), max);
	return cleanedNumber;
}


function writeToBody(text) {
	// Write text to the body of the html page.
	let p = document.createElement("p");
	p.appendChild(document.createTextNode(text));
	document.body.appendChild(p);
}


// util classes ===============================================================


class Keyboard {


	constructor(args={}) {
		this.args = args;
		this.keys = {};
		this.keyPress   = this.keyPress.bind(this);
		this.keyRelease = this.keyRelease.bind(this);
		document.addEventListener('keydown', this.keyPress, true);
		document.addEventListener('keyup', this.keyRelease, true);
	}


	allKeysPressed(targets) {
		// loop over all keys and check if all targets are pressed
		for (let i = 0; i < targets.length; i++) {
			let target = targets[i];
			if (!target in this.keys | !this.keys[target]) return false;
		}
		// if we reach the end of the for loop then all target keys are pressed
		return true;
	}


	anyKeysPressed(targets) {
		// loop over all keys and check if any targets are pressed
		for (let i = 0; i < targets.length; i++) {
			let target = targets[i];
			if (target in this.keys & this.keys[target]) return true;
		}
		// if we reach the end of the for loop then no target keys are pressed
		return false;
	}


	keyPress(event) {
		let key = event.key;
		if (!key in this.keys) this.keys[key] = null;
		this.keys[key] = true;
		tomJS.key = key;
		switch (key) {
			case tomJS.key_left: 
				tomJS.dir = 'L';
				break;
			case tomJS.key_right: 
				tomJS.dir = 'R';
				break;
		};
		if (tomJS.verbose) console.log(key, tomJS.key, tomJS.dir);
	}


	keyRelease(event) {
		let key = event.key;
		this.keys[key] = false;
	}


}


// data =======================================================================


demographics_prompts = {
	'age': {
		'en': 'How old are you?',
		'de': 'Wie alt bist du?',
	},
	'gender': {
		'en': 'What is your gender?',
		'de': 'Welches Geschlecht hast du?',
	},
	'hand': {
		'en': 'Which is your main hand?',
		'de': 'Welche Händigkeit haben Sie?',
	}
}

