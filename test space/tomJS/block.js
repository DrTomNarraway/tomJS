
export const Block = ((module) => {
	
	class Block extends tomJS.State.State {

		constructor(trial_type, trialwise={}, additional={}, conditional={}, trial_reps=1, start_slide=null, end_slide=null, add_countdown=true) {
			super();
			this.block = 0
			this.n = 0;
			this.generateTimeline(trial_type, trialwise, additional, conditional, trial_reps, start_slide, end_slide, add_countdown);
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

		checkConditions(conds) {
			if (Object.keys(conds).length == 0) return;
			for (let _c = 0; _c < Object.keys(conds).length; _c++) {
				const _key = Object.keys(conds)[_c];
				const _cond = conds[_key];
				for (let _o = 0; _o < Object.keys(_cond).length; _o++) {
					const _operation = this.parseText(Object.keys(_cond)[_o]);
					const _outcome   = this.parseText(Object.values(_cond)[_o]);
					const _evaluation  = this.evaluate(_operation);
					if (_evaluation) { 
						this.args[_key] = _outcome;
						break;
					};
				};
			};
		}

		evaluate(operation) {
			const t = operation.split(' ');
			const o = t[1];
			switch(o) {
				case '==' : return t[0] == t[2];
				case '!=' : return t[0] != t[2];
				case '<'  : return t[0] <  t[2];
				case '>'  : return t[0] >  t[2];
				case '<=' : return t[0] <= t[2];
				case '>=' : return t[0] >= t[2];
			}
		}

		generateTimeline(trial_type, trialwise, additional, conditional, trial_reps, start_slide, end_slide, add_countdown) {
			let _timeline = new Timeline();
			const _t_cells = returnTotalDictLength(trialwise);
			let _trialwise = returnAllCombinationsFromDict(trialwise);
			_trialwise = returnShuffledArray(_trialwise);
			let _n_trials = _t_cells * trial_reps;
			if (start_slide != null) _timeline.push(start_slide);
			if (add_countdown) {_timeline.push(new Countdown(3000))};
			for (let t = 0; t < _n_trials; t++) {
				this.args = Object.assign({ }, {'block':this.block, 'trial':t, 'index':tomJS.trials}, _trialwise[t%_t_cells], additional);
				this.checkConditions(conditional);
				const _new_trial = new trial_type(this.args);
				_timeline.push(_new_trial);
				this.n++;
				tomJS.trials += 1;
			};
			if (end_slide != null) _timeline.push(end_slide);
			this.args = null;
			this.timeline = _timeline;
		}

		parseText(_text) {
			let _t = "" + _text;
			if (_t.includes('~')) {
				let _split = _t.split('~');
				_t = _split[0] + eval(_split[1]) + _split[2];
			};
			return _t;
		}

	};

	module.Block = Block;

	return module;

})({});
