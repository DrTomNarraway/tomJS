
class Experiment {	


	version = '05-11-25 17:07';


	constructor() {
		this.jaots = null;
		this.pilot = null;
		this.verbose = null;
		this.grid_lines = null;
		this.save = null;
		this.backgroundColor = null;
		this.color = null;
		this.subject = null;
		this.height = null;
		this.width = null;
		this.size = null;
		this.keyboard = null;
		this.key_a = null;
        this.key_b = null;
        this.key_quit = null;
        this.key_back = null;
		this.key_a_upper = null;
        this.key_b_upper = null;
		this.resp_a = null;
		this.resp_b = null;
		this.key = null;
		this.dir = null;		
        this.gather_demographics = null;
        this.demographics_language = null;
		this.demographics = null;
        this.now = null;
        this.running = null;
        this.timeline = null;
        this.time_pos = null;
        this.trial = null;
        this.block = null;
        this.trials = null;
		this.blocks = null;
		this.data = null;
		this.booted = false;
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
		const _block = new Block(trial_type, trialwise, additional, trial_reps, start_slide, end_slide, countdown);
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


	bootTomJS(args={}, jatos=null) {

		console.log('booting tomJS version '+this.version);

		this.jatos = jatos;

		// debugging
		this.pilot = args.pilot ?? false;
		this.verbose = args.verbose ?? false;
		this.grid_lines = args.grid_lines ?? false;
		this.save = args.save ?? true;

		// set body defaults
		this.backgroundColor = args.backgroundColor ?? "black";
		this.color = args.color ?? "white";		

		// gather identifying information
		if (this.jatos) this.subject = ('workerID' in this.jatos.urlQueryParameters) ? 
			this.jatos.urlQueryParameters.workerID : Math.round(Math.random()*999999);
		else this.subject = Math.round(Math.random()*999999);
		if (this.verbose) console.log(this.subject);
		
		// create canvas
		this.height = window.innerHeight - 16;
		this.width  = window.innerWidth - 16;
		this.size   = Math.min(this.height, this.width); // find the smaller dimension
		this.createCanvas();
		
		// controls
		this.keyboard  = new Keyboard();
		this.key_a     = args.key_a     ?? 'f';
        this.key_b     = args.key_b     ?? 'j';
        this.key_quit  = args.key_quit  ?? 'Escape';
        this.key_back  = args.key_back  ?? 'Backspace';
		this.key_a_upper = this.key_a.toUpperCase();
		this.key_b_upper = this.key_b.toUpperCase();
		this.resp_a    = args.resp_a    ?? 'A';
		this.resp_b    = args.resp_b    ?? 'B';
		this.key = '';
		this.dir = '';
		if (this.verbose) console.log(this.key_a, this.key_b, this.key_quit, this.key_back, this.resp_a, this.resp_b);
		
		// demographics
        this.gather_demographics   = args.gather_demographics ?? true;
        this.demographics_language = args.demographics_language ?? 'en';
		this.demographics          = {'age':null, 'gender':null, 'hand':null};
		
		// timing
        this.now = window.performance.now();
		
		// timeline
        this.running  = true;
        this.timeline = (this.gather_demographics) ? [new Consent(args), new Demographics(args)] : [new Consent(args)];
        this.time_pos = 0;

        // timeline identifiers
        this.trial  = 0;
        this.block  = 0;
        this.trials = 0;
		this.blocks = 0;

		// data
		this.data = [];

		// flag experiment as finished booting
		this.booted = true;

	}


	createCanvas() {
		this.canvas = document.createElement('canvas');
		this.canvas.id = "canvas";
		this.canvas.height = this.size;
		this.canvas.width  = this.size; // make canvas square
		this.canvas.style.position = "absolute"; 
		this.canvas.style.backgroundColor = this.backgroundColor;
		this.canvas.style.color = this.colour;
		this.canvas.style.left = (this.width - this.size + 16) / 2 + "px"; // position canvas in center
		document.body.appendChild(this.canvas); // add canvas to window
		this.context = this.canvas.getContext("2d");
	}


	drawGridLines() {
		// horizontal
		for (let i = 0; i < 5; i++) {
			let w = this.size;
			let h = this.size * 0.001;
			let x = (this.size * 0.5) - (w * 0.5);
			let y = (this.size * 0.5 * (i/2)) - (h * 0.5);
			this.context.fillStyle = this.colour;
			this.context.fillRect(x, y, w, h);
		}
		// vertical
		for (let i = 0; i < 5; i++) {
			let w = this.size * 0.001;
			let h = this.size;
			let x = (this.size * 0.5 * (i/2)) - (w * 0.5);
			let y = (this.size * 0.5) - (h * 0.5);
			this.context.fillStyle = this.colour;
			this.context.fillRect(x, y, w, h);
		}
	}


	endExperiment() {
		if (this.jatos) jatos.startNextComponent();
		else window.close();
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
            if (this.verbose) console.log('at end of timeline, ending experiment');
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
		this.context.fillStyle = this.backgroundColor;
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
		const csv = this.writeCSV();
		if (this.jatos) jatos.submitResultData(csv);
		console.log(csv);
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
		if (this.grid_lines) this.drawGridLines();
	}


	writeCSV() {
		const d = this.data;
		const n = d.length;
		let csv = 'subject,age,gender,hand,block,trial,condition,difficulty,rt,score,outcome,target,response\n';
		for (let i = 0; i < n; i++) {
			let x = d[i];
			let r = [this.subject, this.demographics.age, this.demographics.gender, this.demographics.hand,
				x.block, x.trial, x.condition, x.difficulty, x.rt, x.score, x.outcome, x.target, x.response];			
			csv += r.toString() + '\n';
		};
		return csv;
	}

	
	writeToCanvas (text, args={}) {
		// Write text to the canvas with a relative position (0.5 being center).
		let _upper = args.upper ?? false;
		let _text = _upper ? text.toUpperCase() : text;
		tomJS.context.fillStyle = args.colour ?? "white";
		tomJS.context.textAlign = args.align  ?? "center";
		let _pt = args.pt ?? 22;
		let _tf = args.font ?? "Georgia";
		let _font = _pt+ "px " + _tf;
		tomJS.context.font = _font;
		let _x = args.x ?? 0.5;
		let _y = args.y ?? 0.5;
		let _pos_x = tomJS.size * _x;
		let _pos_y = tomJS.size * _y + (0.334 * _pt);
		let _width = tomJS.size ?? 1;
		tomJS.context.fillText(_text, _pos_x, _pos_y, _width);
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
			'block'      : args.block ?? tomJS.blocks,
			'trial'      : args.trial ?? tomJS.trials,
			'condition'  : args.condition ?? null,
			'difficulty' : this.stimulus.data.difficulty,
			'target'     : this.stimulus.data.target,
			'rt'         : null,
			'score'      : null,
			'outcome'    : null,
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
		};

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


	// super ---------------------------------------------------------------------------------------------------------------


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
		this.stimulusEnter();
	}


