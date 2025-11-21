
class Experiment {	

	version = '21.11.25 16:03';

	constructor(args={}) {
		
		console.log('booting tomJS version '+this.version);

		this.boot_time = window.performance.now();

		// debug
		this.debug = {};
		this.debug.fullscreen = args.fullscreen ?? true;
		this.debug.pilot = args.pilot ?? false;
		this.debug.verbose = args.verbose ?? false;
		this.debug.gridlines = args.gridlines ?? false;
		this.debug.save = args.save ?? true;
		if (this.debug.verbose) console.log('debug',this.debug);

		// visual
		this.visual = {};
		this.visual.fontFamily = args.fontFamily ?? "Arial";
		this.visual.fontSize = args.fontSize ?? "16px";
		this.visual.h0 = args.h0 ?? "28px";
		this.visual.h1 = args.h1 ?? "20px";
		this.visual.backgroundColor = args.backgroundColor ?? "black";
		this.visual.color = args.color ?? "white";				
		this.visual.height = window.innerHeight - 16;
		this.visual.width  = window.innerWidth - 16;
		this.visual.screen_size   = Math.min(this.visual.height, this.visual.width); // find the smaller dimension
		this.visual.stimulus_size = Math.round(this.visual.screen_size * 0.5);
		this.createCanvas();
		if (this.debug.verbose) console.log('visual', this.visual);

		// apply visual settings to document
		document.body.style.fontFamily      = this.visual.fontFamily;
		document.body.style.fontSize        = this.visual.fontSize;
		document.body.style.color           = this.visual.color;
		document.body.style.backgroundColor = this.visual.backgroundColor;
		
		// controls
		this.controls = {};
		this.controls.keyboard  = new Keyboard();
		this.controls.key_a     = args.key_a     ?? 'f';
        this.controls.key_b     = args.key_b     ?? 'j';
        this.controls.key_quit  = args.key_quit  ?? 'Escape';
        this.controls.key_back  = args.key_back  ?? 'Backspace';
		this.controls.key_a_upper = this.controls.key_a.toUpperCase();
		this.controls.key_b_upper = this.controls.key_b.toUpperCase();
		this.controls.resp_a    = args.resp_a    ?? 'A';
		this.controls.resp_b    = args.resp_b    ?? 'B';
		if (this.debug.verbose) console.log('controls',this.controls);

		// current input data
		this.key = '';
		this.dir = '';
		
		// jatos
		this.jatos = false;
		this.study_name = args.study_name ?? false;

		// demographics
		this.demographics = {};
		this.demographics.subject = Math.round(Math.random()*999999);
		this.demographics.age = null;
		this.demographics.gender = null;
		this.demographics.hand = null;
		this.demographics.n = Math.round(Math.random() * 2);

		// timeline
        this.now = window.performance.now();
        this.running  = true;
        this.timeline = [];
		if (inAndTrue(args, 'consent', true))      this.timeline.push(new Consent(args));
		if (inAndTrue(args, 'credit_card', true))  this.timeline.push(new CreditCard(args));
		if (inAndTrue(args, 'demographics', true)) this.timeline.push(new Demographics(args));
        this.time_pos = 0;
        this.trial  = 0;
        this.block  = 0;
        this.trials = 0;
		this.blocks = 0;

		// data
		this.headings = [
			'subject','age','gender','hand',
			'block','trial','condition','difficulty',
			'rt','score','outcome','target',
			'response','response_given','response_key',
			'screen_size','stimulus_size'];
		this.data = [];
		
	}

	// functions -----------------------------------------------------------------------------------------------------------
	
	appendToTimeline (new_state) {
		this.timeline.push(new_state);
	}
	
	appendOneTrial (trial_class, args={}) {
        let _new_trial = new trial_class(args);
        this.appendToTimeline(_new_trial);
        this.trials += 1;
	}

	appendBlock(trial_type, trialwise={}, additional={}, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		const _block = new Block(trial_type, trialwise, additional, trial_reps, start_slide, end_slide, add_countdown);
		this.appendToTimeline(_block);
	}

	appendBlocks(trial_type, blockwise={}, trialwise={}, additional={}, block_reps=1, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		let _b_cells  = returnTotalDictLength(blockwise);
        for (let b = 0; b < block_reps; b++) {
            let _blockwise = returnAllCombinationsFromDict(blockwise);
            _blockwise = returnShuffledArray(_blockwise);
            for (let i = 0; i < _b_cells; i++) {
				let _additional = Object.assign({ }, _blockwise[i%_b_cells], additional);
                this.appendBlock(trial_type, trialwise, _additional, trial_reps, start_slide, end_slide, add_countdown);
			};
		};
	}

	connectToJatos(counterbalance=false) {
		// this. is the window
		tomJS.jatos = true;
		const url = jatos.urlQueryParameters ?? {};
		const wrk = 'workerID' in url;
		const jts = jatos.studyResultId;
		tomJS.demographics.subject = wrk ? url.workerID : jts;
		tomJS.demographics.n = Math.round(jts);
		if (counterbalance) tomJS.counterbalanceAB();
		console.log('Connected to JATOS.');
	}

	createCanvas() {
		this.visual.canvas = document.createElement('canvas');		
		this.visual.canvas.id = "canvas";
		this.visual.canvas.height = this.visual.screen_size;
		this.visual.canvas.width  = this.visual.screen_size; // make canvas square
		this.visual.canvas.style.position = "absolute"; 
		this.visual.canvas.style.backgroundColor = this.visual.backgroundColor;
		this.visual.canvas.style.color = this.visual.colour;
		this.visual.canvas.style.left = (this.visual.width - this.visual.screen_size + 16) / 2 + "px"; // position canvas in center
		this.visual.canvas.style.cursor = "none";
		document.body.appendChild(this.visual.canvas); // add canvas to window
		this.visual.context = this.visual.canvas.getContext("2d");
	}

	counterbalanceAB() {
		const mod = this.demographics.n % 2;
		const A = (mod == 0) ? this.controls.key_a : this.controls.key_b;
		const B = (A == this.controls.key_a) ? this.controls.key_b : this.controls.key_a;
		this.controls.key_a     = A;
        this.controls.key_b     = B;
		this.controls.key_a_upper = A.toUpperCase();
		this.controls.key_b_upper = B.toUpperCase();
		if (this.debug.verbose) console.log({'A':A, 'B':B});
	}

	drawBox(x, y, w, h, c = "white", l = 1) {
		this.visual.context.strokeStyle = c;
		this.visual.context.lineWidth = l;
		this.visual.context.strokeRect(x, y, w, h);
	}

	drawGridLines() {
		// horizontal
		for (let i = 0; i < 5; i++) {
			let w = this.visual.screen_size;
			let h = this.visual.screen_size * 0.001;
			let x = (this.visual.screen_size * 0.5) - (w * 0.5);
			let y = (this.visual.screen_size * 0.5 * (i/2)) - (h * 0.5);
			this.drawRect(x, y, w, h, this.visual.colour);
		};
		// vertical
		for (let i = 0; i < 5; i++) {
			let w = this.visual.screen_size * 0.001;
			let h = this.visual.screen_size;
			let x = (this.visual.screen_size * 0.5 * (i/2)) - (w * 0.5);
			let y = (this.visual.screen_size * 0.5) - (h * 0.5);
			this.drawRect(x, y, w, h, this.visual.colour);
		};
	}

	drawRect(x, y, w, h, colour="white") {
		this.visual.context.fillStyle = colour;
		this.visual.context.fillRect(x, y, w, h);
	}

	endExperiment() {
		if (this.debug.fullscreen) document.exitFullscreen();
		if (this.jatos) jatos.startNextComponent();
		else {
			this.running = false;
			this.resetCanvas();
			this.writeToCanvas('You can close the window when you are ready :)');
		};
	}

