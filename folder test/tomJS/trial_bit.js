
const TrialBit = ((module)=>{

	class TrialBit extends State.State {

		constructor(trial, args={}) {
			super();
			this.trial    = trial;
			this.data     = trial.data;
			this.timeline = null;
		}

	};

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

	};

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

	};

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

	};

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

	};

    module.TrialBit = TrialBit;
    module.FeedbackBit = FeedbackBit;
    module.FixationBit = FixationBit;
    module.ITIBit = ITIBit;
    module.StimulusBit = StimulusBit;

    return module;

})({});
