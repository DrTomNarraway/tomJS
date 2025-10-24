

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
		this.grid_lines = args.grid_lines ?? false;

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
		
		// timeline
        this.running  = true;
        this.timeline = [];
        this.time_pos = 0;

        // timeline identifiers
        this.trial  = 0;
        this.block  = 0;
        this.trials = 0;
		this.blocks = 0;


		// data
		this.data = [];

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
		const _block = new Block(trial_type, trialwise, additional, trial_reps, start_slide, end_slide);
		this.appendToTimeline(_block);
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


	drawGridLines() {
		// horizontal
		for (let i = 0; i < 5; i++) {
			let w = this.size;
			let h = this.size * 0.001;
			let x = (this.size * 0.5) - (w * 0.5);
			let y = (this.size * 0.5 * (i/2)) - (h * 0.5);
			tomJS.context.fillStyle = "white";
			tomJS.context.fillRect(x, y, w, h);
		}
		// vertical
		for (let i = 0; i < 5; i++) {
			let w = this.size * 0.001;
			let h = this.size;
			let x = (this.size * 0.5 * (i/2)) - (w * 0.5);
			let y = (this.size * 0.5) - (h * 0.5);
			tomJS.context.fillStyle = "white";
			tomJS.context.fillRect(x, y, w, h);
		}
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
		if (this.grid_lines) this.drawGridLines();
	}

	
	writeToCanvas (text, args={}) {
		// Write text to the canvas with a relative position (0.5 being center).
		let _upper = args.upper ?? false;
		let _text = _upper ? text.toUpperCase() : text;
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
		tomJS.context.fillText(_text, _pos_x, _pos_y, _width);
	}


}


// states =========================================================================================


class State {

	constructor(args = {}) {
		this.tag = args.tag ?? '';
		this.id = 'State' + this.tag;
		this.ready_to_exit = false;
	}

	update() {
		this.onUpdate();
	}

	onEnter() {
		this.ready_to_exit = false;
	}

	onUpdate() {
		// does nothing
	}

	onExit() {
		// does nothing
	}

}


// blocks =========================================================================================


class Block extends State {


	constructor(trial_type, trialwise={}, additional={}, trial_reps=1, start_slide=null, end_slide=null) {
		super();

		// identification
		this.tag = args.tag ?? '';
		this.id  = 'Block' + this.tag + tomJS.blocks;
		this.block = tomJS.blocks;
		tomJS.blocks++;
		
		// block data
		this.block_data = {};
		this.block_data.n         = 0;
		this.block_data.correct   = 0;
        this.block_data.incorrect = 0;
        this.block_data.fast      = 0;
        this.block_data.slow      = 0;
        this.block_data.censored  = 0;
		this.block_data.score     = [];
		this.block_data.rt        = [];

		// state
		this.ready_to_exit = false;		
		this.timeline      = this.generateTimeline(trial_type, trialwise, additional, trial_reps, start_slide, end_slide);
        this.time_pos      = 0;		
	}

	
	// super --------------------------------------------------------------------------------------


	onEnter() {
		super.onEnter();
	}


	onExit() {
		super.onExit();
	}


	onUpdate() {
		super.onUpdate();
		if (this.timeline[this.time_pos].ready_to_exit) this.nextState();
		else this.timeline[this.time_pos].update();
	}


	// functions ----------------------------------------------------------------------------------


	calculateBlockData() {
		let n = this.block_data.n;
		// arrays to averages
		this.block_data.rt = Math.round((this.block_data.rt.reduce((a,b)=>a+b,0)/n)*1000);
		this.block_data.score = Math.round((this.block_data.score.reduce((a,b)=>a+b,0)/n)*100);
		// counts to percentages
		this.block_data.correct   = Math.round(this.block_data.correct/n);
		this.block_data.incorrect = Math.round(this.block_data.incorrect/n);
		this.block_data.fast      = Math.round(this.block_data.fast/n);
		this.block_data.slow      = Math.round(this.block_data.slow/n);
		this.block_data.censored  = Math.round(this.block_data.censored/n);
	}


