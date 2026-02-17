
class Experiment {	

	version = '17.02.26 11:16';

	constructor(args={}) {
		
		console.log('booting tomJS version ' + this.version);

		// debug
		this.debug = {};
		this.debug.gridlines  = args.gridlines  ?? false;
		this.debug.fullscreen = args.fullscreen ?? true;
		this.debug.save       = args.save       ?? true;
		this.debug.verbose    = args.verbose    ?? false;

		// visual
		this.visual = {};
		this.visual.backgroundColor = args.backgroundColor ?? "black";
		this.visual.color = args.color ?? "white";				
		this.visual.height = window.innerHeight - 16;
		this.visual.width  = window.innerWidth - 16;
		const screen_size = Math.min(this.visual.height, this.visual.width);
		this.visual.screen_size = screen_size;
		this.visual.stimulus_size = Math.round(this.visual.screen_size * 0.5);
		this.createCanvas();
		this.setCanvasSize(this.visual.screen_size);
		this.setFont();

		// apply visual settings to document
		document.body.style.fontFamily      = this.visual.fontFamily;
		document.body.style.fontSize        = this.visual.fontSize;
		document.body.style.color           = this.visual.color;
		document.body.style.backgroundColor = this.visual.backgroundColor;
		
		// controls
		this.controls = {};
		this.controls.keyboard    = new Keyboard();
		this.controls.key_a       = args.key_a     ?? 'f';
        this.controls.key_b       = args.key_b     ?? 'j';
        this.controls.key_quit    = args.key_quit  ?? 'Escape';
        this.controls.key_back    = args.key_back  ?? 'Backspace';
		this.controls.key_a_upper = this.controls.key_a.toUpperCase();
		this.controls.key_b_upper = this.controls.key_b.toUpperCase();
		this.controls.resp_a      = args.resp_a    ?? 'A';
		this.controls.resp_b      = args.resp_b    ?? 'B';

		// current input data
		this.key = '';
		this.dir = '';
		
		// jatos
		this.jatos = false;

		// demographics
		this.demographics = {};
		this.demographics.participant = Math.round(Math.random()*999999);
		this.demographics.age = null;
		this.demographics.gender = null;
		this.demographics.hand = null;
		this.demographics.n = Math.round(Math.random() * 2);

		// timeline
		this.built    = window.performance.now();
        this.now      = window.performance.now();
        this.running  = true;
		this.complete = false;
        this.timeline = new Timeline();
        this.block    = 0;
		this.blocks   = 0;
        this.trial    = 0;
        this.trials   = 0;
		this.started  = null;

		// data
		this.headings = ['participant','age','gender','hand'];
		this.data = [];

		// attention checks
		this.attention = {};
		this.attention.failed    = 0; // current fail count
		this.attention.limit     = args.attention_limit ?? 3; // failted trail limit
		this.attention.check_for = args.attention_check_for ?? 15; // minutes

		// other
		this.rounding = args.rounding ?? 5;

		// research institute
		this.institute = args.institute ?? institute.bremen;
		
	}

	// functions
	
	appendToTimeline(new_state) {
		this.timeline.push(new_state);
	}

	appendBlock(trial_type, trialwise={}, additional={}, conditional={}, attention={}, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		const _block = new Block(trial_type, trialwise, additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown);
		this.appendToTimeline(_block);
	}

	appendBlocks(trial_type, blockwise={}, trialwise={}, additional={}, conditional={}, attention={}, block_reps=1, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		let _b_cells  = ObjectTools.length(blockwise);
        for (let b = 0; b < block_reps; b++) {
            let _blockwise = ObjectTools.allCombinations(blockwise);
            _blockwise = ArrayTools.shuffle(_blockwise);
            for (let i = 0; i < _b_cells; i++) {
				let _additional = Object.assign({ }, _blockwise[i%_b_cells], additional);
                this.appendBlock(trial_type, trialwise, _additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown);
			};
		};
	}

	attentionCheckFailed() {
		this.attention.failed++;
		if (this.attention.failed >= this.attention.limit & 
			((this.now - this.started)/1000/60) <= this.attention.check_for)
			this.requestReturn();
		if (this.debug.verbose) console.log(this.attention);
	}

	connectToJatos(counterbalance=false) {
		// this. is the window
		tomJS.jatos = true;
		const url = jatos.urlQueryParameters ?? {};
		const wrk = 'workerID' in url;
		const jts = jatos.studyResultId;
		tomJS.demographics.participant = wrk ? url.workerID : jts;
		tomJS.demographics.n = Math.round(jts);
		if (counterbalance) tomJS.counterbalanceAB();
		console.log('Connected to JATOS.');
	}

	createCanvas() {
		this.visual.canvas = document.createElement('canvas');		
		this.visual.canvas.id = "canvas";
		this.visual.canvas.width = "95vmin";
		this.visual.canvas.height = "95vmin";
		this.visual.canvas.style.position = "absolute"; 
		this.visual.canvas.style.backgroundColor = this.visual.backgroundColor;
		this.visual.canvas.style.color = this.visual.colour;
		this.visual.canvas.style.cursor = "none";
		document.body.appendChild(this.visual.canvas);
		this.visual.context = this.visual.canvas.getContext("2d");
	}

	counterbalanceAB() {
		const mod = this.demographics.n % 2;
		const A = (mod == 0) ? this.controls.key_a : this.controls.key_b;
		const B = (A == this.controls.key_a) ? this.controls.key_b : this.controls.key_a;
		this.controls.key_a = A;
        this.controls.key_b = B;
		this.controls.key_a_upper = A.toUpperCase();
		this.controls.key_b_upper = B.toUpperCase();
	}

	drawGridLines() {
		// horizontal
		for (let i = 0; i < 5; i++) {
			let w = this.visual.screen_size;
			let h = this.visual.screen_size * 0.001;
			let x = (this.visual.screen_size * 0.5) - (w * 0.5);
			let y = (this.visual.screen_size * 0.5 * (i/2)) - (h * 0.5);
			this.fillRect(x, y, w, h, this.visual.colour);
		};
		// vertical
		for (let i = 0; i < 5; i++) {
			let w = this.visual.screen_size * 0.001;
			let h = this.visual.screen_size;
			let x = (this.visual.screen_size * 0.5 * (i/2)) - (w * 0.5);
			let y = (this.visual.screen_size * 0.5) - (h * 0.5);
			this.fillRect(x, y, w, h, this.visual.colour);
		};
	}

	drawImage (path, args={}) {
		const img = new Image();
		img.src = path;
		const _size = tomJS.visual.stimulus_size * (args.size ?? 0.5);
		const _x = tomJS.visual.screen_size * (args.x ?? 0.5) - (_size * 0.5);
		const _y = tomJS.visual.screen_size * (args.y ?? 0.5) - (_size * 0.5);
		tomJS.visual.context.drawImage(img, _x, _y, _size, _size);
	}

	endExperiment() {
		this.running  = false;
		this.complete = true;
		if (document.fullscreenElement != null) document.exitFullscreen();
		if (this.jatos)	{
			const sessionData = new BlockData();
			sessionData.calculateData(this.data);
			jatos.setStudySessionData(sessionData.toString());
			jatos.startNextComponent("exit 0");
		}
		else {			
			this.resetCanvas();
			this.writeToCanvas('You can close the window when you are ready :)');
		};
	}

	error(message) {
		this.running = false;
		this.fillRect(0, 0, this.visual.screen_size, this.visual.screen_size, "red");
		this.writeToCanvas('ERROR: '+message);
	}

	/** Draw a filled rectangle. x and y degine the position of the top-left pixel. */
	fillRect(x, y, width, height, colour="white") {
		this.visual.context.fillStyle = colour;
		this.visual.context.fillRect(x, y, width, height);
	}

	flushKeys() {
		this.key = '';
		this.dir = '';
	}

	replaceEndBlockWithEndExperiment(end_slide) {		
		const i = this.timeline.length - 1;
		const j = this.timeline.timeline[i].timeline.length - 1;
		this.timeline.timeline[i].timeline.timeline[j] = end_slide;
	}
	
	resetCanvas () {
		this.fillRect(0, 0, this.visual.screen_size, this.visual.screen_size, this.visual.backgroundColor);
	}

	requestReturn() {
		this.running  = false;
		this.complete = true;
		if (document.fullscreenElement != null) document.exitFullscreen();
		this.resetCanvas();
		this.writeToCanvas('You have failed too many attention checks, please return your submission.');
	}

	run = () => {
		if (this.complete) return;
		this.now = Math.round(window.performance.now());
		this.resetCanvas();		
		this.update();
		requestAnimationFrame(this.run);
	}

	saveData() {
		const csv = this.writeCSV();
		if (this.jatos) jatos.submitResultData(csv);
	}

	setCanvasSize(size) {
		this.visual.canvas.width  = size;
		this.visual.canvas.height = size;
		this.visual.canvas.style.left = (this.visual.width - this.visual.screen_size + 16) / 2 + "px";
	}

	setFont(fontFamily="Arial", t=0.05, h1=0.07, h0=0.10) {
		this.visual.fontFamily = fontFamily;
		this.visual.h0       = (this.visual.stimulus_size * h0) + "px";
		this.visual.h1       = (this.visual.stimulus_size * h1) + "px";
		this.visual.fontSize = (this.visual.stimulus_size * t)  + "px";
	}

	start () {
		this.running = true;
		this.complete = false;
		this.started = window.performance.now();
		this.resetCanvas();
		this.timeline.enter();
		requestAnimationFrame(this.run);
	}

	/** Draw a hollow rectangle. x and y degine the position of the top-left pixel. */
	strokeRect(x, y, width, height, colour = "white", lineWidth = 1) {
		this.visual.context.strokeStyle = colour;
		this.visual.context.lineWidth = lineWidth;
		this.visual.context.strokeRect(x, y, width, height);
	}
	
	update () {				
		this.complete = this.timeline.complete;
		if (this.complete) this.endExperiment();
		else this.timeline.update();
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
		return csv;
	}

	/** Write text to the canvas with a relative position (0.5 being center). 
	 * align: html alignment. How should text align itself to the canvas?
	 * colour: html color. What colour to render the text in.
	 * fontSize: int. What pt size should the text render with?
	 * upper: bool (false). Should text be rendered in all uppercase?
	 * x: portion (0.5): Where should the text render horizontally, from 0 (left) to 1 (right)?
	 * y: portion (0.5): Where should the text render vertically, from 0 (top) to 1 (bottom)?
	 */
	writeToCanvas (text, args={}) {		
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
		let _pos_y = tomJS.visual.screen_size * _y + (0.33 * (""+_pt).split('p')[0]);
		let _width = tomJS.visual.screen_size ?? 1;
		tomJS.visual.context.fillText(_text, _pos_x, _pos_y, _width);
	}

}


// timeline ===================================================================


/** tomJS timeline of tomJS states. */
class Timeline {

	constructor(timeline=[], args={}) {
		this.complete = false;
		this.length = timeline.length;
		this.position = 0;
		this.timeline = timeline;
		this.delete   = args.delete ?? true;
	}
	
	currentState() {
		return this.timeline[this.position].constructor.name;
	}

	enter() {
		this.timeline[this.position].enter();
	}

	exit() {
		this.timeline[this.position].exit();
	}

	insert(state, position) {
		const _before = this.timeline.slice(0, position);
		const _after = this.timeline.slice(position);
		const _timeline = _before.concat(state).concat(_after);
		this.timeline = _timeline;
		this.length += 1;
	}

