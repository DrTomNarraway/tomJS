

__version__ = '14.04.26 14:06';


// adding counterbalanace functions
// editing blockwise functions


class Experiment {
	
	constructor(args={}) {
		
		console.log('booting tomJS version ' + __version__);

		// debug
		this.debug = {};
		this.debug.gridlines  = args.gridlines  ?? false;
		this.debug.fullscreen = args.fullscreen ?? true;
		this.debug.save       = args.save       ?? true;
		this.debug.verbose    = args.verbose    ?? false;
        this.debug.show_time  = args.show_time  ?? false;

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
		this.controls.inputs = args.inputs ?? ['f', 'j'];
		this.controls.responses = args.responses ?? { 'f': 'A', 'j': 'B' };
		this.controls.inputs = Object.keys(this.controls.responses);
		this.controls.options = Object.values(this.controls.responses);
		this.keyboard = new Keyboard();
		
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
		this.index    = 0;
		this.started  = null;
        this.lowest   = null;

        // global stimuli storage
        this.stimuli = {};

		// data
		this.headings = ['participant','age','gender','hand'];
		this.data = [];

		// attention checks
		this.attention = {};
		this.attention.failed = 0; // current fail count
		this.attention.limit  = args.attention_limit ?? 3; // failed trail limit
		this.attention.check_until = args.attention_check_until ?? 0.4; // percent

		// other
		this.rounding = args.rounding ?? 5;

		// research institute
		this.institute = institute[args.institute ?? 'bremen'];
		
	}

	// functions
	
	appendToTimeline(new_state) {
		this.timeline.push(new_state);
	}

	appendBlock(trialwise={}, additional={}, conditional=[], attention=[], trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
        const _block = new Block(trialwise, additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown);
		this.appendToTimeline(_block);
	}

	appendBlocks(blockwise={}, trialwise={}, additional={}, conditional=[], attention=[], block_reps=1, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		let _b_cells  = ObjectTools.length(blockwise);
        for (let b = 0; b < block_reps; b++) {
            let _blockwise = ObjectTools.allCombinations(blockwise);
            _blockwise = ArrayTools.shuffle(_blockwise);
            for (let i = 0; i < _b_cells; i++) {
				let _additional = Object.assign({}, _blockwise[i % _b_cells], additional);
                this.appendBlock(trialwise, _additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown);
			};
		};
    }

    appendCounterbalancedBlocks(A, B, blocks) {
        const cbg = this.getCounterbalanceGroup();

        // A
        const a_cells = ObjectTools.length(A.blockwise);
        let _a = ObjectTools.allCombinations(A.blockwise);
        _a = ArrayTools.tape(_a, A.additional);
        _a = ArrayTools.extend(_a, blocks/2/a_cells);
        _a = ArrayTools.shuffle(_a);

        // B
        const b_cells = ObjectTools.length(B.blockwise);
        let _b = ObjectTools.allCombinations(B.blockwise);
        _b = ArrayTools.tape(_b, B.additional);
        _b = ArrayTools.extend(_b, blocks/2/b_cells);
        _b = ArrayTools.shuffle(_b);

        // Combine
        let order = [];
        if (cbg == 0) {
            for (let i = 0; i < blocks; i++) {
                if (i % 2 == 0) order.push(_a.pop())
                else order.push(_b.pop());
            };
        }
        else {
            for (let i = 0; i < blocks; i++) {
                if (i % 2 == 0) order.push(_b.pop())
                else order.push(_a.pop());
            };
        };
        console.log(order);
    }