	pushOutcome(outcome) {
		switch(outcome){
			case 'Correct'   : this.block_data.correct++	; break;
			case 'Incorrect' : this.block_data.incorrect++  ; break;
			case 'Fast'      : this.block_data.fast++		; break;
			case 'Slow'      : this.block_data.slow++		; break;
			case 'Censored'  : this.block_data.censored++	; break;
		}
	}


	generateTimeline(trial_type, trialwise, additional, trial_reps, start_slide, end_slide) {
		let _timeline = [];
		let _t_cells = returnTotalDictLength(trialwise);
		let _trialwise = returnAllCombinationsFromDict(trialwise);
		_trialwise = returnShuffledArray(_trialwise);
		let _n_trials = _t_cells * trial_reps;
		if (start_slide != null) _timeline.push(start_slide);
		for (let t = 0; t < _n_trials; t++) {
			let _args = Object.assign({ }, _trialwise[t%_t_cells], additional, {'block':this.block, 'trial':t});
			let _new_trial = new trial_type(_args);
			_timeline.push(_new_trial);
			this.block_data.n++;

		};
		if (end_slide != null) _timeline.push(end_slide);
		return _timeline;
	}


	nextState () {
        let _end = this.timeline.length - 1;
        let _new_position = this.time_pos + 1;
        if (_new_position > _end) {
            this.timeline[this.time_pos].onExit();
            this.running = false;
		} else {
			if ('data' in this.timeline[this.time_pos]) {
				this.pushOutcome(this.timeline[this.time_pos].data.outcome);
				this.block_data.rt.push(this.timeline[this.time_pos].data.rt);
				this.block_data.score.push(this.timeline[this.time_pos].data.score);
			}
            this.timeline[this.time_pos].onExit();
            this.time_pos = _new_position;
            this.timeline[this.time_pos].onEnter();
		};
	}


}


// trials =========================================================================================


class Trial extends State {


	constructor(args={}) {
		super(args);
		this.id = 'Trial' + this.tag;

		// create new stimulus object
		if (!('stimulus' in args)) tomJS.error('no target stimulus passed to trial');
		this.stimulus = new args.stimulus(args);

		// create data object
		this.data = {
			'block'             : args.block ?? tomJS.blocks,
			'trial'             : args.trial ?? tomJS.trials,
			'condition'         : args.condition ?? null,
			'rt'                : null,
			'score'             : null,
			'target'            : this.stimulus.data.target,
			'response'          : null,
			'outcome'           : null,
		};

		this.properties = {			
			'start'             : null,
			'fixation_duration' : args.fixation_duration ?? 1.000,
			'fixation_start'    : null,
			'fixation_end'      : null,
			'fixation_on'       : null,
			'fixation_off'      : null,
			'stimulus_duration' : args.stimulus_duration ?? 3.000,
			'stimulus_fast'     : args.stimulus_fast ?? 0.200,
			'stimulus_slow'     : args.stimulus_slow ?? 3.000,
			'stimulus_start'    : null,
			'stimulus_end'      : null,
			'stimulus_on'       : null,
			'stimulus_off'      : null,
			'response_given'    : null,			
			'response_key'      : null,
			'feedback_duration' : args.feedback_duration ?? 1.000,
			'feedback_start'    : null,
			'feedback_end'	    : null,
			'feedback_on'	    : null,
			'feedback_off'	    : null,
			'feedback_text'     : null,
			'feedback_colour'   : null,
			'end'               : null,
		};;

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
			this.properties.stimulus_slow = this.properties.stimulus_duration;

		// variables that current state
		this.substate = null;

	}


	// super --------------------------------------------------------------------------------------


	onEnter() {
		super.onEnter();
		this.properties.start = tomJS.now;
		this.queueFirstSubstate();
		this.claculateStartAndEndTimes('fixation');
		this.claculateStartAndEndTimes('stimulus');
	}


	onExit() {
		super.onExit();
		this.properties.end = tomJS.now;
		// this.data = Object.assign({}, this.data, this.stimulus.data);
		if (tomJS.verbose) this.printTrialSummary();
	}


