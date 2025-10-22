

class Experiment {
	
	colours = {
		'black'  : [16, 16, 16, 255],
		'blue'   : [20, 129, 235, 255],
		'green'  : [22, 235, 20, 255],
		'orange' : [235, 126, 20, 255],
		'pink'   : [233, 20, 235, 255],
		'purple' : [126, 17, 238, 255],
		'red'    : [238, 17, 19, 255],
		'yellow' : [232, 238, 108, 255],
		'white'  : [250, 250, 250, 255],
	};

	constructor(args = {}) {	
		// Create the experiment plus perform other startup processess.
		console.log('booting tomJS');

		// debugging
		this.pilot = args.pilot ?? false;
		this.verbose = args.verbose ?? false;
		this.show_fps = args.show_fps ?? false;

		// set body defaults
		document.body.style.backgroundColor = "black";
		document.body.style.color = "white";

		// gather identifying information
		this.subject  = Date.now();
		this.file = null;	
		if (this.verbose) console.log(this.subject, this.file);
		
		// create canvas
		this.height = window.innerHeight - 16;
		this.width  = window.innerWidth - 16;
		this.size   = Math.min(this.height, this.width); // find the smaller dimension
		this.canvas = document.createElement('canvas');
		this.canvas.id = "canvas";
		this.canvas.height = this.size;
		this.canvas.width  = this.size; // make canvas square
		this.canvas.style.position = "absolute"; 
		this.canvas.style.backgroundColor = "black";
		this.canvas.style.color = "white";
		this.canvas.style.left = (this.width - this.size + 16) / 2 + "px"; // position canvas in center
		document.body.appendChild(this.canvas); // add canvas to window
		this.context = this.canvas.getContext("2d");
		
		// controls
		this.keyboard  = new Keyboard();
		this.key_a     = args.key_a     ?? 'f';
        this.key_b     = args.key_b     ?? 'j';
        this.key_quit  = args.key_quit  ?? 'Escape';
        this.key_back  = args.key_back  ?? 'Backspace';
		this.resp_a    = args.resp_a    ?? 'A';
		this.resp_b    = args.resp_b    ?? 'B';
		this.key = '';
		this.dir = '';
		if (this.verbose) console.log(this.key_a, this.key_b, this.key_quit, this.key_back, this.resp_a, this.resp_b);
		// TODO : make inputs not dependent on keyboard layout using keycodes and positions
		
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
        this.now   = window.performance.now();
        this.frame = 0;
		this.fps   = args.fps ?? 120;
		this.tick  = 1000 / this.fps;
		// TODO: make actually run at target fps
		
		// timeline
        this.running  = true;
        this.timeline = [];
        this.time_pos = 0;

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
        let _new_trial = new trial_class(args);
        this.appendToTimeline(_new_trial);
        this.trials += 1;
	}


	appendBlock(trial_type, trialwise={}, additional={}, trial_reps=1, start_slide=null, end_slide=null) {
		let _t_cells = returnTotalDictLength(trialwise);
		let _trialwise = returnAllCombinationsFromDict(trialwise);
		_trialwise = returnShuffledArray(_trialwise);
		let _n_trials = _t_cells * trial_reps;
		if (start_slide != null) this.appendToTimeline(start_slide);
		for (let t = 0; t < _n_trials; t++) {
			let _args = Object.assign({ }, _trialwise[t%_t_cells], additional, {'block':this.blocks, 'trial':t});
			this.appendOneTrial(trial_type, _args);
		};
		if (end_slide != null) this.appendToTimeline(end_slide);
		this.blocks += 1;
	}