	error(message) {
		this.running = false;
		this.drawRect(0, 0, this.visual.screen_size, this.visual.screen_size, "red");
		this.writeToCanvas('ERROR: '+message);
	}

	flushKeys() {
		this.key = '';
		this.dir = '';
	}
	
	nextState () {
        let _end = this.timeline.length - 1;
        let _new_position = this.time_pos + 1;
        if (_new_position > _end) {
            this.timeline[this.time_pos].onExit();
            if (this.debug.verbose) console.log('at end of timeline, ending experiment');
            this.endExperiment();
		} else {
            this.timeline[this.time_pos].onExit();
            this.time_pos = _new_position;
            this.timeline[this.time_pos].onEnter();
		};
	}

	replaceEndBlockWithEndExperiment(end_slide) {		
		const i = this.timeline.length - 1;
		const j = this.timeline[i].timeline.length - 1;
		this.timeline[i].timeline[j] = end_slide;
	}
	
	resetCanvas () {
		this.drawRect(0, 0, this.visual.screen_size, this.visual.screen_size, this.visual.backgroundColor);
	}

	run = () => {
		if (!this.running) return;
		this.now = window.performance.now();
		this.resetCanvas();		
		this.update();
		requestAnimationFrame(this.run);
	}

	saveData() {
		const csv = this.writeCSV();
		if (this.jatos) jatos.submitResultData(csv);
	}

	start () {
		this.resetCanvas();
		this.timeline[0].onEnter();
		requestAnimationFrame(this.run);
	}
	
	update () {
		// run current state or move to next?
		if (this.timeline[this.time_pos].ready_to_exit) this.nextState();
		else this.timeline[this.time_pos].update();
		if (this.debug.gridlines) this.drawGridLines();
	}

	writeCSV() {
		const data = this.data;
		const demo = this.demographics;
		const visu = this.visual;
		let csv = this.headings.toString() + '\n';
		for (let r of data) {
			const x = {...r, ...demo, ...visu};
			let y = [];
			for (let h of tomJS.headings) y.push(x[h]);
			csv += y.toString() + '\n';
		};
		if (tomJS.debug.verbose) console.log(csv);
		return csv;
	}

	writeToCanvas (text, args={}) {
		// Write text to the canvas with a relative position (0.5 being center).
		const _upper = args.upper ?? false;
		const _text = _upper ? text.toUpperCase() : text;
		tomJS.visual.context.fillStyle = args.colour ?? tomJS.visual.color;
		tomJS.visual.context.textAlign = args.align  ?? "center";
		const _pt = args.fontSize ?? tomJS.visual.fontSize;
		const _tf = args.fontFamily ?? tomJS.visual.fontFamily;
		const _font = _pt + " " + _tf;
		tomJS.visual.context.font = _font;
		let _x = args.x ?? 0.5;
		let _y = args.y ?? 0.5;
		let _pos_x = tomJS.visual.screen_size * _x;
		let _pos_y = tomJS.visual.screen_size * _y + (0.33 * _pt.split('p')[0]);
		let _width = tomJS.visual.screen_size ?? 1;
		tomJS.visual.context.fillText(_text, _pos_x, _pos_y, _width);
	}

}


// states ==================================================================================================================


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
		tomJS.flushKeys();
	}

	onUpdate() {
		// does nothing
	}

	onExit() {
		// does nothing
	}

}


// blocks ==================================================================================================================


class Block extends State {