	onUpdate() {
		super.onUpdate();
		this.substate();
	}


	// fixation -----------------------------------------------------------------------------------


	fixationEnter() {
		this.properties.fixation_on = tomJS.now;
		this.substate = this.fixationUpdate;
	}


	fixationExit() {
		this.properties.fixation_off = tomJS.now;
		this.stimulusEnter();
	}


	fixationUpdate() {
		if (this.substate_virgin) this.fixationEnter();
		tomJS.writeToCanvas('+');
		if (tomJS.now >= this.properties.fixation_end) this.fixationExit();
	}


	// stimulus -----------------------------------------------------------------------------------


	stimulusEnter() {
		this.properties.stimulus_on = tomJS.now;
		this.substate = this.stimulusUpdate;		
	}


	stimulusExit() {
		this.properties.stimulus_off = tomJS.now;
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
		if (tomJS.keyboard.anyKeysPressed([tomJS.key_a, tomJS.key_b])) 
			this.stimulusExitResponse();
		if (tomJS.now >= this.properties.stimulus_end) 
			this.stimulusExitTime();
	}


	// feedback -----------------------------------------------------------------------------------


	feedbackEnter() {
		this.updateFeedbackText()
		this.properties.feedback_on = tomJS.now;
		this.substate = this.feedbackUpdate;	
	}


	feedbackExit() {
		this.properties.feedback_off = tomJS.now;
		this.ready_to_exit = true;
	}


	feedbackUpdate() {
		const text = this.properties.feedback_text;
		const colour = this.properties.feedback_colour;
		tomJS.writeToCanvas(text,{'colour':colour});
		if (tomJS.now >= this.properties.feedback_end) this.feedbackExit();
	}


	// functions ----------------------------------------------------------------------------------


	calculateRT() {
		const rg = this.properties.response_given;
		const on = this.properties.stimulus_on;
		this.data.rt = Math.round((rg - on), 5) / 1000;
	}
        
        
	calculateScore() {
		if (this.data.response == this.data.target) this.data.score = 1 
		else this.data.score = 0;
	}


	claculateStartAndEndTimes(part) {
        this.properties[part+'_start'] = tomJS.now;
        this.properties[part+'_end']   = this.properties[part+'_start'] +
			this.properties[part+'_duration']*1000;
	}


	determineOutcome() {
		const rsp = this.data.response;
		const rt  = this.data.rt;
		const tgt = this.data.target;
		const slw = this.properties.stimulus_slow;
		const fst = this.properties.stimulus_fast;
		if		(rsp == null) {this.data.outcome = 'Censored'}
		else if (rt >= slw)   {this.data.outcome = 'Slow'}
		else if (rt <= fst)   {this.data.outcome = 'Fast'}
		else if (rsp == tgt)  {this.data.outcome = 'Correct'}
        else				  {this.data.outcome = 'Incorrect'};
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
		this.data.response = tomJS.dir;
		this.properties.response_key   = tomJS.key; 
		this.properties.response_given = tomJS.now;
	}


	updateFeedbackText() {
		const outcome = this.data.outcome;
		this.properties.feedback_text   = this.feedback_texts[outcome];
		this.properties.feedback_colour = this.feedback_colors[outcome];
	}


}


class FeedbackDeadline extends Trial {


	constructor(args={}) {
		if (!('condition'in args)) tomJS.error('no condition (deadline) passed to feedback deadline trial');
		super(args);
		this.id = 'FeedbackDeadline' + this.tag;
        this.properties.stimulus_slow = this.data.condition;
	}


}


class VisibleFeedbackDeadline extends FeedbackDeadline {


	constructor(args={}) {
		if (!('condition'in args)) 
			tomJS.error('no condition passed to visible feedback deadline trial');
		super(args);
		this.id = 'VisibleFeedbackDeadline' + this.tag;
		this.properties.deadline_min = args.deadline_min ?? this.properties.stimulus_fast;
        this.properties.deadline_max = args.deadline_max ?? this.properties.stimulus_slow;
		this.progress_bar = new ProgressBar(args);
	}