	push(state) {
		this.timeline.push(state);
		this.length += 1;
	}

	returnLength() {
		return this.timeline.length;
	}

	update() {
		if (this.complete) return;
		if (this.timeline[this.position].complete) this.nextState()
		else this.timeline[this.position].update();
	}

	nextState () {
        if (this.position + 1 == this.length) {
            this.timeline[this.position].exit();
			this.complete = true;
		} else {			
            this.timeline[this.position].exit();
			if (this.delete) delete this.timeline[this.position];
            this.position += 1;
            this.timeline[this.position].enter();
		};
	}

}


// data =======================================================================


class DataWrapper {

	constructor() {}

	keys() {
		return Object.keys(this);
	}

	values() {
		return Object.values(this);
	}

	toString() {
		const keys = this.keys();
		const values = this.values();
		let out = "";
		for (let a = 0; a < keys.length; a++) {
			out += keys[a] + ": " + values[a] + ", ";
		};
		out = out.slice(0, -2); // drop last comma and space
		return out;
	}

}


class BlockData extends DataWrapper {

	constructor() {
		super();
		this.accuracy	= null;
		this.rt			= null;
		this.score		= null;
        this.correct	= null;
        this.incorrect	= null;
        this.fast		= null;
        this.slow		= null;
        this.censored	= null;
		this.hits		= null;
		this.miss		= null;
	}

	calculateAverages(data) {
		this.rt = Math.round(ArrayTools.average(ArrayTools.extract(data, 'rt')));
		this.accuracy = Math.round(ArrayTools.average(ArrayTools.extract(data, 'accuracy'))*100);
		this.score = Math.round(ArrayTools.average(ArrayTools.extract(data, 'score')));
	}

	calculateComplex() {
		this.hits = clamp(this.correct + this.incorrect, 0, 100);
		this.miss = clamp(100 - this.hits, 0, 100);
	}

	calculatePercentages(data) {
		const n = data.length;
		let outcomes   = ArrayTools.extract(data, 'outcome');
		this.correct   = Math.round((ArrayTools.count(outcomes,'Correct')/n)*100);
		this.incorrect = Math.round((ArrayTools.count(outcomes,'Incorrect')/n)*100);
		this.fast      = Math.round((ArrayTools.count(outcomes,'Fast')/n)*100);
		this.slow      = Math.round((ArrayTools.count(outcomes,'Slow')/n)*100);
		this.censored  = Math.round((ArrayTools.count(outcomes,'Censored')/n)*100);
	}

	calculateData(data) {
		this.calculateAverages(data);
		this.calculatePercentages(data);
		this.calculateComplex();
	}

}


class TrialData extends DataWrapper {

	constructor() {
		super();
		this.block			    = null;
		this.trial			    = null;
		this.index				= null;
		this.condition		    = null;
		this.difficulty			= null;
		this.rt					= null;
		this.accuracy			= null;
		this.outcome			= null;
		this.score			    = null;
		this.start				= null;
		this.fixation_on		= null;
		this.fixation_duration	= null;
		this.fixation_size		= null;
		this.fixation_colour	= null;
		this.fixation_off		= null;
		this.stimulus_on		= null;
		this.stimulus_duration	= null;
		this.stimulus_fast		= null;
		this.stimulus_slow		= null;
		this.stimulus_off		= null;
		this.target				= null;
		this.response			= null;
		this.response_key	    = null;
		this.response_given		= null;
		this.feedback_on		= null;
		this.feedback_duration	= null;
		this.feedback_text		= null;
		this.feedback_colour	= null;
		this.feedback_size		= null;
		this.feedback_off	    = null;
		this.iti_duration		= null;
		this.end				= null;
	}

}


// states =====================================================================


class State {

	constructor() {
		this.complete = false;
		this.timeline = new Timeline();
		this.name = this.constructor.name;
		this.start = null;
		this.end = null;
	}

	enter() {
		this.complete = false;
		this.start = tomJS.now;
		tomJS.flushKeys();
	}

	exit() {
		if (this.complete) return;
		this.complete = true;
		this.end = tomJS.now;
	}

	update() {
		if (this.complete) return;
		if (this.timeline) this.complete = this.timeline.complete;
	}

}


// mutators ===================================================================


class Mutator extends State {

	/**
	 * Inserted into timeline to perform runtime mutation, such as changing the upcoming block.
	 * @param {CallableFunction} mutation - The mutation function to run upon entering this state.
	 * @param {Object{}} args - An object of optional arguents to pass down the chain.
	 */

	constructor(mutation, args={}) {
		super();
		this.mutation = mutation;
	}

	enter() {
		this.mutation();
	}

}


// blocks =====================================================================


class Block extends State {

	constructor(trial_type, trialwise={}, additional={}, conditional={}, attention={}, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		super();
		this.block = tomJS.blocks;
		tomJS.blocks++;
		this.n = 0;	
		this.generateTimeline(trial_type, trialwise, additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown);
	}

	// super

	enter() {
		super.enter();
		this.timeline.enter();
	}

	exit() {
		super.exit();
		tomJS.block += 1;
        tomJS.trial = 0;
	}

	update() {
		super.update();
		this.complete = this.timeline.complete;
		if (this.complete) return
		else this.timeline.update();
	}

	// functions

	checkConditions(conds, args) {		
		let _conds = conds;
		let _args = args;
		for (let _c = 0; _c < Object.keys(_conds).length; _c++) {
			const _key = Object.keys(_conds)[_c];
			const _cond = _conds[_key];
			for (let _o = 0; _o < Object.keys(_cond).length; _o++) {
				const _evaluation = this.evaluate(Object.keys(_cond)[_o], args);
				if (_evaluation) { 
					_args[_key] = TextTools.parse(Object.values(_cond)[_o]);
					break;
				};
			};
		};
		return _args;
	}

	evaluate(operation, dict) {
		const t = operation.split(' ');
		const l = "" + dict[t[0]];
		const o = t[1];
		const r = "" + t[2];
		switch(o) {
			case '==' : return l == r;
			case '!=' : return l != r;
			case '<'  : return l <  r;
			case '>'  : return l >  r;
			case '<=' : return l <= r;
			case '>=' : return l >= r;
		};
	}

	generateTimeline(trial_type, trialwise, additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown) {
		let _timeline = new Timeline();
		let _trialwise = ObjectTools.allCombinations(trialwise);
		_trialwise = ArrayTools.tape(_trialwise, additional);
		_trialwise = ArrayTools.extend(_trialwise, trial_reps);
		if (Object.keys(attention).length > 0) {
			for (let i = 0; i < attention.targets.length; i++) {
				let _new = attention;
				_new.target = attention.targets[i];
				_new.attention_check = true;
				_trialwise.push(_new);
			};
		};
		if (Object.keys(conditional).length == 0) _trialwise = this.checkConditions(conditional, _trialwise);
		_trialwise = ArrayTools.shuffle(_trialwise);
		if (start_slide != null) _timeline.push(start_slide);
		if (add_countdown) {_timeline.push(new Countdown(3000))};
		for (let t = 0; t < _trialwise.length; t++) {
			const _args = _trialwise[t];
			_args.block = this.block;
			_args.trial = t;
			_args.index = tomJS.trials;
			const _new_trial = new trial_type(_args);
			_timeline.push(_new_trial);
			this.n++;
			tomJS.trials++;
		};
		if (end_slide != null) _timeline.push(end_slide);
		this.timeline = _timeline;
	}

	parseText(text) {
		let _t = "" + text;
		if (_t.includes('~')) {
			let _split = _t.split('~');
			_t = _split[0] + eval(_split[1]) + _split[2];
		};
		return _t;
	}

}


// trial bits =================================================================


class TrialBit extends State {

	constructor(trial, args={}) {
		super();
		this.trial    = trial;
		this.data     = trial.data;
		this.timeline = null;
	}

}


class FeedbackBit extends TrialBit {

	constructor(trial, args={}) {super(trial, args)}

	enter() {
		super.enter();
		this.trial.updateFeedbackText()
		this.data.feedback_on  = tomJS.now;
		this.data.feedback_off = tomJS.now + this.data.feedback_duration;
	}

	exit() {
		super.exit();
		this.data.feedback_off = tomJS.now;		
	}

	update() {
		super.update();
		const text = this.data.feedback_text;
		const colour = this.data.feedback_colour;
		tomJS.writeToCanvas(text,{'colour':colour, 'fontSize':this.data.feedback_size});
		if (tomJS.now >= this.data.feedback_off) this.exit();
	}

}


class FixationBit extends TrialBit {

	constructor(trial, args={}) {super(trial, args)}

	enter() {
		super.enter();
		this.data.fixation_on  = tomJS.now;
		this.data.fixation_off = tomJS.now + this.data.fixation_duration;
	}

	exit() {
		super.exit();
		this.data.fixation_off = tomJS.now;		
	}

	update() {
		super.update();
		if (tomJS.now >= this.data.fixation_off) this.exit();
		const args = {'colour':this.data.fixation_colour, 'fontSize':this.data.fixation_size};
		tomJS.writeToCanvas('+', args);
	}

}


class ITIBit extends TrialBit {

	constructor(trial, args={}) {super(trial, args)}

	enter() {
		super.enter();
		this.data.iti_on  = tomJS.now;
		this.data.iti_off = tomJS.now + this.data.iti_duration;
	}

	exit() {
		super.exit();
		this.data.iti_off = tomJS.now;		
	}

	update() {
		super.update();
		if (tomJS.now >= this.data.iti_off) this.exit();
	}

}


class StimulusBit extends TrialBit {

	constructor(trial, args={}) {super(trial, args)}

	enter() {	
		super.enter();
		this.data.stimulus_on  = tomJS.now;
		this.data.stimulus_off = tomJS.now + this.data.stimulus_duration;
	}

	exit() {
		super.exit();
		this.data.stimulus_off = tomJS.now;
	}

	exitResponse() {
		this.trial.recordResponse();
		this.trial.calculateRT();
		this.trial.determineAccuracy();
		this.trial.determineOutcome();
		this.trial.calculateScore();
		this.exit();
	}

	exitTime() {
		this.trial.determineOutcome();
		this.exit();
	}

	update() {
		super.update();
		if (tomJS.controls.keyboard.anyKeysPressed([tomJS.controls.key_a, tomJS.controls.key_b])) {
			this.exitResponse();
		};
		if (tomJS.now >= this.data.stimulus_off) {
			this.exitTime();
		};
		this.trial.stimulus.draw();
	}

}


// trials =====================================================================


/** Standard two-alternative forced choice reaction time task. */
class Trial extends State {

