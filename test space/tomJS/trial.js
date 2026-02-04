
export const Trial = ((module)=>{

    /** Standard two-alternative forced choice reaction time task. */
	class Trial extends tomJS.State.State {

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
			if (tomJS.headings[4] != 'block') joinUniques(tomJS.headings, this.data.keys());

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

	};

	class FeedbackDeadline extends Trial {

		constructor(args={}) {
			if (!('condition'in args)) tomJS.error('no condition (deadline) passed to feedback deadline trial');
			super(args);
			this.data.stimulus_slow = this.data.condition;
		}

	};

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

	};

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
			if (!(arraySearch(tomJS.headings, 'rtt'))) tomJS.headings = joinUniques(tomJS.headings, this.data.keys());
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

	};

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
			if (this.timeline.currentState() == "ITIBit") return;
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
	
	};

    module.Trial = Trial;
    module.FeedbackDeadline = FeedbackDeadline;
    module.PreFixationPicture = PreFixationPicture;
    module.ResponseSignal = ResponseSignal;
    module.ProgressBarResponseSignal = ProgressBarResponseSignal;

    return module;

})({});