	// super --------------------------------------------------------------------------------------


    onEnter() {
        super.onEnter();
        const percent = this.data.condition / this.properties.deadline_max;
        this.progress_bar.set('pb_percent', percent);
	}


    fixationUpdate() {
        this.drawProgressBar();
        super.fixationUpdate();
	}


    stimulusUpdate() {
        this.updateProgressBar();
        this.drawProgressBar();
        super.stimulusUpdate();
	}

    
    feedbackUpdate() {
        this.drawProgressBar();
        super.feedbackUpdate();
	}


    // functions ----------------------------------------------------------------------------------


    drawProgressBar() { 
        this.progress_bar.drawStimulus();
	}


    updateProgressBar() {
		const start = this.properties.stimulus_on;
		const now = tomJS.now;
		const condition = this.data.condition * 1000;
		const duration = this.properties.deadline_max * 1000;
		const progress = (now - start) + (duration - condition);
		const percent = 1 - Math.min(progress / duration, 1);
        if (percent >= 0.01) this.progress_bar.set('pb_percent', percent);
		else this.progress_bar.set('pb_color_F', "grey");
	}

}


// slides =========================================================================================


class Slide extends State {


	constructor(content = [], can_return = true, args = {}) {
		super();
		this.id = 'Slide';
		this.args = args;
		this.content = content;
		this.can_return = can_return;
		this.start = null;
		this.force_wait = args.force_wait ?? 1000; // in milliseconds
	}


	// super ------------------------------------------------------------------


	onEnter() {
		this.start = tomJS.now;
		super.onEnter();
	}


	onUpdate() {
		super.onUpdate();
		this.drawContent();
		if (tomJS.now < this.start + this.force_wait) return;
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
        tomJS.writeToCanvas(Math.round((this.start + this.lifetime - tomJS.now) / 1000));
        if (tomJS.now >= this.start + this.lifetime) this.ready_to_exit = true;
		super.onUpdate()
	}


}


class EndBlock extends Slide {


	constructor(content = [], can_return = true, args = {}) {
		super(content, can_return, args);
		this.score     = null
        this.rt        = null
        this.correct   = null
        this.incorrect = null
        this.fast      = null
        this.slow      = null
        this.censored  = null
	}


	// super ------------------------------------------------------------------


	onEnter () {
        super.onEnter();
        tomJS.timeline[tomJS.time_pos].calculateBlockData();
		this.score     = tomJS.timeline[tomJS.time_pos].block_data.score;
        this.rt        = tomJS.timeline[tomJS.time_pos].block_data.rt;
		this.correct   = tomJS.timeline[tomJS.time_pos].block_data.correct;
        this.incorrect = tomJS.timeline[tomJS.time_pos].block_data.incorrect;
        this.fast      = tomJS.timeline[tomJS.time_pos].block_data.fast;
        this.slow      = tomJS.timeline[tomJS.time_pos].block_data.slow;
        this.censored  = tomJS.timeline[tomJS.time_pos].block_data.censored;
	}


    onExit () {
        tomJS.saveData();
        tomJS.block += 1;
        tomJS.trial = 0;
        super.onExit();
	}


}


// stimuli ========================================================================================


class Stimulus {


	constructor(args = {}) {
		this.data = {};
	}

	drawStimulus() {
		// does nothing
	}


	resetStimulus() {
		// does nothing
	}

	
	set(key, value, reset = true) {
		this.data[key] = value;
		if (reset) this.resetStimulus();
	}


}


class Gabor extends Stimulus {


	constructor(args = {}) {
		if (!('target' in args)) tomJS.error('no target passed to gabor stimulus');
		super(args);
		this.data.target = args.target;
		this.data.gp_contrast = args.gp_contrast ?? 0.5;
		this.data.gp_opacity  = args.gp_opacity  ?? 1.0;
		this.data.gp_ori      = args.gp_ori      ?? 25;
		this.data.gp_x        = args.gp_x        ?? 0.5;
		this.data.gp_y        = args.gp_y        ?? 0.5;
		this.data.gp_sf       = args.gp_sf       ?? 15;
		this.data.gp_size     = args.gp_size     ?? 0.5;
		this.image_data = this.prepareImageData();
	}