	constructor(trial_type, trialwise={}, additional={}, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
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
		this.timeline      = this.generateTimeline(trial_type, trialwise, additional, trial_reps, start_slide, end_slide, add_countdown);
        this.time_pos      = 0;		
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {
		super.onEnter();
		this.timeline[0].onEnter();
	}

	onExit() {
		super.onExit();
	}

	onUpdate() {
		super.onUpdate();
		if (this.timeline[this.time_pos].ready_to_exit) this.nextState();
		else this.timeline[this.time_pos].update();
	}

	// functions -----------------------------------------------------------------------------------------------------------	

	pushOutcome(outcome) {
		switch(outcome){
			case 'Correct'   : this.block_data.correct++	; break;
			case 'Incorrect' : this.block_data.incorrect++  ; break;
			case 'Fast'      : this.block_data.fast++		; break;
			case 'Slow'      : this.block_data.slow++		; break;
			case 'Censored'  : this.block_data.censored++	; break;
		}
	}

	generateTimeline(trial_type, trialwise, additional, trial_reps, start_slide, end_slide, add_countdown) {
		let _timeline = [];
		let _t_cells = returnTotalDictLength(trialwise);
		let _trialwise = returnAllCombinationsFromDict(trialwise);
		_trialwise = returnShuffledArray(_trialwise);
		let _n_trials = _t_cells * trial_reps;
		if (start_slide != null) _timeline.push(start_slide);
		if (add_countdown) _timeline.push(new Countdown(3.0));
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
            this.ready_to_exit = true;
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


// trials ==================================================================================================================


class Trial extends State {


	constructor(args={}) {
		super(args);
		this.id = 'Trial' + this.tag;

		// create new stimulus object
		if (!('stimulus' in args)) tomJS.error('no target stimulus passed to trial');
		this.stimulus = new args.stimulus(args);

		// create data object
		this.data = {
			'block'          : args.block ?? tomJS.blocks,
			'trial'          : args.trial ?? tomJS.trials,
			'condition'      : args.condition ?? null,
			'difficulty'     : this.stimulus.data.difficulty,
			'target'         : this.stimulus.data.target,
			'rt'             : null,
			'score'          : null,
			'outcome'        : null,
			'response_given' : null,
			'response_key'   : null,
		};

		this.properties = {			
			'start'             : null,
			'fixation_duration' : args.fixation_duration ?? 1.000,
			'fixation_start'    : null,
			'fixation_end'      : null,
			'fixation_on'       : null,
			'fixation_off'      : null,
			'fixation_size'     : args.fixation_size ?? 0.10,
			'stimulus_duration' : args.stimulus_duration ?? 3.000,
			'stimulus_fast'     : args.stimulus_fast ?? 0.200,
			'stimulus_slow'     : args.stimulus_slow ?? 3.000,
			'stimulus_start'    : null,
			'stimulus_end'      : null,
			'stimulus_on'       : null,
			'stimulus_off'      : null,			
			'feedback_duration' : args.feedback_duration ?? 1.000,
			'feedback_start'    : null,
			'feedback_end'	    : null,
			'feedback_on'	    : null,
			'feedback_off'	    : null,
			'feedback_text'     : null,
			'feedback_colour'   : null,
			'feedback_size'     : args.feedback_size ?? 0.05,
			'end'               : null,
		};

		// feedback information
		this.feedback_colors = args.feedback_colors ?? {
			'Correct': 'white', 
			'Incorrect': 'white', 
			'Fast': 'white', 
			'Slow': 'white', 
			'Censored': 'white'
		};
		this.feedback_texts  = args.feedback_texts  ?? { 
			'Correct': 'Correct', 
			'Incorrect': 'Incorrect', 
			'Fast': 'Too Fast', 
			'Slow': 'Too Slow', 
			'Censored': 'Too Slow'
		};

		// ensure too slow response does not override stimulus duration, unless desired
		if ('stimulus_duration' in args && ! 'stimulus_slow' in args)
			this.properties.stimulus_slow = this.properties.stimulus_duration;

		// variables that current state
		this.substate = null;

	}


	// super ---------------------------------------------------------------------------------------------------------------


	onEnter() {
		super.onEnter();
		this.properties.start = tomJS.now;
		this.properties.fixation_size = Math.round((this.properties.fixation_size ) * tomJS.visual.stimulus_size) + "px";
		this.properties.feedback_size = Math.round((this.properties.feedback_size ) * tomJS.visual.stimulus_size) + "px";
		this.queueFirstSubstate();
		this.claculateStartAndEndTimes('fixation');		
	}


	onExit() {
		super.onExit();
		this.properties.end = tomJS.now;
		tomJS.data.push(this.data);
	}


	onUpdate() {
		super.onUpdate();
		this.substate();
	}


	// fixation ------------------------------------------------------------------------------------------------------------


	fixationEnter() {
		this.properties.fixation_on = tomJS.now;
		this.substate = this.fixationUpdate;
	}


	fixationExit() {
		this.properties.fixation_off = tomJS.now;
		this.claculateStartAndEndTimes('stimulus');
		this.stimulusEnter();
	}


	fixationUpdate() {
		if (this.substate_virgin) this.fixationEnter();
		tomJS.writeToCanvas('+', {'fontSize':this.properties.fixation_size});
		if (tomJS.now >= this.properties.fixation_end) this.fixationExit();
	}


	// stimulus ------------------------------------------------------------------------------------------------------------


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
		if (tomJS.controls.keyboard.anyKeysPressed([tomJS.controls.key_a, tomJS.controls.key_b])) 
			this.stimulusExitResponse();
		if (tomJS.now >= this.properties.stimulus_end) 
			this.stimulusExitTime();
	}


	// feedback ------------------------------------------------------------------------------------------------------------


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
		tomJS.writeToCanvas(text,{'colour':colour, 'fontSize':this.properties.feedback_size});
		if (tomJS.now >= this.properties.feedback_end) this.feedbackExit();
	}


	// functions -----------------------------------------------------------------------------------------------------------


	calculateRT() {
		const rg = this.data.response_given;
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


	queueFirstSubstate() {
		this.fixationEnter();		
	}


	recordResponse() {
		this.data.response = tomJS.dir;
		this.data.response_key   = tomJS.key; 
		this.data.response_given = tomJS.now;
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

	// super ---------------------------------------------------------------------------------------------------------------

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

    // functions -----------------------------------------------------------------------------------------------------------

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


class VisualResponseSignal extends Trial {

	constructor(args={}) {

		if (!('condition'in args)) tomJS.error('no condition passed to visual response signal trial');
		super(args);

		if (tomJS.headings.findIndex(x=>x=='rtt')==-1) tomJS.headings.push('rtt');

		this.properties.signal_color = args.signal_color ?? "DodgerBlue";
		this.properties.response_signal = args.response_signal ?? 1.000;
		this.properties.trial_duration = args.trial_duration ?? 2.000;

		this.properties.earl = this.properties.response_signal - this.properties.stimulus_fast;
		this.properties.late = this.properties.response_signal + this.properties.stimulus_slow;
		
		this.properties.fixation_duration = this.properties.response_signal - this.data.condition;
		this.properties.stimulus_duration = this.properties.trial_duration - this.properties.fixation_duration;

		this.properties.p_earl = 1 - (this.properties.earl / this.properties.trial_duration);
		this.properties.p_late = 1 - (this.properties.late / this.properties.trial_duration);

		this.progress_bar = new ProgressBar(args);
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {		
		super.onEnter();
		this.properties.signal_at = this.properties.start + (this.properties.response_signal * 1000);
		this.properties.r_earl    = this.properties.signal_at - this.properties.stimulus_fast;
		this.properties.r_late    = this.properties.signal_at + this.properties.stimulus_slow;
	}

	calculateRT() {
		super.calculateRT();
		const rg = this.data.response_given;
		const rs = this.properties.signal_at;
		this.data.rtt = Math.round((rg - rs), 5) / 1000;
	}

	fixationUpdate() {
		this.updateProgressBar();
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

	// override ------------------------------------------------------------------------------------------------------------

	determineOutcome() {
		const rsp = this.data.response;
		const rtt  = this.data.rtt;
		const tgt = this.data.target;
		const slw = this.properties.stimulus_slow;
		const fst = this.properties.stimulus_fast;
		if		(rsp == null) {this.data.outcome = 'Censored'}
		else if (rtt >= slw)  {this.data.outcome = 'Slow'}
		else if (rtt <= fst)  {this.data.outcome = 'Fast'}
		else if (rsp == tgt)  {this.data.outcome = 'Correct'}
        else				  {this.data.outcome = 'Incorrect'};
	}

	// functions -----------------------------------------------------------------------------------------------------------

	drawProgressBar() { 
        this.progress_bar.drawStimulus();
	}

    updateProgressBar() {
		const start = this.properties.fixation_start;
		const now   = tomJS.now;
		const duration = this.properties.trial_duration * 1000;
		const progress = now - start;
		const percent  = 1 - Math.min(progress / duration, 1);
        if (percent >= 0.01) this.progress_bar.set('pb_percent', percent);		
		if (percent <= this.properties.p_earl) this.progress_bar.set('pb_color_F', this.properties.signal_color);
		if (percent <= this.properties.p_late) this.progress_bar.set('pb_color_F', "white");
		if (percent == 0) this.progress_bar.set('pb_color_F', "grey");
	}

}


// slides ==================================================================================================================


class Slide extends State {

	constructor(content = [], can_return = true, args = {}) {
		super();
		this.id = 'Slide';
		this.args = args;
		this.content = content;
		this.can_return = can_return;
		this.start = null;
		this.force_wait = (args.force_wait ?? 1) * 1000; // pass in seconds for consistency
		this.realizeContent();
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {
		super.onEnter();
		this.start = tomJS.now;
	}

	onUpdate() {
		super.onUpdate();
		this.drawContent();
		if (tomJS.now < this.start + this.force_wait) return;
		this.checkUserInput();
	}

	// functions -----------------------------------------------------------------------------------------------------------

	checkUserInput() {
		const _a = tomJS.controls.key_a;
		const _b = tomJS.controls.key_b;
		if (tomJS.controls.keyboard.allKeysPressed([_a, _b])) this.ready_to_exit = true;
	}

	drawContent() {
		for (const _content of this.content) {
			switch(_content.class) {
				case 'text':
					const _text = this.parseText(_content.text);
					tomJS.writeToCanvas(_text, _content);
					break;
				case 'gabor':
					if (tomJS.dir == 'A') this.gp_L.drawStimulus()
					else this.gp_R.drawStimulus();
					break;
				case 'twolines':
					const _tl_args = {..._content,...{'target':this.parseText(_content.target)}};
					const _tl = new TwoLines(_tl_args);
					_tl.drawStimulus();
					break;
				case 'pixelpatch':
					if (tomJS.dir == 'A') this.pp_A.drawStimulus()
					else this.pp_B.drawStimulus();
					break;
				case 'table':
					this.table.drawStimulus();
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

	realizeContent() {
		for (let c of this.content) {
			switch(c.class) {
				case 'gabor':
					this.gp_L = new Gabor({...c, ...{'target':"A"}});
					this.gp_R = new Gabor({...c, ...{'target':"B"}});
					break;
				case 'pixelpatch':
					this.pp_A = new PixelPatch({...c, ...{'difficulty':c.A}});
					this.pp_B = new PixelPatch({...c, ...{'difficulty':c.B}});
					break;
				case 'table':
					this.table = new Table(c);
					break;
			};
		};
	}

}


class Consent extends Slide {

	constructor(args = {}) {
		super([], false, args);
		this.id = 'Consent';
		this.exit_pressed = false;
		this.exit_button  = null;
		this.container    = null;
		this.institute  = args.institute  ?? bremen.institute;
		this.department = args.department ?? bremen.department;
		this.group      = args.group      ?? bremen.group;
		this.contact    = args.contact    ?? "Contacts";
		this.contacts   = args.contacts   ?? ["Tom Narraway: "+bremen.email];
	}

	// override ------------------------------------------------------------------------------------------------------------

	onUpdate() {		
		tomJS.drawRect(0, 0, tomJS.visual.screen_size, tomJS.visual.screen_size, "white");
		if (tomJS.now < this.start + this.force_wait) return;
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {
		super.onEnter();
		document.body.style.backgroundColor = "white";
		document.body.style.color = "black";
		this.createContainer();
		this.createTopPanel();
		this.createMain();
		createButton("exit", "Consent", this.onExitClicked, this, this.container);
	}

	onExit() {
		super.onExit();
		this.container.remove();
		document.body.style.backgroundColor = tomJS.visual.backgroundColor;
		document.body.style.color = tomJS.visual.color;
	}

	// functions -----------------------------------------------------------------------------------------------------------

	onExitClicked() {
		this.state.ready_to_exit = true;
	}

	createBremenLogo() {
		const url = "https://www.uni-bremen.de/typo3conf/ext/package/Resources/Public/Images/logo_ub_2021.png";
		const img = document.createElement('IMG');
		img.id = "Bremen Logo";
		img.src = url;
		img.style.width = "418px";
		img.style.height = "150px";
		return img;
	}

	createContactPanel() {
		const div = document.createElement('div');
		div.id = "Contact Panel";
		div.style.display = "flex";
		div.style.flexDirection = "column";
		div.style.textAlign = "left";
		div.style.width = "45%";
		div.style.marginLeft = "10%";
		// institute
		let ins = document.createElement('label');
		ins.textContent = this.institute;
		ins.style.fontSize = tomJS.visual.h0;			
		div.append(ins);
		// department
		let dep = document.createElement('label');
		dep.textContent = this.department;
		dep.style.marginTop = "1em";
		dep.style.fontSize = tomJS.visual.h1,	
		div.append(dep);
		// group
		let grp = document.createElement('label');
		grp.textContent = this.group;
		grp.style.marginTop = "1em";		
		div.append(grp);
		// contact
		let ctc = document.createElement('label');
		ctc.textContent = this.contact;
		ctc.style.marginTop = "1em";
		ctc.style.fontSize = tomJS.visual.h1;	
		div.append(ctc);
		// contacts
		for (let i = 0; i < this.contacts.length; i++) {
			let tmp = document.createElement('label');
			tmp.textContent = this.contacts[i];
			tmp.style.marginTop = "1em";	
			div.append(tmp);
		};
		return div;
	}

	createContainer() {
		const ctr = document.createElement('div');		
		ctr.id = "container";
		ctr.style.width           = "65%";
		ctr.style.justifyContent  = "center";
		ctr.style.alignItems      = "center";
		ctr.style.display         = "flex";
		ctr.style.flexDirection   = "column";
		ctr.style.flexWrap        = "wrap";
		ctr.style.textAlign       = "right";
		ctr.style.fontFamily      = tomJS.visual.fontFamily;
		ctr.style.position        = "absolute";
		ctr.style.top             = "0%";
		ctr.style.left            = "50%";
		ctr.style.transform       = "translate(-50%, -0%)";
		ctr.style.color           = "black";
		ctr.style.backgroundColor = "white";
		ctr.style.padding         = "24px";
		this.container = ctr;
		document.body.appendChild(ctr);
	}

	createMain(){
		const div = document.createElement('div');
		div.id = "Main Panel";
		div.style.display = "flex";
		div.style.flexDirection = "column";
		div.style.width = "100%";
		div.style.textAlign = "left";
		// main content
		for (let i = 0; i < Object.keys(consent_form).length; i++) {
			const key = Object.keys(consent_form)[i];
			const kargs = {'fontSize':tomJS.visual.h1}
			const value = Object.values(consent_form)[i];
			createLabel(key+"Key", key, this, div, kargs);
			createLabel(key+"Value", value, this, div);
		}
		// join
		this.container.append(div);
	}
	
	createTopPanel() {
		const div = document.createElement('div');
		div.id = "Top Panel";
		div.style.display = "flex";
		div.style.flexDirection = "row";
		div.style.width = "100%";
		div.style.marginBottom = "32px";
		div.style.marginTop = "32px";
		const logo = this.createBremenLogo();
		const info = this.createContactPanel();
		div.append(logo, info);
		this.container.append(div);
	}

}


class Countdown extends Slide {

	constructor(lifetime, content = [], can_return = false, args = {}) {
		super(content, can_return, args);
		this.id = 'Countdown';
		this.lifetime = lifetime * 1000;
		this.fontSize = args.fontSize ?? 0.05;		
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {
		this.fontSize = Math.round((this.fontSize ) * tomJS.visual.stimulus_size) + "px";
		super.onEnter();
	}

	onUpdate() {
		let time = Math.ceil((this.start + this.lifetime - tomJS.now) / 1000);
		if (time <= 1) time = 1;
        tomJS.writeToCanvas(time, {'fontSize':this.fontSize});
        if (tomJS.now >= this.start + this.lifetime) this.ready_to_exit = true;
		super.onUpdate();
	}

}


class CreditCard extends Slide {

	constructor(args = {}) {
		super([], false, args);
		this.id = 'CreditCard';
		this.cc_width  = "85.60 mm";
		this.cc_height = "53.98 mm";
		this.px_width  = 385;
		this.px_height = 245;
		this.min   = 50;
		this.max   = 200;
		this.value = 100;
		this.instructions = args.instructions ?? "Please hold an ID-1 card (e.g. credit card or driving license) to" +
			" the screen and surround your card with the white border such that no grey is visible.";
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {
		this.createContainer();
		createLabel("instructions", this.instructions, this, this.container);
		this.createWallet();
		this.createCreditCard();
		this.createControls();
		const _up_down_args = {'width':'5vmin', 'height':'5vmin'};
		createButton("Down", "-", ()=>{this.onUpDownClick(this, -1)}, this, this.controls, _up_down_args);
		this.createSlider();
		createButton("Up", "+", ()=>{this.onUpDownClick(this, 1)}, this, this.controls, _up_down_args);
		createButton("Exit", "Confirm", this.onExitClick, this, this.container);
		super.onEnter();
	}

	onExit() {
		super.onExit();
		const _s = this.px_width * (this.slider.value / 100);
		tomJS.visual.stimulus_size = Math.round(_s);
		if (tomJS.debug.verbose) console.log(tomJS.visual);
		this.container.remove();
	}

	// functions -----------------------------------------------------------------------------------------------------------

	createCreditCard() {
		const credit_card = document.createElement('div');
		credit_card.id = "CreditCard";
		credit_card.style.backgroundColor = "grey";
		credit_card.style.width  = this.px_width  + "px";
		credit_card.style.height = this.px_height + "px";
		credit_card.style.margin = "auto";
		credit_card.style.borderRadius = "7%";
		credit_card.style.borderWidth = "1vmin";
		credit_card.style.borderColor = "white";
		credit_card.style.borderStyle = "solid";
		this.wallet.append(credit_card);
		this.credit_card = credit_card;
		credit_card.state = this;
	}

	createContainer() {
		const container = document.createElement('div');	
		container.id			        = "Container";
		container.style.width		    = "100%";
		container.style.height		    = "100%";
		container.style.justifyContent  = "center";
		container.style.alignItems      = "center";
		container.style.display         = "flex";
		container.style.flexDirection   = "column";
		container.style.flexWrap        = "wrap";
		container.style.textAlign       = "right";
		container.style.fontFamily      = tomJS.visual.fontFamily;
		container.style.position        = "absolute";
		container.style.top             = "50%";
		container.style.left            = "50%";
		container.style.transform       = "translate(-50%, -50%)";
		container.style.backgroundColor = "black";
		document.body.appendChild(container);
		container.state = this;
		this.container = container;
	}

	createControls() {
		const controls = document.createElement('div');		
		controls.id = "Controls";
		controls.style.display = "flex";
		controls.style.justifyContent = "center";
		controls.style.alignItems = "center";
		this.container.appendChild(controls);
		controls.state = this;
		this.controls = controls;
	}

	createSlider() {
		const slider = document.createElement('input');
		slider.id = "Slider";
		slider.type = "range";
		slider.step = 1;
		slider.min = this.min;
		slider.max = this.max;
		slider.value = this.value;
		slider.style.width = "50vmin";
		slider.style.marginLeft = "10vmin";
		slider.style.marginRight = "10vmin";
		slider.style.backgroundColor = "white";
		slider.oninput = this.onSlide;
		this.controls.append(slider);
		this.slider = slider;
		slider.state = this;
	}

	createWallet() {
		const wallet = document.createElement('div');
		wallet.id = "Wallet";
		wallet.style.display = "flex";
		wallet.style.width = "100%";
		wallet.style.height = this.px_height * 2.10 + "px";
		wallet.style.justifyContent  = "center";
		wallet.style.alignItems  = "center";
		this.container.append(wallet);
		this.wallet = wallet;
		wallet.state = this;
	}

	onExitClick() {
		// this is the button
		this.state.ready_to_exit = true;
	}

	onUpDownClick(s, x) {
		// this is the button
		const n = Math.round(s.slider.value) + x;
		const m = minMax(n, s.min, s.max);
		s.slider.value = m;
		s.setCreditCardScale();
	}

	onSlide() {
		// this is the slider
		this.state.setCreditCardScale();
	}

	setCreditCardScale() {
		const c = this.credit_card;
		const s = (this.slider.value / 100);
		c.style.width  = Math.round(this.px_width  * s) + "px";
		c.style.height = Math.round(this.px_height * s) + "px";
	}

}


class Demographics extends Slide {

	constructor(args={}) {
		super([], false, args);
		this.id = 'Demographics';
		this.age = null;
		this.gender = null;
		this.hand = null;
		this.exit_pressed = false;
		this.exit_button = null;
		this.heading = args.heading ?? "Demographics Information";
		this.instructions = args.instructions ?? "The following information is optional."+
			" Pless press \"Submit\" when you are ready to continue. ";
		this.bottom_text = "Pressing the button below will start the experiment, your browser will enter fullscreen mode," +
			" and your cursor will be hidden while within the experiment window.";
	}

	// override ------------------------------------------------------------------------------------------------------------

	onUpdate() {		
		this.drawContent();
		if (tomJS.now < this.start + this.force_wait) return;
	}

	// super ---------------------------------------------------------------------------------------------------------------

	onEnter() {		
		super.onEnter();
		this.createContainer();
		createLabel("Heading", this.heading, this, this.container, {'fontSize':tomJS.visual.h0});
		createLabel("Instructions", this.instructions, this, this.container);
		this.createFields();
		createLabel("BottomText", this.bottom_text, this, this.container);
		createButton("exit", "Submit", this.onExitClicked, this, this.container);
	}

	onExit() {
		super.onExit();
		tomJS.demographics.age    = this.Age.value;
		tomJS.demographics.gender = this.Gender.value;
		tomJS.demographics.hand   = this.Hand.value;
		if (tomJS.debug.verbose) console.log('demographics',tomJS.demographics);
		if (tomJS.debug.fullscreen) tomJS.visual.canvas.requestFullscreen();
		this.container.remove();
	}

	// functions -----------------------------------------------------------------------------------------------------------

	onExitClicked() {
		// this. is the button
		this.state.ready_to_exit = true;
	}

	createContainer() {
		const ctr = document.createElement('div');		
		ctr.id = "container";
		ctr.style.width          = "100%";
		ctr.style.height         = "100%";
		ctr.style.justifyContent = "center";
		ctr.style.alignItems     = "center";
		ctr.style.display        = "flex";
		ctr.style.flexDirection  = "column";
		ctr.style.flexWrap       = "wrap";
		ctr.style.textAlign      = "right";
		ctr.style.fontFamily     = tomJS.visual.fontFamily;
		ctr.style.position       = "absolute";
		ctr.style.top            = "50%";
		ctr.style.left           = "50%";
		ctr.style.transform      = "translate(-50%, -50%)";
		this.container = ctr;
		document.body.appendChild(ctr);
	}

	createField(id, type, textContent, options=[], args={}) {
		// create wrapper div
		const div = document.createElement('div');
		div.id = id + "Wrapper";
		div.style.width = args.width ?? "100%";
		div.style.justifyContent = "center";
		div.style.alignItems     = "center";
		div.style.display        = "flex";
		// create label
		createLabel(id+"Label", textContent, this, div, {'width':'50vmin', 'marginRight':'3vh'});
		// create input options
		let input;
		switch(type) {
			case 'select':
				input = document.createElement('select');
				options.forEach(opt => {
					const o = document.createElement('option');
					o.id = id + opt;
					o.value = opt;
					o.textContent = opt === '' ? 'Select...' : opt;
				input.appendChild(o);
				});
				break;
			case 'number':
				input = document.createElement('input');
				input.type = type;
				input.max = args.max ?? 99;
				input.min = args.min ?? 1;
				break;
		};
		input.id = id;
		input.style.width = "50vmin";
		this[id] = input;
		// stich together
		div.append(input);
		this.fields.append(div);
	}

	createFields() {
		// create wrapper div
		const fields = document.createElement('div');
		fields.id = "Fields";
		fields.style.width = args.width ?? "100%";
		fields.style.justifyContent = "center";
		fields.style.alignItems     = "center";
		fields.style.display        = "flex";
		fields.style.flexDirection = "column";
		this.container.append(fields);
		this.fields = fields;
		this.createField("Age", 'number', demographics_prompts.age.en);
		this.createField("Gender", 'select', demographics_prompts.gender.en, demographics_choices.gender.en);
		this.createField("Hand", 'select', demographics_prompts.hand.en, demographics_choices.hand.en);
	}
	
}


class EndBlock extends Slide {


	constructor(content = [], can_return = false, args = {}) {
		super(content, can_return, args);
		this.score     = null;
        this.rt        = null;
        this.correct   = null;
        this.incorrect = null;
        this.fast      = null;
        this.slow      = null;
        this.censored  = null;
		this.hits      = null;
		this.miss      = null;
	}


	// super ---------------------------------------------------------------------------------------------------------------


	onEnter () {
        super.onEnter();
        this.calculateBlockData();
		if (tomJS.debug.save) tomJS.saveData();
	}


    onExit () {        
        tomJS.block += 1;
        tomJS.trial = 0;
        super.onExit();
	}


	// functions  ----------------------------------------------------------------------------------------------------------


	calculateBlockData() {
		const i = tomJS.time_pos;
		const d = tomJS.timeline[i].block_data;
		const n = d.n;
		// arrays to averages
		this.rt = Math.round((d.rt.reduce((a,b)=>a+b,0)/n)*1000);
		this.score = Math.round((d.score.reduce((a,b)=>a+b,0)/n)*100);
		// counts to percentages
		this.correct   = Math.round((d.correct/n)*100);
		this.incorrect = Math.round((d.incorrect/n)*100);
		this.fast      = Math.round((d.fast/n)*100);
		this.slow      = Math.round((d.slow/n)*100);
		this.censored  = Math.round((d.censored/n)*100);
		// complex
		this.hits = minMax(this.correct + this.incorrect, 0, 100);
		this.miss = minMax(this.fast + this.slow + this.censored, 0, 100);
	}


}


class EndExperiment extends Slide {


	constructor(content = [], can_return = false, args = {}) {
		super(content, can_return, args);
		// manifest
		this.score     = null;
        this.rt        = null;
		// outcomes
        this.correct   = null;
        this.incorrect = null;
        this.fast      = null;
        this.slow      = null;
        this.censored  = null;
		// complex
		this.hits = null;
		this.miss = null;
	}


	// super ---------------------------------------------------------------------------------------------------------------


	onEnter () {
        super.onEnter();
        this.calculateExperimentData();
	}


    onExit () {
        if (tomJS.debug.save) tomJS.saveData();
        super.onExit();
	}


	// functions -----------------------------------------------------------------------------------------------------------


	calculateExperimentData() {
		const data = tomJS.data;
		const n = data.length;
		let score     = [];
		let rt        = [];
		let correct   = 0;
		let incorrect = 0;
		let fast      = 0;
		let slow      = 0;
		let censored  = 0;
		for (let i = 0; i < n; i++) {
			score.push(data[i].score);
			rt.push(data[i].rt);
			switch(data[i].outcome){
				case 'Correct'   : correct++	; break;
				case 'Incorrect' : incorrect++  ; break;
				case 'Fast'      : fast++		; break;
				case 'Slow'      : slow++		; break;
				case 'Censored'  : censored++	; break;
			}
		};
		// manifest
		this.rt    = Math.round((rt.reduce((a,b)=>a+b,0)/n)*1000);
		this.score = Math.round((score.reduce((a,b)=>a+b,0)/n)*100);
		// outcomes
		this.correct   = Math.round((correct/n)*100);
		this.incorrect = Math.round((incorrect/n)*100);
		this.fast      = Math.round((fast/n)*100);
		this.slow      = Math.round((slow/n)*100);
		this.censored  = Math.round((censored/n)*100);
		// complex
		const hits = this.correct + this.incorrect;
		this.hits  = minMax(hits, 0, 100);
		const miss = this.fast + this.slow + this.censored
		this.miss  = minMax(miss, 0, 100);
	}

}


class ExampleProgressBar extends Slide {

	constructor(content = [], can_return = false, args = {}) {
		super(content, can_return, args);
		this.min = args.min ?? 0.200;
        this.max = args.max ?? 3.000;
		args.pb_x = args.pb_x ?? 0.5;
		args.pb_y = args.pb_y ?? 0.5;
		this.progress_bar = new ProgressBar(args);
		this.start = null
	}

	// super --------------------------------------------------------------------------------------

	onEnter() {
        super.onEnter();
        this.progress_bar.set('pb_percent', 1);
	}
	
	onUpdate() {
		super.onUpdate();
		this.updateProgressBar();
		this.progress_bar.drawStimulus();
	}

	// functions ----------------------------------------------------------------------------------

	updateProgressBar() {
		const start = this.start;
		const now = tomJS.now;
		const condition = this.max * 1000;
		const duration = this.max * 1000;
		const progress = (now - start) + (duration - condition);
		const percent = 1 - Math.min(progress / duration, 1);
        if (percent >= 0.01) this.progress_bar.set('pb_percent', percent);
		else this.start = tomJS.now;
	}

}


class ExampleVisualResponseSignal extends ExampleProgressBar {

	constructor(content = [], can_return = false, args = {}) {
		super(content, can_return, args);
		this.early = args.early ?? 0.35;
		this.late = args.slate ?? 0.20;
		this.colour = args.colour ?? "DodgerBlue";
	}

	updateProgressBar() {
		const start = this.start;
		const now = tomJS.now;
		const condition = this.max * 1000;
		const duration = this.max * 1000;
		const progress = (now - start) + (duration - condition);
		const percent = 1 - Math.min(progress / duration, 1);
        if (percent >= 0.01) this.progress_bar.set('pb_percent', percent);		
		if (percent <= this.early) this.progress_bar.set('pb_color_F', this.colour);
		if (percent <= this.late) this.progress_bar.set('pb_color_F', "white");
		if (percent == 0) this.start = tomJS.now;
	}

}


// stimuli =================================================================================================================


class Stimulus {


	constructor() {
		this.data = {};		
		this.properties = {};
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
		super(args);
		if (!('target' in args))     tomJS.error('no target passed to gabor');
		if (!('difficulty' in args)) tomJS.error('no difficulty passed to gabor');
		this.data.target     = args.target;
		this.data.difficulty = args.difficulty;
		this.properties.gp_opacity  = args.gp_opacity  ?? 1.0;  // as percentage
		this.properties.gp_ori      = args.gp_ori      ?? 25;	// in degrees
		this.properties.gp_x        = args.gp_x        ?? 0.5;	// in screen units
		this.properties.gp_y        = args.gp_y        ?? 0.5;	// in screen units
		this.properties.gp_sf       = args.gp_sf       ?? 15;
		this.properties.gp_size     = args.gp_size     ?? 1.0;	// in stimulus units
		this.properties.gp_px = Math.round(tomJS.visual.stimulus_size * this.properties.gp_size);
		this.prepareImageData();
	}

	// super ---------------------------------------------------------------------------------------------------------------

	drawStimulus() {
		super.drawStimulus();
		const _s = this.properties.gp_px;
		const img = tomJS.visual.context.createImageData(_s, _s);
		assignImageData(this.image_data, img.data);
		let pos_x = tomJS.visual.screen_size * this.properties.gp_x - (_s * 0.5);
		let pos_y = tomJS.visual.screen_size * this.properties.gp_y - (_s * 0.5);
		tomJS.visual.context.putImageData(img, pos_x, pos_y);
	}

	// functions -----------------------------------------------------------------------------------------------------------

	prepareImageData() {
		const s   = this.properties.gp_px;
		const con = this.data.difficulty;
		const ori = this.properties.gp_ori;
		const sf  = this.properties.gp_sf;
		const lum = 127.5;
		const phs = 0;
		const sigma = 0.2 * s;
		const cx = s / 2, cy = s / 2;
		const dir = (this.data.target == 'A') ? -1 : 1;
		const theta = (ori * Math.PI * dir) / 180;
		const cosT = Math.cos(theta), sinT = Math.sin(theta);
		const k = 2 * Math.PI * sf / s;
		const amp = lum * minMax(con, 0, 1);
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
				const v = minMax(L, 0, 255) | 0;
				image_data.push(v);							// R
				image_data.push(v);							// G
				image_data.push(v);							// B
				image_data.push(Math.round(255 * gauss));	// A
			}
		}
		this.image_data = new Uint8ClampedArray(image_data);
	}

}


class TwoLines extends Stimulus {

	constructor(args = {}) {
		super(args);
		if (!('target' in args))     tomJS.error('no target passed to two lines');
		if (!('difficulty' in args)) tomJS.error('no difficulty passed to two lines');
		this.data.target     = args.target;
		this.data.difficulty = args.difficulty;
		this.properties.tl_color_L    = args.tl_color_L    ?? "white";
		this.properties.tl_color_R    = args.tl_color_R    ?? "white";
        this.properties.tl_distance   = args.tl_distance   ?? 0.25;		// percent of canvas
        this.properties.tl_height     = args.tl_height     ?? 0.15;		// percent of canvas
        this.properties.tl_width      = args.tl_width      ?? 0.02;		// percent of canvas
        this.properties.tl_x          = args.tl_x          ?? 0.5;		// percent of canvas
		this.properties.tl_y          = args.tl_y          ?? 0.5;		// percent of canvas
		this.properties.tl_keep_fix   = args.tl_keep_fix   ?? true;
	}

	// super ---------------------------------------------------------------------------------------------------------------

	drawStimulus() {
		super.drawStimulus();
		if (this.properties.tl_keep_fix) tomJS.writeToCanvas('+');
		this.drawOneLine('A');
		this.drawOneLine('B');
	}

	// functions -----------------------------------------------------------------------------------------------------------

	drawOneLine(side){
		const w = (tomJS.stimulus_size * this.properties.tl_width);
		const adjust = (side === this.data.target) ? this.dapropertiesta.tl_difference : 0;
		const h = (tomJS.stimulus_size * this.properties.tl_height) + adjust;
		const pos_y = (tomJS.stimulus_size * this.properties.tl_y);
		const offset_y = h * 0.5;
		const y = pos_y - offset_y;
		const pos_x = tomJS.stimulus_size * this.properties.tl_x;
		const distance = tomJS.stimulus_size * this.properties.tl_distance;
		const offset_x = w * 0.5;
		const x = (side === "A") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
		const c = (side === this.data.target) ? this.properties.tl_color_L : this.properties.tl_color_R ;
		tomJS.drawRect(x, y, w, h, c);
	}

}


class PixelPatch extends Stimulus {

	constructor(args = {}) {
		if (!('difficulty' in args)) tomJS.error('no way to generate pixel patch stimulus');
		super(args);
		this.data.difficulty = args.difficulty;
		this.data.target     = (this.data.difficulty > 0.5) ? 'A' : 'B';
		this.properties.pp_color_A  = args.pp_color_A ?? colours.black;
		this.properties.pp_color_B  = args.pp_color_B ?? colours.white;
        this.properties.pp_cells    = args.pp_cells   ?? 64;	// cells per row / column
		this.properties.pp_size     = args.pp_size    ?? 1;	    // pixels per cell
        this.properties.pp_x        = args.pp_x       ?? 0.5;	// in screen units
		this.properties.pp_y        = args.pp_y       ?? 0.5;	// in screen units
		this.calculateImageSize();
		this.prepareImageData();
	}

	// super ---------------------------------------------------------------------------------------------------------------	

	drawStimulus() {
		const _g = this.properties.grid_pixels;
		super.drawStimulus();
		const _img = tomJS.visual.context.createImageData(_g, _g);
		assignImageData(this.image_data, _img.data);
		let _pos_x = tomJS.visual.screen_size * this.properties.pp_x - Math.round(_g * 0.5);
		let _pos_y = tomJS.visual.screen_size * this.properties.pp_y - Math.round(_g * 0.5);
		tomJS.visual.context.putImageData(_img, _pos_x, _pos_y);
	}

	// functions -----------------------------------------------------------------------------------------------------------
	
	calculateCellDistribution() {
		const _d = this.data.difficulty;
		const _c = this.properties.pp_cells;
		const _a = Math.ceil(_c * _d);
		const _b = _c - _a;
		this.properties.a_cells = _a;
		this.properties.b_cells = _b;
	}

	calculateImageSize() {
		const _c = this.properties.pp_cells;
		const _s = this.properties.pp_size;
		const _g = _c * _s;
		this.properties.grid_pixels = _g;
	}

	prepareImageData() {
		this.calculateCellDistribution();
		const _A = this.properties.pp_color_A;
		const _B = this.properties.pp_color_B;
		const _c = this.properties.pp_cells;
		const _s = this.properties.pp_size;
		const _a = this.properties.a_cells;
		const _b = this.properties.b_cells;
		let _i = [];
		for (let x = 0; x < _c; x++) {
			const _row = Array(_a).fill(_A).concat(Array(_b).fill(_B)); // create a row of pixels
			const _shf = returnShuffledArray(_row); // randomly shuffle the order of the pixels			
			const _ext = _shf.flatMap(z => Array(_s).fill(z)); // extend the row horizontally
			for (let y = 0; y < _s; y++) _i = _i.concat(_ext.flat()); // repeat the row vertically
		};
		this.image_data = new Uint8ClampedArray(_i);
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


	// super ---------------------------------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		this.drawOneBar('B');
		this.drawOneBar('F');
	}

	// functions -----------------------------------------------------------------------------------------------------------


	drawOneBar(which){
		const w = tomJS.visual.stimulus_size * this.data.pb_width * ((which == 'F') ? this.data.pb_percent : 1);
		const h = tomJS.visual.stimulus_size * this.data.pb_height * ((which == 'F') ? 0.95 : 1);
		const x = (tomJS.visual.screen_size * this.data.pb_x) - (w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.pb_y) - (h * 0.5);
		const c = (which == 'F') ? this.data.pb_color_F : this.data.pb_color_B;
		tomJS.drawRect(x, y, w, h, c);
	}

}


class Table extends Stimulus {

	example_content = ['','A','B','C','AC','BC','D','AD','BD'];
	example_borders = [4, 5, 7, 8];

	constructor(args={}) {
		super(args);
		this.properties.tbl_cols      = args.tbl_cols      ?? 3;
		this.properties.tbl_cell_w    = args.tbl_cell_w    ?? 0.30;	// width of cells in stimulus units
		this.properties.tbl_cell_h    = args.tbl_cell_h    ?? 0.15;	// height of cells in stimulus units
		this.properties.tbl_x         = args.tbl_x         ?? 0.5;
		this.properties.tbl_y         = args.tbl_y         ?? 0.5;
		this.properties.tbl_content   = args.tbl_content   ?? this.example_content;
		this.properties.tbl_borders   = args.tbl_borders   ?? this.example_borders;
		this.properties.tbl_colour    = args.tbl_colour    ?? "white";
		this.properties.tbl_lineWidth = args.tbl_lineWidth ?? 1; // width of border in pixels units
		this.properties.tbl_cells     = this.properties.tbl_content.length;
		this.properties.tbl_rows      = this.properties.tbl_cells / this.properties.tbl_cols;
		this.matrix = this.generateMatrix();
	}

	// super

	drawStimulus() {
		super.drawStimulus();
		this.drawAllCells();
		this.writeAllCells();
	}

	// functions

	drawAllCells() {
		// iterate over provided list of cells and draw a box around it
		for (let c of this.properties.tbl_borders) this.drawOneCell(c);
	}

	drawOneCell(index) {
		const col = index % this.properties.tbl_cols;
		const row = Math.floor(index / this.properties.tbl_rows);		
		const scrn = tomJS.visual.screen_size;
		const stim = tomJS.visual.stimulus_size;
		const w = stim * this.properties.tbl_cell_w;
		const h = stim * this.properties.tbl_cell_h;
		const x = (scrn * this.properties.tbl_x * (1 - this.properties.tbl_cell_w)) + 
			(scrn * this.properties.tbl_cell_w * col * 0.5) - 
			(w * 0.5);
		const y = (scrn * this.properties.tbl_y * (1 - this.properties.tbl_cell_h)) +
			(scrn * this.properties.tbl_cell_h * row * 0.5) -
			(h * 0.5);
		const c = this.properties.tbl_colour;
		const l = this.properties.tbl_lineWidth;		
		tomJS.drawBox(x, y, w, h, c, l);
	}

	generateMatrix() {
		const cols = this.properties.tbl_cols;
		const rows = this.properties.tbl_rows;
		let out = [];
		for (let r = 0; r < rows; r++) {
			const b = r * cols;
			const e = b + this.properties.tbl_cols;
			out.push(this.properties.tbl_content.slice(b, e));
		};
		return out;
	}

	writeAllCells() {
		// iterate over the content array and write each cell to the screen
		for (let c = 0; c < this.properties.tbl_cells; c++) this.writeOneCell(c);
	}

	writeOneCell(index) {
		const col = index % this.properties.tbl_cols;
		const row = Math.floor(index / this.properties.tbl_rows);
		const content = this.properties.tbl_content[index];
		const x = (this.properties.tbl_x * (1 - this.properties.tbl_cell_w)) + (this.properties.tbl_cell_w * col * 0.5);
		const y = (this.properties.tbl_y * (1 - this.properties.tbl_cell_h)) + (this.properties.tbl_cell_h * row * 0.5);
		const args = {'x':x, 'y':y};
		tomJS.writeToCanvas(content, args);
	}

}


// utils ===================================================================================================================


function arrayMax(array) {
	return array.reduce((a,b)=>Math.max(a,b));
}


function arrayMin(array) {
	return array.reduce((a,b)=>Math.min(a,b));
}


function assignImageData(source, sink) {
	if (source.length != sink.length) console.log('ERROR: source and sink are not the same length.',
		Math.sqrt(source.length), Math.sqrt(sink.length));
	for (let i = 0; i < sink.length; i += 4) {
		sink[i+0] = source[i+0];	// R
		sink[i+1] = source[i+1];	// G
		sink[i+2] = source[i+2];	// B
		sink[i+3] = source[i+3];	// A
	};
}


function createButton(id, textContent, onClick, state, parent, args={}) {
	const button = document.createElement('button');
	button.id = id;
	button.textContent = textContent;
	button.onclick = onClick;
	button.style.cursor       = args.cursor       ?? 'pointer';
	button.style.padding      = args.padding      ?? '1%';
	button.style.fontFamily   = args.fontFamily   ?? tomJS.visual.fontFamily;
	button.style.fontSize     = args.fontSize     ?? tomJS.visual.fontSize;
	button.style.marginBottom = args.marginBottom ?? "1%";
	button.style.marginLeft   = args.marginLeft   ?? "0";
	button.style.marginRight  = args.marginRight  ?? "0";
	button.style.marginTop    = args.marginTop    ?? '1%';
	button.style.width        = args.width        ?? null;
	button.style.height       = args.height       ?? null;
	button.state = state;
	state[id] = button;
	parent.append(button);
}


function createContainer(id, state, parent, args={}) {
	const ctr = document.createElement('div');		
	ctr.id = id;
	ctr.style.width          = args.width          ?? "100%";
	ctr.style.height         = args.height         ?? "100%";
	ctr.style.justifyContent = args.justifyContent ?? "center";
	ctr.style.alignItems     = args.alignItems     ?? "center";
	ctr.style.display        = args.display        ?? "flex";
	ctr.style.flexDirection  = args.flexDirection  ?? "column";
	ctr.style.flexWrap       = args.flexWrap       ?? "wrap";
	ctr.style.textAlign      = args.textAlign      ?? "right";
	ctr.style.fontFamily     = args.fontFamil      ?? tomJS.visual.fontFamily;
	ctr.style.position       = args.position       ?? "absolute";
	ctr.style.top            = args.top            ?? "50%";
	ctr.style.left           = args.left           ?? "50%";
	ctr.style.transform      = args.transform      ?? "translate(-50%, -50%)";
	ctr.style.marginBottom   = args.marginBottom   ?? "1%";
	ctr.style.marginLeft     = args.marginLeft     ?? "0";
	ctr.style.marginRight    = args.marginRight    ?? "0";
	ctr.style.marginTop      = args.marginTop      ?? '1%';
	ctr.state = state;
	state[id] = ctr;
	parent.append(ctr)
}


function createLabel(id, content, state, parent, args={}) {
	const label = document.createElement('label');
	label.textContent = content;
	label.style.fontFamily   = args.fontFamily   ?? tomJS.visual.fontFamily;
	label.style.fontSize     = args.fontSize     ?? tomJS.visual.fontSize;
	label.style.width        = args.width        ?? null;
	label.style.marginBottom = args.marginBottom ?? "1%";
	label.style.marginLeft   = args.marginLeft   ?? "0";
	label.style.marginRight  = args.marginRight  ?? "0";
	label.style.marginTop    = args.marginTop    ?? '1%';
	label.state = state;
	state[id] = label;
	parent.append(label);
}


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


function inAndTrue(object, key, fallback=false) {
	if (!(key in object)) return fallback;
	if (key in object) return object[key] == true;
}


function minMax(number, min, max) {
	return Math.max(Math.min(number, max), min);
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
	let cleanedNumber = minMax(parseInt(rolledNumber), max, truncation);
	return cleanedNumber;
}


function updateConsentForm(type, key, value) {
	switch(type) {
		case 'key':
			break;
		case 'value':
			consent_form[key] = value;
			break;
		case 'both':
			break;
	}
}


function writeToBody(text) {
	// Write text to the body of the html page.
	let p = document.createElement("p");
	p.appendChild(document.createTextNode(text));
	document.body.appendChild(p);
}


// util classes ============================================================================================================


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
			case tomJS.controls.key_a: 
				tomJS.dir = tomJS.controls.resp_a;
				break;
			case tomJS.controls.key_b: 
				tomJS.dir = tomJS.controls.resp_b;
				break;
		};
	}


	keyRelease(event) {
		let key = event.key;
		this.keys[key] = false;
	}


}


// data ====================================================================================================================


bremen = {
	'institute'  : "Institut fuer Psychologie",
	'department' : "Fachbereich 11",
	'group'      : "Psychologische Forschungsmethoden und Kognitive Psychologie",
	'email'      : "narraway@uni-bremen.de",
}


colours = {
	//			R    G    B    A
	'black'  : [16,  16,  16,  255],
	'blue'   : [20,  129, 235, 255],
	'green'  : [22,  235, 20,  255],
	'orange' : [235, 126, 20,  255],
	'pink'   : [233, 20,  235, 255],
	'purple' : [126, 17,  238, 255],
	'red'    : [238, 17,  19,  255],
	'yellow' : [232, 238, 108, 255],
	'white'  : [250, 250, 250, 255],
}


consent_form = {
	"General information":
		"Thank you for your interest in our scientific study."+
		" Please read the following information carefully and then decide whether or not to participate in this study." +
		" If you have any further questions about the study beyond this information please message or email Tom Narraway.",
	"Objective of this Research Project":
		"In this study, we want to determine how our experimental manipulation affects the speed and accuracy of your responses.",
	"Study Procedure":
		"First you will use an ID-1 sized card to set the size of the stimuli on your screen." +
		" Then we ask for your age, gender, and dominant hand, but these details are optional." +
		" You will be asked to perform a decision making task in response to simple visual stimuli." +
		" For each decision we record how long you take to respond and if your response is correct or not." +
		" The exact procedure will be explained to you during the experiment." +		
		" The experiment takes approximately 60 minutes and will force your browser into fullscreen mode.",
	"Reimbursement":
		"You will be reimbursed at the rate of 9.50 GBP per hour on the condition that you meet your obligations.",
	"Obligations":
		"The success of scientific studies depends significantly on your cooperation." +
		" We therefore ask you to remain focused and to work according to the instructions throughout the entire study." +
		" In order to demonstrate your focus you must respond correctly on at least 75% of trials." +
		" If you wish to withdraw consent to the use of your data you are obligated to message Tom Narraway via Prolific before your submisison is approved or rejected.",
	"Voluntary Participation and Possibility of Dropping Out":
		"Your participation in the study is voluntary. "+
		" You may withdraw from the study at any time and without giving reasons, without incurring any disadvantages." +
		" If you withdraw but are otherwise eligible for payment, you are entitled to pro rata compensation for your time.",
	"Confidentiality and Anonymity":
		"All data collected as part of this study are initially connected to your anonymous Prolific Participant ID number." +
		" After checking that your obligations are met, your Prolific ID is replaced with a random ID number." +
		" This means that after approving or rejecting your submission, your data can no longer be linked to you in any way." +
		" Accordingly, you cannot withdraw consent to the use of your data and you cannot request that your data be deleted." +
		" As an additional data security measure, the random ID numbers are randomly re-assigned whenever new data is collected.",
	"Data Protection and Use":
		"All processing and analysis is conducted on anonymised data (i.e. data linked to random ID numbers)." +		
		" Anonymous data from this study will be used for research purposes for an indefinite period of time." +
		" Anonymous data may be published online, including to scientific open data platforms."
}


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


demographics_choices = {
	'gender': {
		'en':['','Female','Male','Diverse'],
		'de':['','Weiblich','Maennlich','Divers']
	},
	'hand': {
		'en':['','Left','Right','Both'],
		'de':['','Links','Rechts','Beide']
	}
}