	appendBlocks(trial_type, blockwise={}, trialwise={}, additional={}, block_reps=1, trial_reps=1, start_slide=null, end_slide=null) {
        // Append a number of blocks with different blockwise and trialwise arguments, filling out the entire provided design matrix.
		let _b_cells  = returnTotalDictLength(blockwise);
        for (let b = 0; b < block_reps; b++) {
            let _blockwise = returnAllCombinationsFromDict(blockwise);
            _blockwise = returnShuffledArray(_blockwise);
            for (let i = 0; i < _b_cells; i++) {
				let _additional = Object.assign({ }, _blockwise[i%_b_cells], additional);
                this.appendBlock(trial_type, trialwise, _additional, trial_reps, start_slide, end_slide);
			};
		};
	}


	averageFromTimeine (variable, conditions=[[]]) {
        let values = [];
        let n = 0;
        for (let t = 0; t < this.timeline.length; t++) {
            let trial = this.timeline[t];
			if ('data' in trial == false) continue;
			// check all conditions are met
			let all_clear = true;
            for (let c = 0; c < conditions.length; c++) {
				let condition = conditions[c];
				let value = trial.data[condition[0]];
				let target = condition[1];
				if (value != target) all_clear = false;
			};
			// if all clear is still true after checking all conditions
			if (all_clear) {
				values.push(trial.data[variable]);
				n += 1;
			};
		};
		let sum = values.reduce((a, b) => a + b, 0);
        let average = (sum / values.length);
        return average;
		// TODO: make exclude non-condition
	}


	countInData(...conditions) {
        // Count the number of times a variable appears as true.
        let count = 0;
		for (let t = 0; t < this.timeline.length; t++) {
			if (!'data' in this.timeline[t]) continue;
			let _data = this.timeline[t].data;
			let ok = true;
			for (i in conditions) {
				if (_data[i[0]] != i[1]) ok = false;
			}
			if (ok) count += 1;
		};
        return count;
		// TODO: make exclude non-condition
	}