	// super -----------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		const _s = Math.round(tomJS.size * this.data.gp_size);
		const img = tomJS.context.createImageData(_s, _s);
		this.assignImageData(img.data);
		let pos_x = tomJS.size * this.data.gp_x - (_s * 0.5);
		let pos_y = tomJS.size * this.data.gp_y - (_s * 0.5);
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
		const s = Math.round(tomJS.size * this.data.gp_size);
		const ori = this.data.gp_ori;
		const con = this.data.gp_contrast;
		const sf  = this.data.gp_sf;
		const lum = 127.5;
		const phs = 0;
		const sigma = 0.2 * s;
		const cx = s / 2, cy = s / 2;
		const dir = (this.data.target == 'A') ? -1 : 1;
		const theta = (ori * Math.PI * dir) / 180;
		const cosT = Math.cos(theta), sinT = Math.sin(theta);
		const k = 2 * Math.PI * sf / s;
		const amp = lum * Math.max(0, Math.min(con, 1));		
		let image_data = [];
		for (let _y = 0; _y < s; _y++) {
			const dy = _y - cy
			for (let _x = 0; _x < s; _x++) {
				const dx = _x - cx;
				const xPrime = dx * cosT + dy * sinT;
				const yPrime = -dx * sinT + dy * cosT;
				const gauss = Math.exp(-(xPrime * xPrime + yPrime * yPrime) / (2 * sigma * sigma));
				const carrier = Math.cos(k * xPrime + phs);
				const L = lum + amp * carrier;
				const v = Math.max(0, Math.min(255, L)) | 0;
				image_data.push(v);							// R
				image_data.push(v);							// G
				image_data.push(v);							// B
				image_data.push(Math.round(255 * gauss));	// A
			}
		}
		return new Uint8ClampedArray(image_data);
	}


}


class TwoLines extends Stimulus {

	
	constructor(args = {}) {
		if (!('target' in args)) tomJS.error('no target passed to two line stimulus');
		super(args);
        this.data.target        = args.target;
		this.data.tl_color_L    = args.tl_color_L    ?? "white";
		this.data.tl_color_R    = args.tl_color_R    ?? "white";
        this.data.tl_difference = args.tl_difference ?? 10;			// pixels
        this.data.tl_distance   = args.tl_distance   ?? 0.25;		// percent of canvas
        this.data.tl_height     = args.tl_height     ?? 0.15;		// percent of canvas
        this.data.tl_width      = args.tl_width      ?? 0.02;		// percent of canvas
        this.data.tl_x          = args.tl_x          ?? 0.5;		// percent of canvas
		this.data.tl_y          = args.tl_y          ?? 0.5;		// percent of canvas
		this.data.tl_keep_fix   = args.tl_keep_fix   ?? true;
	}


	// super --------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		if (this.data.tl_keep_fix) tomJS.writeToCanvas('+');
		this.drawOneLine('A');
		this.drawOneLine('B');
	}


	// functions ----------------------------------------------------------------------------------


	drawOneLine(side, args={}){
		const w = (tomJS.size * this.data.tl_width);
		const adjust = (side === this.data.target) ? this.data.tl_difference : 0;
		const h = (tomJS.size * this.data.tl_height) + adjust;
		const pos_y = (tomJS.size * this.data.tl_y);
		const offset_y = h * 0.5;
		const y = pos_y - offset_y;
		const pos_x = tomJS.size * this.data.tl_x;
		const distance = tomJS.size * this.data.tl_distance;
		const offset_x = w * 0.5;
		const x = (side === "A") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
		tomJS.context.fillStyle = (side === this.data.target) ? this.data.tl_color_L : this.data.tl_color_R ;
		tomJS.context.fillRect(x, y, w, h);
	}


}