	constructor(args={}) {
		super(args);

		this.index = args.index ?? 0;

		// create new stimulus object
		if (!('stimulus' in args)) tomJS.error('no target stimulus passed to trial');	
		this.stimulus = new args.stimulus(args);

		// data
		tomJS.data.push(new TrialData());
		this.data = tomJS.data[this.index];

		this.data.block				= Number(args.block ?? tomJS.block);
		this.data.trial				= Number(args.trial ?? tomJS.trial);
		this.data.index				= Number(this.index);
		this.data.condition			= args.condition ?? null;
		this.data.difficulty		= this.stimulus.data.difficulty;
		this.data.fixation_duration	= Number(choose(args.fixation_duration, 1000));
		this.data.fixation_size		= Number(choose(args.fixation_size, 0.10));
		this.data.fixation_colour	= args.fixation_colour ?? "white";
		this.data.stimulus_duration	= Number(choose(args.stimulus_duration, 3000));
		this.data.stimulus_fast		= Number(choose(args.stimulus_fast, 200));
		this.data.stimulus_slow		= Number(choose(args.stimulus_slow, 3000));
		this.data.target			= this.stimulus.data.target;
		this.data.feedback_duration	= Number(choose(args.feedback_duration, 1000));
		this.data.feedback_size		= Number(choose(args.feedback_size, 0.05));
		this.data.iti_duration		= Number(choose(args.iti_duration, 200));

		// timeline
		if ('timeline' in args) this.timeline = args.timeline
		else {
			this.timeline = new Timeline();
			this.timeline.push(new FixationBit(this, args));
			this.timeline.push(new StimulusBit(this, args));
			this.timeline.push(new FeedbackBit(this, args));
			this.timeline.push(new ITIBit(this, args));
		};

		// append data headings to global data heading storage
		if (!(tomJS.headings.includes('block'))) tomJS.headings = ArrayTools.joinUniques(tomJS.headings, this.data.keys());

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

		// mark if is attention check
		this.attention_check = args.attention_check ?? false;

		// ensure too slow response does not override stimulus duration, unless desired
		if ('stimulus_duration' in args && ! 'stimulus_slow' in args)
			this.data.stimulus_slow = this.data.stimulus_duration;

	}

	// super

	enter() {
		super.enter();
		this.data.start = tomJS.now;
		this.estimateOnsets();
		this.data.fixation_size = Math.round((this.data.fixation_size ) * tomJS.visual.stimulus_size) + "px";
		this.data.feedback_size = Math.round((this.data.feedback_size ) * tomJS.visual.stimulus_size) + "px";
		this.timeline.enter();
	}

	exit() {		
		super.exit();
		this.data.end = tomJS.now;
		if (this.attention_check & this.data.outcome != "Correct") tomJS.attentionCheckFailed();
	}	

	update() {
		super.update();
		this.complete = this.timeline.complete;
		if (this.complete) return
		else this.timeline.update();
	}

	// functions

	calculateRT() {
		const rg = this.data.response_given;
		const on = this.data.stimulus_on;
		this.data.rt = roundTo((rg - on), tomJS.rounding);
	}
        
	calculateScore() {
		if (this.data.response == this.data.target) this.data.score = 100 
		else this.data.score = 0;
	}

	determineAccuracy() {
		if (this.data.response == this.data.target) this.data.accuracy = 1 
		else this.data.accuracy = 0;
	}

	determineOutcome() {
		const rsp = this.data.response;
		const rt  = this.data.rt;
		const tgt = this.data.target;
		const slw = this.data.stimulus_slow;
		const fst = this.data.stimulus_fast;
		if		(rsp == null) {this.data.outcome = 'Censored'}
		else if (rt >= slw)   {this.data.outcome = 'Slow'}
		else if (rt <= fst)   {this.data.outcome = 'Fast'}
		else if (rsp == tgt)  {this.data.outcome = 'Correct'}
        else				  {this.data.outcome = 'Incorrect'};
	}

	estimateOnsets() {
		this.data.fixation_on = this.data.start + 1;
		this.data.stimulus_on = this.data.fixation_on + this.data.fixation_duration;
		this.data.feedback_on = this.data.stimulus_on + this.data.stimulus_duration;
		this.data.iti_on      = this.data.feedback_on + this.data.feedback_duration;
	}

	recordResponse() {
		this.data.response       = tomJS.dir;
		this.data.response_key   = tomJS.key; 
		this.data.response_given = tomJS.now;
	}

	updateFeedbackText() {
		const outcome = this.data.outcome;
		this.data.feedback_text   = this.feedback_texts[outcome];
		this.data.feedback_colour = this.feedback_colors[outcome];
	}

}


class FeedbackDeadline extends Trial {

	constructor(args={}) {
		if (!('condition'in args)) tomJS.error('no condition (deadline) passed to feedback deadline trial');
		super(args);
        this.data.stimulus_slow = this.data.condition;
	}

}


class PreFixationPicture extends Trial {

	constructor(args={}) {
		if (!('condition'in args)) tomJS.error('no condition passed to pre-fixation picture trial');
		super(args);

		this.data.cue_duration = args.cue_duration ?? 1000;

	}

	// functions


	cueEnter() {
		this.data.cue_on = tomJS.now;
		this.substate = this.cueUpdate;
	}

	cueExit() {
		this.data.cue_off = tomJS.now;
		this.fixatienter();
	}

	cueQueue() {
		this.data.cue_on = this.data.start + 1;
		this.data.cue_off   = this.data.cue_on + this.data.cue_duration;
	}

	cueUpdate() {
		tomJS.drawImage(this.data.condition, this.args);
		if (tomJS.now >= this.data.cue_off) this.cueExit();
	}

}


/** A row of +s indicate when the partiicoant should respond. */
class ResponseSignal extends Trial {

	constructor(args={}) {
		if (!('condition'in args)) 
			tomJS.error('no condition passed to response signal trial');
		
		super(args);

		// override
		this.data.stimulus_fast = Number(args.stimulus_fast ?? 15);
		this.data.stimulus_slow = Number(args.stimulus_slow ?? 15);

		this.feedback_texts  = args.feedback_texts  ?? { 
			'Correct'	: 'Hit',
			'Incorrect'	: 'Hit',
			'Fast'		: 'Miss', 
			'Slow'		: 'Miss',
			'Censored'	: 'Miss'
		};
		
		// signal
		this.data.above_and_below = args.above_and_below ?? false;
		this.data.signal_for = Number(choose(args.signal_for, 300));
		this.data.signal_x   = Number(choose(args.signal_x, 0.5));
		this.data.signal_y   = Number(choose(args.signal_y, 0.2));

		// warning
		this.data.warning_at  = Number(choose(args.warning_for, 200));
		this.data.warning_for = Number(choose(args.warning_for, 200));

		// calculated
		this.data.stimulus_duration += this.data.condition + this.data.signal_for;
		this.data.trial_duration = this.data.fixation_duration + this.data.condition + this.data.signal_for;

		// placeholder
		this.data.rtt         = null;
		this.data.signal_on   = null;
		this.data.signal_off  = null;
		this.data.warning_on  = null;
		this.data.warning_off = null;
		this.data.early       = null;
		this.data.late        = null;

		// response signal
		this.signal = new (args.signal ?? Text)(args);
		this.signal.set('x', this.data.signal_x);
		this.signal.set('y', this.data.signal_y);
		
		if (this.data.above_and_below) {
			this.signal_lower = new (args.signal ?? Text)(args);
			this.signal_lower.set('x', this.data.signal_x);
			this.signal_lower.set('y', (1 - this.data.signal_y));
		};

		// headings
		if (!(tomJS.headings.includes('rtt'))) tomJS.headings = ArrayTools.joinUniques(tomJS.headings, this.data.keys());
	}

	// override

	determineOutcome() {
		const rsp = this.data.response;
		const rsg = this.data.response_given;
		const erl = this.data.early;
		const lte = this.data.late;
		const tgt = this.data.target;
		let _outcome;
		if		(rsp == null) {_outcome = 'Censored'}
		else if (rsg <= erl)  {_outcome = 'Fast'}
		else if (rsg >= lte)  {_outcome = 'Slow'}
		else if (rsp == tgt)  {_outcome = 'Correct'}
        else				  {_outcome = 'Incorrect'};
		this.data.outcome = _outcome;
	}

	// super

	calculateRT() {
		super.calculateRT();
		const rg = this.data.response_given;
		const rs = this.data.signal_on;
		this.data.rtt = roundTo((rg - rs), tomJS.rounding);
	}

	enter() {
		super.enter();
		this.data.signal_on   = this.data.stimulus_on + this.data.condition;
		this.data.signal_off  = this.data.signal_on   + this.data.signal_for;
		this.data.warning_on  = this.data.signal_on   - this.data.warning_at;
		this.data.warning_off = this.data.warning_on  + this.data.warning_for;
		this.data.early       = this.data.signal_on   - this.data.stimulus_fast;
		this.data.late        = this.data.signal_off  + this.data.stimulus_slow;
	}

	update() {
		super.update();
		this.updateSignal();
		this.drawSignal();
	}

	// functions

	drawSignal() {
		this.signal.draw();
		if (this.data.above_and_below) this.signal_lower.draw();
	}

	updateSignal() {
		let text = "";
		if (tomJS.now < this.data.warning_on)      text = ""
		else if (tomJS.now < this.data.signal_on)  text = "+"
		else if (tomJS.now < this.data.signal_off) text = "+++++"
		else									   text = "";
		this.signal.set('text', text);
		if (this.data.above_and_below) this.signal_lower.set('text', text);
	}

}


/** A bar at the top of the screen informs the participant when, and how long they have, to respond. */
class ProgressBarResponseSignal extends ResponseSignal {

	constructor(args={}) {

		if (!('condition'in args)) tomJS.error('no condition passed to visual response signal trial');
		super(args);

		// override
		this.data.warning_at  = Number(choose(args.warning_for, 0));
		this.data.warning_for = Number(choose(args.warning_for, 0));

		this.data.signal_colour  = args.signal_colour  ?? "DeepSkyBlue";
		this.data.warning_colour = args.warning_colour ?? "#99ccff";
		this.data.bar_colour     = args.bar_colour     ?? "White";
		this.data.border_colour  = args.border_colour  ?? "Grey";
		this.data.empty_colour   = args.empty_colour   ?? "#00000000";

		// signal
		this.signal = new (args.signal ?? ProgressBar)(args);
		this.signal.set('x', this.data.signal_x);
		this.signal.set('y', this.data.signal_y);
		this.signal.set('bar_colour', this.data.bar_colour);
		this.signal.set('border_colour', this.data.border_colour);
		
		if (this.data.above_and_below) {
			this.signal_lower = new (args.signal ?? ProgressBar)(args);
			this.signal_lower.set('x', this.data.signal_x);
			this.signal_lower.set('y', (1 - this.data.signal_y));
			this.signal_lower.set('bar_colour', this.data.bar_colour);
			this.signal_lower.set('border_colour', this.data.border_colour)
		};
	}

	// super

	enter() {
		super.enter();
		this.signal.initialize(this.data);
		if (this.data.above_and_below) this.signal_lower.initialize(this.data);
	}

	update() {
		super.update();
		this.updateProgressBar();
        this.drawProgressBar();
	}

	// functions

	drawProgressBar() {
		if (this.timeline.currentState() == "ITIBit") {tomJS.resetCanvas(); return;}
        this.signal.draw();
		if (this.data.above_and_below) this.signal_lower.draw();
	}

	getBarPercent() {
		return (tomJS.now - this.data.fixation_on) / this.data.trial_duration;
	}

	getBarColour() {
		if (tomJS.now < this.data.warning_on)      return this.data.bar_colour
		else if (tomJS.now < this.data.signal_on)  return this.data.warning_colour
		else if (tomJS.now < this.data.signal_off) return this.data.signal_colour
		else									   return this.data.empty_colour;
	}

    updateProgressBar() {
		if (this.timeline.currentState() == "FeedbackBit" | 
			this.timeline.currentState() == "ITIBit") return;
		const percent = this.getBarPercent();
		this.setBarColour();
		this.setBarPercent(percent);
		this.setWidowColour();
	}