	error(message) {
		this.running = false;
		this.context.fillStyle = "red";
		this.context.fillRect(0, 0, this.width, this.height);
		this.writeToCanvas('ERROR: '+message);
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
		};
	}
	
	
	resetCanvas () {
		// clear the screen, rendering just a black backgorund
		this.context.fillStyle = "black";
		this.context.fillRect(0, 0, this.width, this.height);
	}


	run = () => {
		if (!this.running) return;
		this.now = window.performance.now();
		this.frame += 1;
		this.resetCanvas();		
		this.update();
		requestAnimationFrame(this.run);
	}


	saveData() {
		console.log('data saved :)');
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
		let _pos_x = tomJS.size * _x;
		let _pos_y = tomJS.size * _y;
		let _width = tomJS.size ?? 1;
		tomJS.context.fillText(text, _pos_x, _pos_y, _width);
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
		// does nothing
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
			'block'                : args.block ?? tomJS.blocks,
			'trial'                : args.trial ?? tomJS.trials,
			'condition'            : args.condition ?? null,
			'rt'                   : null,
			'score'                : null,
			'outcome'              : null,
			'rf'				   : null,
			'start_frame'          : null,
			'start_time'           : null,
			'fixation_duration'    : args.fixation_duration ?? 1.000,
			'fixation_frames'      : null,
			'fixation_start_time'  : null,
			'fixation_start_frame' : null,
			'fixation_end_time'    : null,
			'fixation_end_frame'   : null,
			'fixation_on_time'     : null,
			'fixation_off_time'    : null,
			'fixation_on_frame'    : null,
			'fixation_off_frame'   : null,
			'stimulus_duration'    : args.stimulus_duration ?? 3.000,
			'stimulus_fast'        : args.stimulus_fast ?? 0.200,
			'stimulus_slow'        : args.stimulus_slow ?? 3.000,
			'stimulus_frames'      : null,
			'stimulus_start_time'  : null,
			'stimulus_start_frame' : null,
			'stimulus_end_time'    : null,
			'stimulus_end_frame'   : null,
			'stimulus_on_time'     : null,
			'stimulus_off_time'    : null,
			'stimulus_on_frame'    : null,
			'stimulus_off_frame'   : null,
			'target'               : null,
			'response_key'         : null,
			'response'             : null,
			'response_frame'       : null,
			'response_given'       : null,
			'feedback_duration'    : args.feedback_duration ?? 1.000,
			'feedback_frames'      : null,
			'feedback_start_time'  : null,
			'feedback_start_frame' : null,
			'feedback_end_time'    : null,
			'feedback_end_frame'   : null,
			'feedback_on_time'     : null,
			'feedback_off_time'    : null,
			'feedback_on_frame'    : null,
			'feedback_off_frame'   : null,
			'feedback_text'        : null,
			'feedback_colour'      : null,
			'end_frame'            : null,
			'end_time'             : null,
		};

		// gather target from stimulus
		this.data.target = this.stimulus.properties.target;

		// feedback information
		this.feedback_colors = args.feedback_colors ?? {
			'Correct': "white", 
			'Incorrect': "white", 
			'Fast': "white", 
			'Slow': "white", 
			'Censored': "white" 
		};
		this.feedback_texts  = args.feedback_texts  ?? { 
			'Correct': 'Correct', 
			'Incorrect': 'Incorrect', 
			'Fast': 'Too Fast', 
			'Slow': ' Too Slow', 
			'Censored': 'Too Slow' 
		};

		// ensure too slow response does not override stimulus duration, unless desired
		if ('stimulus_duration' in args && ! 'stimulus_slow' in args)
			this.data.stimulus_slow = this.data.stimulus_duration;

		// variables that current state
		this.substate = null;

	}


	// super ------------------------------------------------------------------


	onEnter() {
		super.onEnter();
		this.data.start_time = tomJS.now;
		this.data.start_frame = tomJS.frame;
		this.queueFirstSubstate();
		this.claculateStartAndEndTimes('fixation');
		this.claculateStartAndEndTimes('stimulus');
	}


	onExit() {
		super.onExit();
		this.data.end_time = tomJS.now;
		this.data.end_frame = tomJS.frame;
		if (tomJS.verbose) this.printTrialSummary();
	}


	onUpdate() {
		super.onUpdate();
		this.substate();
	}


	// fixation ---------------------------------------------------------------


	fixationEnter() {
		this.data.fixation_on_time  = tomJS.now;
		this.data.fixation_on_frame = tomJS.frame;
		this.substate = this.fixationUpdate;
	}


	fixationExit() {
		this.data.fixation_off_time  = tomJS.now;
		this.data.fixation_off_frame = tomJS.frame;
		this.stimulusEnter();
	}


	fixationUpdate() {
		if (this.substate_virgin) this.fixationEnter();
		tomJS.writeToCanvas('+');
		if (tomJS.now >= this.data.fixation_end_time) this.fixationExit();
	}


	// stimulus ---------------------------------------------------------------


	stimulusEnter() {
		this.data.stimulus_on_time = tomJS.now;
		this.data.stimulus_on_frame = tomJS.frame;
		this.substate = this.stimulusUpdate;		
	}


	stimulusExit() {
		this.data.stimulus_off_time  = tomJS.now;
		this.data.stimulus_off_frame = tomJS.frame;
		this.claculateStartAndEndTimes('feedback');
		this.feedbackEnter();
	}


	stimulusExitResponse() {
		this.recordResponse();
		this.calculateRT();
		this.determineOutcome();
		this.calculateScore();
		this.stimulusExit();		
	}


	stimulusExitTime() {
		this.determineOutcome();
		this.stimulusExit();
	}


	stimulusUpdate() {
		this.stimulus.drawStimulus(this.args);
		if (tomJS.keyboard.anyKeysPressed([tomJS.key_a, tomJS.key_b])) this.stimulusExitResponse();
		if (tomJS.frame >= this.data.stimulus_end) this.stimulusExitTime();
	}


	// feedback ---------------------------------------------------------------


	feedbackEnter() {
		this.updateFeedbackText()
		this.data.feedback_on_time = tomJS.now;
		this.data.feedback_on_frame = tomJS.frame;
		this.substate = this.feedbackUpdate;	
	}


	feedbackExit() {
		this.data.feedback_off_time = tomJS.now;
		this.data.feedback_off_frame = tomJS.frame;
		this.ready_to_exit = true;
	}


	feedbackUpdate() {
		tomJS.writeToCanvas(this.data.feedback_text, { 'colour': this.data.feedback_colour });	
		if (tomJS.now >= this.data.feedback_end_time) this.feedbackExit();
	}


	// functions --------------------------------------------------------------


	calculateRT() {
		this.data.rt = Math.round((this.data.response_given-this.data.stimulus_on_time),5)/1000;
		this.data.rf = this.data.response_frame-this.data.stimulus_on_frame;
	}
        
        
	calculateScore() {
		if (this.data.response == this.data.target) this.data.score = 1
		else this.data.score = 0;
	}


	claculateStartAndEndTimes(part) {
        // time
        this.data[part+'_start_time'] = tomJS.now + tomJS.tick;
        this.data[part+'_end_time']   = this.data[part+'_start_time'] + this.data[part+'_duration'] * 1000;
        // frame
        this.data[part+'_frames']      = this.data[part+'_duration'] / tomJS.fps;
        this.data[part+'_start_frame'] = tomJS.frame + 1;
        this.data[part+'_end_frame']   = this.data[part+'_start_frame'] + this.data[part+'_frames'];
	}


	determineOutcome() {
		if		(this.data.response == null)				 {this.data.outcome = 'Censored'}
		else if (this.data.rt >= this.data['stimulus_slow']) {this.data.outcome = 'Slow' }
		else if (this.data.rt <= this.data['stimulus_fast']) {this.data.outcome = 'Fast'}
		else if (this.data.response == this.data['target'])  {this.data.outcome = 'Correct'}
        else												 {this.data.outcome = 'Incorrect'};
	}


	printTrialSummary() {        
		console.log(
			this.data['block'], 
			this.data['trial'], 
			this.data['condition'], 
			this.data['rt'], 
			this.data['score'], 
			this.data['outcome'],
			this.data['response'],
			this.data['target'],
		);
	}


	queueFirstSubstate() {
		this.fixationEnter();		
	}


	recordResponse() {
		this.data.response_key   = tomJS.key; // key is the last key that was pressed
		this.data.response       = tomJS.dir; // the indicated direction of the last key pressed
		this.data.response_given = tomJS.now;
		this.data.response_frame = tomJS.frame;
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
					let _gabor_args = {..._content,...{'target':this.parseText(_content['target'])}};
					let _gabor = new Gabor(_gabor_args);
					_gabor.drawStimulus();
					break;
				case 'twolines':
					let _twoline_args = {..._content,...{'target':this.parseText(_content['target'])}};
					let _twolines = new TwoLines(_twoline_args);
					_twolines.drawStimulus();
					break;
			};
		};
	}


	parseText(_text) {
		if (_text.includes('~')) {
			let _split = _text.split('~');
			let _eval = eval('tomJS.' + _split[1]);
			_text = _split[0] + _eval + _split[2];
		};
		if (_text.includes('^')) {
			let _split = _text.split('^');
			let _eval = eval('this.' + _split[1]);
			_text = _split[0] + _eval + _split[2];
		};
		return _text;
	}


}