class PixelPatch extends Stimulus {

	
	constructor(args = {}) {
		if (!('pp_aness' in args)) tomJS.error('no A-ness passed to pixel patch stimulus');
		if (args.pp_aness == 0.5 | args.pp_aness == 0) tomJS.error('pixel patch must have some bias');				
		super(args);
		this.id = 'PixelPatch' + this.tag;
		this.data.pp_aness      = args.pp_aness;
		this.data.pp_color_A    = args.pp_color_A    ?? tomJS.colours.black;
		this.data.pp_color_B    = args.pp_color_B    ?? tomJS.colours.white;
        this.data.pp_size       = args.pp_size       ?? 0.3;	// percent of canvas
		this.data.pp_rows       = args.pp_rows       ?? 50;		// count
        this.data.pp_x          = args.pp_x          ?? 0.5;	// percent of canvas
		this.data.pp_y          = args.pp_y          ?? 0.5;	// percent of canvas
		this.data.target = (this.data.pp_aness > 0.5) ? 'A' : 'B';
		this.calculateImageSize();
		this.image_data = this.prepareImageData();
	}

	// super --------------------------------------------------------------------------------------


	drawStimulus() {
		const _gp = this.data.grid_pix;
		super.drawStimulus();
		const img = tomJS.context.createImageData(_gp, _gp);
		this.assignImageData(img.data);
		let pos_x = tomJS.size * this.data.pp_x - (_gp * 0.5);
		let pos_y = tomJS.size * this.data.pp_y - (_gp * 0.5);
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


	calculateImageSize() {
		const _s = this.data.pp_size;
		const _r = this.data.pp_rows;
		const _a = this.data.pp_aness;
		this.data.grid_pix = Math.round(tomJS.size * _s);
		this.data.cell_pix = Math.round(this.data.grid_pix / _r);
		this.data.grid_dim = Math.round(this.data.grid_pix / this.data.cell_pix);
		this.data.a_cells  = Math.round(this.data.grid_dim * _a);
	}


	prepareImageData() {
		const A   = this.data.pp_color_A;
		const B   = this.data.pp_color_B;
		const _gd = this.data.grid_dim;
		const _ac = this.data.a_cells;
		const _cp = this.data.cell_pix;
		let image_data = [];
		for (let x = 0; x < _gd; x++) {
			let row = Array(_ac).fill(A).concat(Array(_gd-_ac).fill(B));
			row = returnShuffledArray(row);
			row = row.flatMap(c => Array(_cp).fill(c));
			for (let y = 0; y < _cp; y++) image_data = image_data.concat(row.flat());
		};
		return new Uint8ClampedArray(image_data);
	}


}


class ProgressBar extends Stimulus {


	constructor(args = {}) {
		super(args);
		this.data.pb_color_F    = args.pb_color_F    ?? "white";
		this.data.pb_color_B    = args.pb_color_B    ?? "grey";
        this.data.pb_height     = args.pb_height     ?? 0.10;		// percent of canvas
        this.data.pb_width      = args.pb_width      ?? 0.50;		// percent of canvas
        this.data.pb_x          = args.pb_x          ?? 0.50;		// percent of canvas
		this.data.pb_y          = args.pb_y          ?? 0.20;		// percent of canvas
		this.data.pb_percent    = args.pb_percent    ?? 1.00;
	}


	// super --------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		this.drawOneBar('B');
		this.drawOneBar('F');
	}

	// functions ----------------------------------------------------------------------------------


	drawOneBar(which){
		const w = tomJS.size * this.data.pb_width * ((which == 'F') ? this.data.pb_percent : 1);
		const h = tomJS.size * this.data.pb_height * ((which == 'F') ? 0.95 : 1);
		const x = (tomJS.size * this.data.pb_x) - (w * 0.5);
		const y = (tomJS.size * this.data.pb_y) - (h * 0.5);
		tomJS.context.fillStyle = (which == 'F') ? this.data.pb_color_F : this.data.pb_color_B;
		tomJS.context.fillRect(x, y, w, h);
	}

}


// utils ==========================================================================================


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