	setBarColour() {
		const colour  = this.getBarColour();
        this.signal.set('bar_colour', colour);
		if (this.data.above_and_below) this.signal_lower.set('bar_colour', colour);
	}

	setBarPercent(percent) {
		this.signal.set('percent', percent);
		if (this.data.above_and_below) this.signal_lower.set('percent', percent);
	}

	setWidowColour() {
		let colour;
		if (tomJS.now < this.data.warning_on)      colour = this.signal.window_colour
		else if (tomJS.now < this.data.signal_on)  colour = this.data.warning_colour
		else if (tomJS.now < this.data.signal_off) colour = this.data.signal_colour
		else									   colour = this.signal.window_colour;
		this.signal.set('window_colour', colour);
		if (this.data.above_and_below) this.signal_lower.set('window_colour', colour);
	}
	
}


// slides =====================================================================


class Slide extends State {

	constructor(content=[], args={}) {
		super();
		this.content = content;
		this.force_wait = args.force_wait ?? 1000;		
		this.timeline = null;
		this.realizeContent();
		this.can_proceed = false;		
	}

	// super

	enter() {
		super.enter();
		this.can_proceed = false;
		setTimeout(()=>{this.can_proceed = true}, this.force_wait);
	}

	update() {
		super.update();
		this.drawContent();
		if (!this.can_proceed) return;
		this.checkUserInput();
	}

	// functions

	checkConditions(content) {
		if (!('conditions' in content)) return true;
		for (let c of content.conditions) if (!eval(this.parseText(c))) return false;
		return true;
	}

	checkUserInput() {
		const _a = tomJS.controls.key_a;
		const _b = tomJS.controls.key_b;
		if (tomJS.controls.keyboard.allKeysPressed([_a, _b])) this.complete = true;
	}

	drawContent() {
		for (const _c of this.content) {
			switch(_c.class) {
				case 'gabor':
					if (tomJS.dir == 'A') this.gp_L.draw()
					else this.gp_R.draw();
					break;
				case 'image':
					const _path = this.parseText(_c.path);
					tomJS.drawImage(_path, _c);
					break;
				case 'pixelpatch':
					if (tomJS.dir == 'A') this.pp_A.draw()
					else this.pp_B.draw();
					break;
				case 'table':
					this.table.draw();
					break;
				case 'text':
					if (!(this.checkConditions(_c))) break;
					const _text = this.parseText(_c.text);
					tomJS.writeToCanvas(_text, _c);
					break;
				case 'twolines':
					const _tl_args = {..._c,...{'target':this.parseText(_c.target)}};
					const _tl = new TwoLines(_tl_args);
					_tl.draw();
					break;
				case 'progressbar': 
					const percent = (tomJS.now - this.bar_start) / this.bar_max;
					if (percent >= 1.5) this.bar_start = tomJS.now;
					const bar = this['progressbar'+_c.tag??''];
					bar.set('percent', percent);
					if (percent < 0 | percent > 1) {
						bar.set('bar_colour', "#00000000");
						bar.set('window_colour', this.window_colour);
					}
					else if (percent < _c.signal_on  ?? 0.50) {
						bar.set('bar_colour', this.bar_colour);
						bar.set('window_colour', this.window_colour);
					}
					else if (percent < _c.signal_off ?? 0.75) {
						bar.set('bar_colour', this.signal_colour);
						bar.set('window_colour', this.signal_colour);
					}
					else {
						bar.set('bar_colour', this.bar_colour);
						bar.set('window_colour', this.window_colour);
					};
					bar.draw();
					break;
			};
		};
	}

	parseText(_text) {
		if (_text.includes('~')) {
			let _split = _text.split('~');
			_text = _split[0] + eval(_split[1]) + _split[2];
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
				case 'progressbar':
					this.bar_start = this.start;
					this.bar_max   = c.bar_max ?? 2000;
					this.bar_colour = c.bar_colour ?? "White";
					this.signal_colour = c.signal_colour ?? "DeepSkyBlue";
					this.window_colour = c.window_colour ?? "Silver";
					this.signal_on = c.signal_on ?? 0.50;
					this.signal_off = c.signal_off ?? 0.75;
					this['progressbar'+c.tag ?? ''] = new (c.signal ?? ProgressBar)(c);
					break;
			};
		};
	}

}


class Consent extends Slide {

	constructor(args={}) {
		super([], args);
		this.exit_pressed = false;
		this.exit_button  = null;
		this.container    = null;
		this.institute    = tomJS.institute;
	}

	// override

	update() {
		if (this.complete) return;
		tomJS.fillRect(0, 0, tomJS.visual.screen_size, tomJS.visual.screen_size, "white");
		if (tomJS.now < this.start + this.force_wait) return;
	}

	// super

	enter() {
		this.createContainer();
		super.enter();
		document.body.style.backgroundColor = "white";
		document.body.style.color = "black";
		this.createTopPanel();
		this.createMain();
		createButton("exitButton", "Consent", this.exitButtonClicked, this, this.container);
	}

	exit() {
		super.exit();
		this.container.remove();
		document.body.style.backgroundColor = tomJS.visual.backgroundColor;
		document.body.style.color = tomJS.visual.color;
	}

	// functions

	exitButtonClicked() {
		this.state.complete = true;
		if (tomJS.debug.fullscreen) document.documentElement.requestFullscreen();
	}

	createLogo() {
		const url = this.institute.logo;
		const img = document.createElement('IMG');
		img.id = "Logo";
		img.src = url;
		img.style.width = "400px";
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
		ins.textContent = this.institute.institute;
		ins.style.fontSize = tomJS.visual.h0;			
		div.append(ins);
		// department
		let dep = document.createElement('label');
		dep.textContent = this.institute.department;
		dep.style.marginTop = "1em";
		dep.style.fontSize = tomJS.visual.h1,	
		div.append(dep);
		// group
		let grp = document.createElement('label');
		grp.textContent = this.institute.group;
		grp.style.marginTop = "1em";		
		div.append(grp);
		// contact
		let ctc = document.createElement('label');
		ctc.textContent = "Contact";
		ctc.style.marginTop = "1em";
		ctc.style.fontSize = tomJS.visual.h1;	
		div.append(ctc);
		// contacts
		for (let i = 0; i < this.institute.contacts.length; i++) {
			let tmp = document.createElement('label');
			tmp.textContent = this.institute.contacts[i];
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
		const logo = this.createLogo();
		const info = this.createContactPanel();
		div.append(logo, info);
		this.container.append(div);
	}

}


class Countdown extends Slide {

	constructor(lifetime, args={}, content=[]) {
		super(content, args);
		this.lifetime = lifetime;
		this.fontSize = choose(args.fontSize, 0.05);
	}

	// super

	enter() {
		this.fontSize = Math.ceil((this.fontSize) * tomJS.visual.stimulus_size) + "px";
		super.enter();
	}

	update() {
		let time = Math.ceil((this.start + this.lifetime - tomJS.now) / 1000);
        tomJS.writeToCanvas(time, {'fontSize':this.fontSize});
        if (tomJS.now >= this.start + this.lifetime) this.complete = true;
		super.update();
	}

}


/** Calculate the standard stimulius size using a physical ID-1 card. */
class CreditCard extends Slide {

	constructor(args={}) {
		super([], args);
		this.cc_width  = "86mm";
		this.cc_height = "54mm";
		this.width     = 86;
		this.height    = 54;
		this.min       = 50;
		this.max       = 200;
		this.value     = 100;
		this.instructions = args.instructions ?? "Please hold an ID-1 card (e.g. credit card or driving license) to" +
			" the screen and surround your card with the white border such that no grey is visible.";
	}

	// super

	enter() {
		super.enter();
		this.adjustWindowSize();
		this.createContainer();
		createLabel("instructions", this.instructions, this, this.container, {'width':'50%'});
		this.createWallet();
		this.createCreditCard();
		this.createControls();
		const _up_down_args = {'width':'5vmin', 'height':'5vmin'};
		createButton("Down", "-", ()=>{this.onUpDownClick(this, -1)}, this, this.controls, _up_down_args);
		this.createSlider();
		createButton("Up", "+", ()=>{this.onUpDownClick(this, 1)}, this, this.controls, _up_down_args);
		createButton("Exit", "Confirm", this.exitClick, this, this.container);
	}

	exit() {
		super.exit();
		this.adjustWindowSize();		
		this.adjustStimulusSize();
		this.container.remove();
	}

	// functions

	adjustStimulusSize() {
		const w = this.credit_card.clientWidth;
		const _s = Math.round(w * (this.slider.value / 100));
		tomJS.visual.stimulus_size = _s;
	}

	adjustWindowSize() {
		tomJS.visual.height = window.innerHeight - 16;
		tomJS.visual.width  = window.innerWidth - 16;
		const screen_size = Math.min(tomJS.visual.height, tomJS.visual.width);
		tomJS.visual.screen_size = screen_size;
		tomJS.setCanvasSize(screen_size);
		tomJS.setFont();
	}

	createCreditCard() {
		const credit_card = document.createElement('div');
		credit_card.id = "CreditCard";
		credit_card.style.backgroundColor = "grey";
		credit_card.style.width  = this.cc_width;
		credit_card.style.height = this.cc_height;
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
		wallet.style.height = this.height * 2.10 + "mm";
		wallet.style.justifyContent  = "center";
		wallet.style.alignItems  = "center";
		this.container.append(wallet);
		this.wallet = wallet;
		wallet.state = this;
	}

	exitClick() {
		// this. is the button
		this.state.complete = true;
	}

	onUpDownClick(s, x) {
		// this. is the button
		const n = Math.round(s.slider.value) + x;
		const m = clamp(n, s.min, s.max);
		s.slider.value = m;
		s.setCreditCardScale();
	}

	onSlide() {
		// this. is the slider
		this.state.setCreditCardScale();
	}

	setCreditCardScale() {
		const c = this.credit_card;
		const s = this.slider.value / 100;
		c.style.width  = Math.round(this.width  * s) + "mm";
		c.style.height = Math.round(this.height * s) + "mm";
	}

}


class Demographics extends Slide {

	constructor(args={}) {
		super([], args);
		this.age = null;
		this.gender = null;
		this.hand = null;
		this.exit_pressed = false;
		this.exit_button = null;
		this.heading = args.heading ?? "Demographics Information";
		this.instructions = args.instructions ?? "The following information is optional."+
			" Pless press \"Submit\" when you are ready to continue. ";
	}

	// override

	update() {		
		this.drawContent();
		if (tomJS.now < this.start + this.force_wait) return;
	}

	// super

	enter() {
		super.enter();
		this.createContainer();
		createLabel("Heading", this.heading, this, this.container, {'fontSize':tomJS.visual.h0});
		createLabel("Instructions", this.instructions, this, this.container);
		this.createFields();
		createButton("exitButton", "Submit", this.exitClicked, this, this.container);
	}

	exit() {
		super.exit();
		tomJS.demographics.age    = this.Age.value;
		tomJS.demographics.gender = this.Gender.value;
		tomJS.demographics.hand   = this.Hand.value;
		this.container.remove();
	}

	// functions