class Countdown extends Slide {


	constructor(lifetime, content = [], can_return = true, args = {}) {
		super(content, can_return, args);
		this.id = 'Countdown';
		this.lifetime = lifetime * 1000;
	}


	// super ------------------------------------------------------------------


	onUpdate() {
        tomJS.writeToCanvas(Math.round((this.start_time + this.lifetime - tomJS.now) / 1000));
        if (tomJS.now >= this.start_time + this.lifetime) this.ready_to_exit = true;
		super.onUpdate()
	}


}


class EndBlock extends Slide {


	constructor(content = [], can_return = true, args = {}) {
		super(content, can_return, args);
		this.score = null
        this.rt    = null
        this.n_cor = null
        this.n_err = null
        this.n_fst = null
        this.n_slw = null
        this.n_cen = null
	}


	// super ------------------------------------------------------------------


	onEnter () {
        super.onEnter();
		this.getCounts();
        this.getPercentages();
		this.calculateRates();
	}


    onExit () {
        tomJS.saveData();
        tomJS.block += 1;
        tomJS.trial = 0;
        super.onExit();
	}


	// functions --------------------------------------------------------------


	calculateRates() {
		return null
	}


	getCounts() {
		this.n_cor = Math.random();
        this.n_err = Math.random();
        this.n_fst = Math.random();
        this.n_slw = Math.random();
        this.n_cen = Math.random();
	}