	attentionCheckFailed() {
		this.attention.failed++;
		if (this.attention.failed >= this.attention.limit
			& this.block <= (Math.floor(this.blocks*this.attention.check_until))-1)
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
        const sessionData = new Data.BlockData();
		sessionData.calculateData(this.data);
		if (this.jatos)	{			
			jatos.setStudySessionData(sessionData.toString());
			jatos.startNextComponent("exit 0");
		}
		else {			
			this.resetCanvas();
			this.writeToCanvas('You can close the window when you are ready :)');
            console.log(sessionData);
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
		this.keyboard.key = '';
		this.keyboard.dir = '';
    }

    forceCounterbalanceGroup(group) {
        if (group != 0 | group != 1) tomJS.error("Forcing invalid counterbalance group.");
        this.demographics.cbg = group;
    }

    getCounterbalanceGroup() {
        return this.demographics.n % 2
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
        const csv = "FAILED ATTENTION CHECKS \n \n" + this.writeCSV();
        if (this.jatos) jatos.submitResultData(csv);
	}

	run = () => {
		if (this.complete) return;
		this.now = Math.round(window.performance.now());
		this.resetCanvas();
		this.update();
        if (this.debug.gridlines) this.drawGridLines();
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

	getTimeline() {
		return this.timeline.timeline;
	}
	
	update () {		
		this.complete = this.timeline.complete;
		if (this.complete) this.endExperiment();
		else this.timeline.update();        
	}

	writeCSV() {
		const data = this.data;
		const demo = this.demographics;
		const visu = this.visual;
		let csv = this.headings.toString() + '\n';
        for (let r of data) {
            if (r.block > tomJS.block) continue;
			const x = {...r, ...demo, ...visu};
			let y = [];
			for (let h of this.headings) y.push(x[h]);
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


// root classes ===============================================================


class State {

	constructor() {
		this.complete = false;        
		this.end = null;
		this.name = this.constructor.name;
		this.start = null;
		this.timeline = new Timeline();
	}

	enter() {
		this.complete = false;
		this.start = tomJS.now;
		tomJS.flushKeys();
        if (tomJS.debug.fullscreen & document.fullscreenElement == null) 
                document.documentElement.requestFullscreen();
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
        tomJS.lowest = this;
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

	constructor(trialwise={}, additional={}, conditional=[], attention=[], trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
		super();
		this.block = tomJS.blocks;
		tomJS.blocks++;
		this.n = 0;	
		this.generateTimeline(trialwise, additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown);
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

    attentionChecks(args, checks) {
        for (let i = 0; i < checks.length; i++) {
            var arg = {...checks[i], ...{'attention_check':true}};
            args.push(arg);
        };
    }

	checkConditions(args, conditions) {
		for (let c = 0; c < conditions.length; c++) {
			for (let a of Object.keys(args)) {
				this.checkIf(args[a], conditions[c]);
			};
		};
	}

	checkIf(arg, statement) {
		const split = statement.replace("(", "").replace(")", "").split(" ");
		const l = "" + split[1];
		const o = "" + split[2];
		const r = "" + split[3];
		if (!(Object.keys(arg).includes(l))) return;
		const a = "" + arg[l];
		if (!(TextTools.evaluate(a+" "+o+" "+r))) return;
		const x = "" + split[4];
		const y = "" + split[6];
		arg[x] = y;
	}

	generateTimeline(trialwise, additional, conditional, attention, trial_reps, start_slide, end_slide, add_countdown) {
		let _timeline = new Timeline();

		// make a list of trials based on design cells
		let _arguments = ObjectTools.allCombinations(trialwise);
		_arguments = ArrayTools.tape(_arguments, additional);
		_arguments = ArrayTools.extend(_arguments, trial_reps);
		if (conditional.length > 0) this.checkConditions(_arguments, conditional);
		if (attention.length > 0)   this.attentionChecks(_arguments, attention);
		_arguments = ArrayTools.shuffle(_arguments);        

		// add opening slides
		if (start_slide != null) _timeline.push(start_slide);
		if (add_countdown) { _timeline.push(new Slides.Countdown(3000)) };

		// add trials
		for (let t = 0; t < _arguments.length; t++) {
			const _args = _arguments[t];
			_args.block = this.block;
			_args.trial = t;
			_args.index = tomJS.trials;
            if (!('trial_type' in _args)) tomJS.error('Trial type not passed to trial.');
			const _new_trial = new _args.trial_type(_args);
			_timeline.push(_new_trial);
			this.n++;
			tomJS.trials++;
		};

		// add closing slide
		if (end_slide != null) _timeline.push(end_slide);

		// assign data
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


// modules ====================================================================


const Data = ((module) => {

	module.DataWrapper = class DataWrapper {

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

	module.BlockData = class BlockData extends module.DataWrapper {

		constructor() {
			super();
			this.accuracy = null;
			this.rt = null;
			this.score = null;
			this.correct = null;
			this.incorrect = null;
			this.fast = null;
			this.slow = null;
			this.censored = null;
			this.hits = null;
			this.miss = null;
		}

		calculateAverages(data) {
			this.rt = Math.round(ArrayTools.average(ArrayTools.extract(data, 'rt')));
			this.accuracy = Math.round(ArrayTools.average(ArrayTools.extract(data, 'accuracy')) * 100);
			this.score = Math.round(ArrayTools.average(ArrayTools.extract(data, 'score')));
		}

		calculateComplex() {
			this.hits = clamp(this.correct + this.incorrect, 0, 100);
			this.miss = clamp(100 - this.hits, 0, 100);
		}

		calculatePercentages(data) {
			const n = data.length;
			let outcomes = ArrayTools.extract(data, 'outcome');
			this.correct = Math.round((ArrayTools.count(outcomes, 'Correct') / n) * 100);
			this.incorrect = Math.round((ArrayTools.count(outcomes, 'Incorrect') / n) * 100);
			this.fast = Math.round((ArrayTools.count(outcomes, 'Fast') / n) * 100);
			this.slow = Math.round((ArrayTools.count(outcomes, 'Slow') / n) * 100);
			this.censored = Math.round((ArrayTools.count(outcomes, 'Censored') / n) * 100);
		}

		calculateData(data) {
			this.calculateAverages(data);
			this.calculatePercentages(data);
			this.calculateComplex();
		}

	}

	module.TrialData = class TrialData extends module.DataWrapper {

		constructor() {
			super();
			this.block = null;
			this.trial = null;
			this.index = null;
			this.rt = null;
			this.accuracy = null;
			this.outcome = null;
			this.score = null;
			this.start = null;
			this.fixation_on = null;
			this.fixation_duration = null;
			this.fixation_size = null;
			this.fixation_colour = null;
			this.fixation_off = null;
			this.stimulus_on = null;
			this.stimulus_duration = null;
			this.stimulus_fast = null;
			this.stimulus_slow = null;
			this.stimulus_off = null;
			this.target = null;
			this.response = null;
			this.response_key = null;
			this.response_given = null;
			this.feedback_on = null;
			this.feedback_duration = null;
			this.feedback_text = null;
			this.feedback_colour = null;
			this.feedback_size = null;
			this.feedback_off = null;
			this.iti_duration = null;
			this.end = null;
		}

	}

	return module;

})({});


const Nodes = ((module) => {

    module.TapCollector = class TapCollector {

        constructor(target='Space') {
            this.target = target;
            this.taps = ['index,state,timestamp\n'];
            this.collect = this.collect.bind(this);
            document.addEventListener('keydown', this.collect, true);
        };

        collect(event) {
		    if (event.code != this.target) return;
            const data = ''+tomJS.index+','+tomJS.lowest.currentState()+','+event.timeStamp+'\n';
            this.taps.push(data);
            if (tomJS.jatos & tomJS.debug.save)
                jatos.uploadResultFile(this.taps.toString(), 'tapData.csv');
        };
		
    };

    return module;

})({});


const Slides = ((module) => {

	module.Slide = class Slide extends State {

		constructor(content = [], args = {}) {
			super();
			this.content = content;
            this.data = args;
			this.force_wait = args.force_wait ?? 1000;
			this.timeline = null;
			this.can_proceed = false;
			this.realizeContent();
		}

		// super

		enter() {            
			super.enter();
			this.can_proceed = false;
			setTimeout(() => { this.can_proceed = true }, this.force_wait);
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
			for (let c of content.conditions)
                if (!TextTools.evaluate(this.parseText(c))) return false;
			return true;
		}

		checkUserInput() {
			if (tomJS.keyboard.allKeysPressed(tomJS.controls.inputs)) this.complete = true;
		}

		drawContent() {            
			for (const _c of this.content) {
                if (!(this.checkConditions(_c))) continue;
				switch (_c.class) {
					case 'gabor':
                        this.data.gabor_hash = tomJS.keyboard.dir == "A" ? 
                            this.data.hash_A : this.data.hash_B;
                        if (tomJS.keyboard.dir == "A") _c.A.draw()
                        else _c.B.draw();
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
						const _text = this.parseText(_c.text);
						tomJS.writeToCanvas(_text, _c);
						break;
					case 'twolines':
						const _tl_args = { ..._c, ...{ 'target': this.parseText(_c.target) } };
						const _tl = new TwoLines(_tl_args);
						_tl.draw();
						break;
					case 'progressbar':
						this.data.bar_percent = 
                            (tomJS.now - this.data.bar_start) / this.data.bar_max;

						if (this.data.bar_percent >= 1.5) this.data.bar_start = tomJS.now;
                        
						if (this.data.bar_percent <= 0) {
							this.data.bar_colour    = "#00000000";
							this.data.window_colour = this.data._window_colour;
						}
                        else if (this.data.bar_percent >= 1) {
                            this.data.bar_colour    = "#00000000";
							this.data.window_colour = this.data._window_colour;
                        }
						else if (this.data.bar_percent < this.data.signal_on) {
							this.data.bar_colour    = this.data._bar_colour;
							this.data.window_colour = this.data._window_colour;
						}
						else if (this.data.bar_percent < this.data.signal_off) {
							this.data.bar_colour    = this.data._signal_colour;
							this.data.window_colour = this.data._signal_colour;
						}
						else {
							this.data.bar_colour    = this.data._bar_colour;
							this.data.window_colour = this.data._window_colour;
						};

						this['progressbar' + _c.tag ?? ''].draw();
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
				switch (c.class) {
					case 'gabor':
                        c.A = new Stimuli.Gabor(this, {...c, 'gabor_ori':360-c.gabor_ori});
                        this.data.hash_A = this.data.gabor_hash;
                        c.B = new Stimuli.Gabor(this, {...c, 'gabor_ori':c.gabor_ori});
                        this.data.hash_B = this.data.gabor_hash;
						break;
					case 'progressbar':
						this.data.bar_start     = this.start;
						this.data.bar_max       = c.bar_max ?? 2000;
						this.data._bar_colour    = c.bar_colour ?? "White";
						this.data._signal_colour = c.signal_colour ?? "DeepSkyBlue";
						this.data._window_colour = c.window_colour ?? "Silver";
						this.data.signal_on	    = c.signal_on ?? 0.75
						this.data.signal_off    = c.signal_off ?? 1.00;
						const _bar = new (c.signal ?? Stimuli.ProgressBar)(this, c);
						this['progressbar' + c.tag ?? ''] = _bar;
						break;
				};
			};
		}

	}

	module.Countdown = class Countdown extends module.Slide {

		constructor(lifetime, args = {}, content = []) {
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
			tomJS.writeToCanvas(time, { 'fontSize': this.fontSize });
			if (tomJS.now >= this.start + this.lifetime) this.complete = true;
			super.update();
		}

	}

	module.Consent = class Consent extends module.Slide {

		constructor(args = {}) {
			super([], args);
			this.exit_pressed = false;
			this.exit_button = null;
			this.container = null;
		}

		// override

		update() {
			if (this.complete) return;
			tomJS.fillRect(0, 0, tomJS.visual.screen_size, tomJS.visual.screen_size, "white");
			if (tomJS.now < this.start + this.force_wait) return;
		}

		// super

		enter() {
			super.enter();
			this.container = HTMLTools.Container("container", document.body, {'width':'85%'});
			document.body.style.backgroundColor = "white";
			document.body.style.color = "black";
			this.createTopPanel();
			this.createInformationPage();
			this.createConsentForm();
			this.exitButton = HTMLTools.Button("exitButton", "Consent", this.exitButtonClicked, this.container);
			this.exitButton.state = this;
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
			if (tomJS.debug.fullscreen & document.fullscreenElement == null) 
                document.documentElement.requestFullscreen();
		}

		createLogo() {
			const url = tomJS.institute.logo;
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
			ins.textContent = tomJS.institute.institute;
			ins.style.fontSize = tomJS.visual.h0;
			div.append(ins);
			// department
			let dep = document.createElement('label');
			dep.textContent = tomJS.institute.department;
			dep.style.marginTop = "1em";
			dep.style.fontSize = tomJS.visual.h1,
				div.append(dep);
			// group
			let grp = document.createElement('label');
			grp.textContent = tomJS.institute.group;
			grp.style.marginTop = "1em";
			div.append(grp);
			// contact
			let ctc = document.createElement('label');
			ctc.textContent = "Contact";
			ctc.style.marginTop = "1em";
			ctc.style.fontSize = tomJS.visual.h1;
			div.append(ctc);
			// contacts
			for (let i = 0; i < tomJS.institute.contacts.length; i++) {
				let tmp = document.createElement('label');
				tmp.textContent = tomJS.institute.contacts[i];
				tmp.style.marginTop = "1em";
				div.append(tmp);
			};
			return div;
		}

		createConsentForm() {
			const div = document.createElement('div');
			div.id = "Consent Form";
			div.style.display = "flex";
			div.style.flexDirection = "column";
			div.style.width = "100%";
			div.style.textAlign = "left";
			this.container.appendChild(div);
			HTMLTools.Label("Terms", "Terms", div, {'fontSize':tomJS.visual.h1});
			const _cf = tomJS.institute.consent_form;
			for (let i = 0; i < _cf.length; i++) HTMLTools.Label("cf" + i, _cf[i], div);
			const _args = { 'marginTop': "3%" }
			const _statement = "I have read the foregoing information, or it has been read to me."
				+ " I have had the opportunity to ask questions about it and any"
				+ " questions I have asked have been answered to my satisfaction."
				+ " I consent voluntarily to be a participant in this study."
			HTMLTools.Label("cf_statement", _statement, div, _args);
		}

		createInformationPage() {
			const div = document.createElement('div');
			div.id = "Main Panel";
			div.style.display = "flex";
			div.style.flexDirection = "column";
			div.style.width = "100%";
			div.style.textAlign = "left";
			this.container.append(div);
			const _is = tomJS.institute.information_statement;
			for (let i = 0; i < Object.keys(_is).length; i++) {
				const key = Object.keys(_is)[i];
				const value = Object.values(_is)[i];
				const kargs = { 'fontSize': tomJS.visual.h1 }
				HTMLTools.Label(key + "Key", key, div, kargs);
				HTMLTools.Label(key + "Value", value, div);
			};
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

	/** Calculate the standard stimulius size using a physical ID-1 card. */
	module.CreditCard = class CreditCard extends module.Slide {

		constructor(args = {}) {
			super([], args);
			this.cc_width = "86mm";
			this.cc_height = "54mm";
			this.width = 86;
			this.height = 54;
			this.min = 50;
			this.max = 200;
			this.value = 100;
			this.instructions = args.instructions ?? "Please hold an ID-1 card"
				+ " (e.g.credit card or driving license) to"
				+ " the screen and surround your card with the white border" 
				+ " such that no grey is visible.";
		}

		// super

		enter() {
			super.enter();
			this.adjustWindowSize();
			this.createContainer();
			HTMLTools.Label("Instructions", this.instructions, this.container, { 'width': '50%' });
			this.createWallet();
			this.createCreditCard();
			this.createControls();
			const _up_down_args = {'width': '5vmin', 'height': '5vmin'};
			this.down_button = HTMLTools.Button("Down", "-", ()=>{this.onUpDownClick(this, -1)}, this.controls, _up_down_args);
			this.down_button.state = this;
			this.createSlider();
			this.up_button = HTMLTools.Button("Up", "+", ()=>{this.onUpDownClick(this, 1)}, this.controls, _up_down_args);
			this.up_button.state = this;
			this.exit_button = HTMLTools.Button("Exit", "Confirm", this.exitClick, this.container);
			this.exit_button.state = this;
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
			tomJS.visual.width = window.innerWidth - 16;
			const screen_size = Math.min(tomJS.visual.height, tomJS.visual.width);
			tomJS.visual.screen_size = screen_size;
			tomJS.setCanvasSize(screen_size);
			tomJS.setFont();
		}

		createCreditCard() {
			const credit_card = document.createElement('div');
			credit_card.id = "CreditCard";
			credit_card.style.backgroundColor = "grey";
			credit_card.style.width = this.cc_width;
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
			container.id = "Container";
			container.style.width = "100%";
			container.style.height = "100%";
			container.style.justifyContent = "center";
			container.style.alignItems = "center";
			container.style.display = "flex";
			container.style.flexDirection = "column";
			container.style.flexWrap = "wrap";
			container.style.textAlign = "right";
			container.style.fontFamily = tomJS.visual.fontFamily;
			container.style.position = "absolute";
			container.style.top = "50%";
			container.style.left = "50%";
			container.style.transform = "translate(-50%, -50%)";
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
			wallet.style.justifyContent = "center";
			wallet.style.alignItems = "center";
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
			c.style.width = Math.round(this.width * s) + "mm";
			c.style.height = Math.round(this.height * s) + "mm";
		}

	}

	module.Demographics = class Demographics extends module.Slide {

		constructor(args = {}) {
			super([], args);
			this.age = null;
			this.gender = null;
			this.hand = null;
			this.heading = args.heading ?? "Demographics Information";
			this.instructions = args.instructions ?? "The following information is optional."
				+ " Pless press \"Submit\" when you are ready to continue. ";
		}

		// super

		enter() {
			super.enter();
			this.createContainer();
			HTMLTools.Label("Heading", this.heading, this.container, { 'fontSize': tomJS.visual.h0 });
			HTMLTools.Label("Instructions", this.instructions, this.container);
			this.createFields();
			this.exit_button = HTMLTools.Button("exitButton", "Submit", this.exitClicked, this.container);
			this.exit_button.state = this;
		}

		exit() {
			super.exit();
			tomJS.demographics.age = this.Age.value;
			tomJS.demographics.gender = this.Gender.value;
			tomJS.demographics.hand = this.Hand.value;
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
			ctr.style.width = "100%";
			ctr.style.height = "100%";
			ctr.style.justifyContent = "center";
			ctr.style.alignItems = "center";
			ctr.style.display = "flex";
			ctr.style.flexDirection = "column";
			ctr.style.flexWrap = "wrap";
			ctr.style.textAlign = "right";
			ctr.style.fontFamily = tomJS.visual.fontFamily;
			ctr.style.position = "absolute";
			ctr.style.top = "50%";
			ctr.style.left = "50%";
			ctr.style.transform = "translate(-50%, -50%)";
			this.container = ctr;
			document.body.appendChild(ctr);
		}

		createField(id, type, textContent, options = [], args = {}) {
			// create wrapper div
			const div = document.createElement('div');
			div.id = id + "Wrapper";
			div.style.width = args.width ?? "100%";
			div.style.justifyContent = "center";
			div.style.alignItems = "center";
			div.style.display = "flex";
			// create label
			HTMLTools.Label(id + "Label", textContent, div, { 'width': '50vmin', 'marginRight': '3vh', 'textAlign': 'right' });
			// create input options
			let input;
			switch (type) {
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
			fields.style.alignItems = "center";
			fields.style.display = "flex";
			fields.style.flexDirection = "column";
			this.container.append(fields);
			this.fields = fields;
			this.createField("Age", 'number', demographics_prompts.age.en);
			this.createField("Gender", 'select', demographics_prompts.gender.en, demographics_choices.gender.en);
			this.createField("Hand", 'select', demographics_prompts.hand.en, demographics_choices.hand.en);
		}

	}

	/** Slide shown at the end of a block. Access averaged data inside ~this.data~. */
	module.EndBlock = class EndBlock extends module.Slide {

		constructor(content = [], args = {}) {
			super(content, args);
			this.data = new Data.BlockData();
			this.filter = args.filter ?? 'block == ~tomJS.block~';
		}

		// super

		enter() {
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
	module.EndExperiment = class EndExperiment extends module.EndBlock {

		constructor(content = [], args = {}) {
			super(content, args);
		}

		// override

		gatherData() {
			return tomJS.data;
		}

	}

	return module;

})({});


const Stimuli = ((module) => {

	module.Stimulus = class Stimulus extends State {

		constructor(trial, args={}) {
			super();
			this.trial = trial;
			this.timeline = null;
		}

		// override

		enter() {
			this.initialize();
		}

		// functions

		draw() {
			// does nothing
		}

		initialize() {
            // does nothing
		}

		set(key, value) {
			if (!(Object.keys(this.trial.data).includes(key))) return null;
			this.data[key] = value;
		}

        update() {
            tomJS.resetCanvas();
        }

	}

	module.Gabor = class Gabor extends module.Stimulus {

		constructor(trial, args={}) {
			super(trial, args);
			this.trial.data.gabor_contrast = args.gabor_contrast ?? 1.00; // %
			this.trial.data.gabor_opacity = args.gabor_opacity ?? 1.0;  // as percentage
			this.trial.data.gabor_ori = args.gabor_ori ?? 30; // degrees, negative = left
			this.trial.data.gabor_sf = args.gabor_sf ?? 15; // cycles per stimulus
            this.trial.data.gabor_size = Math.round(tomJS.visual.stimulus_size * (args.gabor_size ?? 1.0));
			this.trial.data.gabor_x = args.gabor_x ?? 0.5;	// in screen units
			this.trial.data.gabor_y = args.gabor_y ?? 0.5;	// in screen units

            // determine this gabors global image counterpart
            this.trial.data.gabor_hash = this.hash();
            
            // create the global image if it does not exist
            if (!(this.trial.data.gabor_hash in tomJS.stimuli)) this.prepareImageData();

		}

		draw() {
			const _s = this.trial.data.gabor_size;
            const _i = tomJS.stimuli[this.trial.data.gabor_hash];
			const img = tomJS.visual.context.createImageData(_s, _s);
			assignImageData(_i, img.data);
			let pos_x = tomJS.visual.screen_size * this.trial.data.gabor_x - (_s * 0.5);
			let pos_y = tomJS.visual.screen_size * this.trial.data.gabor_y - (_s * 0.5);
			tomJS.visual.context.putImageData(img, pos_x, pos_y);
		}

        enter() {
            this.trial.data.stimulus_on = tomJS.now;
            this.trial.data.stimulus_off = tomJS.now + this.trial.data.stimulus_duration;
        }

        exit() {
            this.trial.data.stimulus_off = tomJS.now;
        }
        
        /** quasi-hash function to find this gabors global image data */
        hash() {            
            let _c = (""+this.trial.data.gabor_contrast*100).padStart(3,"0");
            let _a = (""+this.trial.data.gabor_opacity*100).padStart(3,"0");
            let _o = "" + this.trial.data.gabor_ori;
            let _s = "" + this.trial.data.gabor_sf;
            let _z = "" + this.trial.data.gabor_size;
            let _x = (""+this.trial.data.gabor_x*100).padStart(3,"0");
            let _y = (""+this.trial.data.gabor_y*100).padStart(3,"0");
            // return Number((_c+_a+_o+_s+_z+_x+_y).replace(/[.-]/gm,''));
            return Number((_c+_a+_o+_s+_z+_x+_y));
        }

        prepareImageData() {
			const s = this.trial.data.gabor_size;
			const con = this.trial.data.gabor_contrast;
			const ori = this.trial.data.gabor_ori;
			const sf = this.trial.data.gabor_sf;
			const lum = 127.5;
			const phs = 0;
			const sigma = 0.2 * s;
			const cx = s / 2, cy = s / 2;
			const theta = (ori * Math.PI) / 180;
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
			tomJS.stimuli[this.trial.data.gabor_hash] = new Uint8ClampedArray(image_data);
		}

        responseGiven() {
			this.trial.recordResponse();
			this.trial.calculateRT();
			this.trial.determineAccuracy();
			this.trial.determineOutcome();
			this.trial.calculateScore();
			this.complete = true;
		}

		timedOut() {
			this.trial.determineOutcome();
			this.complete = true;
		}

        update() {
			if (this.complete) return;
            if (tomJS.now > this.trial.data.stimulus_off) this.timedOut();
			if (tomJS.keyboard.anyKeysPressed(['f','j'])) this.responseGiven();
			this.draw();
        }

	}

	module.TwoLines = class TwoLines extends module.Stimulus {

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

	module.PixelPatch = class PixelPatch extends module.Stimulus {

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

	module.ProgressBar = class ProgressBar extends module.Stimulus {

		constructor(trial, args={}) {
			super(trial, args);
			this.trial.data.bar_colour = args.bar_colour ?? "White";
			this.trial.data.bar_border_colour = args.bar_border_colour ?? "Grey";
			this.trial.data.bar_height = args.bar_height ?? 0.13;
			this.trial.data.bar_width = args.bar_width ?? 0.75;
			this.trial.data.bar_x = args.bar_x ?? 0.50;
			this.trial.data.bar_y = args.bar_y ?? 0.20;
			this.trial.data.bar_percent = args.bar_percent ?? 0;
			this.trial.data.bar_scale = args.bar_scale ?? 1;
			if (this.trial.data.bar_scale != 1)
				this.trial.data.bar_height *= this.trial.data.bar_scale
				this.trial.data.bar_width *= this.trial.data.bar_scale;
		}

		// super

		draw() {
			this.drawBorder();
			this.drawBar();
		}

		// functions

		drawBorder() {
			const w = tomJS.visual.stimulus_size * this.trial.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.trial.data.bar_height;
			const x = (tomJS.visual.screen_size * this.trial.data.bar_x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.trial.data.bar_y) - (h * 0.5);
			const c = this.trial.data.bar_border_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.trial.data.bar_width * this.trial.data.bar_percent;
			const h = tomJS.visual.stimulus_size * this.trial.data.bar_height * this.trial.data.bar_height;
			const x = (tomJS.visual.screen_size * this.trial.data.bar_x) - (tomJS.visual.stimulus_size * this.trial.data.bar_width * 0.5);
			const y = (tomJS.visual.screen_size * this.trial.data.bar_y) - (h * 0.5);
			const c = this.trial.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

	}

	module.NecroDancerBar = class NecroDancerBar extends module.ProgressBar {

		constructor(trial, args = {}) {
			super(trial, args);
			this.trial.data.note_width = args.note_width ?? 0.01;
			this.trial.data.note_height = args.note_height ?? 0.17;
			this.trial.data.window_colour = args.window_colour ?? "LightGrey";
			this.trial.data.window_width = args.window_width ?? 0.20;
			this.trial.data.window_pos = args.window_pos ?? 0.50;
			this.trial.data.window_linewidth = args.window_linewidth ?? 2;
			if (this.trial.data.bar_scale != 1)
				this.trial.data.note_height *= this.trial.data.bar_scale
			    this.trial.data.note_width *= this.trial.data.bar_scale;
		}

		// super

		draw() {
            super.draw();
			this.drawRightBar();
			this.drawWindow();
		}

		initialize(data) {
			this.trial.data.window_width = this.trial.data.signal_for / this.trial.data.bar_duration;
		}

		// override

		drawBar() {
			const w = tomJS.visual.stimulus_size * this.trial.data.note_width;
			const h = tomJS.visual.stimulus_size * this.trial.data.note_height;
			const p = clamp(this.trial.data.bar_percent, 0, 1) * 0.5;
			const x = (tomJS.visual.screen_size * this.trial.data.bar_x) +
				(tomJS.visual.stimulus_size * this.trial.data.bar_width * p) -
				(tomJS.visual.stimulus_size * this.trial.data.bar_width * 0.5) -
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.trial.data.bar_y) - (h * 0.5);
			const c = this.trial.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		// functions

		drawRightBar() {
			const w = tomJS.visual.stimulus_size * this.trial.data.note_width;
			const h = tomJS.visual.stimulus_size * this.trial.data.note_height;
			const p = 1 - clamp(this.trial.data.bar_percent, 0, 1) * 0.5;
			const x = (tomJS.visual.screen_size * this.trial.data.bar_x) +
				(tomJS.visual.stimulus_size * this.trial.data.bar_width * p) -
				(tomJS.visual.stimulus_size * this.trial.data.bar_width * 0.5) -
				(w * 0.5);
			const y = (tomJS.visual.screen_size * this.trial.data.bar_y) - (h * 0.5);
			const c = this.trial.data.bar_colour;
			tomJS.fillRect(x, y, w, h, c);
		}

		drawWindow() {
			const w = tomJS.visual.stimulus_size * this.trial.data.window_width * this.trial.data.bar_width;
			const h = tomJS.visual.stimulus_size * this.trial.data.bar_height;
			const x = (tomJS.visual.screen_size * this.trial.data.bar_x) - (w * 0.5);
			const y = (tomJS.visual.screen_size * this.trial.data.bar_y) - (h * 0.5);
			const c = this.trial.data.window_colour;
			const l = this.trial.data.window_linewidth;
			tomJS.strokeRect(x, y, w, h, c, l);
		}

	}

	module.Table = class Table extends module.Stimulus {

		example_content = ['', 'A', 'B', 'C', 'AC', 'BC', 'D', 'AD', 'BD'];
		example_borders = [4, 5, 7, 8];

		constructor(args = {}) {
			super(args);
			this.data.cols = args.table_cols ?? 3;
			this.data.cell_w = args.table_cell_w ?? 0.30;	// width of cells in stimulus units
			this.data.cell_h = args.table_cell_h ?? 0.15;	// height of cells in stimulus units
			this.data.x = args.table_x ?? 0.5;
			this.data.y = args.table_y ?? 0.5;
			this.data.content = args.table_content ?? this.example_content;
			this.data.borders = args.table_borders ?? this.example_borders;
			this.data.colour = args.table_colour ?? "white";
			this.data.lineWidth = args.table_lineWidth ?? 1; // width of border in pixels units
			this.data.cells = this.data.table_content.length;
			this.data.rows = this.data.table_cells / this.data.table_cols;
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
			for (let c of this.data.borders) this.drawOneCell(c);
		}

		drawOneCell(index) {
			const col = index % this.data.cols;
			const row = Math.floor(index / this.data.rows);
			const scrn = tomJS.visual.screen_size;
			const stim = tomJS.visual.stimulus_size;
			const w = stim * this.data.cell_w;
			const h = stim * this.data.cell_h;
			const x = (scrn * this.data.x * (1 - this.data.cell_w)) +
				(scrn * this.data.cell_w * col * 0.5) -
				(w * 0.5);
			const y = (scrn * this.data.y * (1 - this.data.cell_h)) +
				(scrn * this.data.cell_h * row * 0.5) -
				(h * 0.5);
			const c = this.data.colour;
			const l = this.data.lineWidth;
			tomJS.drawBox(x, y, w, h, c, l);
		}

		generateMatrix() {
			const cols = this.data.cols;
			const rows = this.data.rows;
			let out = [];
			for (let r = 0; r < rows; r++) {
				const b = r * cols;
				const e = b + this.data.cols;
				out.push(this.data.content.slice(b, e));
			};
			return out;
		}

		writeAllCells() {
			// iterate over the content array and write each cell to the screen
			for (let c = 0; c < this.data.cells; c++) this.writeOneCell(c);
		}

		writeOneCell(index) {
			const col = index % this.data.cols;
			const row = Math.floor(index / this.data.rows);
			const content = this.data.content[index];
			const x = (this.data.x * (1 - this.data.cell_w)) + (this.data.cell_w * col * 0.5);
			const y = (this.data.y * (1 - this.data.cell_h)) + (this.data.cell_h * row * 0.5);
			const args = { 'x': x, 'y': y };
			tomJS.writeToCanvas(content, args);
		}

	}

	module.Text = class Text extends module.Stimulus {

		constructor(trial, args = {}) {
            super(trial, args);
			this.trial.data.text_text = args.text_text ?? 'Hello World :)';
			this.trial.data.text_x = args.text_x ?? 0.5;
			this.trial.data.text_y = args.text_y ?? 0.5;
			this.trial.data.text_colour = args.text_colour ?? "white";
			this.trial.data.text_upper = args.text_upper ?? false;
            this.trial.data.text_size = Math.round((args.text_size ?? 0.10) * tomJS.visual.stimulus_size) + "px";
            this.drawArgs = {
                'color': this.trial.data.text_colour,
                'fontSize': this.trial.data.text_size,
                'x': this.trial.data.text_x,
                'y': this.trial.data.text_y
            };
		}

		// functions

		calculateFontSize(size) {
			return Math.round(size * tomJS.visual.stimulus_size) + "px";
		}

        draw() {
			tomJS.writeToCanvas(this.trial.data.text_text, this.drawArgs);
		}

        enter() {
            this.trial.data.stimulus_on = tomJS.now;
            this.trial.data.stimulus_off = tomJS.now + this.trial.data.stimulus_duration;
        }

        exit() {
            this.trial.data.stimulus_off = tomJS.now;
        }

        responseGiven() {
			this.trial.recordResponse();
			this.trial.calculateRT();
			this.trial.determineAccuracy();
			this.trial.determineOutcome();
			this.trial.calculateScore();
			this.complete = true;
		}

		timedOut() {
			this.trial.determineOutcome();
			this.complete = true;
		}

        update() {
			if (this.complete) return;
            if (tomJS.now > this.trial.data.stimulus_off) this.timedOut();
			if (tomJS.keyboard.anyKeysPressed(['f','j'])) this.responseGiven();
			this.draw();
        }

	}

	module.Feedback = class Feedback extends module.Stimulus {

		constructor(trial, args = {}) {
			super(trial, args);
			this.trial.data.feedback_text = args.feedback_text ?? "";
			this.trial.data.feedback_size = Math.round((args.feedback_size ?? 0.10) * tomJS.visual.stimulus_size) + "px";
            this.trial.data.feedback_colour = args.feedback_colour ?? "white";
            this.drawArgs = {
                'color': this.trial.data.feedback_colour,
                'fontSize': this.trial.data.feedback_size
            };
		}

		draw() {
			tomJS.writeToCanvas(this.trial.data.feedback_text, this.drawArgs);
		}

		enter() {
			const outcome = this.trial.data.outcome;
			this.trial.data.feedback_text = this.trial.feedback_texts[outcome];
			this.trial.data.feedback_colour = this.trial.feedback_colors[outcome];
            this.trial.data.feedback_on = tomJS.now;
            this.trial.data.feedback_off = tomJS.now + this.trial.data.feedback_duration;            
		}

        exit() {
            this.trial.data.feedback_off = tomJS.now;
        }

        update() {
			if (this.complete) return;
            if (tomJS.now > this.trial.data.feedback_off) this.complete = true;
			else this.draw();
        }

	}

	module.Fixation = class Fixation extends module.Stimulus {

		constructor(trial, args={}) {
			super(trial, args);
			this.trial.data.fixation_text = args.fixation_text ?? "+";
			this.trial.data.fixation_size = Math.round((args.fixation_size ?? 0.15) * tomJS.visual.stimulus_size) + "px";
            this.trial.data.fixation_colour = args.fixation_colour ?? "white";
            this.trial.data.fixation_x = args.fixation_x ?? 0.5;
            this.trial.data.fixation_y = args.fixation_y ?? 0.5;
            this.drawArgs = {
                'color': this.trial.data.fixation_colour,
                'fontSize': this.trial.data.fixation_size,
                'x': this.trial.data.fixation_x,
                'y': this.trial.data.fixation_y
            };
		}

        draw() {
			tomJS.writeToCanvas(this.trial.data.fixation_text, this.drawArgs);
		}

        enter() {
            this.trial.data.fixation_on = tomJS.now;
            this.trial.data.fixation_off = tomJS.now + this.trial.data.fixation_duration;
        }

        exit() {
            this.trial.data.fixaton_off = tomJS.now;
        }

        update() {
			if (this.complete) return;
            if (tomJS.now > this.trial.data.fixation_off) this.complete = true;
			else this.draw();
        }

	}

    module.ITI = class ITI extends module.Stimulus {

        constructor(trial, args = {}) {
            super(trial, args);
        }

        enter() {
            this.trial.data.iti_on = tomJS.now;
            this.trial.data.iti_off = tomJS.now + this.trial.data.iti_duration;
        }

        exit() {
            this.trial.data.iti_off = tomJS.now;
        }

        update() {
			if (this.complete) return;
            if (tomJS.now > this.trial.data.iti_off) this.complete = true;
			else tomJS.resetCanvas();
        }

    }

	return module;

})({});


const Trials = ((module) => {

	/** Standard two-alternative forced choice reaction time task. */
	module.Trial = class Trial extends State {

		constructor(args = {}) {
			super(args);

			this.index = args.index ?? 0;

			// data
			tomJS.data.push(new Data.TrialData());
			this.data = tomJS.data[this.index];                      

            if (!('target' in args)) tomJS.error('No target passed to trial.');
            this.data.target = args.target;

			this.data.block = Number(args.block ?? tomJS.block);
			this.data.trial = Number(args.trial ?? tomJS.trial);
			this.data.index = Number(this.index);
			this.data.fixation_duration = Number(choose(args.fixation_duration, 1000));
			this.data.stimulus_duration = Number(choose(args.stimulus_duration, 3000));
			this.data.stimulus_fast = Number(choose(args.stimulus_fast, 200));
			this.data.stimulus_slow = Number(choose(args.stimulus_slow, 3000));			
			this.data.feedback_duration = Number(choose(args.feedback_duration, 1000));
			this.data.iti_duration = Number(choose(args.iti_duration, 1000));

			// timeline
			this.timeline = new Timeline();

            const _fixation = new (args.fixation ?? Stimuli.Fixation)(this, args);
			this.timeline.push(_fixation);

            const _stimulus = new (args.stimulus ?? Stimuli.Gabor)(this, args);
            this.timeline.push(_stimulus);

            const _feedback = new (args.feedback ?? Stimuli.Feedback)(this, args);
			this.timeline.push(_feedback);

            const _iti = new (args.iti ?? Stimuli.ITI)(this, args);
			this.timeline.push(_iti);

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

			this.feedback_texts = args.feedback_texts ?? {
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
			this.timeline.enter();
		}

		exit() {
			super.exit();
			tomJS.trial += 1;
			tomJS.index += 1;
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
			const rt = this.data.rt;
			const tgt = this.data.target;
			const slw = this.data.stimulus_slow;
			const fst = this.data.stimulus_fast;
			if (rsp == null) { this.data.outcome = 'Censored' }
			else if (rt >= slw) { this.data.outcome = 'Slow' }
			else if (rt <= fst) { this.data.outcome = 'Fast' }
			else if (rsp == tgt) { this.data.outcome = 'Correct' }
			else { this.data.outcome = 'Incorrect' };
		}

		recordResponse() {
			this.data.response       = tomJS.keyboard.dir;
			this.data.response_key   = tomJS.keyboard.key;
			this.data.response_given = tomJS.keyboard.timestamp;
		}

	}

	module.FeedbackDeadline = class FeedbackDeadline extends module.Trial {

		constructor(args = {}) {
			if (!('condition' in args)) tomJS.error('no condition (deadline) passed to feedback deadline trial');
			super(args);
			this.data.stimulus_slow = this.data.condition;
		}

	}

	module.PreFixationPicture = class PreFixationPicture extends module.Trial {

		constructor(args = {}) {
			if (!('condition' in args)) tomJS.error('no condition passed to pre-fixation picture trial');
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
			this.data.cue_off = this.data.cue_on + this.data.cue_duration;
		}

		cueUpdate() {
			tomJS.drawImage(this.data.condition, this.args);
			if (tomJS.now >= this.data.cue_off) this.cueExit();
		}

	}

	/** A row of +s indicate when the partiicoant should respond. */
	module.ResponseSignal = class ResponseSignal extends module.Trial {

		constructor(args={}) {
			if (!('condition' in args))
				tomJS.error('no condition passed to response signal trial');

			super(args);

			// override
			this.data.stimulus_fast = Number(args.stimulus_fast ?? 15);
			this.data.stimulus_slow = Number(args.stimulus_slow ?? 15);

			this.feedback_texts = args.feedback_texts ?? {
				'Correct': 'Hit',
				'Incorrect': 'Hit',
				'Fast': 'Miss',
				'Slow': 'Miss',
				'Censored': 'Miss'
			};

			// signal
			this.data.above_and_below = args.above_and_below ?? false;
			this.data.signal_for = Number(choose(args.signal_for, 300));
			this.data.signal_x = Number(choose(args.signal_x, 0.5));
			this.data.signal_y = Number(choose(args.signal_y, 0.2));

			// warning
			this.data.warning_at = Number(choose(args.warning_for, 200));
			this.data.warning_for = Number(choose(args.warning_for, 200));

			// calculated
			this.data.stimulus_duration += this.data.condition + this.data.signal_for;
			this.data.trial_duration = this.data.fixation_duration
                + this.data.condition
                + this.data.signal_for;

			// placeholder
			this.data.rtt = null;
			this.data.signal_on = null;
			this.data.signal_off = null;
			this.data.warning_on = null;
			this.data.warning_off = null;
			this.data.early = null;
			this.data.late = null;

			// response signal
			this.signal = new (args.signal ?? Stimuli.Text)(args);
			if (this.data.above_and_below) this.signal_lower = new (args.signal ?? Stimuli.Text)(args);

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
			if (rsp == null) { _outcome = 'Censored' }
			else if (rsg <= erl) { _outcome = 'Fast' }
			else if (rsg >= lte) { _outcome = 'Slow' }
			else if (rsp == tgt) { _outcome = 'Correct' }
			else { _outcome = 'Incorrect' };
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
			this.data.signal_on = this.data.stimulus_on + this.data.condition;
			this.data.signal_off = this.data.signal_on + this.data.signal_for;
			this.data.warning_on = this.data.signal_on - this.data.warning_at;
			this.data.warning_off = this.data.warning_on + this.data.warning_for;
			this.data.early = this.data.signal_on - this.data.stimulus_fast;
			this.data.late = this.data.signal_off + this.data.stimulus_slow;
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
			if (tomJS.now < this.data.warning_on) text = ""
			else if (tomJS.now < this.data.signal_on) text = "+"
			else if (tomJS.now < this.data.signal_off) text = "+++++"
			else text = "";            
			this.signal.set('text_text', text);
			if (this.data.above_and_below) this.signal_lower.set('text_text', text);
		}

	}

	/** A bar at the top of the screen informs the participant when, and how long they have, to respond. */
	module.ProgressBarResponseSignal = class ProgressBarResponseSignal extends module.Trial {

		constructor(args={}) {

            super(args);

			if (!('condition' in args)) 
                tomJS.error('no condition passed to visual response signal trial');
            this.data.condition = args.condition;

			// override
			this.data.stimulus_fast = Number(args.stimulus_fast ?? 15);
			this.data.stimulus_slow = Number(args.stimulus_slow ?? 15);

			this.feedback_texts = args.feedback_texts ?? {
				'Correct': 'Hit',
				'Incorrect': 'Hit',
				'Fast': 'Miss',
				'Slow': 'Miss',
				'Censored': 'Miss'
			};

			// warning
			this.data.warning_at = Number(choose(args.warning_for, 0));
			this.data.warning_for = Number(choose(args.warning_for, 0));

            // signal
			this.data.signal_for = Number(choose(args.signal_for, 300));
			this.data.signal_x = Number(choose(args.signal_x, 0.5));
			this.data.signal_y = Number(choose(args.signal_y, 0.2));
			this.data.signal_colour = args.signal_colour ?? "DeepSkyBlue";
			this.data.warning_colour = args.warning_colour ?? "#99ccff";
			this.data.bar_colour = args.bar_colour ?? "White";
			this.data.border_colour = args.border_colour ?? "Grey";
			this.data.empty_colour = args.empty_colour ?? "#00000000";

            // calculated
			this.data.stimulus_duration += this.data.condition + this.data.signal_for;
			this.data.bar_duration = this.data.fixation_duration
                + this.data.condition
                + this.data.signal_for;

			// signal(s)
			this.signal = new (args.signal ?? Stimuli.ProgressBar)(this, args);
			
			// placeholder
			this.data.rtt = null;
			this.data.signal_on = null;
			this.data.signal_off = null;
			this.data.warning_on = null;
			this.data.warning_off = null;
			this.data.early = null;
			this.data.late = null;

            // append data headings to global data heading storage
			if (!(tomJS.headings.includes('signal_for'))) tomJS.headings = ArrayTools.joinUniques(tomJS.headings, this.data.keys());

		}

        // override

        determineOutcome() {
			const rsp = this.data.response;
			const rsg = this.data.response_given;
			const erl = this.data.early;
			const lte = this.data.late;
			const tgt = this.data.target;
			let _outcome;
			if (rsp == null) { _outcome = 'Censored' }
			else if (rsg <= erl) { _outcome = 'Fast' }
			else if (rsg >= lte) { _outcome = 'Slow' }
			else if (rsp == tgt) { _outcome = 'Correct' }
			else { _outcome = 'Incorrect' };
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
            this.data.signal_on = this.data.start + this.data.fixation_duration + this.data.condition;
			this.data.signal_off = this.data.signal_on + this.data.signal_for;
			this.data.warning_on = this.data.signal_on - this.data.warning_at;
			this.data.warning_off = this.data.warning_on + this.data.warning_for;
			this.data.early = this.data.signal_on - this.data.stimulus_fast;
			this.data.late = this.data.signal_off + this.data.stimulus_slow;
			this.signal.initialize(this.data);
		}

		update() {
			super.update();
			this.updateProgressBar();
			this.drawProgressBar();
		}

		// functions

        drawProgressBar() {
			if (this.timeline.currentState() == "ITI") { tomJS.resetCanvas(); return; }            
			this.signal.draw();
		}

		getBarPercent() {
			return (tomJS.now - this.data.fixation_on) / this.data.bar_duration;
		}

		getBarColour() {
			if (tomJS.now < this.data.warning_on) return this.data.bar_colour
			else if (tomJS.now < this.data.signal_on) return this.data.warning_colour
			else if (tomJS.now < this.data.signal_off) return this.data.signal_colour
			else return this.data.empty_colour;
		}

		updateProgressBar() {
			if (this.timeline.currentState() == "Feedback" |
				this.timeline.currentState() == "ITI") return;			
			this.data.bar_colour = this.getBarColour();
			this.data.bar_percent = this.getBarPercent();
			this.data.window_colour = this.getBarColour();
		}

	}

	return module;

})({});


// utils ======================================================================


function assignImageData(source, sink) {
	if (source.length != sink.length) 
        console.warn('ERROR: source and sink are not the same length.',
		Math.sqrt(source.length), Math.sqrt(sink.length));
	for (let i = 0; i < sink.length; i += 4) {
		sink[i+0] = source[i+0];	// R
		sink[i+1] = source[i+1];	// G
		sink[i+2] = source[i+2];	// B
		sink[i+3] = source[i+3];	// A
	};
}


/** Choose one of the options from the passed list at random, or the fallback instead. */
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


// tools ======================================================================


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
		for (let i = 0; i < (N-1); i++) _array = _array.concat(source);
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
			if (TextTools.evaluate(a[key]+" "+operation+" "+target)) {
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

	module.Button = function Button(id, textContent, onClick, parent, args={}) {
		const _btn = document.createElement('button');
		_btn.id = id;
		_btn.textContent = textContent;
		_btn.onclick = onClick;
		_btn.style.cursor = args.cursor ?? 'pointer';
		_btn.style.padding = args.padding ?? '1%';
		_btn.style.fontFamily = args.fontFamily ?? tomJS.visual.fontFamily;
		_btn.style.fontSize = args.fontSize ?? tomJS.visual.fontSize;
		_btn.style.marginBottom = args.marginBottom ?? "1%";
		_btn.style.marginLeft = args.marginLeft ?? "0";
		_btn.style.marginRight = args.marginRight ?? "0";
		_btn.style.marginTop = args.marginTop ?? '1%';
		_btn.style.width = args.width ?? null;
		_btn.style.height = args.height ?? null;
		parent.append(_btn);
		return _btn;
	}

	module.Container = function Container(id, parent) {
		const _ctr = document.createElement('div');
		_ctr.id = id;
		_ctr.style.width = "85%";
		_ctr.style.justifyContent = "center";
		_ctr.style.alignItems = "center";
		_ctr.style.display = "flex";
		_ctr.style.flexDirection = "column";
		_ctr.style.flexWrap = "wrap";
		_ctr.style.textAlign = "right";
		_ctr.style.fontFamily = tomJS.visual.fontFamily;
		_ctr.style.position = "absolute";
		_ctr.style.top = "0%";
		_ctr.style.left = "50%";
		_ctr.style.transform = "translate(-50%, -0%)";
		_ctr.style.color = "black";
		_ctr.style.backgroundColor = "white";
		_ctr.style.padding = "24px";
		parent.appendChild(_ctr);
		return _ctr;
	}

	module.Label = function Label(id, content, parent, args={}) {
		const _lbl = document.createElement('label');
		_lbl.id = id;
		_lbl.textContent = content;
		_lbl.style.fontFamily = args.fontFamily ?? tomJS.visual.fontFamily;
		_lbl.style.fontSize = args.fontSize ?? tomJS.visual.fontSize;
		_lbl.style.width = args.width ?? null;
		_lbl.style.marginBottom = args.marginBottom ?? "1%";
		_lbl.style.marginLeft = args.marginLeft ?? "0";
		_lbl.style.marginRight = args.marginRight ?? "0";
		_lbl.style.marginTop = args.marginTop ?? '1%';
		_lbl.style.textAlign = args.textAlign ?? "left";
		parent.appendChild(_lbl);
		return _lbl;
	}

	/** Write text to the body of the html page. */
	module.Write = function Write(text) {
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
	constructor(args = {}) {
		this.args = args;
		this.key = '';
		this.dir = '';
		this.timestamp = 0;
		this.keys = {};
		this.keyPress = this.keyPress.bind(this);
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
		if (targets == null) return null;
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
		this.key = key;
		this.timestamp = event.timeStamp;
		this.keys[key] = true;
		if (tomJS.controls.inputs.includes(key)) this.dir = tomJS.controls.responses[key];
	}

	keyRelease(event) {
		let key = event.key;
		this.keys[key] = false;
	}

}


const TextTools = ((module) => {	

	/** Evaluate the relationship between l and r based on o. */
	module.evaluate = function evaluate(string) {
        const _split = string.split(" ");
        const l = _split[0];
        const o = _split[1];
        const r = _split[2];
		switch(o) {
			case '==' : return l == r;
			case '!=' : return l != r;
			case '<'  : return Number(l) < Number(r);
			case '>'  : return Number(l) > Number(r);
			case '<=' : return Number(l) <= Number(r);
			case '>=' : return Number(l) >= Number(r);
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
	'bremen': {
		'institute': "Department of Psychology",
		'department': "Faculty 11",
		'group': "Human and Health Sciences",
		'contacts': [
			"Psychological Research Methods and Cognitive Psychology",
			"Tom Narraway: narraway@uni-bremen.de",
			"Heinrich Liesefeld: heinrich.liesefeld@uni-bremen.de"],
		'logo': "https://www.uni-bremen.de/_assets/8ec6f74154680cbbd6366024eea31e0b/Images/logo_ub_2021.png",
		'information_statement': {
			"General information":
				"Thank you for your interest in our scientific study."
				+ " Please read the following information carefully and then decide"
				+ " whether or not to participate in this study. If you have any"
				+ " further questions about the study beyond this information please"
				+ "message or email Tom Narraway.",
			"Objective of this Research Project":
				"In this study, we want to determine how our experimental"
				+ " manipulation affects the speed and accuracy of your responses.",
			"Study Procedure":
				"First you will use an ID-1 sized card to set the size of the stimuli"
				+ " on your screen. Then we ask for your age, gender, and dominant "
				+ " hand, but these details are optional. You will be asked to"
				+ " perform a decision making task in response to simple visual stimuli."
				+ " For example, you may be asked to determine if a stimulus is rotated left or right,"
				+ " or if a stimulus is more blue or more orange."
				+ " For each decision we record how long you take to respond and if"
				+ " your response is correct or not. The exact procedure will be"
				+ " explained to you during the experiment. The experiment takes"
				+ " approximately 60 minutes and will force your browser into fullscreen mode.",
			"Reimbursement":
				"You will be reimbursed at the rate of 10 GBP per hour on the"
				+ " condition that you meet your obligations.",
			"Obligations":
				" You are obliged to pay a fair amount of attention throughout this study."
				+ " In order to determine if this obligation is met, this study"
				+ " contains attention checks. As per Prolific policy, if you fail"
				+ " too many of these checks the experiment will end and you will"
				+ " be asked to return your submission. If you wish to withdraw"
				+ " consent to the use of your data you are obligated to contact"
				+ " Tom Narraway before your submisison is approved or rejected.",
			"Responsible Bodies":
				"Data generated by this study is only processed by our research"
				+ " group and therefore the responsible body is the University of Bremen.",
			"Categories of Data":
				"As a part of this study, we collect only anonymous data.",
			"Purpose of Data Collection":
				"We collect your anonymous data for research purposes.",
			"Legal Basis for Data Processing":
				"The legal basis for the processing of your data is your consent"
				+ " according to Art. 6.1(a) GDPR.",
			"When is your Data Deleted or Anonymized?":
				"All of your data is immediately anonymized. If your submission is returned"
				+ " or rejected: your data will be imediatley deleted. If your"
				+ " submission is approved: your data will be kept indefinatley.",
			"Who has Access to your Data?":
				"Initially your data are only accessed by our research group, are not passed"
				+ " to any other parties and are not transferred outside of the EU/ EEA."
				+ " After removing your prolific ID, Your data may be made publicly"
                + " available on scientific data repositories.",
			"Protection from Unauthorized Access":
				"Your data are initially linked to your anonymous Prolific ID."
				+ " When your submission is approved: you are assigned a new random ID."
				+ " This ensures that once your data is submitted: it is impossible"
				+ " for anyone, including us, to link your data back to you.",
			"Your Rights":
				"Because your Prolific ID is removed from the data once it is approved:"
				+ " you only have the right to revoke consent to the use of your data"
				+ " up until your submission is approved. After that time we can no "
				+ " longer identify which data is yours and therefore cannot delete it."
				+ " You may withdraw from the study at any time, without giving reasons,"
				+ " and if are otherwise eligible: can receive pro rata compensation for your time.",
		},
		'consent_form': [
			"1. I consent to offering 1 hour of participation in this study in exchange for 10 GBP.",
			"2. I am aware of the study procedure, and all of my questions regarding it have been answered.",
			"3. I agree to the recording and analysis of my anonymous data.",
			"4. I am satisfied with the data protection practices of this study.",
			"5. I consent to the storage of my data as described in the preceding information.",
			"6. I accept that once my submission is approved I can no longer withdraw consent to the use of my anonymous data.",
			"7. I understand that my participation is voluntary and that I can withdraw at any time without giving reasons, and that in this case I am entitled to compensation for the time spent participating up to that point.",
			"8. I am aware that all of the information on this page is considered to be part of the consent form."
		],
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