	exitClicked() {
		// this. is the button
		this.state.complete = true;
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
		createLabel(id+"Label", textContent, this, div, {'width':'50vmin', 'marginRight':'3vh', 'textAlign':'right'});
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


/** Slide shown at the end of a block. Access averaged data inside ~this.data~. */
class EndBlock extends Slide {

	constructor(content = [],args = {}) {
		super(content, args);
		this.data = new BlockData();
		this.filter = args.filter ?? 'block == ~tomJS.block~';
	}

	// super

	enter () {
        super.enter();
        this.data.calculateData(this.gatherData());
		if (tomJS.debug.save) tomJS.saveData();
	}

	// functions

	gatherData() {
		return ArrayTools.filter(tomJS.data, this.filter);
	}

}


/** Slide shown at the end of the experiment. Access averaged data inside ~this.data~. */
class EndExperiment extends EndBlock {

	constructor(content=[], args={}) {
		super(content, args);
	}

	// override

	gatherData() {
		return tomJS.data;
	}

}


// stimuli ====================================================================


const Stimuli = ((module) => {

	module.Stimulus = class Stimulus {

		constructor() {
			this.data = {};
		}

		draw() {
			// does nothing
		}

		initialize(data) {
			// does nothing
		}

		reset() {
			// does nothing
		}

		set(key, value, reset = true) {
			this.data[key] = value;
			if (reset) this.reset();
		}

	}

	module.Gabor = class Gabor extends Stimulus {

		constructor(args = {}) {
			super(args);
			if (!('target' in args)) tomJS.error('no target passed to gabor');
			if (!('difficulty' in args)) tomJS.error('no difficulty passed to gabor');
			this.data.target = args.target;
			this.data.difficulty = args.difficulty;
			this.data.gp_opacity = args.gp_opacity ?? 1.0;  // as percentage
			this.data.gp_ori = args.gp_ori ?? 25;	// in degrees
			this.data.gp_x = args.gp_x ?? 0.5;	// in screen units
			this.data.gp_y = args.gp_y ?? 0.5;	// in screen units
			this.data.gp_sf = args.gp_sf ?? 15;
			this.data.gp_size = args.gp_size ?? 1.0;	// in stimulus units
			this.data.gp_px = Math.round(tomJS.visual.stimulus_size * this.data.gp_size);
			this.prepareImageData();
		}

		// super

		draw() {
			super.draw();
			const _s = this.data.gp_px;
			const img = tomJS.visual.context.createImageData(_s, _s);
			assignImageData(this.image_data, img.data);
			let pos_x = tomJS.visual.screen_size * this.data.gp_x - (_s * 0.5);
			let pos_y = tomJS.visual.screen_size * this.data.gp_y - (_s * 0.5);
			tomJS.visual.context.putImageData(img, pos_x, pos_y);
		}

		// functions

		prepareImageData() {
			const s = this.data.gp_px;
			const con = this.data.difficulty;
			const ori = this.data.gp_ori;
			const sf = this.data.gp_sf;
			const lum = 127.5;
			const phs = 0;
			const sigma = 0.2 * s;
			const cx = s / 2, cy = s / 2;
			const dir = (this.data.target == 'A') ? -1 : 1;
			const theta = (ori * Math.PI * dir) / 180;
			const cosT = Math.cos(theta), sinT = Math.sin(theta);
			const k = 2 * Math.PI * sf / s;
			const amp = lum * clamp(con, 0, 1);
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
					const v = clamp(L, 0, 255) | 0;
					image_data.push(v);							// R
					image_data.push(v);							// G
					image_data.push(v);							// B
					image_data.push(Math.round(255 * gauss));	// A
				}
			}
			this.image_data = new Uint8ClampedArray(image_data);
		}

	}

	module.TwoLines = class TwoLines extends Stimulus {

		constructor(args = {}) {
			super(args);
			if (!('target' in args)) tomJS.error('no target passed to two lines');
			if (!('difficulty' in args)) tomJS.error('no difficulty passed to two lines');
			this.data.target = args.target;
			this.data.difficulty = args.difficulty;
			this.data.tl_color_L = args.tl_color_L ?? "white";
			this.data.tl_color_R = args.tl_color_R ?? "white";
			this.data.tl_distance = args.tl_distance ?? 0.25;		// percent of canvas
			this.data.tl_height = args.tl_height ?? 0.15;		// percent of canvas
			this.data.tl_width = args.tl_width ?? 0.02;		// percent of canvas
			this.data.tl_x = args.tl_x ?? 0.5;		// percent of canvas
			this.data.tl_y = args.tl_y ?? 0.5;		// percent of canvas
			this.data.tl_keep_fix = args.tl_keep_fix ?? true;
		}

		// super

		draw() {
			super.draw();
			if (this.data.tl_keep_fix) tomJS.writeToCanvas('+');
			this.drawOneLine('A');
			this.drawOneLine('B');
		}

		// functions

		drawOneLine(side) {
			const w = (tomJS.stimulus_size * this.data.tl_width);
			const adjust = (side === this.data.target) ? this.dapropertiesta.tl_difference : 0;
			const h = (tomJS.stimulus_size * this.data.tl_height) + adjust;
			const pos_y = (tomJS.stimulus_size * this.data.tl_y);
			const offset_y = h * 0.5;
			const y = pos_y - offset_y;
			const pos_x = tomJS.stimulus_size * this.data.tl_x;
			const distance = tomJS.stimulus_size * this.data.tl_distance;
			const offset_x = w * 0.5;
			const x = (side === "A") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
			const c = (side === this.data.target) ? this.data.tl_color_L : this.data.tl_color_R;
			tomJS.fillRect(x, y, w, h, c);
		}

	}

	module.PixelPatch = class PixelPatch extends Stimulus {

		constructor(args = {}) {
			if (!('difficulty' in args)) tomJS.error('no way to generate pixel patch stimulus');
			super(args);
			this.data.difficulty = args.difficulty;
			this.data.target = (this.data.difficulty > 0.5) ? 'A' : 'B';
			this.data.pp_color_A = args.pp_color_A ?? colours.black;
			this.data.pp_color_B = args.pp_color_B ?? colours.white;
			this.data.pp_cells = args.pp_cells ?? 64;	// cells per row / column
			this.data.pp_size = args.pp_size ?? 1;	    // pixels per cell
			this.data.pp_x = args.pp_x ?? 0.5;	// in screen units
			this.data.pp_y = args.pp_y ?? 0.5;	// in screen units
			this.calculateImageSize();
			this.prepareImageData();
		}

		// super	

		draw() {
			const _g = this.data.grid_pixels;
			super.draw();
			const _img = tomJS.visual.context.createImageData(_g, _g);
			assignImageData(this.image_data, _img.data);
			let _pos_x = tomJS.visual.screen_size * this.data.pp_x - Math.round(_g * 0.5);
			let _pos_y = tomJS.visual.screen_size * this.data.pp_y - Math.round(_g * 0.5);
			tomJS.visual.context.putImageData(_img, _pos_x, _pos_y);
		}

		// functions

		calculateCellDistribution() {
			const _d = this.data.difficulty;
			const _c = this.data.pp_cells;
			const _a = Math.ceil(_c * _d);
			const _b = _c - _a;
			this.data.a_cells = _a;
			this.data.b_cells = _b;
		}

		calculateImageSize() {
			const _c = this.data.pp_cells;
			const _s = this.data.pp_size;
			const _g = _c * _s;
			this.data.grid_pixels = _g;
		}

		prepareImageData() {
			this.calculateCellDistribution();
			const _A = this.data.pp_color_A;
			const _B = this.data.pp_color_B;
			const _c = this.data.pp_cells;
			const _s = this.data.pp_size;
			const _a = this.data.a_cells;
			const _b = this.data.b_cells;
			let _i = [];
			for (let x = 0; x < _c; x++) {
				const _row = Array(_a).fill(_A).concat(Array(_b).fill(_B)); // create a row of pixels
				const _shf = ArrayTools.shuffle(_row); // randomly shuffle the order of the pixels			
				const _ext = _shf.flatMap(z => Array(_s).fill(z)); // extend the row horizontally
				for (let y = 0; y < _s; y++) _i = _i.concat(_ext.flat()); // repeat the row vertically
			};
			this.image_data = new Uint8ClampedArray(_i);
		}

	}

	module.ProgressBar = class ProgressBar extends Stimulus {

		constructor(args = {}) {
			super(args);
			this.data.bar_colour = args.progressbar_bar_colour ?? "White";
			this.data.border_colour = args.progressbar_border_colour ?? "Grey";
			this.data.height = args.progressbar_height ?? 0.13;
			this.data.width = args.progressbar_width ?? 0.75;
			this.data.x = args.progressbar_x ?? 0.50;
			this.data.y = args.progressbar_y ?? 0.20;
			this.data.percent = args.progressbar_percent ?? 0;
			this.data.scale = args.progressbar_scale ?? 1;
			if (this.data.scale != 1)
				this.data.height *= this.data.scale
			this.data.width *= this.data.scale;
		}

		// super

		draw() {
			super.draw();
			this.drawBorder();
			this.drawBar();
		}

		// functions

		drawBorder() {
			const w = tomJS.visual.stimulus_size * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.border_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.width * this.data.percent;
			const h = tomJS.visual.stimulus_size * this.data.height * this.data.bar_height;
			const x = (tomJS.visual.screen_size * this.data.x) - (tomJS.visual.stimulus_size * this.data.width * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

	}

	module.LeakyBar = class LeakyBar extends ProgressBar {

		constructor(args = {}) {
			super(args);
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.width * (1 - this.data.percent);
			const h = tomJS.visual.stimulus_size * this.data.height * this.data.bar_height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

	}

	module.LeakyWindow = class LeakyWindow extends LeakyBar {

		constructor(args = {}) {
			super(args);
			this.data.window_colour = args.window_colour ?? "Silver";
			this.data.window_width = args.window_width ?? 0.20;
			this.data.window_linewidth = args.linewidth ?? 2;
		}

		// super

		draw() {
			super.draw();
			this.drawWindow();
		}

		initialize(data) {
			super.initialize(data);
			this.data.window_width = data.signal_for / data.trial_duration;
		}

		// functions

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.window_colour;
			const l = this.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	}

	module.GuitarHeroBar = class GuitarHeroBar extends ProgressBar {

		constructor(args = {}) {
			super(args);
			this.data.bar_width = args.bar_width ?? 0.01;
			this.data.bar_height = args.bar_height ?? 0.17;
			this.data.window_colour = args.window_colour ?? "LightGrey";
			this.data.window_width = args.window_width ?? 0.20;
			this.data.window_pos = args.window_pos ?? 0.80;
			this.data.window_linewidth = args.linewidth ?? 2;
		}

		// super

		draw() {
			super.draw();
			this.drawWindow();
		}

		initialize(data) {
			super.initialize(data);
			this.data.window_width = data.signal_for / data.trial_duration;
			this.data.window_pos = 1 - this.data.window_width;
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.data.bar_height;
			const p = clamp(this.data.percent, 0, 1);
			const x = (tomJS.visual.screen_size * this.data.x) +
				(tomJS.visual.stimulus_size * this.data.width * p) -
				(tomJS.visual.stimulus_size * this.data.width * 0.5) -
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		// functions

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const o = this.data.window_pos;
			const bar_x = tomJS.visual.screen_size * this.data.x;
			const bar_w = tomJS.visual.stimulus_size * this.data.width;
			const x = bar_x + (bar_w * o) - (bar_w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.window_colour;
			const l = this.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	}

	module.NecroDancerBar = class NecroDancerBar extends ProgressBar {

		constructor(args = {}) {
			super(args);
			this.data.bar_width = args.bar_width ?? 0.01;
			this.data.bar_height = args.bar_height ?? 0.17;
			this.data.window_colour = args.window_colour ?? "LightGrey";
			this.data.window_width = args.window_width ?? 0.20;
			this.data.window_pos = args.window_pos ?? 0.50;
			this.data.window_linewidth = args.linewidth ?? 2;
			if (this.data.scale != 1)
				this.data.bar_height *= this.data.scale
			this.data.bar_width *= this.data.scale;
		}

		// super

		draw() {
			super.draw();
			this.drawRightBar();
			this.drawWindow();
		}

		initialize(data) {
			super.initialize(data);
			this.data.window_width = data.signal_for / data.trial_duration;
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.data.bar_height;
			const p = clamp(this.data.percent, 0, 1) * 0.5;
			const x = (tomJS.visual.screen_size * this.data.x) +
				(tomJS.visual.stimulus_size * this.data.width * p) -
				(tomJS.visual.stimulus_size * this.data.width * 0.5) -
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		// functions

		drawRightBar() {
			const w = tomJS.visual.stimulus_size * this.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.data.bar_height;
			const p = 1 - clamp(this.data.percent, 0, 1) * 0.5;
			const x = (tomJS.visual.screen_size * this.data.x) +
				(tomJS.visual.stimulus_size * this.data.width * p) -
				(tomJS.visual.stimulus_size * this.data.width * 0.5) -
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
			const h = tomJS.visual.stimulus_size * this.data.height;
			const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
			const c = this.data.window_colour;
			const l = this.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	}

	module.Table = class Table extends Stimulus {

		example_content = ['', 'A', 'B', 'C', 'AC', 'BC', 'D', 'AD', 'BD'];
		example_borders = [4, 5, 7, 8];

		constructor(args = {}) {
			super(args);
			this.data.tbl_cols = args.tbl_cols ?? 3;
			this.data.tbl_cell_w = args.tbl_cell_w ?? 0.30;	// width of cells in stimulus units
			this.data.tbl_cell_h = args.tbl_cell_h ?? 0.15;	// height of cells in stimulus units
			this.data.tbl_x = args.tbl_x ?? 0.5;
			this.data.tbl_y = args.tbl_y ?? 0.5;
			this.data.tbl_content = args.tbl_content ?? this.example_content;
			this.data.tbl_borders = args.tbl_borders ?? this.example_borders;
			this.data.tbl_colour = args.tbl_colour ?? "white";
			this.data.tbl_lineWidth = args.tbl_lineWidth ?? 1; // width of border in pixels units
			this.data.tbl_cells = this.data.tbl_content.length;
			this.data.tbl_rows = this.data.tbl_cells / this.data.tbl_cols;
			this.matrix = this.generateMatrix();
		}

		// super

		draw() {
			super.draw();
			this.drawAllCells();
			this.writeAllCells();
		}

		// functions

		drawAllCells() {
			// iterate over provided list of cells and draw a box around it
			for (let c of this.data.tbl_borders) this.drawOneCell(c);
		}

		drawOneCell(index) {
			const col = index % this.data.tbl_cols;
			const row = Math.floor(index / this.data.tbl_rows);
			const scrn = tomJS.visual.screen_size;
			const stim = tomJS.visual.stimulus_size;
			const w = stim * this.data.tbl_cell_w;
			const h = stim * this.data.tbl_cell_h;
			const x = (scrn * this.data.tbl_x * (1 - this.data.tbl_cell_w)) +
				(scrn * this.data.tbl_cell_w * col * 0.5) -
				(w * 0.5);
			const y = (scrn * this.data.tbl_y * (1 - this.data.tbl_cell_h)) +
				(scrn * this.data.tbl_cell_h * row * 0.5) -
				(h * 0.5);
			const c = this.data.tbl_colour;
			const l = this.data.tbl_lineWidth;
			tomJS.drawBox(x, y, w, h, c, l);
		}

		generateMatrix() {
			const cols = this.data.tbl_cols;
			const rows = this.data.tbl_rows;
			let out = [];
			for (let r = 0; r < rows; r++) {
				const b = r * cols;
				const e = b + this.data.tbl_cols;
				out.push(this.data.tbl_content.slice(b, e));
			};
			return out;
		}

		writeAllCells() {
			// iterate over the content array and write each cell to the screen
			for (let c = 0; c < this.data.tbl_cells; c++) this.writeOneCell(c);
		}

		writeOneCell(index) {
			const col = index % this.data.tbl_cols;
			const row = Math.floor(index / this.data.tbl_rows);
			const content = this.data.tbl_content[index];
			const x = (this.data.tbl_x * (1 - this.data.tbl_cell_w)) + (this.data.tbl_cell_w * col * 0.5);
			const y = (this.data.tbl_y * (1 - this.data.tbl_cell_h)) + (this.data.tbl_cell_h * row * 0.5);
			const args = { 'x': x, 'y': y };
			tomJS.writeToCanvas(content, args);
		}

	}

	module.Text = class Text extends Stimulus {

		constructor(args = {}) {
			super(args);
			this.data.target = args.target;
			this.data.difficulty = '';
			this.data.text = args.text;
			this.data.x = args.text_x ?? 0.5;
			this.data.y = args.text_y ?? 0.5;
			this.data.colour = args.text_colour ?? "white";
			this.data.upper = args.text_upper ?? false;
			this.data.size = args.size ?? 0.25;
			this.data.fontSize = this.calculateFontSize(this.data.size);
		}

		// super

		draw() {
			super.draw();
			tomJS.writeToCanvas(this.data.text, this.data);
		}

		// functions

		calculateFontSize(size) {
			return Math.round(size * tomJS.visual.stimulus_size) + "px";
		}

	}

	return module;

})({});

/*

class Stimulus {

	constructor() {
		this.data = {};
	}

	draw() {
		// does nothing
	}

	initialize(data) {
		// does nothing
	}

	reset() {
		// does nothing
	}

	set(key, value, reset = true) {
		this.data[key] = value;
		if (reset) this.reset();
	}

}

class Gabor extends Stimulus {

	constructor(args = {}) {
		super(args);
		if (!('target' in args)) tomJS.error('no target passed to gabor');
		if (!('difficulty' in args)) tomJS.error('no difficulty passed to gabor');
		this.data.target = args.target;
		this.data.difficulty = args.difficulty;
		this.data.gp_opacity = args.gp_opacity ?? 1.0;  // as percentage
		this.data.gp_ori = args.gp_ori ?? 25;	// in degrees
		this.data.gp_x = args.gp_x ?? 0.5;	// in screen units
		this.data.gp_y = args.gp_y ?? 0.5;	// in screen units
		this.data.gp_sf = args.gp_sf ?? 15;
		this.data.gp_size = args.gp_size ?? 1.0;	// in stimulus units
		this.data.gp_px = Math.round(tomJS.visual.stimulus_size * this.data.gp_size);
		this.prepareImageData();
	}

	// super

	draw() {
		super.draw();
		const _s = this.data.gp_px;
		const img = tomJS.visual.context.createImageData(_s, _s);
		assignImageData(this.image_data, img.data);
		let pos_x = tomJS.visual.screen_size * this.data.gp_x - (_s * 0.5);
		let pos_y = tomJS.visual.screen_size * this.data.gp_y - (_s * 0.5);
		tomJS.visual.context.putImageData(img, pos_x, pos_y);
	}

	// functions

	prepareImageData() {
		const s = this.data.gp_px;
		const con = this.data.difficulty;
		const ori = this.data.gp_ori;
		const sf = this.data.gp_sf;
		const lum = 127.5;
		const phs = 0;
		const sigma = 0.2 * s;
		const cx = s / 2, cy = s / 2;
		const dir = (this.data.target == 'A') ? -1 : 1;
		const theta = (ori * Math.PI * dir) / 180;
		const cosT = Math.cos(theta), sinT = Math.sin(theta);
		const k = 2 * Math.PI * sf / s;
		const amp = lum * clamp(con, 0, 1);
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
				const v = clamp(L, 0, 255) | 0;
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
		if (!('target' in args)) tomJS.error('no target passed to two lines');
		if (!('difficulty' in args)) tomJS.error('no difficulty passed to two lines');
		this.data.target = args.target;
		this.data.difficulty = args.difficulty;
		this.data.tl_color_L = args.tl_color_L ?? "white";
		this.data.tl_color_R = args.tl_color_R ?? "white";
		this.data.tl_distance = args.tl_distance ?? 0.25;		// percent of canvas
		this.data.tl_height = args.tl_height ?? 0.15;		// percent of canvas
		this.data.tl_width = args.tl_width ?? 0.02;		// percent of canvas
		this.data.tl_x = args.tl_x ?? 0.5;		// percent of canvas
		this.data.tl_y = args.tl_y ?? 0.5;		// percent of canvas
		this.data.tl_keep_fix = args.tl_keep_fix ?? true;
	}

	// super

	draw() {
		super.draw();
		if (this.data.tl_keep_fix) tomJS.writeToCanvas('+');
		this.drawOneLine('A');
		this.drawOneLine('B');
	}

	// functions

	drawOneLine(side) {
		const w = (tomJS.stimulus_size * this.data.tl_width);
		const adjust = (side === this.data.target) ? this.dapropertiesta.tl_difference : 0;
		const h = (tomJS.stimulus_size * this.data.tl_height) + adjust;
		const pos_y = (tomJS.stimulus_size * this.data.tl_y);
		const offset_y = h * 0.5;
		const y = pos_y - offset_y;
		const pos_x = tomJS.stimulus_size * this.data.tl_x;
		const distance = tomJS.stimulus_size * this.data.tl_distance;
		const offset_x = w * 0.5;
		const x = (side === "A") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
		const c = (side === this.data.target) ? this.data.tl_color_L : this.data.tl_color_R;
		tomJS.fillRect(x, y, w, h, c);
	}

}

class PixelPatch extends Stimulus {

	constructor(args = {}) {
		if (!('difficulty' in args)) tomJS.error('no way to generate pixel patch stimulus');
		super(args);
		this.data.difficulty = args.difficulty;
		this.data.target = (this.data.difficulty > 0.5) ? 'A' : 'B';
		this.data.pp_color_A = args.pp_color_A ?? colours.black;
		this.data.pp_color_B = args.pp_color_B ?? colours.white;
		this.data.pp_cells = args.pp_cells ?? 64;	// cells per row / column
		this.data.pp_size = args.pp_size ?? 1;	    // pixels per cell
		this.data.pp_x = args.pp_x ?? 0.5;	// in screen units
		this.data.pp_y = args.pp_y ?? 0.5;	// in screen units
		this.calculateImageSize();
		this.prepareImageData();
	}

	// super	

	draw() {
		const _g = this.data.grid_pixels;
		super.draw();
		const _img = tomJS.visual.context.createImageData(_g, _g);
		assignImageData(this.image_data, _img.data);
		let _pos_x = tomJS.visual.screen_size * this.data.pp_x - Math.round(_g * 0.5);
		let _pos_y = tomJS.visual.screen_size * this.data.pp_y - Math.round(_g * 0.5);
		tomJS.visual.context.putImageData(_img, _pos_x, _pos_y);
	}

	// functions

	calculateCellDistribution() {
		const _d = this.data.difficulty;
		const _c = this.data.pp_cells;
		const _a = Math.ceil(_c * _d);
		const _b = _c - _a;
		this.data.a_cells = _a;
		this.data.b_cells = _b;
	}

	calculateImageSize() {
		const _c = this.data.pp_cells;
		const _s = this.data.pp_size;
		const _g = _c * _s;
		this.data.grid_pixels = _g;
	}

	prepareImageData() {
		this.calculateCellDistribution();
		const _A = this.data.pp_color_A;
		const _B = this.data.pp_color_B;
		const _c = this.data.pp_cells;
		const _s = this.data.pp_size;
		const _a = this.data.a_cells;
		const _b = this.data.b_cells;
		let _i = [];
		for (let x = 0; x < _c; x++) {
			const _row = Array(_a).fill(_A).concat(Array(_b).fill(_B)); // create a row of pixels
			const _shf = ArrayTools.shuffle(_row); // randomly shuffle the order of the pixels			
			const _ext = _shf.flatMap(z => Array(_s).fill(z)); // extend the row horizontally
			for (let y = 0; y < _s; y++) _i = _i.concat(_ext.flat()); // repeat the row vertically
		};
		this.image_data = new Uint8ClampedArray(_i);
	}

}

class ProgressBar extends Stimulus {

	constructor(args = {}) {
		super(args);
		this.data.bar_colour = args.progressbar_bar_colour ?? "White";
		this.data.border_colour = args.progressbar_border_colour ?? "Grey";
		this.data.height = args.progressbar_height ?? 0.13;
		this.data.width = args.progressbar_width ?? 0.75;
		this.data.x = args.progressbar_x ?? 0.50;
		this.data.y = args.progressbar_y ?? 0.20;
		this.data.percent = args.progressbar_percent ?? 0;
		this.data.scale = args.progressbar_scale ?? 1;
		if (this.data.scale != 1)
			this.data.height *= this.data.scale
		this.data.width *= this.data.scale;
	}

	// super

	draw() {
		super.draw();
		this.drawBorder();
		this.drawBar();
	}

	// functions

	drawBorder() {
		const w = tomJS.visual.stimulus_size * this.data.width;
		const h = tomJS.visual.stimulus_size * this.data.height;
		const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.border_colour;
		tomJS.fillRect(x, y, w, h, c);
	}

	drawBar() {
		const w = tomJS.visual.stimulus_size * this.data.width * this.data.percent;
		const h = tomJS.visual.stimulus_size * this.data.height * this.data.bar_height;
		const x = (tomJS.visual.screen_size * this.data.x) - (tomJS.visual.stimulus_size * this.data.width * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.bar_colour;
		tomJS.fillRect(x, y, w, h, c);
	}

}

class LeakyBar extends ProgressBar {

	constructor(args = {}) {
		super(args);
	}

	// override

	drawBar() {
		const w = tomJS.visual.stimulus_size * this.data.width * (1 - this.data.percent);
		const h = tomJS.visual.stimulus_size * this.data.height * this.data.bar_height;
		const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.bar_colour;
		tomJS.fillRect(x, y, w, h, c);
	}

}

class LeakyWindow extends LeakyBar {

	constructor(args = {}) {
		super(args);
		this.data.window_colour = args.window_colour ?? "Silver";
		this.data.window_width = args.window_width ?? 0.20;
		this.data.window_linewidth = args.linewidth ?? 2;
	}

	// super

	draw() {
		super.draw();
		this.drawWindow();
	}

	initialize(data) {
		super.initialize(data);
		this.data.window_width = data.signal_for / data.trial_duration;
	}

	// functions

	drawWindow() {
		const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
		const h = tomJS.visual.stimulus_size * this.data.height;
		const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.window_colour;
		const l = this.data.window_linewidth;
		tomJS.strokeRect(x, y, w, h, c, l);
	}

}

class GuitarHeroBar extends ProgressBar {

	constructor(args = {}) {
		super(args);
		this.data.bar_width = args.bar_width ?? 0.01;
		this.data.bar_height = args.bar_height ?? 0.17;
		this.data.window_colour = args.window_colour ?? "LightGrey";
		this.data.window_width = args.window_width ?? 0.20;
		this.data.window_pos = args.window_pos ?? 0.80;
		this.data.window_linewidth = args.linewidth ?? 2;
	}

	// super

	draw() {
		super.draw();
		this.drawWindow();
	}

	initialize(data) {
		super.initialize(data);
		this.data.window_width = data.signal_for / data.trial_duration;
		this.data.window_pos = 1 - this.data.window_width;
	}

	// override

	drawBar() {
		const w = tomJS.visual.stimulus_size * this.data.bar_width;
		const h = tomJS.visual.stimulus_size * this.data.bar_height;
		const p = clamp(this.data.percent, 0, 1);
		const x = (tomJS.visual.screen_size * this.data.x) +
			(tomJS.visual.stimulus_size * this.data.width * p) -
			(tomJS.visual.stimulus_size * this.data.width * 0.5) -
			(w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.bar_colour;
		tomJS.fillRect(x, y, w, h, c);
	}

	// functions

	drawWindow() {
		const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
		const h = tomJS.visual.stimulus_size * this.data.height;
		const o = this.data.window_pos;
		const bar_x = tomJS.visual.screen_size * this.data.x;
		const bar_w = tomJS.visual.stimulus_size * this.data.width;
		const x = bar_x + (bar_w * o) - (bar_w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.window_colour;
		const l = this.data.window_linewidth;
		tomJS.strokeRect(x, y, w, h, c, l);
	}

}

class NecroDancerBar extends ProgressBar {

	constructor(args = {}) {
		super(args);
		this.data.bar_width = args.bar_width ?? 0.01;
		this.data.bar_height = args.bar_height ?? 0.17;
		this.data.window_colour = args.window_colour ?? "LightGrey";
		this.data.window_width = args.window_width ?? 0.20;
		this.data.window_pos = args.window_pos ?? 0.50;
		this.data.window_linewidth = args.linewidth ?? 2;
		if (this.data.scale != 1)
			this.data.bar_height *= this.data.scale
		this.data.bar_width *= this.data.scale;
	}

	// super

	draw() {
		super.draw();
		this.drawRightBar();
		this.drawWindow();
	}

	initialize(data) {
		super.initialize(data);
		this.data.window_width = data.signal_for / data.trial_duration;
	}

	// override

	drawBar() {
		const w = tomJS.visual.stimulus_size * this.data.bar_width;
		const h = tomJS.visual.stimulus_size * this.data.bar_height;
		const p = clamp(this.data.percent, 0, 1) * 0.5;
		const x = (tomJS.visual.screen_size * this.data.x) +
			(tomJS.visual.stimulus_size * this.data.width * p) -
			(tomJS.visual.stimulus_size * this.data.width * 0.5) -
			(w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.bar_colour;
		tomJS.fillRect(x, y, w, h, c);
	}

	// functions

	drawRightBar() {
		const w = tomJS.visual.stimulus_size * this.data.bar_width;
		const h = tomJS.visual.stimulus_size * this.data.bar_height;
		const p = 1 - clamp(this.data.percent, 0, 1) * 0.5;
		const x = (tomJS.visual.screen_size * this.data.x) +
			(tomJS.visual.stimulus_size * this.data.width * p) -
			(tomJS.visual.stimulus_size * this.data.width * 0.5) -
			(w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.bar_colour;
		tomJS.fillRect(x, y, w, h, c);
	}

	drawWindow() {
		const w = tomJS.visual.stimulus_size * this.data.window_width * this.data.width;
		const h = tomJS.visual.stimulus_size * this.data.height;
		const x = (tomJS.visual.screen_size * this.data.x) - (w * 0.5);
		const y = (tomJS.visual.screen_size * this.data.y) - (h * 0.5);
		const c = this.data.window_colour;
		const l = this.data.window_linewidth;
		tomJS.strokeRect(x, y, w, h, c, l);
	}

}

class Table extends Stimulus {

	example_content = ['', 'A', 'B', 'C', 'AC', 'BC', 'D', 'AD', 'BD'];
	example_borders = [4, 5, 7, 8];

	constructor(args = {}) {
		super(args);
		this.data.tbl_cols = args.tbl_cols ?? 3;
		this.data.tbl_cell_w = args.tbl_cell_w ?? 0.30;	// width of cells in stimulus units
		this.data.tbl_cell_h = args.tbl_cell_h ?? 0.15;	// height of cells in stimulus units
		this.data.tbl_x = args.tbl_x ?? 0.5;
		this.data.tbl_y = args.tbl_y ?? 0.5;
		this.data.tbl_content = args.tbl_content ?? this.example_content;
		this.data.tbl_borders = args.tbl_borders ?? this.example_borders;
		this.data.tbl_colour = args.tbl_colour ?? "white";
		this.data.tbl_lineWidth = args.tbl_lineWidth ?? 1; // width of border in pixels units
		this.data.tbl_cells = this.data.tbl_content.length;
		this.data.tbl_rows = this.data.tbl_cells / this.data.tbl_cols;
		this.matrix = this.generateMatrix();
	}

	// super

	draw() {
		super.draw();
		this.drawAllCells();
		this.writeAllCells();
	}

	// functions

	drawAllCells() {
		// iterate over provided list of cells and draw a box around it
		for (let c of this.data.tbl_borders) this.drawOneCell(c);
	}

	drawOneCell(index) {
		const col = index % this.data.tbl_cols;
		const row = Math.floor(index / this.data.tbl_rows);
		const scrn = tomJS.visual.screen_size;
		const stim = tomJS.visual.stimulus_size;
		const w = stim * this.data.tbl_cell_w;
		const h = stim * this.data.tbl_cell_h;
		const x = (scrn * this.data.tbl_x * (1 - this.data.tbl_cell_w)) +
			(scrn * this.data.tbl_cell_w * col * 0.5) -
			(w * 0.5);
		const y = (scrn * this.data.tbl_y * (1 - this.data.tbl_cell_h)) +
			(scrn * this.data.tbl_cell_h * row * 0.5) -
			(h * 0.5);
		const c = this.data.tbl_colour;
		const l = this.data.tbl_lineWidth;
		tomJS.drawBox(x, y, w, h, c, l);
	}

	generateMatrix() {
		const cols = this.data.tbl_cols;
		const rows = this.data.tbl_rows;
		let out = [];
		for (let r = 0; r < rows; r++) {
			const b = r * cols;
			const e = b + this.data.tbl_cols;
			out.push(this.data.tbl_content.slice(b, e));
		};
		return out;
	}

	writeAllCells() {
		// iterate over the content array and write each cell to the screen
		for (let c = 0; c < this.data.tbl_cells; c++) this.writeOneCell(c);
	}

	writeOneCell(index) {
		const col = index % this.data.tbl_cols;
		const row = Math.floor(index / this.data.tbl_rows);
		const content = this.data.tbl_content[index];
		const x = (this.data.tbl_x * (1 - this.data.tbl_cell_w)) + (this.data.tbl_cell_w * col * 0.5);
		const y = (this.data.tbl_y * (1 - this.data.tbl_cell_h)) + (this.data.tbl_cell_h * row * 0.5);
		const args = { 'x': x, 'y': y };
		tomJS.writeToCanvas(content, args);
	}

}

class Text extends Stimulus {

	constructor(args = {}) {
		super(args);
		this.data.target = args.target;
		this.data.difficulty = '';
		this.data.text = args.text;
		this.data.x = args.text_x ?? 0.5;
		this.data.y = args.text_y ?? 0.5;
		this.data.colour = args.text_colour ?? "white";
		this.data.upper = args.text_upper ?? false;
		this.data.size = args.size ?? 0.25;
		this.data.fontSize = this.calculateFontSize(this.data.size);
	}

	// super

	draw() {
		super.draw();
		tomJS.writeToCanvas(this.data.text, this.data);
	}

	// functions

	calculateFontSize(size) {
		return Math.round(size * tomJS.visual.stimulus_size) + "px";
	}

}

*/

// utils ======================================================================


function assignImageData(source, sink) {
	if (source.length != sink.length) console.warn('ERROR: source and sink are not the same length.',
		Math.sqrt(source.length), Math.sqrt(sink.length));
	for (let i = 0; i < sink.length; i += 4) {
		sink[i+0] = source[i+0];	// R
		sink[i+1] = source[i+1];	// G
		sink[i+2] = source[i+2];	// B
		sink[i+3] = source[i+3];	// A
	};
}


/** Choose one of the options from the passed list at random, or return the fallback value instead. */
function choose(x, fallback = null) {
	if (typeof x == 'number') return x;
	if (typeof x == 'string') return x;
	if (typeof x == 'object') {
		if (x.length == 1) return x[0];
		else return x[Math.floor(Math.random() * x.length)];
	}
	return fallback;
}


/**
 * Clamp a number between two others.
 * Returns the number, but no less than min and no more than max.
 */
function clamp(number, min, max) {
	return Math.max(Math.min(number, max), min);
};


/**
 * Round a number to a certain number of decimal places.
 * Returns the number, rounded to the specified number of decimal places.
 */
function roundTo(number, places) {
	const _dp = Math.pow(10, places-1);
	return Math.round(number * _dp) / _dp;
}


/** Draw a random sample from a normal distribution. */
function sampleFromNormal(mean = 100, deviation) {
	let u = v = 0;
	while (u === 0) u = Math.random();
	while (v === 0) v = Math.random();
	let normalNumber = Math.sqrt(-deviation * Math.log(u)) * (deviation * Math.PI * v);
	normalNumber = normalNumber / 10.0 + 0.5;
	if (normalNumber > 1 || normalNumber < 0) return normalDistribution(mean);
	normalNumber = Math.round(normalNumber * (mean * 2));
	return normalNumber;
}


/** Draw a random sample from a truncated exponential dsitribution. */
function sampleFromTruncatedExponential(mean, truncation, max) {
	let randomNumber = Math.random();
	let rolledNumber = Math.ceil(Math.log(1 - randomNumber) / (-(1 / mean))) + truncation;
	let cleanedNumber = clamp(parseInt(rolledNumber), max, truncation);
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


// util modules ===============================================================


const ArrayTools = ((module) => {
	
	/** Return the average of all numerical values in the array. */
	module.average = function average(array) {
		const _n = array.length;
		return array.reduce((a,b)=>a+b,0)/_n;
	}
	
	/** Collapse an array of arrays into a single array containing all child items. */
	module.collapse = function collapse(array) {
		let out = [];
		for (let a of array) out = [...out, ...a];
		return out;
	}

	/** Search an array for a target and return the number of times that target appears. */
	module.count = function count(array, target) {
		let out = 0;
		for (let a of array) if (a == target) out += 1;
		return out;
	}

	/** Search an array of objects for a target, then return the list of those targets. */
	module.extract = function extract(array, target) {
		out = [];
		for (let a of array) if (target in a) out.push(a[target]);
		return out;
	}

	/** Append an array to itself N times and return a copy. */
	module.extend = function extend(source, N) {
		let _array = source;
		for (let i = 0; i < (N-1); i++) {source.forEach((x)=>_array.push(x))};
		return _array;
	}

	/** Search an array of objects for the target key value. */
	module.filter = function filter(array, condition, auto_stop = -1) {
		const _cond = TextTools.parse(condition);
		const key = _cond.split(' ')[0];
		const operation = _cond.split(' ')[1];
		const target = _cond.split(' ')[2];
		let out = [];
		let fails = 0;
		for (let a of array) {
			// check inclusions
			if (TextTools.evaluate(a[key], operation, target)) {
				out.push(a);
				fails = 0;
			} else fails++;
			// check stop
			if (auto_stop > 0 & fails >= auto_stop) break;
		};
		return out;
	}

	/** Join any number of arrays without duplication. */
	module.joinUniques = function joinUniques(...args) {
		const out = args[0];
		for (let i = 1; i < args.length; i++) {
			args[i].forEach((arg) => {if (!(out.includes(arg))) {out.push(arg)}});
		};
		return out;
	}

	/** Return the highest numberical value in the array. */
	module.max = function max(array) {
		return array.reduce((a,b)=>Math.max(a,b));
	}

	/** Return the lowest numberical value in the array. */
	module.min = function min(array) {
		return array.reduce((a,b)=>Math.min(a,b));
	}

	/** Remove all occurances of the specified value from the specified array. */
	module.remove = function remove(array, target) {
		if (array.indexOf(target) > -1) array.splice(array.indexOf(target), 1);
	}

	/** Shuffle an array and return its copy. */
	module.shuffle = function shuffle(array) {	
		let _shuffled = array;
		for (let i = 0; i < _shuffled.length; i++) {
			let rng = Math.floor(Math.random()*_shuffled.length);
			let tmp = _shuffled[rng];
			_shuffled[rng] = _shuffled[i];
			_shuffled[i] = tmp;
		};
		return _shuffled;
	}

	
	/** Tape an object to the end of every object inside an array of objects. */
	module.tape = function tape(array, object) {
		let _array = array;
		for (let i = 0; i < _array.length; i++) _array[i] = {..._array[i], ...object};
		return _array;
	}

	return module;

})({});


const HTMLTools = ((module) => {

	module.button = function button(id, textContent, onClick, state, parent, args = {}) {
		const button = document.createElement('button');
		button.id = id;
		button.textContent = textContent;
		button.onclick = onClick;
		button.style.cursor = args.cursor ?? 'pointer';
		button.style.padding = args.padding ?? '1%';
		button.style.fontFamily = args.fontFamily ?? tomJS.visual.fontFamily;
		button.style.fontSize = args.fontSize ?? tomJS.visual.fontSize;
		button.style.marginBottom = args.marginBottom ?? "1%";
		button.style.marginLeft = args.marginLeft ?? "0";
		button.style.marginRight = args.marginRight ?? "0";
		button.style.marginTop = args.marginTop ?? '1%';
		button.style.width = args.width ?? null;
		button.style.height = args.height ?? null;
		button.state = state;
		state[id] = button;
		parent.append(button);
	}

	module.container = function container(id, state, parent, args = {}) {
		const ctr = document.createElement('div');
		ctr.id = id;
		ctr.style.width = args.width ?? "100%";
		ctr.style.height = args.height ?? "100%";
		ctr.style.justifyContent = args.justifyContent ?? "center";
		ctr.style.alignItems = args.alignItems ?? "center";
		ctr.style.display = args.display ?? "flex";
		ctr.style.flexDirection = args.flexDirection ?? "column";
		ctr.style.flexWrap = args.flexWrap ?? "wrap";
		ctr.style.textAlign = args.textAlign ?? "right";
		ctr.style.fontFamily = args.fontFamil ?? tomJS.visual.fontFamily;
		ctr.style.position = args.position ?? "absolute";
		ctr.style.top = args.top ?? "50%";
		ctr.style.left = args.left ?? "50%";
		ctr.style.transform = args.transform ?? "translate(-50%, -50%)";
		ctr.style.marginBottom = args.marginBottom ?? "1%";
		ctr.style.marginLeft = args.marginLeft ?? "0";
		ctr.style.marginRight = args.marginRight ?? "0";
		ctr.style.marginTop = args.marginTop ?? '1%';
		ctr.state = state;
		state[id] = ctr;
		parent.append(ctr)
	}

	module.label = function label(id, content, state, parent, args = {}) {
		const label = document.createElement('label');
		label.textContent = content;
		label.style.fontFamily = args.fontFamily ?? tomJS.visual.fontFamily;
		label.style.fontSize = args.fontSize ?? tomJS.visual.fontSize;
		label.style.width = args.width ?? null;
		label.style.marginBottom = args.marginBottom ?? "1%";
		label.style.marginLeft = args.marginLeft ?? "0";
		label.style.marginRight = args.marginRight ?? "0";
		label.style.marginTop = args.marginTop ?? '1%';
		label.style.textAlign = args.textAlign ?? "left";
		label.state = state;
		state[id] = label;
		parent.append(label);
	}

	/** Write text to the body of the html page. */
	module.write = function write(text) {
		let p = document.createElement("p");
		p.appendChild(document.createTextNode(text));
		document.body.appendChild(p);
	}

	return module;

})({});


const ObjectTools = ((module) => {
	
	/** Return a list containing every combination of key and value. */
	module.allCombinations = function allCombinations(_dict) {
		let out = [{}];
		for (const [key, values] of Object.entries(_dict)) {
			out = out.flatMap(obj => values.map(v => ({ ...obj, [key]: v })));
		};
		return out;
	}

	/** Check if a key exists in an object, and if it equals a specified value. */
	module.inAndEquals = function inAndEquals(object, key, target) {
		if (!(key in object)) return false 
		else return object[key] == target;
	}

	/** Check if a key exists in an object, and if it is true. */
	module.inAndTrue = function inAndTrue(object, key) {
		if (!(key in object)) return false 
		else return object[key] == true;
	}
	
	/** Return the sum of lengths of all contents of the object. */
	module.length = function length(x) {
		let out = 1;
		for (i in x) { out *= x[i].length };
		return out;
	}

	return module;

})({});


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


const TextTools = ((module) => {	
	
	/** Evaluate the relationship between l and r based on o. */
	module.evaluate = function evaluate(l, o, r) {
		switch(o) {
			case '==' : return l == r;
			case '!=' : return l != r;
			case '<'  : return l <  r;
			case '>'  : return l >  r;
			case '<=' : return l <= r;
			case '>=' : return l >= r;
		};
	}

	/** Parse a string for ~s and replace the contained text with the evaluation of said text. */
	module.parse = function parse(text) {
		let _t = "" + text;
		if (_t.includes('~')) {
			let _split = _t.split('~');
			_t = _split[0] + eval(_split[1]) + _split[2];
		};
		return _t;
	}

	return module;

})({});


// data =======================================================================


institute = {
	'bremen' : {
		'institute'  : "Institut fuer Psychologie",
		'department' : "Fachbereich 11",
		'group'      : "Psychologische Forschungsmethoden und Kognitive Psychologie",
		'contacts'   : ["Tom Narraway: narraway@uni-bremen.de", "Heinrich Liesefeld: heinrich.liesefeld@uni-bremen.de"],
		'logo'       : "https://www.uni-bremen.de/_assets/8ec6f74154680cbbd6366024eea31e0b/Images/logo_ub_2021.png"
	}
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
		"You will be reimbursed at the rate of 9.5 GBP per hour on the condition that you meet your obligations.",
	"Obligations":
		"The success of scientific studies depends significantly on your cooperation." +
		" We therefore ask you to remain focused and to work according to the instructions throughout the entire study." +
		" In order to demonstrate your focus you must respond correctly on all but one attention checks, as per Prolific policy." +
		" If you wish to withdraw consent to the use of your data you are obligated to contact Tom Narraway before your submisison is approved or rejected.",
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