	getPercentages() {
		this.score = Math.round(tomJS.averageFromTimeine('score', [[['block', tomJS.block]]])*100);
        this.rt    = Math.round(tomJS.averageFromTimeine('rt', [[['block', tomJS.block]]])*1000);
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
		const s = tomJS.size * this.properties.size;
		const cx = s / 2, cy = s / 2;

		// optional arguments
		const sigma = args.sigma ?? 0.2 * s;

		// calculate target direction multiplier
		let dir = null;
		if (this.properties.target == 'L') {dir = -1} else {dir = 1};

		// Calculate maths terms
		const theta = (this.properties.ori * Math.PI * dir) / 180;
		const cosT = Math.cos(theta), sinT = Math.sin(theta);
		const k = 2 * Math.PI * this.properties.sf / s;
		const amp = this.properties.lum * Math.max(0, Math.min(this.properties.contrast, 1));

		// Make image object
		const img = tomJS.context.createImageData(s, s);
		const data = img.data;

		// Add to img data, written by chatGPT
		let i = 0;
		for (let _y = 0; _y < s; _y++) {
			const dy = _y - cy
			for (let _x = 0; _x < s; _x++) {
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
		let pos_x = tomJS.size * this.properties.x - (s * 0.5);
		let pos_y = tomJS.size * this.properties.y - (s * 0.5);
		tomJS.context.putImageData(img, pos_x, pos_y);

		// TODO: make not fucked up
	}


}


class TwoLines extends Stimulus {

	
	constructor(args = {}) {
		if (!'target' in args) tomJS.error('no target passed to two line stimulus');
		super(args);
		this.id = 'TwoLines' + this.tag;
        this.properties.target     = args.target;
		this.properties.color_L    = args.twoline_color_L    ?? "white";
		this.properties.color_R    = args.twoline_color_R    ?? "white";
        this.properties.difference = args.twoline_difference ?? 10;			// pixels
        this.properties.distance   = args.twoline_distance   ?? 0.25;		// percent of canvas
        this.properties.height     = args.twoline_height     ?? 0.15;		// percent of canvas
        this.properties.width      = args.twoline_width      ?? 0.02;		// percent of canvas
        this.properties.x          = args.twoline_x          ?? 0.5;		// percent of canvas
		this.properties.y          = args.twoline_y          ?? 0.5;		// percent of canvas
		this.properties.keep_fix   = args.twoline_keep_fix   ?? true;
		if (!this.id in tomJS.stimuli) tomJS.stimuli[this.id] = this;
	}


	drawStimulus(args={}) {
		super.drawStimulus();
		if (this.properties.keep_fix) tomJS.writeToCanvas('+');
		this.drawOneLine('L');
		this.drawOneLine('R');
	}


	drawOneLine(side, args={}){
		// width
		let w = (tomJS.size * this.properties.width);
		// height
		let adjust = (side === this.properties.target) ? this.properties.difference : 0;
		let h = (tomJS.size * this.properties.height) + adjust;
		// y
		let pos_y = (tomJS.size * this.properties.y);
		let offset_y = h * 0.5;
		let y = pos_y - offset_y;
		// x
		let pos_x = tomJS.size * this.properties.x;
		let distance = tomJS.size * this.properties.distance;
		let offset_x = w * 0.5;
		let x = (side === "L") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
		// render
		tomJS.context.fillStyle = (side === this.properties.target) ? this.properties.color_L : this.properties.color_R ;
		tomJS.context.fillRect(x, y, w, h);
	}


}


class PixelPatch extends Stimulus {

	
	constructor(args = {}) {
		if (!'aness' in args) tomJS.error('no A-ness passed to pixel patch stimulus');
		if (args.aness == 0.5 | args.aness == 0) tomJS.error('pixel patch must have some bias');
		if (!args.pixelpatch_color_A in tomJS.colours) tomJS.error('pixel patch colour A not a valid tomJS colour');
		if (!args.pixelpatch_color_B in tomJS.colours) tomJS.error('pixel patch colour B not a valid tomJS colour');
		super(args);
		this.id = 'PixelPatch' + this.tag;
		// gather options and properties
		this.properties.aness      = args.pixelpatch_aness;
		this.properties.bias_type  = args.pixelpatch_bias_type  ?? 'percent';	// percent or pixel
		this.properties.color_A    = args.pixelpatch_color_A    ?? tomJS.colours.black;
		this.properties.color_B    = args.pixelpatch_color_B    ?? tomJS.colours.white;
        this.properties.size       = args.pixelpatch_size       ?? 0.3;			// percent of canvas
		this.properties.cell       = args.pixelpatch_cell       ?? 5;			// count
        this.properties.x          = args.pixelpatch_x          ?? 0.5;			// percent of canvas
		this.properties.y          = args.pixelpatch_y          ?? 0.5;			// percent of canvas
		// check bias type is acceptable
		if (!this.properties.bias_type in ['percent','pixel']) tomJS.error('pixel patch bias type not recognised');
		// assign target based on A-ness of stimuluss
		if (this.properties.bias_type == "percent" && this.properties.aness > 0.5) this.properties.target = 'A';
		else this.properties.target = 'B';
		// prepare image data to prevent redrawing every frame
		this.image_data = this.prepareImageData();
	}

	// super --------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		const s = Math.round(tomJS.size*this.properties.size);
		const img = tomJS.context.createImageData(s, s);
		this.assignImageData(img.data);
		let pos_x = tomJS.size * this.properties.x - (s * 0.5);
		let pos_y = tomJS.size * this.properties.y - (s * 0.5);
		tomJS.context.putImageData(img, pos_x, pos_y);
	}


	// functions ----------------------------------------------------------------------------------


	assignImageData(data) {
		for (let i = 0; i < data.length; i += 4) {
			data[i+0] = this.image_data[i+0];	// R
			data[i+1] = this.image_data[i+1];	// G
			data[i+2] = this.image_data[i+2];	// B
			data[i+3] = this.image_data[i+3];	// A
		};
	}


	prepareImageData() {
		const cell_pix = Math.round((tomJS.size*this.properties.size) / this.properties.cell);
		const grid_pix = Math.round(tomJS.size*this.properties.size);
		const grid_dim = grid_pix / cell_pix;	
		const A = this.properties.color_A;
		const B = this.properties.color_B;
		const aness = Math.round(grid_dim * this.properties.aness);
		let data = [];
		for (let x = 0; x < grid_dim; x++) {
			let row = Array(aness).fill(A).concat(Array(grid_dim-aness).fill(B));
			row = returnShuffledArray(row);
			row = row.flatMap(c => Array(cell_pix).fill(c));
			for (let y = 0; y < cell_pix; y++) data = data.concat(row.flat());
		};
		return new Uint8ClampedArray(data);
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
		let tmp = _shuffled[rng];
		_shuffled[rng] = _shuffled[i];
		_shuffled[i] = tmp;
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
			case tomJS.key_a: 
				tomJS.dir = tomJS.resp_a;
				break;
			case tomJS.key_b: 
				tomJS.dir = tomJS.resp_b;
				break;
		};
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