	fixationUpdate() {
		if (this.substate_virgin) this.fixationEnter();
		tomJS.writeToCanvas('+');
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
		if (tomJS.keyboard.anyKeysPressed([tomJS.key_a, tomJS.key_b])) 
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
		tomJS.writeToCanvas(text,{'colour':colour});
		if (tomJS.now >= this.properties.feedback_end) this.feedbackExit();
	}


	// functions -----------------------------------------------------------------------------------------------------------


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
		if (tomJS.keyboard.allKeysPressed(['f', 'j'])) this.ready_to_exit = true;
	}


	drawContent() {
		for (const _content of this.content) {
			switch(_content.class) {
				case 'text':
					const _text = this.parseText(_content.text);
					tomJS.writeToCanvas(_text, _content);
					break;
				case 'gabor':
					const _gb_args = {..._content,...{'target':this.parseText(_content.target)}};
					const _gb = new Gabor(_gb_args);
					_gb.drawStimulus();
					break;
				case 'twolines':
					const _tl_args = {..._content,...{'target':this.parseText(_content.target)}};
					const _tl = new TwoLines(_tl_args);
					_tl.drawStimulus();
					break;
				case 'pixelpatch':
					if (!this.A) {
						let tmp = new PixelPatch({'difficulty':_content.A});
						this.A = tmp.image_data;
					};
					if (!this.B) {
						let tmp = new PixelPatch({'difficulty':_content.B});
						this.B = tmp.image_data;
					};
					const _image_data = (tomJS.dir == 'A') ? this.A : this.B ;
					const _pp_args = {..._content,...{'image_data':_image_data}};
					const _pp = new PixelPatch(_pp_args);
					_pp.drawStimulus();
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
		this.h0 = (args.h0 ?? "24")+ "px";
		this.h1 = (args.h1 ?? "18")+ "px";
		this.h2 = (args.h2 ?? "14")+ "px";
	}


	// override ------------------------------------------------------------------------------------------------------------


	onUpdate() {		
		tomJS.context.fillStyle = "white";
		tomJS.context.fillRect(0, 0, tomJS.width, tomJS.height);
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
		this.createButton();
	}


	onExit() {
		super.onExit();
		this.container.remove();
		document.body.style.backgroundColor = tomJS.backgroundColor;
		document.body.style.color = tomJS.color;
	}


	// functions -----------------------------------------------------------------------------------------------------------


	buttonClicked() {
		this.slide.ready_to_exit = true;
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


	createButton() {
		const btn = document.createElement('button');
		btn.id = "exit_button";
		btn.textContent = "I Consent";
		btn.onclick = this.buttonClicked;
		btn.slide = this;
		btn.style.marginTop = '4em';
		btn.style.marginBottom = "32px";
		btn.style.cursor    = 'pointer';
		btn.style.padding   = '1em';
		this.container.appendChild(btn);
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
		ins.style.marginTop = "1em";
		ins.style.fontSize = this.h0;			
		div.append(ins);
		// department
		let dep = document.createElement('label');
		dep.textContent = this.department;
		dep.style.marginTop = "1em";
		dep.style.fontSize = this.h1,	
		div.append(dep);
		// group
		let grp = document.createElement('label');
		grp.textContent = this.group;
		grp.style.marginTop = "1em";
		grp.style.fontSize = this.h2;			
		div.append(grp);
		// contact
		let ctc = document.createElement('label');
		ctc.textContent = this.contact;
		ctc.style.marginTop = "1em";
		ctc.style.fontSize = this.h1;			
		div.append(ctc);
		// contacts
		for (let i = 0; i < this.contacts.length; i++) {
			let tmp = document.createElement('label');
			tmp.textContent = this.contacts[i];
			tmp.style.marginTop = "1em";
			tmp.style.fontSize = this.h2;			
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
		ctr.style.fontFamily      = "Georgia";
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
		for (let i = 0; i < consent_form.length; i++) {
			const tmp = document.createElement('label');
			tmp.textContent = consent_form[i];
			tmp.style.width = "100%";
			tmp.style.marginBottom = "1em";
			if (i % 2 == 0) { 
				tmp.style.fontSize = this.h1;
			} else {
				tmp.style.fontSize = this.h2;
			};
			div.append(tmp);
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
	}


	// super ---------------------------------------------------------------------------------------------------------------


	onEnter() {
		super.onEnter();
	}


	onUpdate() {
        tomJS.writeToCanvas(Math.round((this.start + this.lifetime - tomJS.now) / 1000));
        if (tomJS.now >= this.start + this.lifetime) this.ready_to_exit = true;
		super.onUpdate();
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
		this.heading = args.heading ?? "Welcome to the experiment.";
		this.instructions = args.instructions ?? "The following information is optional."+
			" Pless press \"Submit\" when you are ready to continue. "+
			" Please do not refresh the page at any time.";			
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
		this.createHeading();
		this.age = this.createField(demographics_prompts.age.en, 'number');
		this.gender = this.createField(demographics_prompts.gender.en, 'select', demographics_choices.gender.en);
		this.hand = this.createField(demographics_prompts.hand.en, 'select', demographics_choices.hand.en);
		this.createButton();
	}


	onExit() {
		super.onExit();
		tomJS.demographics.age    = this.age.value;
		tomJS.demographics.gender = this.gender.value;
		tomJS.demographics.hand   = this.hand.value;
		if (tomJS.verbose) console.log(tomJS.demographics);
		this.container.remove();
	}


	// functions -----------------------------------------------------------------------------------------------------------


	buttonClicked() {
		this.slide.ready_to_exit = true;
	}


	createButton() {
		const btn = document.createElement('button');
		btn.id = "exit_button";
		btn.textContent = "Submit";
		btn.onclick = this.buttonClicked;
		btn.slide = this;
		btn.style.marginTop = '4em';
		btn.style.cursor    = 'pointer';
		btn.style.display   = 'flex';
		btn.style.padding   = '1em';
		this.container.appendChild(btn);
	}


	createContainer() {
		const ctr = document.createElement('div');		
		ctr.id = "container";
		ctr.style.width          = "100vh";
		ctr.style.justifyContent = "center";
		ctr.style.alignItems     = "center";
		ctr.style.display        = "flex";
		ctr.style.flexDirection  = "row";
		ctr.style.flexWrap       = "wrap";
		ctr.style.textAlign      = "right";
		ctr.style.fontFamily     = "Georgia";
		ctr.style.position       = "absolute";
		ctr.style.top            = "50%";
		ctr.style.left           = "50%";
		ctr.style.transform      = "translate(-50%, -50%)";
		this.container = ctr;
		document.body.appendChild(ctr);
	}


	createField(label, type, options = []) {
		// create wrapper div
		const div = document.createElement('div');
		div.id = label;
		div.style.width = "100vh";
		div.style.marginTop = "2em";
		// create label
		const lbl = document.createElement('label');
		lbl.textContent = label;
		lbl.style.textAlign = "right";
		lbl.style.width = "50vh";
		// create input options
		let input;		
		if (type === 'select') {
			input = document.createElement('select');
			options.forEach(opt => {
				const o = document.createElement('option');
				o.value = opt;
				o.textContent = opt === '' ? 'Select...' : opt;
			input.appendChild(o);
			});
		} else {
			input = document.createElement('input');
			input.type = type;
		}
		input.style.width = "50vh";
		input.style.marginLeft = "2em";
		// stich together
		div.append(lbl, input);
		this.container.append(div);
		// connect to slide
		return input;
	}


	createHeading() {
		// heading
		const hed = document.createElement('label');
		hed.textContent = this.heading;	
		hed.style.textAlign = "center";
		hed.style.fontSize = "28px"
		this.container.appendChild(hed);
		// instructions
		const ins = document.createElement('label');
		ins.textContent = this.instructions;
		ins.style.width = '100vh';
		ins.style.marginTop = '2em';
		ins.style.textAlign = "center";
		this.container.appendChild(ins);
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
		this.hits = this.correct + this.incorrect;
		this.miss = this.fast + this.slow + this.censored;
	}


    onExit () {
        if (tomJS.save) tomJS.saveData();
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
        if (tomJS.save) tomJS.saveData();
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
		this.hits = minMax(this.correct + this.incorrect, 0, 100);
		this.miss = minMax(this.fast + this.slow + this.censored, 0, 100);
	}

}


// stimuli =================================================================================================================


class Stimulus {


	constructor(args={}) {
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
		this.properties.gp_opacity  = args.gp_opacity  ?? 1.0;
		this.properties.gp_ori      = args.gp_ori      ?? 25;
		this.properties.gp_x        = args.gp_x        ?? 0.5;
		this.properties.gp_y        = args.gp_y        ?? 0.5;
		this.properties.gp_sf       = args.gp_sf       ?? 15;
		this.properties.gp_size     = args.gp_size     ?? 0.5;
		this.image_data = this.prepareImageData();
	}


	// super ---------------------------------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		const _s = Math.round(tomJS.size * this.properties.gp_size);
		const img = tomJS.context.createImageData(_s, _s);
		this.assignImageData(img.data);
		let pos_x = tomJS.size * this.properties.gp_x - (_s * 0.5);
		let pos_y = tomJS.size * this.properties.gp_y - (_s * 0.5);
		tomJS.context.putImageData(img, pos_x, pos_y);
	}


	// functions -----------------------------------------------------------------------------------------------------------


	assignImageData(data) {
		for (let i = 0; i < data.length; i += 4) {
			data[i+0] = this.image_data[i+0];	// R
			data[i+1] = this.image_data[i+1];	// G
			data[i+2] = this.image_data[i+2];	// B
			data[i+3] = this.image_data[i+3];	// A
		};
	}


	prepareImageData() {
		const s = Math.round(tomJS.size * this.properties.gp_size);
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
		return new Uint8ClampedArray(image_data);
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
		const w = (tomJS.size * this.properties.tl_width);
		const adjust = (side === this.data.target) ? this.dapropertiesta.tl_difference : 0;
		const h = (tomJS.size * this.properties.tl_height) + adjust;
		const pos_y = (tomJS.size * this.properties.tl_y);
		const offset_y = h * 0.5;
		const y = pos_y - offset_y;
		const pos_x = tomJS.size * this.properties.tl_x;
		const distance = tomJS.size * this.properties.tl_distance;
		const offset_x = w * 0.5;
		const x = (side === "A") ? pos_x - offset_x - distance : pos_x - offset_x + distance;
		tomJS.context.fillStyle = (side === this.data.target) ? this.properties.tl_color_L : this.properties.tl_color_R ;
		tomJS.context.fillRect(x, y, w, h);
	}


}


class PixelPatch extends Stimulus {

	
	constructor(args = {}) {
		if (!('pp_aness' in args) & (!'image_data' in args)) tomJS.error('no way to generate pixel patch stimulus');
		super(args);
		this.data.difficulty = args.difficulty;
		this.data.target     = (this.data.difficulty > 0.5) ? 'A' : 'B';
		this.properties.pp_color_A    = args.pp_color_A    ?? colours.black;
		this.properties.pp_color_B    = args.pp_color_B    ?? colours.white;
        this.properties.pp_size       = args.pp_size       ?? 0.3;	// percent of canvas
		this.properties.pp_rows       = args.pp_rows       ?? 50;		// count
        this.properties.pp_x          = args.pp_x          ?? 0.5;	// percent of canvas
		this.properties.pp_y          = args.pp_y          ?? 0.5;	// percent of canvas		
		this.calculateImageSize();
		this.image_data = args.image_data ?? this.prepareImageData();
	}

	// super ---------------------------------------------------------------------------------------------------------------


	drawStimulus() {
		const _gp = this.properties.grid_pix;
		super.drawStimulus();
		const img = tomJS.context.createImageData(_gp, _gp);
		this.assignImageData(img.data);
		let pos_x = tomJS.size * this.properties.pp_x - (_gp * 0.5);
		let pos_y = tomJS.size * this.properties.pp_y - (_gp * 0.5);
		tomJS.context.putImageData(img, pos_x, pos_y);
	}


	// functions -----------------------------------------------------------------------------------------------------------


	assignImageData(data) {
		for (let i = 0; i < data.length; i += 4) {
			data[i+0] = this.image_data[i+0];	// R
			data[i+1] = this.image_data[i+1];	// G
			data[i+2] = this.image_data[i+2];	// B
			data[i+3] = this.image_data[i+3];	// A
		};
	}


	calculateImageSize() {
		const _a = this.data.difficulty;
		const _s = this.properties.pp_size;
		const _r = this.properties.pp_rows;
		this.properties.grid_pix = Math.round(tomJS.size * _s);
		this.properties.cell_pix = Math.round(this.properties.grid_pix / _r);
		this.properties.grid_dim = Math.round(this.properties.grid_pix / this.properties.cell_pix);
		this.properties.a_cells  = Math.round(this.properties.grid_dim * _a);
	}


	prepareImageData() {
		const A   = this.properties.pp_color_A;
		const B   = this.properties.pp_color_B;
		const _gd = this.properties.grid_dim;
		const _ac = this.properties.a_cells;
		const _cp = this.properties.cell_pix;
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


	// super ---------------------------------------------------------------------------------------------------------------


	drawStimulus() {
		super.drawStimulus();
		this.drawOneBar('B');
		this.drawOneBar('F');
	}

	// functions -----------------------------------------------------------------------------------------------------------


	drawOneBar(which){
		const w = tomJS.size * this.data.pb_width * ((which == 'F') ? this.data.pb_percent : 1);
		const h = tomJS.size * this.data.pb_height * ((which == 'F') ? 0.95 : 1);
		const x = (tomJS.size * this.data.pb_x) - (w * 0.5);
		const y = (tomJS.size * this.data.pb_y) - (h * 0.5);
		tomJS.context.fillStyle = (which == 'F') ? this.data.pb_color_F : this.data.pb_color_B;
		tomJS.context.fillRect(x, y, w, h);
	}

}


// utils ===================================================================================================================


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


// data ====================================================================================================================


bremen = {
	'institute'  : "Institut feur Psychologie",
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


consent_form = [
	"General information",
		"Thank you for your interest in our scientific study."+
		" Please read the following information carefully and then decide whether or not to participate in this study."+
		" If you have any further questions about the study beyond this information please message or email Tom Narraway.",
	"1. Objective of this Research Project",
		"In this study, we investigate the cognitive representations of motor action planning." +
		" We aim to determine how our experiment affects the speed and accuracy of your responses.",
	"2. Study Procedure",
		"You will be asked to press buttons in response to simple visual stimuli."+
		" For each decision we record how long you take to respond and if your response is correct or not."+
		" The exact procedure will be explained to you during the experiment."+
		" We will also ask to record your age, gender, and dominant hand, but these details are optional."+
		" The experiment takes approximately 60 minutes.",
	"3. Reimbursement",
		"You will be reimbursed at the rate of 9.50 GBP per hour.",
	"4. Obligations",
		"The success of scientific studies depends significantly on your cooperation."+
		" We therefore ask you to remain focused and to work according to the instructions throughout the entire study.",
	"5. Voluntary participation and possibility of dropping out",
		"Your participation in the study is voluntary. "+
		" You may withdraw from the study at any time and without giving reasons, without incurring any disadvantages."+
		" If you withdraw, you are entitled to a pro rata compensation for your time spent.",
	"6. Confidentiality and anonymity",
		"Data collected as part of this study is connected to a randomly assigned ID-number and therefore cannot be traced back to you.",
	"7. Data protection",
		"The collection and processing of your personal data described above is carried out without collecting any identifying information."+
		" This means that no one can link your data to you after collection."+
		" Accordingly, your data cannot be deleted after collection."+
		" Therefore you cannot withdraw consent to the use of your data."
]


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
